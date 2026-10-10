# Desain Ulang — Transaksi Rutin (Recurring Transactions) v2

> **Status:** Draf desain (belum implementasi, tidak ada kode yang diubah).
> **Tujuan:** Menghilangkan seluruh kelas bug transaksi rutin: tanggal bergeser (timezone), duplikasi client+cron, "hapus tapi muncul lagi", dan data lama yang tidak bisa dipulihkan.

---

## 1. Latar Belakang & Masalah

Bug yang dilaporkan: rutin bulanan tanggal 4 (bayar kos Rp1,4 jt) justru muncul di tanggal 2/3; `lastProcessedDate` berhenti di tanggal 2; menghapus transaksi malah membuatnya terbuat lagi.

Commit `f78614b` (timezone shift, cron duplication, leap year, overflow) dan `0f5b195` (soft-delete resurrection) **memperbaiki rumus**, tetapi tidak menutup akar desainnya:

| Akar masalah | Kenapa perbaikan rumus tidak cukup |
|---|---|
| Hari diturunkan runtime dari `startDate.getDate()` | Data lama yang sudah bergeser tetap menghasilkan hari salah selamanya (tanpa migrasi). |
| Cursor tunggal `lastProcessedDate` | Tidak bisa membedakan "belum dibuat" vs "sengaja dihapus user" → resurrect. |
| Dua penulis: client (`MoneyContext`) + server (`api/daily-cron.ts`) | Id `auto-<rtId>-<tgl>` hanya sama kalau tanggal sama; timezone berbeda → id beda → dobel. |
| Regenerasi dari state in-memory | Cek `exists` tidak melihat data server yang belum tersinkron. |
| `Date → toISOString()` untuk tanggal lokal | Bergeser 1 hari di zona waktu non-UTC. |

---

## 2. Prinsip Desain

**Rule + Pure Schedule + Idempotent Materialize + Exception Ledger.**

### Pilar 1 — Jadwal disimpan eksplisit, tidak diturunkan runtime
Hari/bulan jatuh tempo dibaca dari field `anchorDate`, bukan dihitung ulang dari `lastProcessedDate`. User boleh mengedit `anchorDate` tanpa merusak riwayat.

### Pilar 2 — Fungsi jadwal murni & deterministik
`schedule(rule, from, to)` hanya fungsi dari `anchorDate` + `frequency`. Tidak menyentuh DB, tidak ada state. Semua aritmetika memakai **string `YYYY-MM-DD` + timezone kanonik**, tanpa `Date → toISOString()`.

### Pilar 3 — Materialisasi idempotent
ID occurrence deterministik: `auto_${rtId}_${date}`. Pembuatan memakai `create-if-absent` di dalam transaksi. Dengan begitu client dan cron boleh sama-sama menulis — hasilnya identik, mustahil dobel.

### Pilar 4 — Exception ledger
Penghapusan/skip dicatat di `recurring_exceptions/{rtId}.skipped[date]`. Generator selalu menghormatinya → "hapus" tidak pernah resurrect.

---

## 3. Model Data Baru

### 3.1 Rule (`recurring_transactions`)
```ts
interface RecurringTransaction {
  id: string;
  type: Transaction['type'];
  amount: number;
  note: string;
  categoryId?: string;
  subCategoryId?: string;
  assetId?: string;
  fromAssetId?: string;
  toAssetId?: string;
  goalId?: string;

  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  anchorDate: string;        // 'YYYY-MM-DD' — acuan hari & bulan
  time: string;              // 'HH:mm'
  timezone: string;          // 'Asia/Jakarta' (kanonik per-rule)
  endDate?: string;          // 'YYYY-MM-DD'
  catchUp: boolean;          // true = isi occurrence yang terlewat; false = hanya ke depan
  isActive: boolean;

  // metadata sinkron
  createdAt: string;
  updatedAt?: number;
  isDeleted?: boolean;
  createdBy?: string;
  updatedBy?: string;

  // TIDAK ADA LAGI: lastProcessedDate
}
```

Catatan: `anchorDate` menggantikan `startDate`. Tetap ada `time` agar occurrence tidak selalu `00:00`.

### 3.2 Exception ledger
```ts
// doc: recurring_exceptions/{rtId}
interface RecurringExceptions {
  rtId: string;
  skipped: Record<string, true>;   // { 'YYYY-MM-DD': true } — user hapus/skip
  overrides?: Record<string, Partial<Transaction>>; // opsional: editan per-occurrence
  updatedAt: number;
}
```

