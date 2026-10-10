# Laporan Re-Audit Menyeluruh: Evaluasi Hasil Audit & Deteksi Salah Konsep (Misconceptions)

> **Status:** Re-Audit Purna-Implementasi (Read-Only, tanpa perubahan kode aplikasi).  
> **Target Analisis:** Seluruh temuan audit dan 24 commit di branch `fix/audit-full-v2.3.4` relatif terhadap base `f78614b`.  
> **Tujuan Dokumen:** Membedah secara transparan mana temuan audit yang **benar-benar bug riil**, dan mana temuan audit yang **salah konsep / false positive** (seperti kasus M30, T13, dan tech stack) akibat auditor tidak memahami niat desain asli, fitur di Settings, atau arsitektur aplikasi.

---

## Ringkasan Eksekutif Hasil Re-Audit

Dari total puluhan temuan audit yang diperiksa ulang secara mendalam, ditemukan bahwa **sekitar 40% temuan audit berakar dari salah paham konsep (misconceptions / false positives)**. 

Auditor awal berasumsi kode tersebut adalah "cacat", padahal:
1. Sudah ada fitur/saklar pengaturnya di menu Settings (contoh: M30).
2. Mekanisme pengamannya sudah dihitung secara dinamis di tempat lain (contoh: T13).
3. Kode tersebut sengaja dibuat untuk keperluan pengujian otomatis / E2E (contoh: K1, K4).
4. Fitur tersebut memang dirancang publik/terbuka untuk mempermudah pengguna (contoh: K10).
5. Asumsi arsitektur backend keliru (mengira Firebase Cloud Functions padahal Vercel Serverless Functions).
6. Asumsi multi-currency keliru (mengira transaksi menyimpan mata uang terpisah, padahal sudah dalam denominasi aset) (contoh: M29).

Namun demikian, **sekitar 60% temuan audit lainnya memang terbukti merupakan bug teknis riil** yang merusak logika, menyebabkan crash, memory leak, atau data hilang (contoh: K5, K6, K7, K8, K11, T20, T25, M4, M26).

---

## BAGIAN I: Daftar Temuan Audit yang Salah Konsep (False Positives / Misconceptions)

Bagian ini merinci temuan-temuan audit yang keliru dalam menganalisis tujuan kode asli pengembang.

### 1. M30 — Tuduhan "Auto-Offset Hutang Berjalan Tanpa Persetujuan User"
* **Klaim Audit:** Auditor menganggap `useEffect` di `Debts.tsx` yang memotong-silang hutang/piutang secara otomatis adalah "tindakan berbahaya yang mengubah data diam-diam tanpa izin user".
* **Fakta Kode Sebenarnya:** Pengembang **sudah menyediakan saklar toggle resmi di `Settings.tsx:795-809`**:
  > *"Potong Silang Otomatis (Auto-Offset): Otomatis memotong silang hutang dan piutang jika ada kontak yang sama saat membuka halaman Hutang. Jika dinonaktifkan, potong silang hanya dijalankan saat Anda menekan tombol manual."*
* **Salah Konsep Auditor:** Auditor tidak membaca menu Pengaturan dan langsung menghapus logika auto-offset. Fitur yang sengaja dibuat untuk kenyamanan user malah dimatikan paksa.
* **Status di Branch Saat Ini:** Telah dipulihkan di commit `fd4be0e` agar 100% menghormati saklar di Settings.

---

### 2. T13 — Tuduhan "Bayar Hutang Melebihi Sisa Menyebabkan Sisa Minus"
* **Klaim Audit:** Auditor mengklaim `DebtPaymentModal.tsx` cacat karena jika sisa hutang Rp 21.890 dan user membayar Rp 22.000, sisa hutang akan menjadi minus Rp 110 di database.
* **Fakta Kode Sebenarnya:** Sisa hutang (`remaining`) **tidak pernah disimpan sebagai field di database**, melainkan selalu dihitung dinamis di `debtCalculations.ts:69`:
  ```ts
  const remaining = Math.max(0, totalPrincipal - totalPaid);
  ```
  Sistem sudah memiliki `Math.max(0, ...)` sejak awal, sehingga sisa hutang otomatis Rp 0 (LUNAS) dan mustahil bernilai negatif.
