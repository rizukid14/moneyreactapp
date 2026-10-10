# Implementation Plan — Alokasi Pembayaran Hutang Multi-Tagihan + Sinkronisasi Split Bill

> Mengacu pada `DEBT_MULTI_BILL_PAYMENT_PLAN.md`.
> **Tujuan:** (1) Bayar 1 atau banyak nota sekaligus dengan alokasi jelas; (2) tampilkan sisa per-nota; (3) status lunas Split Bill ikut ter-update di link publik.
> **Status:** Rencana implementasi (belum ada kode yang diubah).

---

## 0. Ringkasan Keputusan

| # | Keputusan | Nilai |
|---|---|---|
| 1 | Alokasi pembayaran | **Manual pilih nota** (default) + tombol FIFO opsional |
| 2 | Pembayaran lama | **Belum dialokasikan** + tombol alokasikan manual (tanpa paksa FIFO) |
| 3 | Split Bill sync | **Ya** — status lunas tampil di link publik |
| 4 | Label nota lama | Pakai `description` yang ada; kosong → "Hutang/Piutang" |

---

## 1. Kondisi Kode Saat Ini (Fakta)

- **1 dokumen `Debt` per kontak+tipe** (auto-merge di `addDebt`, `MoneyContext.tsx`).
- **"Nota" = transaksi `debtRole: 'principal'`** di dalam dokumen hutang itu (`_createTx(... 'principal')`).
- **Pembayaran** = transaksi `debtRole: 'payment'` dengan `relatedId = debt.id` (`addDebtPayment`).
- **Split Bill** membuat piutang per orang via `addDebt` (+ `performSplitSave` di `ReceiptScanner`, `handleSaveToDebts` di `SharedSplitBill`), **tanpa tautan** ke dokumen `shared_splits`.
- `shared_splits/{id}` dibuat di `SplitBillModal.handleShare` via `dbSaveSharedSplit` (deterministik `sourceId = <merchant>-<date>-<total>`).

---

## 2. Perubahan Model Data

### 2.1 `Transaction` (`MoneyContext.tsx`)
```ts
export interface DebtAllocation {
  principalTxId: string;   // id transaksi principal (nota) yang dibayar
  amount: number;          // nominal yang dialokasikan ke nota itu
}

export interface Transaction {
  // ...field lama...
  debtAllocations?: DebtAllocation[]; // hanya untuk transaksi pembayaran hutang
}
```

### 2.2 `Debt` (`MoneyContext.tsx`)
```ts
export interface Debt {
  // ...field lama...
  sourceSplitId?: string;     // = sourceId dokumen shared_splits (petunjuk sinkronisasi)
  sourceSplitMember?: string; // nama anggota pada split
}
```

### 2.3 `SharedSplit` (`db.ts`)
```ts
export interface SharedSplit {
  // ...field lama...
  memberPayments?: Record<string, { paidAt: number; amount: number }>;
}
```

---

## 3. Fase Implementasi

### FASE 0 — Fondasi (types & kalkulasi)
- [ ] **0.1** Tambah `DebtAllocation` + `Transaction.debtAllocations` di `MoneyContext.tsx`.
- [ ] **0.2** Tambah `Debt.sourceSplitId`, `sourceSplitMember`.
- [ ] **0.3** `src/lib/debtCalculations.ts`: tambah
  ```ts
  export const calculatePrincipalBalances = (debt, transactions, categories) => {
    // 1. Ambil principalTxs (isDebtPrincipalTx) & paymentTxs (isDebtPaymentTx).
    // 2. Untuk tiap paymentTx:
    //    - Jika punya debtAllocations -> kurangi sesuai alokasi.
    //    - Jika TIDAK punya -> tandai "unallocated" (tidak dikurangi ke nota mana pun;
    //      masukkan ke pool belum terpetakan).
    // 3. Kembalikan: { perNota: { principalTxId, label, principal, paid, remaining, isPaid }[], unallocated: number, totalRemaining }
  };
  ```
- [ ] **0.4** Unit test kecil (node) untuk `calculatePrincipalBalances` (dengan/tanpa alokasi).

