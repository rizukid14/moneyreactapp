# Plan: Pembayaran Multi-Tagihan (Bayar 1 atau Banyak Nota Sekaligus)

> **Kasus Riil:**  
> Kontak "Budi" punya 3 nota hutang pokok:
> 1. Nota A: Makan siang (Rp 30.000)
> 2. Nota B: Bensin (Rp 50.000)
> 3. Nota C: Pulsa (Rp 20.000)  
>
> **Kebutuhan:**  
> User mentransfer uang sekali via m-Banking (misal **Rp 50.000**), dan ingin uang itu langsung melunasi **Nota A (30k)** dan **Nota C (20k)** sekaligus dalam **1 kali transaksi**.

---

## 1. Konsep Utama (Single Bank Transaction, Multi-Bill Allocation)

1. **Mutasi Rekening Bank Tetap 1 Baris:**  
   Uang keluar dari rekening BCA tercatat pas **Rp 50.000** (bukan dipecah jadi 2 transaksi bank). Sesuai 100% dengan bukti mutasi m-Banking.
2. **Metadata Alokasi di Transaksi:**  
   Transaksi pembayaran tersebut membawa rincian alokasi tagihan mana saja yang dilunasi:
   ```json
   {
     "id": "tx_bayar_123",
     "type": "hutang_keluar",
     "amount": 50000,
     "note": "Pelunasan: Makan siang (30k), Pulsa (20k)",
     "debtAllocations": [
       { "principalTxId": "tx_makan_siang", "amount": 30000 },
       { "principalTxId": "tx_pulsa", "amount": 20000 }
     ]
   }
   ```
3. **Status per Nota Langsung Ter-update:**  
   - Nota A (Makan siang): Sisa **Rp 0 (LUNAS)** ✅  
   - Nota B (Bensin): Sisa **Rp 50.000 (Belum dibayar)** ⏳  
   - Nota C (Pulsa): Sisa **Rp 0 (LUNAS)** ✅  

---

## 2. Alur Pengalaman Pengguna (UI Flow di `DebtPaymentModal`)

Saat Anda klik **"Cicil / Lunas"** pada kontak:

### Langkah 1: Checklist Tagihan Aktif
Di atas kolom nominal pembayaran, muncul daftar nota pokok yang belum lunas:
```
┌────────────────────────────────────────────────────────┐
│ PILIH TAGIHAN YANG AKAN DIBAYAR:                      │
│                                                        │
│ [☑] Makan siang              Sisa: Rp 30.000          │
│ [ ] Bensin                   Sisa: Rp 50.000          │
│ [☑] Pulsa                    Sisa: Rp 20.000          │
│                                                        │
│ Terpilih: 2 tagihan · Subtotal: Rp 50.000              │
└────────────────────────────────────────────────────────┘
```
- Begitu Anda centang **Makan siang** dan **Pulsa**, kotak input "Jumlah Pembayaran" **otomatis terisi Rp 50.000**.
- Catatan otomatis terisi: *"Pelunasan: Makan siang, Pulsa"*.

### Langkah 2: Fleksibilitas Pembayaran Sebagian (Partial)
Bagaimana kalau user mencentang 2 tagihan (subtotal Rp 50.000), tapi uangnya cuma ada **Rp 40.000**?
- Input pembayaran bisa diedit menjadi Rp 40.000.
- Sistem otomatis mengalokasikan:
  - Nota A (Rp 30.000) $\rightarrow$ **LUNAS (30k/30k)**
  - Nota C (Rp 20.000) $\rightarrow$ **Terbayar 10k, Sisa Rp 10.000**
- Atau user bisa menyesuaikan angka alokasi per nota secara manual jika ingin dibagi rata.

### Langkah 3: Shortcut Cepat (Tanpa Ribet Milih)
Tetap disediakan tombol cepat:
- **[ Bayar Semua (Lunas Penuh) ]** $\rightarrow$ Otomatis mencentang semua nota.
- **[ Sesuai Pilihan ]** $\rightarrow$ Menjumlahkan yang dicentang saja.

---

## 3. Tampilan di Laci Riwayat Kontak (`Debts.tsx`)

Ketika kartu kontak diklik (di-expand), daftar riwayat menampilkan status sisa di setiap baris pokok:

```
RIWAYAT TRANSAKSI
Pokok Hutang: Rp 100.000 · Terbayar: Rp 50.000 · Sisa: Rp 50.000

[POKOK]  Makan siang · 10 Mei           Rp 30.000
         ↳ [LUNAS] Terbayar Rp 30.000 via BCA (15 Mei)

[POKOK]  Bensin · 12 Mei                Rp 50.000
         ↳ [BELUM DIBAYAR] Sisa Rp 50.000

[POKOK]  Pulsa · 14 Mei                 Rp 20.000
         ↳ [LUNAS] Terbayar Rp 20.000 via BCA (15 Mei)

---------------------------------------------------
[BAYAR]  Pelunasan: Makan siang, Pulsa  -Rp 50.000
         15 Mei 2026 · BCA
```

---

## 4. Kompatibilitas Data Lama (Tanpa Paksaan FIFO)

Pembayaran **lama** (sebelum fitur ini) tidak punya `debtAllocations`. Prinsipnya: **user diberi pilihan**, bukan dipaksa otomatis.

### 4.1 Status pembayaran lama = "Belum dialokasikan"
- Transaksi pembayaran lama ditandai badge: **[ BELUM DIALOKASIKAN ]**.
- Sisa per-nota dihitung dari alokasi **manual**; jika belum ada, sistem hanya menampilkan **"Pool Belum Terpetakan"** (bukan menebak).
- Contoh tampilan laci kontak:
  ```
  [POKOK]  Makan siang        Rp 30.000   →  ?
  [POKOK]  Bensin             Rp 50.000   →  ?
  [POKOK]  Pulsa              Rp 20.000   →  ?
  [BAYAR]  Rp 50.000 (15 Mei)  →  [ BELUM DIALOKASIKAN ]  (tap untuk atur)
  ```

### 4.2 Tombol "Alokasikan" (pilihan manual)
- User tap pembayaran lama → muncul pilihan:
  1. **Tandai nota yang dibayar** (centang note + isi nominal per note).
  2. **Bagi rata otomatis (FIFO)** — tombol cepat bila memang ingin.
  3. **Biarkan belum dialokasikan** (default; sisa tetap ditandai "Belum terpetakan").
- Setelah disimpan, transaksi lama mendapat `debtAllocations` dan badge berubah jadi **MANUAL**.

### 4.3 Ringkasan
- **Tidak ada pemaksaan FIFO.** FIFO hanyalah salah satu tombol pilihan.
- Angka per-nota akurat karena berasal dari alokasi yang **Anda tentukan** (atau belum ditentukan, tapi transparan).


---

## 5. Cek Kelayakan Terhadap Kode Riil (Review)

Plan ini **cocok** dengan arsitektur kode yang ada, dengan catatan:

1. **"Nota" = transaksi `debtRole: 'principal'` di dalam 1 dokumen hutang kontak.**
   Saat ini `addDebt` memang menggabungkan hutang kontak sama menjadi 1 `Debt`, **tetapi setiap penambahan tetap membuat 1 transaksi principal baru** (`_createTx(... debtRole:'principal')`). Jadi "Nota A/B/C" itu **sudah ada** sebagai `principalTxs` — tidak perlu stop auto-merge. Plan ini justru memanfaatkannya.

2. **CELAH PENTING — label nota masih generik.**
   Saat merge, note transaksi principal dibuat generik, mis. `"Pemberian pinjaman (Piutang) kepada Budi"` (tanpa "Makan siang"). Maka daftar nota tidak bisa dibedakan.
   → **Wajib:** note principal harus memuat deskripsi tagihan, mis. `"Pinjaman ke Budi: Makan siang"`. Ambil dari `newDebt.description`.

3. **Pembayaran saat ini 1 transaksi = 1 `relatedId`.**
   Untuk bayar banyak nota sekaligus, tetap **1 transaksi bank** tetapi membawa `debtAllocations[]` (lihat §1). Kalkulasi sisa per-nota membaca `debtAllocations`; pembayaran lama yang belum dialokasikan ditandai transparan dan bisa dialokasikan manual (§4).

---

## 6. Integrasi Split Bill → Status Lunas di Link Publik

> **Kebutuhan (dari user):** Saat piutang hasil Split Bill ditandai lunas, link `shared-split/<id>` yang dibuka teman-teman **ikut menunjukkan siapa yang sudah lunas**.