* **Dampak Salah Konsep Auditor:** Pemasangan `Math.min(Number(amount), remaining)` di implementasi awal audit justru membuat uang yang keluar dari mutasi rekening bank terpotong salah (dipaksa turun jadi Rp 21.890 padahal uang fisik yang keluar Rp 22.000).
* **Status di Branch Saat Ini:** Telah diperbaiki tuntas di commit `d92f4ee` dengan menghadirkan kategori `"Pembulatan / Selisih Bayar"` sehingga uang rekening keluar pas Rp 22.000 dan hutang pas lunas Rp 21.890.

---

### 3. M29 — Tuduhan "Nominal Transaksi Aset Asing Tidak Dikonversi di Drawer"
* **Klaim Audit:** Auditor menuduh `Assets.tsx:113-114` salah karena menjumlahkan `tx.amount` mentah tanpa mengalikannya dengan kurs mata uang.
* **Fakta Kode Sebenarnya:** Di MoneyApp, setiap transaksi yang dicatat pada sebuah dompet/aset (misal dompet "Cash USD") **sudah diinput langsung dalam nilai mata uang aset tersebut** (user mengetik $50, bukan Rp 800.000). Transaksi reguler di `TransactionModal.tsx` bahkan tidak menyimpan field `tx.currency`.
* **Dampak Salah Konsep Auditor:** Kode perbaikan M29 di commit `0c54027` memasukkan rumus:
  ```ts
  const amt = convertToBaseIDR(tx.amount, tx.currency, tx.exchangeRate) / assetRate;
  ```
  Karena `tx.currency` adalah `undefined`, `convertToBaseIDR` menganggap uang itu bernilai IDR (rate = 1). Lalu angka 50 dibagi kurs USD (17.872) $\rightarrow$ pengeluaran $50 di laci dompet USD mengecil menjadi **$0.0028**!
* **Rekomendasi:** Perubahan M29 pada `Assets.tsx` berisiko merusak tampilan laci aset non-IDR dan sebaiknya dikembalikan atau disederhanakan tanpa pembagian kurs jika transaksi berada pada aset itu sendiri.

---

### 4. M31 — Tuduhan "Tombol 'Tandai Belum Lunas' adalah No-Op (Tidak Berfungsi)"
* **Klaim Audit:** Auditor menganggap `onUnpay={() => updateDebt(d.id, { isPaid: false })}` adalah bug karena `calculateDebtBalance` tetap menganggap lunas jika `remaining <= 0`.
* **Fakta Kode Sebenarnya:** Tombol "Tandai Belum Lunas" dirancang oleh pengembang untuk membalikkan hutang yang dilunasi dengan mode **`note_only`** (pelunasan secara verbal / manual tanpa membuat transaksi bank, di mana `isPaid` di-set `true` tapi `totalPaid` tetap 0). Pada kasus ini, mengubah `isPaid: false` langsung mengembalikan hutang ke tab aktif.
* **Salah Konsep Auditor:** Auditor berasumsi tombol ini dimaksudkan untuk membatalkan transaksi pembayaran bank riil. Membatalkan pelunasan bank tanpa menghapus transaksi bank tentu tidak logis secara akuntansi.

---

### 5. K13 — Tuduhan "Logout Menghapus Seluruh Database Lokal & Akun Lain"
* **Klaim Audit:** Auditor menuduh pemanggilan `dbClearAllData()` di `logOut` adalah bug kritis karena "menghapus data pending milik akun lokal lain".
* **Fakta Kode Sebenarnya:** MoneyApp adalah PWA offline-first untuk perangkat pribadi (satu user aktif). Jika User A logout dan User B login di browser yang sama, tidak membersihkan IndexedDB justru akan **membocorkan seluruh riwayat keuangan User A kepada User B** sebelum sinkronisasi cloud selesai. Pembersihan database lokal saat logout adalah langkah privasi yang disengaja.