### 3.3 Transaksi hasil generate
```ts
interface Transaction {
  // ...field lama...
  id: `auto_${string}_${string}`;   // deterministik: auto_<rtId>_<date>
  sourceRecurringId?: string;        // = rtId, untuk query balik
  occurrenceDate?: string;           // 'YYYY-MM-DD'
  isUserModified?: boolean;          // true bila user mengedit occurrence ini
}
```

---

## 4. Algoritma

### 4.1 Fungsi jadwal murni
```ts
// Semua operasi string 'YYYY-MM-DD'; timezone hanya dipakai untuk menentukan "today".
function schedule(rule, from: string, to: string): string[] {
  const dates: string[] = [];
  let d = firstOnOrAfter(rule.anchorDate, from);        // no-op utk 'daily/weekly' dari anchorDate
  if (d === null) return dates;
  while (d <= to) {
    dates.push(d);
    d = addFrequency(d, rule.frequency, dayOf(rule.anchorDate)); // clamp ke hari terakhir bulan
  }
  return dates;
}
```

- `addFrequency` bulanan: `targetDay = dayOf(anchorDate)`; bulan +1; hari = `min(targetDay, daysInMonth)`. (Sudah benar di `getNextDateSafe`, tinggal dipindah jadi murni.)
- `daily/weekly`: aritmetika dari `anchorDate`; `firstOnOrAfter` menggeser ke kelipatan yang tepat.
- Tidak ada `new Date(localDate).toISOString()`.

### 4.2 Materialisasi idempotent (aman multi-penulis)
```ts
async function materializeAll(rtCol, todayIn) {
  for (const rt of activeRules) {
    if (rt.isDeleted || !rt.isActive) continue;
    const today = todayIn(rt.timezone);                     // string 'YYYY-MM-DD'
    const from = rt.catchUp ? rt.anchorDate : today;
    const exceptions = await getExceptions(rt.id);           // { skipped }

    for (const date of schedule(rt, from, today)) {
      if (exceptions.skipped[date]) continue;               // pilar 4
      const txRef = txCol.doc(`auto_${rt.id}_${date}`);
      await runTransaction(db, async (t) => {               // atomic
        if ((await t.get(txRef)).exists) return;            // create-if-absent, jangan timpa editan
        t.set(txRef, buildTx(rt, date));
      });
    }
  }
}
```

Hasil:
- Client & cron boleh keduanya jalan → id sama → tidak mungkin dobel.
- Editan user pada satu occurrence tidak ditimpa (create-if-absent).
- Occurrence yang di-skip tidak dibuat ulang → **hapus tidak resurrect**.

### 4.3 Hapus satu occurrence
```ts
async function deleteOccurrence(rtId, date) {
  await deleteTx(`auto_${rtId}_${date}`);
  await setException(rtId, { skipped: { ...prev, [date]: true } });
}
```

### 4.4 Edit satu occurrence
```ts
async function editOccurrence(rtId, date, patch) {
  await updateTx(`auto_${rtId}_${date}`, { ...patch, isUserModified: true });
  // tidak perlu ledger; create-if-absent sudah menjaga
}
```

### 4.5 Matikan rutin & catch-up
- `isActive=false` → generator melewati. Riwayat lama tetap.
- `catchUp=false` → hanya generate dari `today` ke depan (tidak mengisi masa lalu). Berguna bila user tidak ingin transaksi "belakang" muncul.

---

## 5. Timezone

- Satu **zona kanonik per rule** (`timezone`, default `Asia/Jakarta`).
- "Today" dihitung dengan `Intl.DateTimeFormat('en-CA', { timeZone: rule.timezone })` → menghasilkan `'YYYY-MM-DD'`.
- Semua perbandingan tanggal dilakukan sebagai **string**, bukan objek `Date`.
- Melarang `new Date('YYYY-MM-DD').toISOString()` untuk keperluan tanggal lokal.

---

## 6. Satu Penulis atau Dua?

Dengan id deterministik + `create-if-absent`, dua penulis tetap aman. Namun untuk kesederhanaan operasional, rekomendasi:

| Opsi | Kapan dipakai | Catatan |
|---|---|---|
| **Server-only (cron)** | Utama | Client hanya menampilkan; menjamin konsistensi lintas device. Butuh cron aktif. |
| **Client + cron** | Offline-first | Aman karena id deterministik; gunakan `runTransaction`. |
| **Client-only** | Tanpa backend | Matikan cron; cocok untuk mode lokal. |

Default rekomendasi: **Client + cron** (tahan offline, tetap idempotent).

---

## 7. Alternatif (lebih radikal) — Read-time Projection

Tidak menyimpan tx auto sama sekali. Rutin = rule; daftar transaksi mem-*merge* occurrence yang diproyeksikan saat render; yang disimpan hanya `exceptions`.

