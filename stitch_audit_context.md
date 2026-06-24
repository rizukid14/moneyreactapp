# MoneyApp — Audit Desain Stitch (Context Lengkap)

**Tanggal Audit**: 29 Mei 2026  
**Stitch Project ID**: `5403096536917961430`  
**Design System**: Precision Financial Identity (`assets/beed2d4c55e349ee9c6b14324961427a`)  
**Workspace**: `c:\Users\user.test\OneDrive\Documents\Naufal\Pribadi\code\moneyreactapp`

---

## Design System — Precision Financial Identity

| Property | Value |
| :--- | :--- |
| Font | Outfit (Google Fonts) |
| Warna Primer | `#3b82f6` (Biru) |
| Background | `#f9f9ff` (Putih keunguan) |
| Border Radius | Halus / rounded (16–18px) |
| Bahasa | Indonesia (Bahasa Indonesia) |

---

## Daftar Halaman Aplikasi (Routes di App.tsx)

| No | File | Route | Deskripsi |
| :--- | :--- | :--- | :--- |
| 1 | `src/pages/Transactions.tsx` | `/` (index) | Dashboard utama transaksi harian |
| 2 | `src/pages/Statistics.tsx` | `/stats` | Grafik & statistik keuangan |
| 3 | `src/pages/ReceiptScanner.tsx` | `/scan` | OCR struk & mutasi (crop, hasil, edit) |
| 4 | `src/pages/BulkInput.tsx` | `/bulk-input` | Input transaksi massal via teks/voice |
| 5 | `src/pages/Assets.tsx` | `/assets` | Manajemen rekening & aset keuangan |
| 6 | `src/pages/Debts.tsx` | `/debts` | Daftar hutang & piutang |
| 7 | `src/pages/Settings.tsx` | `/settings` | Pengaturan, kategori, ZBB, target tabungan |
| 8 | `src/pages/Trips.tsx` | `/trips` | Daftar perjalanan & patungan |
| 9 | `src/pages/TripDetail.tsx` | `/trips/:id` | Detail perjalanan (anggota, belanja, settle) |
| 10 | `src/pages/SharedSplitBill.tsx` | `/shared-split/:id` | Halaman publik split bill (non-login) |

---

## Daftar Komponen Utama Lainnya

| No | File | Deskripsi |
| :--- | :--- | :--- |
| 1 | `src/components/LockScreen.tsx` | Layar kunci PIN keamanan |
| 2 | `src/components/AuthScreen.tsx` | Halaman login & register |
| 3 | `src/components/BudgetManagement.tsx` | Manajemen amplop anggaran ZBB (dipakai di Settings) |
| 4 | `src/components/GoalManagement.tsx` | Manajemen target tabungan (dipakai di Settings) |
| 5 | `src/components/OnboardingTutorial.tsx` | Tutorial panduan pengguna baru |
| 6 | `src/components/chatbot/ChatBot.tsx` | Panel chatbot AI MoneyBot |
| 7 | `src/components/AssetSummaryCarousel.tsx` | Karousel ringkasan aset |

---

## Daftar Modal (26 file di `src/components/modals/`)

| No | File | Deskripsi |
| :--- | :--- | :--- |
| 1 | `TransactionModal.tsx` | Form tambah/edit transaksi |
| 2 | `SplitBillModal.tsx` | Form split bill / patungan |
| 3 | `AssetModal.tsx` | Form tambah/edit aset rekening |
| 4 | `AssetSelectModal.tsx` | Pilih rekening aset |
| 5 | `CategoryModal.tsx` | Form tambah/edit kategori |
| 6 | `CategorySelectModal.tsx` | Pilih kategori (split panel) |
| 7 | `ContactModal.tsx` | Form tambah/edit kontak |
| 8 | `ContactSelectModal.tsx` | Pilih kontak (multi-select) |
| 9 | `DebtModal.tsx` | Form tambah/edit hutang/piutang |
| 10 | `DebtPaymentModal.tsx` | Form bayar cicilan hutang |
| 11 | `DebtAddPrincipalModal.tsx` | Form tambah pokok pinjaman |
| 12 | `DebtOffsetModal.tsx` | Dialog potong hutang-piutang timbal balik |
| 13 | `GoalModal.tsx` | Form tambah/edit target tabungan |
| 14 | `GoalSelectModal.tsx` | Pilih target tabungan |
| 15 | `BudgetModal.tsx` | Form tambah/edit amplop anggaran ZBB |
| 16 | `CalculatorModal.tsx` | Kalkulator input nominal |
| 17 | `DatePickerModal.tsx` | Pemilih tanggal kustom |
| 18 | `CreateTripModal.tsx` | Form buat/edit trip perjalanan |
| 19 | `AddTripExpenseModal.tsx` | Form tambah belanja di trip |
| 20 | `SettleUpModal.tsx` | Penyelesaian saldo patungan |
| 21 | `SettlementExplanationModal.tsx` | Penjelasan alur settlement |
| 22 | `SharedBillsManagerModal.tsx` | Kelola link shared split |
| 23 | `SharedExpenseDetailModal.tsx` | Detail rincian biaya bersama |
| 24 | `OverspendReallocationModal.tsx` | Realokasi anggaran lebih ZBB |
| 25 | `StatDetailModal.tsx` | Detail statistik per kategori |
| 26 | `WhatsNewModal.tsx` | Modal what's new / changelog |