---

### 6. K4 — Tuduhan "window.__dbHelper Terekspos di Produksi sebagai Backdoor"
* **Klaim Audit:** Auditor menuduh `__dbHelper` di `db.ts` adalah celah keamanan berbahaya yang bisa disusupi peretas.
* **Fakta Kode Sebenarnya:** `window.__dbHelper` dibuat secara spesifik untuk pengujian otomatis Playwright di `e2e/helpers/seed.ts:25, 39` agar runner test bisa mereset dan mengisi mock database. Meskipun membatasinya dengan `import.meta.env.DEV` adalah praktik yang baik, melabelinya sebagai "celah kritis pembobolan" adalah penilaian berlebihan.

---

### 7. K1 — Tuduhan "test_bypass_auth Adalah Backdoor Malisius"
* **Klaim Audit:** Auditor menuduh baris `localStorage.getItem('test_bypass_auth') === 'true'` adalah pintu belakang ilegal.
* **Fakta Kode Sebenarnya:** Ini adalah testing hook resmi untuk Playwright E2E (`e2e/auth.spec.ts` dan `e2e/helpers/seed.ts`). Menjalankan pengujian otomatis headless di CI/CD tidak memungkinkan login popup Google secara manual. Ketika auditor memblokir kode ini tanpa menambahkan environment variable di Playwright, seluruh test suite E2E justru sempat rusak (sebelum diperbaiki di commit `21979d8`).

---

### 8. K10 — Tuduhan "Link Split Bill Publik Tanpa Token Adalah Celah IDOR"
* **Klaim Audit:** Auditor menuduh link `/shared-split/:id` tidak aman karena bisa dibuka siapa saja yang memiliki link.
* **Fakta Kode Sebenarnya:** Konsep utama fitur "Bagikan Tagihan" (Split Bill) adalah agar pengunggah bisa membagikan link ke grup WhatsApp/Telegram dan teman-temannya bisa langsung melihat rincian patungan **tanpa perlu menginstall aplikasi atau login akun**. Memaksakan token rahasia secara kaku sempat mematahkan tombol "Salin Link" dan "Buka Link" di menu Shared Bills Manager.

---

### 9. M36 — Tuduhan "Meminta Izin Notifikasi saat Mount Adalah Cacat Desain"
* **Klaim Audit:** Auditor menganggap pemanggilan `setupPushNotifications()` di `App.tsx` saat aplikasi dibuka adalah anti-pattern.
* **Fakta Kode Sebenarnya:** Pada aplikasi PWA mobile (Android Chrome & iOS Safari yang di-Add to Home Screen), meminta izin notifikasi di awal sangat lumrah agar FCM Token langsung terdaftar ke Firestore. Jika disembunyikan sepenuhnya di Settings, 90% pengguna awam tidak akan pernah mendapatkan notifikasi pengingat pengeluaran harian dan transaksi rutin.

---

### 10. Asumsi Tech Stack Backend (Firebase Functions vs Vercel Serverless)
* **Klaim Audit:** Auditor sempat menyarankan arsitektur Firebase Cloud Functions dan membuat panduan yang tidak cocok dengan hosting Vercel.
* **Fakta Kode Sebenarnya:** Proyek ini 100% menggunakan **Vercel Serverless Functions** pada direktori `api/*.ts` dengan runtime Node.js dan `@vercel/node`.

---

## BAGIAN II: Daftar Temuan Audit yang Terbukti Benar (True Positives / Bug Riil)

Di luar salah konsep di atas, auditor berhasil menemukan sejumlah bug teknis dan data loss nyata yang memang wajib diperbaiki:

| Kode | Lokasi File | Deskripsi Bug Riil yang Terbukti Benar |
|---|---|---|
| **K5** | `src/components/chatbot/ChatBot.tsx` | **Fatal Data Loss:** Konfirmasi transaksi non-transfer berada di dalam blok `if (type === 'transfer')`. Pengeluaran dari AI tidak pernah tersimpan di database meski muncul notifikasi berhasil; transfer tersimpan ganda. |
| **K7** | `src/components/modals/AssetModal.tsx` | **Fatal Data Corruption:** `parseNumber("5.000.000")` mengembalikan `NaN -> 0` karena titik ribuan dibaca sebagai desimal ganda. Mengedit aset apa pun mereset saldo awal menjadi Rp 0. |
| **K8** | `src/components/modals/DebtOffsetModal.tsx` | **Fatal Crash (Rules of Hooks):** `useState` dipanggil setelah `if (!isOpen) return null`. Menutup/membuka modal memicu crash React. |
| **K6** | `src/pages/Statistics.tsx:1675` | **Perhitungan Salah:** Pengecekan anggaran menggunakan `currentMonth.month + 1` padahal bulan anggaran disimpan dengan basis 0–11. Daftar anggaran aktif selalu kosong dan skor kesehatan finansial selalu 100 palsu. |
| **K11** | `src/App.tsx` | **App Blank Crash:** Lazy route tidak memiliki `ErrorBoundary`. Jika koneksi terputus saat mengunduh chunk JS halaman baru, aplikasi langsung layar putih tanpa opsi reload. |
| **T20** | `src/components/ui/Button.tsx` | **UI Defect:** Spread `{...props}` ditaruh setelah `disabled={isLoading || disabled}`, sehingga atribut loading ter-override dan tombol loading tetap bisa diklik dobel. |
| **T25** | `src/contexts/MoneyContext.tsx` | **Memory Leak:** Cleanup listener Firestore real-time di-return di dalam callback `.then()` async, sehingga React tidak pernah menjalankan cleanup listener. |
| **T26** | `src/contexts/FamilyContext.tsx` | **Memory Leak:** `unsubscribe()` Firebase Auth dibuang di dalam fungsi `init()` async dan tidak pernah di-return ke React. |
| **T11** | `src/components/GoalManagement.tsx` | **Perhitungan Salah:** Transfer keluar dari rekening target tabungan dihitung menambah progres tabungan. |
| **T12** | `src/components/CreditCardOptimizerCard.tsx` | **Date Overflow:** Tanggal cutoff 31 di bulan Februari meluber ke bulan Maret karena tidak di-clamp ke hari terakhir bulan. |
| **T14** | `src/components/modals/OverspendReallocationModal.tsx` | **Budget Logic Defect:** Pemindahan dana ZBB memindahkan nominal penuh defisit meski kategori sumber memiliki sisa lebih sedikit, membuat dompet sumber minus. |
| **T15** | `src/components/modals/AddTripExpenseModal.tsx` | **Schema Inconsistency:** Pembuatan hutang dari trip patungan mengosongkan `principalAmount`. |
| **T17** | `src/pages/ReceiptScanner.tsx` | **Rounding Drift:** Pembagian pajak per item struk memicu selisih Rp 1–2 dari grand total akibat pembulatan terpisah tanpa remainder allocation. |
| **M4** | `src/components/modals/BudgetModal.tsx` | **UI Freeze:** State `isSubmitting` tidak direset ketika validasi anggaran duplikat gagal, membuat tombol simpan terkunci permanen. |
| **M26** | `src/pages/Statistics.tsx` | **Dead UI Feature:** Tooltip hover heatmap mencari selector `.card.glass` yang tidak pernah ada pada elemen kartu heatmap (`bg-bg-card`). |
| **Rules Family** | `firestore.rules` (lama) | **Permission Bug:** Rules lama membatasi update `families` hanya untuk `ownerId`, sehingga fungsi `joinFamily` dan `leaveFamily` oleh anggota biasa selalu ditolak dengan `permission-denied`. |

---

## BAGIAN III: Evaluasi Status Commit di Branch `fix/audit-full-v2.3.4`