**Acceptance:** tsc bersih; helper teruji.

---

### FASE 1 — Label Nota
- [ ] **1.1** Di `addDebt`, sertakan `description` pada note transaksi principal:
  - `"Pinjaman ke {contact}: {description}"` (piutang) / `"Pinjaman dari {contact}: {description}"` (hutang).
- [ ] **1.2** Pastikan `description` benar-benar tersimpan saat pembuatan hutang (dari TransactionModal, Split, Trip, Trip Expense).
- [ ] **1.3** Fallback label: `description` → jika kosong → `"Hutang"/"Piutang"`.

**Acceptance:** tiap nota punya label yang bisa dibedakan di riwayat.

---

### FASE 2 — Alokasi Pembayaran (Multi-Nota)
- [ ] **2.1** `addDebtPayment(debtId, amount, assetId, date, time, note, allocations?)`:
  - Simpan transaksi pembayaran **1 baris** dengan `debtAllocations = allocations`.
  - Teruskan ke `_createTx` (tambah param opsional `debtAllocations`).
- [ ] **2.2** `DebtPaymentModal`:
  - Muat daftar nota belum lunas (via `calculatePrincipalBalances`).
  - **Checklist multi-select** nota + nominal per nota (editable).
  - **Auto-total**: jumlah centang → isi input pembayaran.
  - **Partial**: jika total input < subtotal → alokasi proporsional/berurutan; sisa per nota diupdate.
  - Tombol cepat: **Bayar Semua** (centang semua), **Bagi Rata (FIFO)**.
  - Kirim `allocations` ke `onConfirm`.
- [ ] **2.3** `Debts.tsx` `onConfirm` meneruskan `allocations` ke `addDebtPayment`.
- [ ] **2.4** Validasi: total alokasi == nominal pembayaran (selisih → kategori "Pembulatan / Selisih Bayar", sudah ada).

**Acceptance:** bayar Rp 50.000 ke 2 nota (30k + 20k) → 1 transaksi bank Rp 50.000, nota A & C lunas, nota B tetap.

---

### FASE 3 — Tampilan Riwayat per-Nota + Alokasi Manual Data Lama
- [ ] **3.1** `Debts.tsx` laci riwayat: untuk tiap principal tx tampilkan **badge**:
  - `LUNAS` (hijau) / `Sisa Rp X` (kuning) / `Belum dibayar` (merah).
- [ ] **3.2** Pembayaran lama tanpa `debtAllocations` → badge **[ BELUM DIALOKASIKAN ]** + tombol **Alokasikan**.
- [ ] **3.3** Modal kecil "Alokasikan Pembayaran": centang nota + nominal; simpan → `updateTransaction` menambahkan `debtAllocations`. Tombol "Bagi Rata (FIFO)" opsional.
- [ ] **3.4** Ringkasan "Pool Belum Terpetakan: Rp X" bila ada pembayaran tanpa alokasi.

**Acceptance:** pembayaran lama transparan; user bisa menetapkan alokasi sendiri.

---

### FASE 4 — Sinkronisasi Split Bill → Link Publik
- [ ] **4.1** Saat membuat hutang/piutang dari split, isi `sourceSplitId` (deterministik `sourceId`) + `sourceSplitMember`:
  - `ReceiptScanner.performSplitSave` (owner side).
  - `SharedSplitBill.handleSaveToDebts` / `handleIdentityConfirm` (recipient side).
  - `SplitBillModal` meneruskan `sourceId` ke `onSave`.
- [ ] **4.2** `db.ts`:
  - Tambah `memberPayments` di `SharedSplit`.
  - `dbUpdateSharedSplitPaymentBySourceId(sourceId, memberName, amount)` → query `shared_splits` (`creatorId==uid && sourceId==sourceId`) → update `memberPayments`.