---

## Screen yang SUDAH ADA di Stitch (32 screen)

### Halaman Utama

| Screen | Title di Stitch | Screen ID |
| :--- | :--- | :--- |
| Dashboard Transaksi | Dashboard Transaksi MoneyApp | `480dffdc6c374fc6a2e0ff1af075b66d` |
| Statistik Keuangan | Statistik Keuangan MoneyApp | `2cea04d0080e4286a3e4961c2eb1687d` |
| Amplop Anggaran (ZBB) | Halaman Amplop Anggaran MoneyApp | `0d1604a3e82b4699ad2709ebdd18f958` |
| Manajemen Aset | Manajemen Aset & Hutang MoneyApp | `85359fc22a12425793cc461900182986` |
| Pengaturan | Pengaturan MoneyApp | `0f03c55f734041cbb0ad64aaf117fdbc` |
| Patungan & Perjalanan | Patungan & Perjalanan MoneyApp | `b8321310560b4922acad7777865a98cc` |

### Bulk Input & OCR

| Screen | Title di Stitch | Screen ID |
| :--- | :--- | :--- |
| Bulk Input - Tahap Teks | Halaman Bulk Input - Tahap Teks | `e8a30a5d9d0045bf88129be50b0bd172` |
| Bulk Input - Tahap Hasil | Halaman Bulk Input - Tahap Hasil | `0193db81b6f34df2a2faebd9c2d92909` |
| Bulk Input (Alternatif) | Halaman Input Sekaligus MoneyApp | `6845cdc2124544bcb99f1d99703cae8a` |
| Pindai - Tahap Crop | Halaman Pindai - Tahap Crop MoneyApp | `8c08b923cb9840298a364ef533b5c203` |
| Pindai - Hasil Struk | Halaman Pindai - Hasil Struk MoneyApp | `64bf11fe99304ce1befe607ca0ab5d0f` |
| Edit Hasil OCR | Halaman Edit Hasil OCR Struk & Mutasi | `f0bdf1d085c0496f9ebd2b1ecac9bb3e` |

### Security & Onboarding

| Screen | Title di Stitch | Screen ID |
| :--- | :--- | :--- |
| Layar Kunci PIN | Layar Kunci PIN MoneyApp | `9621fc71c3b1420f81ce61ab22745a23` |
| Login & Register | Halaman Login & Register MoneyApp | `09350a6824ad47a1a67f34947ec63fcf` |
| Onboarding Step 1 | Panduan Pengguna Baru - Langkah 1 | `44faae88e850455ab82078d81df6b902` |

### Modals & Overlays

