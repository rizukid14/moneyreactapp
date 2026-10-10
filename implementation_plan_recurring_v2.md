# Implementation Plan — Transaksi Rutin v2 (Idempotent Recurring Engine)

> **Mengacu pada:** [`RECURRING_REDESIGN.md`](./RECURRING_REDESIGN.md) & bagian "Kasus Khusus: Transaksi Rutin" di [`AUDIT_REPORT.md`](./AUDIT_REPORT.md).
> **Tujuan:** Menutup R1–R6 (date drift, dobel client+cron, resurrect saat hapus, tanpa migrasi, jalur pembuat salah hari).
> **Status:** Rencana (belum ada kode yang diubah).

---

## 1. Goal

Membuat mesin transaksi rutin yang **deterministik** dan **idempotent**, sehingga:
- Occurrence selalu jatuh pada tanggal yang benar (timezone-safe).
- Client dan cron boleh berjalan bersamaan tanpa menghasilkan duplikat.
- Menghapus satu occurrence tidak ever membuatnya kembali.
- Data lama yang sudah bergeser bisa diperbaiki lewat migrasi + UI.

---

## 2. Scope

**Termasuk:**
- Mesin generate (client `MoneyContext` + `api/daily-cron.ts`).
- Model data rule (`anchorDate`, `timezone`, `catchUp`), ledger `recurring_exceptions`, id deterministik.
- Migrasi data lama + UI "Perbaiki Jadwal".
- Perbaikan jalur pembuat rutin yang salah hari.

**Tidak termasuk (fase terpisah):**
- Read-time projection (alternatif radikal).
- Perubahan skema `Transaction` lain di luar field rutin.
- Perbaikan cron notifikasi (daily/weekly-cron) selain bagian rutin.

---

## 3. Prinsip (ringkas)

1. `anchorDate` disimpan eksplisit — hari **tidak** diturunkan dari `lastProcessedDate`.
2. `schedule(rule, from, to)` murni & deterministik.
3. Id occurrence deterministik `auto_${rtId}_${date}` + `create-if-absent` (atomic).
4. `recurring_exceptions/{rtId}.skipped[date]` dihormati generator.

---

## 4. Deliverable & Definition of Done

- [ ] `schedule()` murni + unit test lulus semua timezone (T1–T7).
- [ ] Generate idempotent: menjalankan dua sumber → 1 transaksi/occurrence.
- [ ] Hapus occurrence → tidak regenerate.
- [ ] Edit occurrence → tidak tertimpa.
- [ ] Migrasi jalan sekali, idempotent, tidak menghilangkan data.
- [ ] `npm run lint` tidak menambah error baru; `tsc -b` bersih.
- [ ] Regression test recurring diperluas & lulus.

---

## 5. Fase & Task

### Fase 0 — Persiapan (tanpa mengubah perilaku)
- [ ] **0.1** Tambah tipe & helper murni di `src/lib/utils.ts`:
  - `dayOf(dateStr): number`
  - `daysInMonth(year, month): number`
  - `addFrequency(dateStr, freq, anchorDay): string`
  - `firstOnOrAfter(anchorDate, from, freq): string | null`
  - `schedule(rule, from, to): string[]`
  - `todayIn(timezone): string` (via `Intl.DateTimeFormat('en-CA', { timeZone })`)
- [ ] **0.2** Buat modul bersama `src/lib/recurring.ts` yang mengekspor `schedule`, `materialize`, `buildTx`, dipakai client **dan** cron (hindari duplikasi logika). Untuk serverless, pastikan tanpa dependensi DOM.
- [ ] **0.3** Tambah tipe `RecurringExceptions` di `MoneyContext.tsx` (atau `recurring.ts`).
- [ ] **0.4** Unit test baru `scripts/test_recurring_v2.mjs` (node) untuk T1–T7 (sebagian bisa reuse `test_recurring_comprehensive.js`).

**Acceptance:** `schedule()` lulus test timezone & bulan pendek; belum ada pemakaian di produksi.

---

### Fase 1 — Idempotency + Ledger (fix gejala paling mendesak)
> Ini menutup **dobel** dan **resurrect** tanpa mengubah skema rule dulu.

- [ ] **1.1** `src/lib/db.ts`:
  - Bump `DB_VERSION` (11 → 12).
  - Tambah store `recurring_exceptions` di `MoneyAppDB` & `dbUpgrade`.
  - Helper: `dbGetExceptions(rtId)`, `dbPutException(rtId, { skipped })`, `dbAddSkip(rtId, date)`.
