# Plan: Alokasi Pembayaran Hutang/Piutang per-Tagihan (Multi-Bill per Kontak)

> **Status:** Rencana desain (belum ada kode yang diubah).
> **Masalah inti:** Banyak hutang di satu nama → bayar sebagian → bingung sisa tiap tagihan yang mana.
> **Terkait:** `src/contexts/MoneyContext.tsx` (`addDebt`), `src/pages/Debts.tsx` (`DebtCard`, grouping), `src/components/modals/DebtPaymentModal.tsx`.

---

## 1. Latar Belakang & Akar Masalah

### 1.1 Perilaku saat ini
- `addDebt` **menggabung otomatis** hutang dengan `contact` + `type` sama menjadi **1 record** bila belum lunas & tidak `excludeAutoOffset`:
  ```ts
  const existingDebt = (!isPaid && !excludeAutoOffset)
    ? debts.find(d => !d.isPaid && !d.excludeAutoOffset && d.contact===... && d.type===...)
    : undefined;
  if (existingDebt) {
    updatedDebt.totalAmount = existingDebt.totalAmount + newDebt.totalAmount; // digabung
    updatedDebt.description = `${existing.description}; ${new.description}`;  // jadi satu
  }
  ```
- Akibatnya: **identitas "tagihan"/"bill" hilang**. Kalau bayar sebagian, sisa hanya terlihat di level kontak, bukan per nota.

### 1.2 Yang membingungkan user
1. Satu kontak bisa punya banyak "nota" (misal: Budi — pinjam bensin, pinjam makan, pinjam uang).
2. Bayar Rp X → tidak jelas ini melunasi nota yang **mana**, dan **sisa per nota** berapa.
3. `DebtPaymentModal` hanya menampilkan **nama kontak**, bukan tagihan spesifik → bagian label desc tidak menonjol.

---

## 2. Tujuan

1. **Setiap tagihan = 1 entitas** dengan label jelas (mis. "Bensin 12 Mei", "Makan", "Pinjam cash").
2. **Pembayaran teralokasi jelas**: user bisa pilih nota tertentu, atau biarkan sistem mengalokasikan (FIFO jatuh tempo), atau pecah ke beberapa nota.
3. **UI per-bill**: tampilkan sisa, pokok, sudah dibayar, dan jatuh tempo **per nota**.
4. Tidak merusak data lama (migrasi aman, idempotent).

---

## 3. Opsi Desain

### Opsi A — Hentikan auto-merge (1 kontak → banyak tagihan) + label per tagihan
- Setiap `addDebt` membuat record baru (kecuali user memilih "gabung ke nota lama").
- Tambah field `label`/`purpose` (nama singkat tagihan).
- **Plus:** identitas tagihan jelas; pembayaran per nota natural.
- **Minus:** kartu hutang bisa banyak per kontak; perlu UI grouping yang rapi.

### Opsi B — Tetap merge, tambah UI alokasi pembayaran
- Tetap 1 hutang besar per kontak, tapi saat bayar, muncul rincian alokasi (dari nota mana saja).
- **Plus:** perubahan data ringan.
- **Minus:** akar masalah (identitas nota hilang) tetap ada; alokasi hanya "kosmetik".

### Opsi C — Hybrid (REKOMENDASI)
- Default **tidak merge** (setiap tagihan berdiri sendiri) + **opsi tombol "Gabung ke tagihan ini"** bila user memang mau.
- `DebtPaymentModal` menampilkan **daftar tagihan** kontak tersebut:
  - pilih 1 tagihan untuk dibayar, **atau**
  - "Alokasikan otomatis" (FIFO: jatuh tempo terdekat dulu), **atau**
  - pecah manual (isi nominal per tagihan).
- Kartu & grouping menampilkan **label + sisa per tagihan**.

---

## 4. Model Data

### 4.1 Tambahan field `Debt`
```ts
interface Debt {
  // ...field lama...
  label?: string;        // Nama singkat tagihan, mis. "Bensin 12 Mei"
  billNo?: number;       // opsional: nomor urut tagihan per kontak
  // principalAmount, totalAmount, dueDate, description: tetap
}
```

### 4.2 Alokasi pembayaran
- Transaksi pembayaran tetap memakai `relatedId = debt.id` (sudah ada) → **tiap transaksi menempel ke 1 tagihan**.
- Untuk pembayaran yang dipecah ke beberapa tagihan → buat **beberapa transaksi pembayaran** (masing-masing `relatedId` berbeda) atau 1 transaksi dengan `itemizedDetails`.