| Screen | Title di Stitch | Screen ID |
| :--- | :--- | :--- |
| Modal Input Transaksi | Modal Input Transaksi MoneyApp | `f8d30d9faf5c4adfad9ab6c67e50c6ac` |
| Modal Split Bill (v1) | Modal Split Bill - Patungan MoneyApp | `c7c346102e4a4ecb942e51e808efee91` |
| Modal Split Bill (v2) | Modal Split Bill / Patungan MoneyApp | `acb1e535f11a4b84beaa1e85f262daa9` |
| Modal Edit Aset | Modal Edit Aset MoneyApp | `e753817f70574966a63113799e20c352` |
| Modal Tambah Rekening Aset | Modal Tambah Rekening Aset MoneyApp | `693603bc98a0480989f8136e78b47e05` |
| Modal Tambah/Edit Hutang (v1) | Modal Tambah Hutang Piutang MoneyApp | `7adceb23cd5c4bc380a35523469d01e6` |
| Modal Tambah/Edit Hutang (v2) | Modal Tambah/Edit Hutang Piutang MoneyApp | `6fd2ac7bd05b46cabd96dde63f35ea57` |
| Modal Tambah Kategori | Modal Tambah Kategori MoneyApp | `4253fe3301fd4b30abf3cc280b40402c` |
| Modal Tambah/Edit Kategori | Modal Tambah/Edit Kategori MoneyApp | `fa50411f767d4a60b5a1d68cd555c4e2` |
| Modal Pilih Kategori (v1) | Modal Pilih Kategori MoneyApp | `73f7a6b1e792469db303e861d4cae226` |
| Modal Pilih Kategori (v2) | Modal Pilih Kategori MoneyApp | `27e73f89f71a4b2f94fdae2d892a3a04` |
| Modal Pilih Rekening (v1) | Modal Pilih Rekening MoneyApp Overlay | `010cce6f277d4120a3f964fecd070678` |
| Modal Pilih Rekening (v2) | Modal Pilih Rekening MoneyApp | `19633bbd76dd4053b29f17eb98640b19` |
| Modal Pilih Kontak | Modal Pilih Kontak MoneyApp | `7c5bcdbd708c4a72a1f486900e4ba438` |
| Modal Pilih Target Tabungan | Modal Pilih Target Tabungan MoneyApp | `1de1d7395fa1410fb5080775490d49b7` |
| Modal Settle Up | Modal Settle Up MoneyApp Overlay | `00a73bf52a88479c8d58493324f6187b` |
| Modal Shared Bills Manager | Modal Pengelola Link Shared MoneyApp | `dff6a2d615fb4ce388c34d3e20b51b69` |
| Modal Realokasi Anggaran ZBB | Modal Realokasi Anggaran Lebih ZBB | `b057ac77467741e69d5a5b159e149f42` |

### ChatBot & AI

| Screen | Title di Stitch | Screen ID |
| :--- | :--- | :--- |
| Panel ChatBot Terbuka | Panel ChatBot Terbuka MoneyApp | `faeba2d9235f466fabd45c261c9ffd3d` |
| Draft Transaksi AI | Detail Kartu Draft Transaksi AI Overlay | `376aaf5ae26e417ca4bcc18b6b6acaee` |

### Gambar Aset (Non-UI)

| Screen | Title di Stitch | Screen ID |
| :--- | :--- | :--- |
| Foto Struk Belanja | (grocery receipt generated image) | `2978383323344d07ab42b38ddcadc892` |
| Foto Struk Restoran | (restaurant receipt generated image) | `a08cd1f4711c48a8b1c8d9aef4fde2e9` |

---

## Screen yang BELUM ADA di Stitch

### A. Halaman Utama (3 halaman — PRIORITAS TINGGI)

| No | Halaman | File Sumber | Deskripsi |
| :--- | :--- | :--- | :--- |
| 1 | **Halaman Hutang & Piutang** | `src/pages/Debts.tsx` | Daftar hutang/piutang per kontak, tab filter (Aktif, Hutang, Piutang, Lunas), kartu total sisa hutang/piutang, badge status (JATUH TEMPO, SEGERA, LUNAS), progress bar cicilan, tombol offset otomatis, dan tombol aksi cepat (Bayar, Tambah Pokok, Edit, Hapus). |
| 2 | **Halaman Detail Perjalanan** | `src/pages/TripDetail.tsx` | Detail trip: daftar anggota grup, list pengeluaran trip (belanja, tiket, dll), saldo masing-masing anggota, tombol Settle Up & Share Link. |
| 3 | **Halaman Publik Shared Split** | `src/pages/SharedSplitBill.tsx` | View publik non-login via URL `/shared-split/:id`. Menampilkan rincian patungan kelompok, daftar anggota, breakdown biaya, dan prosedur settlement. |

### B. Modals Pendukung (10 modal — PRIORITAS SEDANG)