- [ ] **1.2** `src/contexts/MoneyContext.tsx` (`runAutoProcess`):
  - Ganti cek `exists` in-memory → **`create-if-absent`** lewat helper DB (`dbPutTransactionIfAbsent`) yang membaca store dulu (IDB) dan memakai `setDoc` hanya bila belum ada; untuk cloud pakai guard `runTransaction` bila tersedia.
  - Sebelum membuat, cek `exceptions.skipped[date]` → skip.
  - Jangan pakai `transactions` sebagai sumber kebenaran untuk existence.
- [ ] **1.3** `api/daily-cron.ts`:
  - Ganti `txRef.get()` → `create` idempotent di dalam transaksi; hormati `skipped`.
- [ ] **1.4** `deleteTransaction` (khusus tx `sourceRecurringId`/`[Auto:rtId]`):
  - Set `skipped[date] = true` di ledger setelah menghapus.
- [ ] **1.5** Pastikan edit occurrence menandai `isUserModified` dan tidak ditimpa.

**Acceptance:** T2 (jalankan 2× → 1 tx) & T3 (hapus → tidak kembali) lulus.

---

### Fase 2 — `anchorDate` + Schedule Murni
- [ ] **2.1** Migrasi tipe `RecurringTransaction`: tambah `anchorDate`, `time`, `timezone`, `catchUp`; `startDate` tetap ditulis untuk kompatibilitas mundur (deprecated).
- [ ] **2.2** Ubah semua pembuat rutin agar mengisi `anchorDate` yang benar:
  - `MoneyContext.tsx` `addRecurringTransaction` (normalisasi input).
  - `TransactionModal.tsx:489-490` → `anchorDate: date` (buang `lastProcessedDate`).
  - `ChatBot.tsx:679` → **jangan** `getLocalDate()`; gunakan hari yang diniatkan (mis. dari `toolArgs`/tanya user).
  - `GoalModal.tsx:105` & `Settings.tsx:1312` → `anchorDate` dari tanggal yang relevan.
- [ ] **2.3** Ganti generator client & cron agar memakai `schedule(rule, from, to)` (murni) bukan loop berbasis `lastProcessedDate`.
- [ ] **2.4** Definisikan `today` = `todayIn(rule.timezone)` (string), bandingkan sebagai string.
- [ ] **2.5** Hapus pembacaan `lastProcessedDate` di generator (tetap simpan untuk info).

**Acceptance:** T1 (timezone), T5 (clamp bulan), T6 (catch-up) lulus.

---

### Fase 3 — Migrasi Data Lama + UI "Perbaiki Jadwal"
- [ ] **3.1** Migrasi sekali jalan (guard `migrated_recurring_v2`), di bootstrap `MoneyContext`:
  - `anchorDate = startDate`, `time = '00:00'`, `timezone = 'Asia/Jakarta'`, `catchUp = true`.
  - Bangun `skipped` dari tx auto yang `isDeleted` (scan `[Auto:rtId]`).
- [ ] **3.2** UI di `Settings.tsx` (bagian Rutin):
  - Tampilkan `anchorDate` (ganti label "Terakhir: lastProcessedDate").
  - Tombol **"Perbaiki Jadwal"**: set `anchorDate` baru, hapus tx auto lama milik rt itu, bersihkan `skipped` terkait, lalu regenerate.
  - Toggle `catchUp`.
- [ ] **3.3** Verifikasi migrasi idempotent (jalankan 2× → hasil sama, tanpa duplikasi).

**Acceptance:** T7 lulus; data lama bergeser bisa diperbaiki tanpa menyentuh data lain.

---

### Fase 4 — Pembersihan & Keputusan Penulis
- [ ] **4.1** Putuskan mode penulis (lihat Bagian 6 `RECURRING_REDESIGN.md`): default **Client + cron** (aman karena id deterministik).
- [ ] **4.2** Hapus `lastProcessedDate` dari tipe & UI setelah stabil (opsional, kompatibilitas).
- [ ] **4.3** Dokumentasikan alur baru di README/CHANGELOG.

---

## 6. Perubahan per File (ringkas)

