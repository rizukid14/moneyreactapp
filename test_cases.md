# Panduan Pengujian Manual (Test Cases)

Berikut adalah langkah-langkah praktis untuk menguji seluruh perbaikan *bug* (Fase 1 hingga Fase 3) yang telah diimplementasikan. Gunakan mode Desktop (Vercel Dev) dan mode Mobile (DevTools HP atau perangkat asli) untuk pengujian menyeluruh.

---

## Fase 1: Logika Inti & Manajemen State

### 1. Transaksi Orphan pada Penghapusan Aset (9.2)
- **Tujuan:** Memastikan transaksi yang terkait dengan aset ikut terhapus saat aset tersebut dihapus.
- **Langkah:**
  1. Ke halaman Aset, lalu buat Aset baru bernama "Test Aset".
  2. Buka halaman Utama, buat transaksi "Pengeluaran" atau "Pendapatan" menggunakan sumber dana "Test Aset".
  3. Cek total saldo dashboard dan daftar transaksi (Pastikan nilainya bertambah/berkurang).
  4. Kembali ke halaman Aset, dan Hapus "Test Aset".
  5. Cek kembali halaman Utama.
- **Ekspektasi:** Transaksi pengeluaran/pendapatan tadi hilang secara otomatis, dan total saldo Dashboard menyesuaikan dengan benar (kembali normal).

### 2. Stale Closure pada Pelunasan Hutang (9.3)
- **Tujuan:** Menghindari _stale state_ (membaca nilai usang) saat kalkulasi pelunasan.
- **Langkah:**
  1. Ke menu Hutang & Piutang, lalu tekan "Tambah Pinjaman".
  2. Buat hutang baru sebesar Rp 100.000.
  3. Klik "Bayar/Lunasi" pada hutang tersebut.
  4. Pada Modal pelunasan, lakukan perubahan jumlah (contoh: jadi Rp 50.000) lalu simpan.
- **Ekspektasi:** Aplikasi langsung memotong saldo (mencatat transaksi pelunasan sebesar Rp 50.000) dan progress bar hutang tersebut menjadi 50% tanpa *error* di konsole (dan datanya terbaru, tidak _stale_ membaca Rp 100.000 full).

### 3. Efisiensi Rerender MoneyContext (9.4)
- **Tujuan:** Memastikan tidak ada re-render berlebihan (membuat aplikasi lambat).
- **Langkah:**
  1. Bernavigasi dengan cepat di antara menu bawah (Dashboard -> Statistik -> Profile -> Settings).
  2. Tambahkan transaksi baru secara beruntun 3-4 kali.
- **Ekspektasi:** Aplikasi terasa responsif, modal terbuka tanpa ada *lag*/tertahan (*janky frame*), membuktikan refactoring dengan `useRef` di _Context_ berhasil.

---

## Fase 2: Perilaku UI & Interaksi

### 4. Interaksi Swipe yang Lengket (9.1)
- **Tujuan:** Item transaksi yang di-swipe akan otomatis menutup setelah *action*.
- **Langkah:**
  1. Pada halaman Transaksi, *swipe* salah satu riwayat ke Kiri (Hapus). Muncul dialog konfirmasi.
  2. Klik "Batal" (Tutup dialog konfirmasi).
  3. *Swipe* lagi ke Kanan (Edit) pada riwayat yang sama, lalu tekan tombol "Close" (silang) pada Modal edit yang muncul.
- **Ekspektasi:** Indikator merah/biru pada item yang digeser langsung menutup perlahan secara otomatis.

### 5. Native Window Confirm yang Kaku (9.8)
- **Tujuan:** Mengganti Popup browser native menjadi Modal UI aplikasi.
- **Langkah:**
  1. Pergi ke Pengaturan -> Manajemen Kategori.
  2. Buat kategori kustom baru.
  3. Tekan ikon tong sampah untuk menghapus kategori tersebut.
- **Ekspektasi:** Konfirmasi akan menggunakan Popup/Dialog bergaya Nordic (seirama dengan sistem desain), bukan peringatan pop-up kotak putih ala browser.