### 4.3 Ledger (opsional)
- `debt_payments/{paymentId}` mencatat alokasi `{ debtId, amount }[]` untuk audit alokasi. (Bisa ditunda.)

---

## 5. Perubahan UI

### 5.1 `DebtCard` (Debts.tsx)
- Tampilkan **label tagihan** (mis. "Bensin 12 Mei") di baris atas, bukan hanya nama kontak.
- Tampilkan **sisa per tagihan** + jatuh tempo + progress.
- Tetap ada badge LUNAS / JATUH TEMPO / SEGERA / MANDIRI.

### 5.2 Grouping "Kontak"
- Saat grouping = `contact`, tiap grup menampilkan **sub-total hutang/piutang** kontak + **daftar tagihan** (masing-masing sisa).
- Ringkasan grup: "Total ke Budi: Rp X • 3 tagihan • sisa Rp Y".

### 5.3 `DebtPaymentModal` (pembayaran)
- Menampilkan **daftar tagihan** milik kontak (belum lunas) dengan sisa masing-masing.
- Mode alokasi:
  1. **Pilih 1 tagihan** (radio) → bayar ke tagihan itu.
  2. **Alokasi otomatis (FIFO)** → urutkan tagihan berdasarkan `dueDate` terlama → lunasi berturut-turut sampai nominal habis.
  3. **Pecah manual** → isi nominal per tagihan.
- Ringkasan: "Dibayar Rp X → Tagihan A: Rp a, Tagihan B: Rp b".
- Selisih/pembulatan tetap pakai kategori **"Pembulatan / Selisih Bayar"** (sudah ada).

---

## 6. Rencana Migrasi Data Lama

1. Data lama yang **sudah ter-merge**: biarkan sebagai 1 tagihan (jangan dipaksa pecah). Beri `label` default dari `description` (potongan pertama) atau "Hutang/Piutang".
2. Data lama yang terpisah (MANDIRI/lunas): beri `label` dari deskripsi.
3. Guard sekali jalan: `migrated_debt_labels_v1` di `localStorage`.

---

## 7. Fase Implementasi

### Fase 1 — Identitas Tagihan (kecil, aman)
- [ ] Tambah `label` di `Debt` + input "Nama Tagihan" di `DebtModal`.
- [ ] `DebtCard` tampilkan `label`.
- [ ] Migrasi `label` dari deskripsi.

### Fase 2 — Pembayaran per-Tagihan (inti)
- [ ] `DebtPaymentModal` tampilkan daftar tagihan kontak (bila >1).
- [ ] Mode: pilih tagihan / FIFO / pecah manual.
- [ ] Simpan sebagai transaksi pembayaran dengan `relatedId` per tagihan.
- [ ] Ringkasan alokasi + integrasi "Pembulatan / Selisih Bayar".

### Fase 3 — Grouping & Ringkasan Kontak
- [ ] Group by contact: sub-total + daftar sisa per tagihan.
- [ ] Kirim pembayaran dari level grup (pilih tagihan target).

### Fase 4 (opsional) — Ledger alokasi & riwayat
- [ ] Halaman riwayat pembayaran per tagihan (pokok, dibayar, sisa, tanggal).
- [ ] Ledger `debt_payments` untuk audit.

---

## 8. Keputusan yang Dibutuhkan (User Review)

1. **Auto-merge:** hentikan otomatis (multi-tagihan) atau tetap gabung + tanya "Gabung / Tagihan Baru"?
2. **Alokasi default:** pilih tagihan manual, atau FIFO jatuh tempo sebagai default?
3. **Label tagihan:** wajib atau opsional (default dari deskripsi)?
4. **Data lama ter-merge:** biarkan utuh, atau sediakan tombol "Pecah tagihan"?

---

## 9. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Kartu hutang jadi banyak per kontak | Grouping by contact + collapse |
| Data lama ter-merge tak bisa dipisah otomatis | Sediakan "Pecah Tagihan" manual (opsional) |
| Alokasi FIFO tidak sesuai keinginan user | Default FIFO tapi bisa override manual |
| Selisih pembulatan saat alokasi | Pakai kategori "Pembulatan / Selisih Bayar" |

---

*Dokumen rencana. Tidak ada kode sumber yang diubah.*