| File | Perubahan | Fase |
|---|---|---|
| `src/lib/utils.ts` | Helper tanggal murni + `schedule()` | 0 |
| `src/lib/recurring.ts` (baru) | Logika bersama client/server | 0 |
| `src/lib/db.ts` | Store `recurring_exceptions`, helper CRUD, `dbPutTransactionIfAbsent`, `DB_VERSION` 12 | 1 |
| `src/contexts/MoneyContext.tsx` | Generator idempotent + ledger + migrasi + normalisasi | 1–3 |
| `api/daily-cron.ts` | Pakai `schedule()` + `create-if-absent` + honori `skipped` | 1–2 |
| `src/components/modals/TransactionModal.tsx` | `anchorDate` (buang `lastProcessedDate`) | 2 |
| `src/components/chatbot/ChatBot.tsx` | Jangan pakai `getLocalDate()` untuk `anchorDate` | 2 |
| `src/components/modals/GoalModal.tsx` | `anchorDate` dari tanggal goal | 2 |
| `src/pages/Settings.tsx` | Tampilkan `anchorDate`; UI "Perbaiki Jadwal"; `catchUp` | 3 |
| `scripts/test_recurring_*.mjs` | Perluas test T1–T7 | 0,4 |

---

## 7. Skema Helper Kunci (kontrak)

```ts
// recurring.ts
export function schedule(rt: RecurringRule, from: string, to: string): string[];
export async function materializeRule(rt: RecurringRule, opts: { txCol; exceptions; now: string }): Promise<number>;
export function buildOccurrence(rt: RecurringRule, date: string): Transaction; // id: auto_<rtId>_<date>
```

Aturan materialize:
1. `if (exceptions.skipped[date]) continue;`
2. `create-if-absent` (atomic) — **jangan** overwrite.
3. Kembalikan jumlah tx baru (untuk notifikasi cron).

---

## 8. Rencana Uji (wajib lulus sebelum merge)

| Test | Skenario | Ekspektasi |
|---|---|---|
| T1 | anchor day 4 di WIB/WITA/UTC-8 | occurrence tetap tgl 4 |
| T2 | jalankan client + cron 2× | 1 tx/occurrence |
| T3 | hapus occurrence lalu jalankan ulang | tidak dibuat lagi |
| T4 | edit occurrence lalu jalankan ulang | editan utuh |
| T5 | anchor 31 | Feb = 28/29, Mar = 31 |
| T6 | `catchUp=false`, rule lama | tidak buat transaksi masa lalu |
| T7 | data lama bergeser + "Perbaiki Jadwal" | occurrence benar |

Ditambah lint (`npm run lint`) tidak menambah error baru & `tsc -b` bersih.

---

## 9. Rollback

- Fase 1–2 bersifat aditif (store baru + field baru). Rollback = abaikan field/store baru; kode lama tetap jalan (kompatibilitas `startDate`).
- Migrasi Fase 3 idempotent & tidak menghapus data → aman dijalankan ulang.
- Jangan hapus `lastProcessedDate` sampai Fase 4 stabil.

---

## 10. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Beda logika client vs cron | Modul bersama `recurring.ts`; unit test sama. |
| `runTransaction` tidak tersedia/lambat | Fallback `dbPutTransactionIfAbsent` (IDB dulu, lalu `setDoc` guarded). |
| Migrasi salah menandai skip | Hanya skip tx `isDeleted` yang jelas milik rt; sisanya default tidak skip. |
| Duplikasi saat offline | Id deterministik → penulisan berulang aman. |
| User tidak ingin transaksi mundur | `catchUp` + UI "Perbaiki Jadwal". |

---

## 11. Estimasi (kasar)

| Fase | Beban |
|---|---|
| 0 Persiapan | 0.5 hari |
| 1 Idempotency + Ledger | 1 hari |
| 2 anchorDate + Schedule | 1 hari |
| 3 Migrasi + UI | 1 hari |
| 4 Pembersihan | 0.5 hari |
| Total | ±4 hari |

---

## 12. User Review Required

1. **Mode penulis:** setuju default **Client + cron** (keduanya tetap jalan, aman karena id deterministik), atau mau **server-only** (matikan generate di client)?
2. **Migrasi hari:** untuk data lama yang `startDate`-nya sudah bergeser, apakah cukup otomatis `anchorDate = startDate` lalu user pakai tombol "Perbaiki Jadwal", atau Anda ingin sistem menebak hari dari transaksi terakhir?
3. **`catchUp` default:** isi transaksi yang terlewat (true) atau hanya ke depan (false)?
4. **Prioritas:** langsung kerjakan Fase 0→4 penuh, atau **Fase 1 saja dulu** (paling cepat menutup dobel + resurrect) lalu evaluasi?

---

*Dokumen rencana implementasi. Tidak ada kode sumber yang diubah.*