- [ ] **4.3** `addDebtPayment`: jika `debt.sourceSplitId` ada → setelah mencatat pembayaran, panggil `dbUpdateSharedSplitPaymentBySourceId(debt.sourceSplitId, debt.sourceSplitMember, amount)`.
- [ ] **4.4** `SharedSplitBill.tsx` (link publik): baca `memberPayments` → tampilkan badge **LUNAS** / **Belum Bayar** per orang.
- [ ] **4.5** `SharedBillsManagerModal.tsx`: tampilkan progres "X/Y orang lunas · Rp A / Rp B terkumpul".

**Acceptance:** tandai piutang Budi lunas → link publik & manager menampilkan Budi LUNAS.

---

### FASE 5 — Uji, Migrasi, Polish
- [ ] **5.1** Migrasi opsional: `migrated_debt_bill_labels_v1` (backfill label dari deskripsi). Tidak wajib untuk pembayaran lama (biar "belum dialokasikan").
- [ ] **5.2** Tambah `debtAllocations`/`sourceSplitId` ke daftar field yang di-sync (sudah otomatis karena bagian dokumen).
- [ ] **5.3** Uji manual semua skenario (lihat §5).
- [ ] **5.4** `tsc -b` + `npm run build` + lint tidak menambah error.

---

## 4. Edge Cases

| Kasus | Penanganan |
|---|---|
| Bayar > total tagihan terpilih | Sisanya → "Pembulatan / Selisih Bayar" |
| Bayar < total tagihan terpilih | Alokasi berurutan (FIFO) atau proporsional; nota terakhir partial |
| Hapus transaksi pembayaran | Alokasi ikut hilang → nota kembali belum lunas (sudah otomatis) |
| `sourceSplitId` ada tapi dokumen `shared_splits` sudah dihapus/expired | Update di-skip (no-op) |
| Hutang MANDIRI (`excludeAutoOffset`) | Tetap mendukung multi-nota & alokasi |
| Offset potong-silang | Tetap `debtRole: 'offset'`; alokasi FIFO ke nota (tidak wajib manual) |

---

## 5. Rencana Uji

- **T1:** 3 nota (30k/50k/20k), bayar 50k pilih nota A+C → A,C lunas, B sisa 50k, 1 tx bank 50k.
- **T2:** Bayar 40k pilih A+C → A lunas 30k, C terbayar 10k sisa 10k.
- **T3:** Bayar semua (Lunas Penuh) → semua nota lunas.
- **T4:** Pembayaran lama tanpa alokasi → badge "belum dialokasikan"; alokasikan manual → akurat.
- **T5:** Delete pembayaran → nota kembali belum lunas.
- **T6:** Split Bill → tandai piutang Budi lunas → link publik & manager menampilkan Budi LUNAS.
- **T7:** Regresi: offset potong-silang & fitur hutang lama tetap jalan.

---

## 6. Rollback

- Semua perubahan **aditif** (field opsional). Kode lama mengabaikan field baru.
- Tidak ada migrasi destruktif.
- Rollback = revert commit per fase.

---

## 7. Estimasi (kasar)

| Fase | Beban |
|---|---|
| 0 Fondasi | 0.5 hari |
| 1 Label nota | 0.5 hari |
| 2 Alokasi pembayaran | 1.5 hari |
| 3 Riwayat + alokasi manual | 1 hari |
| 4 Split Bill sync | 1.5 hari |
| 5 Uji & polish | 0.5 hari |
| **Total** | **±5.5 hari** |

---

## 8. Urutan Pengerjaan Disarankan

1. Fase 0 → Fase 1 (fondasi + label, cepat & aman).
2. Fase 2 (inti alokasi pembayaran).
3. Fase 3 (tampilan & data lama).
4. Fase 4 (sync split bill).
5. Fase 5 (uji & polish).

---

## 9. User Review Required

1. Setuju urutan fase di atas?
2. Untuk Fase 2, default saat buka modal: **semua nota tercentang** atau **kosong**?
3. Fase 4: update link publik saat pembayaran **real-time** (langsung) atau saat **buka manager** saja?
4. Perlukah **notifikasi** ke kontak saat ditandai lunas? (di luar scope saat ini)

---

*Dokumen rencana implementasi. Tidak ada kode sumber yang diubah.*