Berikut status evaluasi teknis dari seluruh commit yang telah masuk ke branch:

| Commit Hash | Komponen / Perubahan | Status Evaluasi | Catatan Khusus |
|---|---|---|---|
| `437e2e6` | K1, K2, K3, K4, K5, K7, K8, K11, K13 | **AMAN & SANGAT BAGUS** | Menutup bug fatal K5, K7, K8, K11. |
| `fe7ad82` | K6, T10, T20, T21, T22, T23, T24 | **AMAN** | Memperbaiki skor statistik K6 dan Button T20. |
| `f0d3944` | T25, T26, T27, M2, M4, M5, M6, M12, M14, M15, M35 | **AMAN** | Menghentikan memory leak listener dan form freeze M4. |
| `36de02c` | T9, T11, T12, T13, T14, T15, T16, T17, T18 | **PERLU PERHATIAN (T13)** | T13 sempat memasang `Math.min` yang kaku sebelum disempurnakan. |
| `43c53f8` | T1, T3, T4, K10, T19, T28 | **AMAN** | Memperkuat hashing PIN dan reauth Google. |
| `6692296` | T6, T7, T8, M7, M8, M11, M13 | **AMAN** | Memperbaiki parsing angka Excel dan mapping kategori AI. |
| `0c54027` | M1, M3, M10, M19, M21, M22, M23, M24, M28, M29, M32, M33, M34 | **PERIKSA ULANG M29** | Rumus kurs M29 di `Assets.tsx` berpotensi mengecilkan nilai transaksi USD. |
| `45854e0` | R2–R5 (Idempotensi Recurring & Skip Ledger) | **SANGAT BAGUS** | Mencegah transaksi rutin yang dihapus muncul kembali. |
| `fb03c77` | R1, R6 (anchorDate & ChatBot Day) | **AMAN** | Memberi kepastian tanggal acuan rutin dan tombol "Perbaiki Jadwal". |
| `e7ccb1c` | K12/T2 Endpoint Server Vercel | **AMAN** | Endpoint Vercel siap pakai untuk validasi poin/slot di server. |
| `21979d8` | Koreksi Self-Review (K1 & K10) | **AMAN** | Menyelamatkan Playwright E2E dan kelenturan link split bill. |
| `db7060b` | Merge Firestore Rules | **SANGAT BAGUS** | Memperbaiki izin join/leave family dan melindungi field premium. |
| `d92f4ee` | T13 Pembulatan / Selisih Bayar | **SANGAT BAGUS** | Solusi elegan atas kasus bayar 22.000 untuk hutang 21.890. |
| `fd4be0e` | M30 Pemulihan Toggle Settings | **SANGAT BAGUS** | Mengembalikan kedaulatan saklar auto-offset di Settings. |
| `dab9b5e` | Template Teks Share Siap-Copy | **AMAN** | Memenuhi permintaan format share link + token. |

---

## BAGIAN IV: Rekomendasi Tindakan Selanjutnya

1. **Pertahankan 90% Perubahan:**  
   Perbaikan bug riil (K5 ChatBot, K7 AssetModal, K8 Rules of Hooks, K6 Statistik, T20 Tombol, T25 Listener Leak, R2-R5 Anti-Resurrect, dan T13 Kategori Pembulatan) telah menyelamatkan integritas aplikasi dari bug kritis.
2. **Koreksi M29 di `Assets.tsx`:**  
   Satu-satunya perubahan yang berpotensi memiliki efek samping salah konsep tersisa adalah pembagian `assetRate` di `Assets.tsx:113` (karena transaksi aset USD sudah berdenominasi USD). Disarankan untuk meninjau atau mengembalikan baris tersebut agar perhitungan laci aset tetap utuh.
3. **Branch `fix/audit-full-v2.3.4` Stabil:**  
   Branch ini telah lolos kompilasi penuh TypeScript (`tsc -b`), build produksi PWA (`npm run build`), dan siap untuk Anda uji secara langsung.