| No | Modal | File Sumber | Deskripsi |
| :--- | :--- | :--- | :--- |
| 1 | **CreateTripModal** | `src/components/modals/CreateTripModal.tsx` | Form buat/edit trip (nama destinasi, tanggal mulai/selesai, tag chip anggota, tombol tambah dari kontak). |
| 2 | **BudgetModal** | `src/components/modals/BudgetModal.tsx` | Form tambah/edit amplop anggaran ZBB (pilih kategori, input limit nominal dengan kalkulator). |
| 3 | **GoalModal** | `src/components/modals/GoalModal.tsx` | Form tambah/edit target tabungan (nama tujuan, target nominal, target tanggal, ikon). |
| 4 | **ContactModal** | `src/components/modals/ContactModal.tsx` | Form cepat tambah/edit kontak (Nama, Nomor Telepon, Catatan). |
| 5 | **DebtPaymentModal** | `src/components/modals/DebtPaymentModal.tsx` | Form input pembayaran cicilan atau pelunasan hutang/piutang. |
| 6 | **DebtAddPrincipalModal** | `src/components/modals/DebtAddPrincipalModal.tsx` | Form tambah nominal pokok pinjaman berjalan. |
| 7 | **DebtOffsetModal** | `src/components/modals/DebtOffsetModal.tsx` | Dialog konfirmasi potong hutang-piutang timbal balik dari kontak yang sama. |
| 8 | **AddTripExpenseModal** | `src/components/modals/AddTripExpenseModal.tsx` | Form tambah item belanja/transaksi baru di dalam detail trip (paling besar: 34KB). |
| 9 | **SharedExpenseDetailModal** | `src/components/modals/SharedExpenseDetailModal.tsx` | Pop-up rincian pembagian biaya pengeluaran tertentu di trip. |
| 10 | **SettlementExplanationModal** | `src/components/modals/SettlementExplanationModal.tsx` | Penjelasan alur settlement (siapa bayar siapa, minimalisasi transfer). |

### C. Modal Minor / Utilitas (tidak wajib didesain)

| No | Modal | File Sumber | Alasan Skip |
| :--- | :--- | :--- | :--- |
| 1 | `CalculatorModal.tsx` | Kalkulator numerik | Komponen utilitas kecil, bukan layar utama |
| 2 | `DatePickerModal.tsx` | Pemilih tanggal | Komponen utilitas kecil |
| 3 | `StatDetailModal.tsx` | Detail statistik | Pop-up kecil di halaman statistik |
| 4 | `WhatsNewModal.tsx` | Changelog versi | Pop-up informasional, bukan fitur inti |
| 5 | `ConfirmDialog` (common) | Dialog konfirmasi yes/no | Utilitas generik |

---

## Ringkasan Status

| Kategori | Sudah di Stitch | Belum di Stitch | Total |
| :--- | :---: | :---: | :---: |
| Halaman Utama (Routes) | 7 | **3** | 10 |
| Modal Utama & Overlay | 15 (termasuk varian duplikat) | **10** | 25+ |
| Komponen Non-Modal (ChatBot, Lock, Auth, Onboarding) | 4 | 0 | 4 |
| Gambar Aset | 2 | 0 | 2 |
| **TOTAL SCREENS DI STITCH** | **32** | **13** | **45** |

> [!IMPORTANT]
> **3 halaman utama** (Debts, TripDetail, SharedSplitBill) adalah prioritas tertinggi karena merupakan route independen yang bisa diakses pengguna langsung. **10 modal pendukung** bersifat prioritas sedang karena muncul sebagai overlay di atas halaman yang sudah ada.

---

## Catatan Teknis

- Beberapa screen di Stitch memiliki **varian duplikat** (v1/v2) untuk modal yang sama (Kategori, Rekening, Hutang, Split Bill). Ini adalah iterasi desain yang normal.
- `BudgetManagement.tsx` dan `GoalManagement.tsx` bukan halaman terpisah — mereka di-render sebagai bagian dari halaman **Settings.tsx**.
- Halaman `SharedSplitBill` bisa diakses tanpa login (route publik), jadi desainnya harus standalone dan modern.
- `AddTripExpenseModal.tsx` adalah modal terbesar (34KB) dengan banyak field: nominal, kategori, pembagian per anggota, metode split (equal/custom/per-item).
