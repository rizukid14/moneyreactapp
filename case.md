## 9. Bug Hunt Report (Broken Connectors & CRUD Issues)

### 9.1 Card Swipe Gesture Sticky/Disappearance Bug (Critical UI)
* **Temuan:** Ketika melakukan swipe ke kiri (untuk hapus) atau ke kanan (untuk edit) pada list item transaksi (`TransactionItem.tsx`), aset (`Assets.tsx`), atau hutang-piutang (`Debts.tsx`), item akan tergeser keluar layar (`x: '-100%'` / `100%`) dan memudar (`opacity: 0`). 
* **Masalah:** Jika dialog konfirmasi penghapusan dibatalkan (klik "Batal" di `ConfirmDialog`), atau jika modal edit ditutup, posisi kartu **tidak pernah di-reset** kembali ke tengah (`x: 0`, `opacity: 1`). Kartu tersebut tetap hilang/tidak terlihat secara permanen di UI sampai halaman di-refresh.
* **Penyebab:** Hook `useSwipeGesture` mengontrol animasi internal menggunakan Framer Motion `controls` tapi tidak mengekspos fungsi `reset` atau mendengarkan perubahan status modal/dialog untuk melakukan animasi balik.

### 9.2 Broken Envelope Budget spending & transactions (Critical Feature)
* **Temuan:** Pada halaman Anggaran Bulanan (`Budgets.tsx`), progress bar pengeluaran amplop/anggaran selalu menampilkan **0% terpakai**, dan rincian transaksi amplop saat diklik selalu bertuliskan **"Tidak ada transaksi untuk kategori ini"**, meskipun ada banyak transaksi pengeluaran terdaftar.
* **Penyebab 1 (spendingMap):** Di `Budgets.tsx` baris 93, pencarian kategori transaksi menggunakan `categoryNameMap.get(tx.categoryId.toLowerCase())`. Namun, `tx.categoryId` menyimpan **ID Kategori** (UUID/string acak), sedangkan kunci di `categoryNameMap` adalah **Nama Kategori** (seperti `'makanan'`). Akibatnya, lookup selalu mengembalikan `undefined` dan perhitungan nominal belanja bernilai 0.
* **Penyebab 2 (selectedBudgetTransactions):** Di `Budgets.tsx` baris 115, pencarian transaksi menyaring berdasarkan `tx.categoryId === cat.name`. Ini salah karena membandingkan ID Kategori (string ID) secara langsung dengan Nama Kategori (string nama).

### 9.3 Transaksi Biaya Admin Terlantar / Yatim Piatu (Data Integrity)
* **Temuan:** Saat transaksi bertipe "Transfer" yang memiliki biaya admin dihapus atau diubah tipenya menjadi non-transfer (seperti pengeluaran biasa) di `TransactionModal.tsx`, transaksi biaya admin terkait (`relatedId`) tertinggal di basis data dan tidak ikut terhapus atau dibersihkan.
* **Penyebab:** Fungsi `deleteTransaction` di `MoneyContext.tsx` hanya melakukan sinkronisasi penghapusan pada modul Trip dan Hutang/Piutang, tetapi tidak menghapus transaksi biaya admin yang memiliki `relatedId === tx.id`.

### 9.4 Stale Closure pada Perhitungan Sisa Saldo Pelunasan Hutang (Data Integrity)
* **Temuan:** Aksi pelunasan hutang (`settleDebt` di `MoneyContext.tsx`) menghasilkan nilai saldo sisa (`remaining`) dan nominal pelunasan yang salah / tidak sinkron jika dipanggil berturut-turut setelah pencatatan pembayaran baru.
* **Penyebab:** Dependency array dari `settleDebt` (`useCallback`) hanya berisi `[debts]`. Di dalamnya, callback ini menyaring dan memproses list `transactions` untuk menghitung sisa saldo. Karena `transactions` tidak dimasukkan ke dalam dependency array, callback ini menggunakan nilai `transactions` yang usang (stale closure) dari render sebelumnya.