- **Plus:** nol duplikasi, nol drift, "hapus" = tambah exception.
- **Minus:** semua agregasi (saldo, budget, statistik, notifikasi) harus sadar proyeksi → perubahan besar dan berisiko.
- **Rekomendasi:** baru dipertimbangkan setelah 4 pilar materialisasi stabil.

---

## 8. Rencana Migrasi (sekali jalan)

1. Untuk tiap rule lama: `anchorDate = startDate`, `timezone = 'Asia/Jakarta'` (atau dari profil), `time = '00:00'`, `catchUp = true`.
2. Bangun `recurring_exceptions.skipped` dari tx auto yang sudah dihapus (scan transaksi `[Auto:rtId]` dengan `isDeleted = true`) → cegah muncul kembali.
3. Buang ketergantungan `lastProcessedDate`; tidak dihapus dari Firestore untuk kompatibilitas mundur, tapi tidak lagi dibaca.
4. Karena `startDate` lama bisa sudah bergeser (mis. tersimpan `-03`), sediakan UI **"Perbaiki Jadwal"** untuk menetapkan `anchorDate` yang benar, lalu regenerate bersih (hapus tx auto lama milik rt itu + exception agar bisa dibuat ulang).
5. Tandai migrasi di `localStorage`/setting (mis. `migrated_recurring_v2`) agar idempotent.

---

## 9. Perubahan Kode yang Diperlukan

| File | Perubahan |
|---|---|
| `src/lib/utils.ts` | Ekstrak `schedule()`, `addFrequency()`, `firstOnOrAfter()`, `dayOf()`, `todayIn(tz)`; jadikan murni. |
| `src/contexts/MoneyContext.tsx` | Ganti `runAutoProcess` → `materializeAll` berbasis `runTransaction` + ledger; hapus logika `lastProcessedDate`. |
| `api/daily-cron.ts` | Pakai `schedule()` yang sama (share logic atau duplikat identik); buat tx via transaksi `create-if-absent`. |
| `src/lib/db.ts` | Tambah store `recurring_exceptions`; helper CRUD exception; bump `DB_VERSION`. |
| `src/components/modals/TransactionModal.tsx` | Set `anchorDate` (bukan `startDate`/`lastProcessedDate`). |
| `src/pages/Settings.tsx` | UI "Perbaiki Jadwal" + tampilkan `anchorDate` (bukan "Terakhir: lastProcessedDate"). |
| **Hapus pemanggil `startDate: getLocalDate()`** | `ChatBot.tsx:679`, `GoalModal.tsx:105`, `Settings.tsx:1312` → set `anchorDate` yang benar. |

---

## 10. Rencana Uji (Regresi)

- **T1 Timezone:** buat rule tanggal 4 di WIB/WITA/UTC-8 → occurrence harus tetap tanggal 4.
- **T2 Idempotensi:** jalankan materialisasi dua kali (client + cron) → hanya 1 tx per occurrence.
- **T3 Hapus:** hapus occurrence → jalankan ulang → tidak dibuat lagi.
- **T4 Edit:** edit occurrence → jalankan ulang → editan tidak tertimpa.
- **T5 Lebar bulan:** anchor 31 → Feb = 28/29, Mar = 31 (clamp).
- **T6 Catch-up:** rule dibuat jauh di masa lalu dengan `catchUp=false` → tidak membuat transaksi masa lalu.
- **T7 Migrasi:** data lama bergeser + "Perbaiki Jadwal" → occurrence benar setelah regenerate.

Perluas `scripts/test_recurring_comprehensive.js` yang sudah ada.

---

## 11. Pemetaan ke Audit

| Poin audit | Ditutup oleh |
|---|---|
| Duplikasi client + cron (`auto-<rtId>-<tgl>`) | Pilar 3 (id deterministik + create-if-absent) |
| Date drift / timezone (Pola Akar #1 pada recurring) | Pilar 2 + Bagian 5 |
| Resurrect saat hapus | Pilar 4 |
| Ketergantungan `lastProcessedDate` | Pilar 1 |
| Pembuat rutin salah hari (`ChatBot.tsx:679`, dst.) | Bagian 9 |

---

## 12. Rollout Bertahap (opsional, risiko minimum)

1. **Fase 1 (patch terkecil):** tambah `recurring_exceptions` + `create-if-absent`; jangan ubah schema dulu. Ini langsung membereskan *resurrect* & *dobel*.
2. **Fase 2:** tambah `anchorDate` + `schedule()` murni; migrasi; UI "Perbaiki Jadwal".
3. **Fase 3:** bersihkan `lastProcessedDate` & rapikan satu penulis.

---

*Dokumen desain. Tidak ada kode sumber yang diubah.*
