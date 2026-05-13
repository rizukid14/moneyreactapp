export interface ChangelogItem {
  type: 'new' | 'fix' | 'improve';
  text: string;
}

export interface ChangelogVersion {
  version: string;
  date: string;
  badge?: string;
  entries: ChangelogItem[];
}

export const changelogTypeMeta = {
  new: { label: 'BARU', color: 'var(--primary)', bg: 'hsla(215,85%,58%,0.12)' },
  fix: { label: 'FIX', color: 'var(--danger)', bg: 'hsla(350,80%,58%,0.1)' },
  improve: { label: 'IMPROVE', color: '#d97706', bg: 'hsla(35,90%,52%,0.1)' },
};

export const changelogData: ChangelogVersion[] = [
  {
    version: 'v1.0.17', date: 'Mei 2026', badge: 'Terbaru',
    entries: [
      { type: 'new', text: 'Ekosistem Holiday Trip Premium: Perombakan total UI input pengeluaran trip dengan nominal premium, scroll pembayar horizontal, dan integrasi aset riil (langsung potong saldo rek)' },
      { type: 'improve', text: 'OCR Trip Full-Edit: Kemampuan mengedit nama item, harga, menambah atau menghapus item hasil scan struk secara manual pada modal trip' },
      { type: 'new', text: 'Smart Settle-Up Trip: Fitur pelunasan bagi biaya dengan dukungan tombol "Buka Link" (Open in App) dan identifikasi visual warna rekening' },
      { type: 'improve', text: 'Grouped Settings Menu: Penataan ulang menu pengaturan ke dalam kategori logis (Akun, Keuangan, Sosial, Sistem) untuk navigasi yang lebih efisien' },
      { type: 'improve', text: 'Chatbot Knowledge Injection: Pembaharuan basis pengetahuan AI Chatbot agar lebih cerdas dalam menjelaskan fitur-fitur terbaru aplikasi' },
    ],
  },
  {
    version: 'v1.0.16', date: 'Mei 2026',
    entries: [
      { type: 'new', text: 'Manajemen Kategori Fleksibel: Kemampuan untuk mengubah (Edit) nama Kategori dan Sub-kategori secara inline secara langsung, lengkap dengan pembaharuan nama otomatis pada seluruh riwayat transaksi terkait' },
      { type: 'improve', text: 'Legend Kategori Responsif: Desain scrollable kustom pada grafik donat yang mencegah tumpukan tulisan saat subkategori terlalu banyak' },
      { type: 'new', text: 'Financial Member Pass Card: Tampilan baru halaman Profil berbentuk kartu keanggotaan digital premium dengan gamifikasi tier level kekayaan riil, statistik saldo aktif, dan hitungan transaksi bulanan' },
      { type: 'new', text: 'Heatmap Centering & Smooth Scroll: Deteksi otomatis bulan berjalan pada heatmap aktivitas harian agar selalu fokus tepat di tengah layar secara langsung' },
      { type: 'improve', text: 'Penyelarasan Tema Piutang: Tab, tombol "+ Tambah Sekarang", rincian piutang, dan modal masukan "Piutang Saya" kini sepenuhnya selaras berwarna hijau sukses' },
    ],
  },
  {
    version: 'v1.0.15', date: 'Mei 2026',
    entries: [
      { type: 'new', text: 'Asisten AI Finansial Pintar: Fitur interaksi ChatBot cerdas terintegrasi langsung untuk membantu memantau riwayat pengeluaran & memberikan analisis mutasi bulanan' },
      { type: 'improve', text: 'Pencadangan Instan Cloud: Tombol sinkronisasi manual untuk memaksa pencadangan data ke penyimpanan cloud dalam satu ketukan' },
    ],
  },
  {
    version: 'v1.0.14', date: 'Mei 2026',
    entries: [
      { type: 'new', text: 'Split Bill (OCR): Bagi tagihan belanja ke banyak orang sekaligus langsung dari hasil scan struk' },
      { type: 'new', text: 'Penggabungan Hutang Otomatis: Tambah piutang/hutang ke kontak yang sama kini otomatis digabung (Tips: Kosongkan aset jika ingin pembayaran tercatat sebagai Pengeluaran)' },
      { type: 'improve', text: 'Auto-Collapse Transaksi: Daftar transaksi hanya membuka hari ini agar tampilan lebih rapi' },
      { type: 'fix', text: 'Kalkulasi saldo sisa piutang yang salah saat penambahan nominal dengan catatan kustom' },
    ],
  },
  {
    version: 'v1.0.13', date: 'Mei 2026',
    entries: [
      { type: 'new', text: 'Sistem Potong Silang (Offset) otomatis untuk Hutang & Piutang dari kontak yang sama' },
      { type: 'new', text: 'Support tipe transaksi "Transfer" pada fitur Input Sekaligus & OCR Mutasi' },
      { type: 'new', text: 'Input Biaya Admin pada mode Bulk/OCR dengan pemisahan transaksi pengeluaran otomatis' },
      { type: 'new', text: 'Statistik perbandingan pertumbuhan (growth) pendapatan & pengeluaran dari bulan lalu' },
      { type: 'improve', text: 'Penyempurnaan parsing AI untuk mendeteksi rekening asal/tujuan pada transfer' },
      { type: 'fix', text: 'Reference error pada halaman statistik saat menghitung perbandingan bulan' },
    ],
  },
  {
    version: 'v1.0.12', date: 'Mei 2026',
    entries: [
      { type: 'new', text: 'Kalkulator Matematika Instan: Modul kalkulator mini terintegrasi langsung pada modal masukan nominal transaksi' },
      { type: 'improve', text: 'Pemisah Ribuan Real-time: Masukan angka nominal kini otomatis terformat dengan titik ribuan secara langsung saat mengetik' },
    ],
  },
  {
    version: 'v1.0.11', date: 'Mei 2026',
    entries: [
      { type: 'new', text: 'Pintasan Tanggal Cepat: Tombol cepat (Kemarin, Hari Ini) di modal transaksi untuk mempercepat pencatatan pengeluaran harian' },
      { type: 'improve', text: 'Auto-Focus Input: Mengetik nominal atau catatan kini otomatis memindahkan kursor tanpa ketukan tambahan' },
    ],
  },
  {
    version: 'v1.0.10', date: 'Apr 2025',
    entries: [
      { type: 'new', text: 'Pencarian Transaksi Lanjutan: Fitur filter pencarian (Advanced Search) transaksi berdasarkan teks catatan, kategori, dan rentang jumlah saldo' },
      { type: 'improve', text: 'Scroll-Performance: Optimasi virtual list scroll pada riwayat ribuan transaksi agar tidak patah-patah' },
    ],
  },
  {
    version: 'v1.0.9', date: 'Apr 2025',
    entries: [
      { type: 'new', text: 'Widget Ringkasan Finansial: Penambahan panel pintasan statistik cepat di bagian dashboard utama' },
      { type: 'improve', text: 'Liquid Fill Loading: Efek ombak air mengalir premium saat memuat grafik perkembangan tabungan' },
    ],
  },
  {
    version: 'v1.0.8', date: 'Apr 2025',
    entries: [
      { type: 'new', text: 'Gacha tier system: 9 tingkatan kekayaan (Bronze → Sultan 👑)' },
      { type: 'new', text: 'Liquid wave fill animation pada kartu aset carousel' },
      { type: 'new', text: 'Pesan motivasi berputar (3 per tier) setiap 4 detik' },
      { type: 'new', text: 'Progress "berapa lagi ke tier berikutnya" langsung di kartu' },
      { type: 'new', text: 'OCR Struk: pajak & service charge didistribusikan proporsional ke setiap item' },
      { type: 'new', text: 'Toast notification system — tidak ada lagi dialog browser bawaan' },
      { type: 'improve', text: 'Warna section pada modal Hutang/Piutang lebih distinct (filled + border)' },
      { type: 'improve', text: 'Summary card Hutang/Piutang: fill lebih pekat, tanpa border' },
      { type: 'fix', text: 'Build error: field tier.name → tier.rank setelah refactor gacha' },
    ],
  },
  {
    version: 'v1.0.7', date: 'Mar 2025',
    entries: [
      { type: 'new', text: 'Asset carousel swipeable dengan konfigurasi kartu di Settings' },
      { type: 'new', text: 'Hidden Assets accordion — aset tersembunyi tidak hilang dari neraca' },
      { type: 'new', text: 'OCR Struk via OpenAI GPT-4o-mini dengan auto-kategori & aset' },
      { type: 'new', text: 'Modul Hutang & Piutang dengan cicilan, jatuh tempo, dan riwayat' },
      { type: 'improve', text: 'Subcategory tersedia di BulkInput, DebtModal, dan ReceiptScanner' },
      { type: 'fix', text: 'Default aset tidak tersimpan dengan benar di beberapa modul input' },
    ],
  },
  {
    version: 'v1.0.6', date: 'Feb 2025',
    entries: [
      { type: 'new', text: 'Scan mutasi bank (bulk import via foto/PDF)' },
      { type: 'new', text: 'Recurring transactions — transaksi berulang otomatis' },
      { type: 'new', text: 'PIN lock untuk keamanan aplikasi' },
      { type: 'improve', text: 'Dark mode dengan CSS variable full-coverage' },
    ],
  },
  {
    version: 'v1.0.5', date: 'Jan 2025',
    entries: [
      { type: 'new', text: 'Modul Anggaran Belanja (Budgeting): Set batas pengeluaran bulanan per kategori dengan indikator bar persentase' },
      { type: 'improve', text: 'Alert Overbudget: Peringatan visual instan jika pencatatan transaksi melebihi anggaran yang dibuat' },
    ],
  },
  {
    version: 'v1.0.4', date: 'Des 2024',
    entries: [
      { type: 'new', text: 'Ekspor Data CSV: Kemampuan mengunduh laporan bulanan mutasi langsung dalam berkas lembar sebar excel/CSV' },
      { type: 'improve', text: 'Filter Rentang Tanggal: Filter riwayat mutasi berdasarkan hari, pekan, bulan berjalan, atau custom range' },
    ],
  },
  {
    version: 'v1.0.3', date: 'Nov 2024',
    entries: [
      { type: 'new', text: 'Backup Otomatis Terenkripsi: Data disimpan dengan enkripsi sandi lokal ke IndexedDB browser' },
      { type: 'improve', text: 'Pemuatan Gambar Cepat: Dukungan optimasi cache pada file foto profil & avatar kontak' },
    ],
  },
  {
    version: 'v1.0.2', date: 'Okt 2024',
    entries: [
      { type: 'new', text: 'Dukungan Multi-Akun Aset: Menambahkan kemampuan mencatat saldo di berbagai dompet (Tunai, Bank, Dompet Digital)' },
      { type: 'improve', text: 'Kalkulasi Gabungan Otomatis: Jumlah total bersih saldo seluruh akun dikalkulasi real-time secara instan' },
    ],
  },
  {
    version: 'v1.0.1', date: 'Sep 2024',
    entries: [
      { type: 'new', text: 'Rilis Perdana MoneyApp: Peluncuran dasar aplikasi pencatatan keuangan pribadi dengan modul mutasi keluar masuk dasar, kategori statis, dan tema gelap otomatis' },
    ],
  },
];