### 9.5 static `_paidInstallmentKeys` Memblokir Pembayaran Ulang / Multi-User (Logic Bug)
* **Temuan:** Kunci pencegah double-submit cicilan/pelunasan disimpan di variabel global statis di luar komponen `const _paidInstallmentKeys = new Set<string>()` di `MoneyContext.tsx`.
* **Masalah:** Jika pengguna menghapus transaksi cicilan yang baru dibuat, mereka **tidak akan pernah bisa** membayar cicilan itu lagi selama tab browser belum vdirefresh karena kunci tersebut tersangkut permanen di dalam `Set`. Masalah ini juga berdampak pada kebocoran data kunci jika pengguna melakukan log out dan log in menggunakan akun yang berbeda pada sesi browser yang sama.

### 9.6 Validasi Kontradiktif di Excel Mapping Modal (UI/UX Bug)
* **Temuan:** Di `ExcelMappingModal.tsx` baris 97, teks informasi panduan menyatakan bahwa pengguna tidak wajib memetakan kolom "Tipe" karena aplikasi akan otomatis mengatur nilai bawaan ke "Pengeluaran".
* **Masalah:** Namun, kode validasi tombol konfirmasi di baris 46 menuliskan `if (!mapping.dateCol || !mapping.typeCol || !mapping.amountCol) { showToast(...); return; }`. Ini memaksa pengguna untuk memetakan kolom "Tipe", sehingga jika file Excel mereka tidak memiliki kolom Tipe, proses impor akan tertahan selamanya.

### 9.7 Kegagalan Impor Mutasi Bank/CSV Tanpa Kolom Tipe (Broken Feature)
* **Temuan:** Impor bank statement BCA/Mandiri (melalui `excelImport.ts`) selalu membuang seluruh baris data dan menghasilkan error baris tidak valid.
* **Penyebab:** Pada file `excelImport.ts`, baris 184 melarang pemrosesan baris jika tipe bukan `'pengeluaran' | 'pendapatan' | 'transfer'`. Logika default dan deteksi mutasi bank (seperti mengubah minus ke pengeluaran dan plus ke pendapatan) baru didefinisikan di baris 212. Akibatnya, baris bank statement yang kolom Tipenya kosong selalu tereliminasi di validasi baris 184 sebelum sempat dianalisis tipenya.

### 9.8 Bypass ConfirmDialog di Categories Page (UI/UX Inconsistency)
* **Temuan:** Halaman `Categories.tsx` baris 97 masih memanggil fungsi bawaan peramban `window.confirm` ketika pengguna menghapus kategori atau subkategori, alih-alih menggunakan komponen UI custom `ConfirmDialog` yang premium dan terintegrasi di seluruh aplikasi.
 ### 9.9 Konflik Gesture Scroll pada PullToRefresh (Scrollable Area Bug)