### 6.1 Masalah saat ini
- Split bill membuat piutang per orang (`handleSaveToDebts`/`performSplitSave`) tetapi **tidak menyimpan tautan** ke dokumen `shared_splits/{id}`.
- Halaman publik `SharedSplitBill.tsx` **tidak bisa membaca** data hutang pribadi pemilik (Firestore rules menolak lintas-user).
- Akibat: menandai lunas di modul Hutang **tidak** mengubah status di link publik.

### 6.2 Desain sinkronisasi
1. **Tambah tautan di Debt/principal tx:**
   ```ts
   sourceSplitId?: string;     // id dokumen shared_splits
   sourceSplitMember?: string; // nama anggota (contactName)
   ```
   Diisi ketika hutang/piutang dibuat dari Split Bill.

2. **Tulis status ke dokumen publik `shared_splits` milik pemilik:**
   Tambah field di `SharedSplit`:
   ```ts
   memberPayments?: Record<string, { paidAt: number; amount: number }>;
   ```
   Saat pemilik membayar piutang terkait split, client memanggil
   `dbUpdateSharedSplitPayment(splitId, memberName, amount)` (hanya `creatorId` yang boleh, sesuai rules).

3. **Halaman publik `SharedSplitBill` merender dari `memberPayments`:**
   - Budi: ✅ **LUNAS** (kalau ada di `memberPayments`)
   - Siti: ⏳ **Belum Bayar**

4. **`SharedBillsManagerModal` menampilkan progres:**
   - "Resto ABC · 1/2 orang lunas · Rp 50.000 / Rp 80.000 terkumpul".

### 6.3 Alur lengkap
```
Bayar piutang Budi (via DebtPaymentModal)
   → addDebtPayment(...) + debtAllocations
   → jika debt.sourceSplitId: dbUpdateSharedSplitPayment(sourceSplitId, Budi, amount)
   → Link publik & Shared Links Manager otomatis tampil "Budi: LUNAS"
```

> Catatan: hanya pemilik (`creatorId`) yang boleh update dokumen `shared_splits` (sudah sesuai rules).

---

## 7. Rencana File yang Diubah

1. **`src/contexts/MoneyContext.tsx`**:
   - `Transaction`: tambah `debtAllocations?: { principalTxId: string; amount: number }[]`.
   - `Debt`: tambah `sourceSplitId?: string`, `sourceSplitMember?: string`.
   - `addDebt`: (a) sertakan `description` di note principal, (b) teruskan `sourceSplitId`/`sourceSplitMember`.
   - `addDebtPayment`: terima `allocations?: DebtAllocation[]`; panggil sinkron `shared_splits` bila ada `sourceSplitId`.
2. **`src/lib/debtCalculations.ts`**:
   - `calculatePrincipalBalances(debt, transactions)`: hitung sisa per principal tx (pakai `debtAllocations`, fallback FIFO).
3. **`src/components/modals/DebtPaymentModal.tsx`**:
   - Checklist multi-select nota + subtotal otomatis + alokasi partial.
4. **`src/pages/Debts.tsx`**:
   - Badge `LUNAS` / `Sisa Rp X` di tiap baris principal pada laci riwayat.
5. **`src/lib/db.ts`**:
   - `dbUpdateSharedSplitPayment(splitId, memberName, amount)` + tambah field `memberPayments` di `SharedSplit`.
6. **`src/pages/SharedSplitBill.tsx`**:
   - Tampilkan badge lunas/belum per orang dari `memberPayments`.
7. **`src/components/modals/SharedBillsManagerModal.tsx`**:
   - Tampilkan progres pelunasan per link.
8. **`src/pages/ReceiptScanner.tsx` & `src/pages/SharedSplitBill.tsx`** (`handleSaveToDebts`/`performSplitSave`):
   - Kirim `sourceSplitId` + `sourceSplitMember` saat membuat hutang dari split.

---

## 8. Keputusan yang Dibutuhkan

1. **Alokasi default:** manual (pilih nota) — setuju? (Sesuai pilihan Anda: Opsi 2.)
2. **Pembayaran lama:** biarkan "belum dialokasikan" + tombol alokasikan manual (bukan paksa FIFO) — setuju?
3. **Split Bill sync:** tampilkan status lunas di link publik — setuju? (Jika ya, ada tambahan tulis ke dokumen publik.)
4. **Label nota** pada hutang lama: pakai `description` yang ada, atau kosongkan?

---

*Dokumen rencana. Tidak ada kode sumber yang diubah.*