### 6. Scrolling Macet di Scanner Struk (9.10)
- **Tujuan:** Memastikan halaman edit struk bisa di-scroll di perangkat sentuh (HP).
- **Langkah:**
  1. (Wajib pakai mode *Mobile* / Emulasi Mobile di Browser Devtools).
  2. Klik ikon "+" lalu pilih "Scan Struk".
  3. Masukkan gambar dummy. Klik Lanjut ke area verifikasi tabel barang.
  4. Sentuh dan usap (*swipe/scroll*) layar ke atas dan bawah pada area teks input.
- **Ekspektasi:** Halaman Scanner bisa bebas di-scroll seperti layar biasa (tidak ada blokade *touch-none*).

### 7. Pull-to-Refresh di Layar Besar (9.9)
- **Tujuan:** Menghilangkan kemunculan spinner refresh saat scroll ke atas.
- **Langkah:**
  1. (Gunakan desktop/laptop dengan mouse).
  2. Buka Dashboard, *scroll* paksa / *drag* dengan mouse ke arah atas.
- **Ekspektasi:** Spinner *Pull-To-Refresh* tidak terpicu sembarangan saat *mouse scroll* mencapai bagian atas `div`.

---

## Fase 3: Visual & Aksesibilitas

### 8. Notifikasi Sukses Pindah Halaman/Abrupt Redirect (9.6)
- **Tujuan:** Membuat toast (notifikasi hijau) sempat terlihat sebelum navigasi.
- **Langkah:**
  1. Buka fitur AI Text Bulk Input (ikon menu -> Text).
  2. Tempelkan format tes, misalnya "Makan siang 50rb". Klik Parse, lalu klik "Simpan".
- **Ekspektasi:** Pop-up "1 transaksi berhasil disimpan" akan muncul di layar selama 0.6 detik sebelum layar akhirnya bersih/ter-reset (tidak instan reset saat tombol baru ditekan).

### 9. Label Waktu Transaksi yang Rapi (9.7)
- **Tujuan:** Menghilangkan label waktu dengan detik yang kepanjangan.
- **Langkah:**
  1. Lihat daftar transaksi di Dashboard.
  2. Cek label waktu pada masing-masing _item_ transaksi (biasanya di baris detail abu-abu).
- **Ekspektasi:** Tulisan waktu tampil rapi (misalnya **10:30 WIB**), bukan seperti **10:30:45 AM WIB**.

### 10. Animasi Modal Asset Berkedip (9.11)
- **Tujuan:** Menganimasikan transisi keluar masuk modal detail.
- **Langkah:**
  1. Pergi ke halaman Dompet / Rekening (Aset).
  2. Tekan salah satu dompet untuk melihat detail saldo/transaksi dompet tersebut (Drawer akan muncul dari bawah).
  3. Klik kembali area luar hitam atau "X" untuk menutupnya.
- **Ekspektasi:** *Drawer* akan muncul merosot (*slide down*) ke bawah secara *smooth* perlahan-lahan. Tidak lagi tiba-tiba lenyap (*flicker/pop*) tanpa jeda.

### 11. Mobile Layout Cutoff (9.12)
- **Tujuan:** Mencegah kontainer kepotong (navbar hilang).
- **Langkah:**
  1. Buka aplikasi pada Smartphone dengan Safari (iOS) atau Chrome (Android).
  2. Buka halaman Aset (atau halaman yang butuh *scroll* panjang), *scroll* perlahan ke atas/bawah.
- **Ekspektasi:** Navigasi bawah selalu tertambat di bagian bawah dan tidak pernah terpotong *toolbar* bawaan browser HP.

### 12. Tombol Save Ketutupan Keyboard (9.13)
- **Tujuan:** Visibilitas tombol pada iOS dengan _safe-area_.
- **Langkah:**
  1. (Eksklusif: Uji di perangkat iOS riil / Device Simulator, atau tes buka form yang memiliki input terbawah).
  2. Buka Modal "Tambah Transaksi" dan fokus/klik pada input paling bawah untuk memunculkan *virtual keyboard*.
  3. Gulir form hingga terlihat tombol "Simpan Perubahan".
- **Ekspektasi:** Tombol "Simpan" tetap aman terlihat berkat ada tambahan spasi bantalan (padding bawah) kompensasi untuk *home bar indicator / keyboard space*.

---
*(Selesaikan pengujian manual ini satu per satu sebelum melanjutkan ke pengembangan fitur baru!)*