* **Temuan:** Fitur pull-to-refresh pada peranti sentuh terpicu secara tidak sengaja di hampir setiap gesture scroll ke atas, membuat navigasi list transaksi sangat terganggu dan tidak nyaman.
* **Penyebab:** Pada file [PullToRefresh.tsx](file:///c:/Vibe/moneyreactapp/src/components/ui/PullToRefresh.tsx#L35), sistem mendeteksi tarikan refresh jika posisi scroll berada di atas (`scrollPos === 0`). Namun, di [index.css](file:///c:/Vibe/moneyreactapp/src/index.css#L252), kontainer utama `.app-container` menggunakan tinggi tetap `height: 100dvh` dengan `overflow-y: auto`. Ini menyebabkan scrolling halaman terjadi di dalam elemen `.app-container` tersebut, sehingga `window.scrollY` atau `documentElement.scrollTop` akan selalu bernilai `0`. Akibatnya, gesture pull-to-refresh akan selalu aktif saat pengguna mengusap layar ke bawah, meskipun posisi list sebenarnya sedang di tengah atau bawah.

### 9.10 Receipt Crop Mobile View Scroll Lock (Overflow/Scroll Bug)
* **Temuan:** Saat mengunggah struk belanja beresolusi tinggi atau berukuran memanjang vertikal di halaman Pindai Struk, pengguna peranti bergerak (mobile) tidak dapat melakukan scroll ke bawah untuk memotong bagian bawah gambar atau menekan tombol konfirmasi/batal.
* **Penyebab:** Di [ReceiptScanner.tsx](file:///c:/Vibe/moneyreactapp/src/pages/ReceiptScanner.tsx#L837), pembungkus kanvas crop menggunakan kelas Tailwind `touch-none`. Kelas ini mematikan seluruh gesture sentuh standar peramban. Ketika gambar struk yang panjang meluap melebihi tinggi layar (overflow), pengguna tidak dapat menggulir halaman karena interaksi sentuh pada kanvas tersebut dikunci sepenuhnya.

### 9.11 Kesalahan Penulisan Kelas Tailwind Glow (Theme Compilation Bug)
* **Temuan:** Efek bayangan berpendar (glow shadow) dan latar belakang transparan berpendar yang seharusnya memperindah UI tidak tampil sama sekali di layar.
* **Penyebab:** File [AuthScreen.tsx](file:///c:/Vibe/moneyreactapp/src/components/AuthScreen.tsx#L66) menggunakan kelas Tailwind `bg-primary-glow/10`, `shadow-primary-glow/40`, dan `shadow-primary-glow/30`, sementara [QuotaBanner.tsx](file:///c:/Vibe/moneyreactapp/src/components/QuotaBanner.tsx#L90) menggunakan `bg-primary-glow`. Kelas-kelas ini tidak dapat dikompilasi karena warna `primary-glow` (dan varian glow lainnya) tidak didaftarkan di dalam objek warna `colors` pada [tailwind.config.js](file:///c:/Vibe/moneyreactapp/tailwind.config.js).

### 9.12 Ketidaksinambungan Sinkronisasi Tema Mode Gelap/Terang (Theme Sync Inconsistency)
* **Temuan:** Terdapat ketidakpastian sinkronisasi tema gelap/terang pada level sistem DOM.
* **Penyebab:** Aplikasi menyinkronkan tema pada dua tempat berbeda dengan cara yang tidak seragam:
  - Di [MoneyContext.tsx](file:///c:/Vibe/moneyreactapp/src/contexts/MoneyContext.tsx#L810), tema ditulis sebagai atribut `data-theme` pada elemen `html` (`document.documentElement`).
  - Di [App.tsx](file:///c:/Vibe/moneyreactapp/src/App.tsx#L29), tema ditulis sebagai kelas `.dark` pada elemen `body` (`document.body`).
  Karena Tailwind diatur dengan `darkMode: "class"`, pemisahan ini memicu masalah jika kelas `.dark` dicari di tingkat root `html`. Selain itu, variabel warna tema gelap di [index.css](file:///c:/Vibe/moneyreactapp/src/index.css#L142) terikat pada kelas `.dark`, sehingga jika root `html` tidak memiliki kelas tersebut, CSS variables yang diakses langsung dari tingkat root akan mengacu pada nilai bawaan tema terang (light theme values).

### 9.13 Desain Token Bypass & Hardcoded Colors pada ChatBot (Theme Inconsistency)
* **Temuan:** Komponen asisten AI chatbot menampilkan warna teks dan latar belakang tombol yang tidak konsisten dan tidak kontras saat pengguna berpindah ke mode gelap.
* **Penyebab:** Pada file [ChatBot.tsx](file:///c:/Vibe/moneyreactapp/src/components/chatbot/ChatBot.tsx#L1401), terdapat penggunaan gaya inline (inline styles) yang sangat mendominasi dan secara eksplisit mem-bypass variabel CSS global dengan warna heksadesimal mentah (hardcoded). Contohnya adalah penggunaan `color: '#ef4444'` untuk teks error di baris 1401, serta warna latar belakang `#10b981` dan `rgba(16, 185, 129, 0.1)` di baris 1556-1558 dan 1632-1634 untuk penanda eksekusi transaksi, alih-alih menggunakan token sistem `var(--danger)` dan `var(--success)`.
 