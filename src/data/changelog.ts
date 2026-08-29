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
    version: 'v2.3.3', date: 'Agu 2026', badge: 'Terbaru',
    entries: [
      { type: 'new', text: 'Multi-Select Filter Akun & Kategori Aset di Statistik: Analisis statistik kini mendukung filter multi-rekening yang fleksibel (bisa pilih kombinasi rekening apa saja atau per kategori seperti Semua Tabungan, Semua Bank, Semua E-Wallet) berbasis modal split-view.' },
      { type: 'improve', text: 'Personal AI Memory & Dynamic Category RAG: AI Scan Struk dan Bulk Parse kini mempelajari pola transaksi historis Anda langsung dari database lokal untuk memberikan rekomendasi kategori yang akurat dan dinamis sesuai kebiasaan personal Anda.' },
      { type: 'improve', text: 'Redesain Modal Kelola Kategori: Tampilan pengelola kategori kini selaras total dengan modal pilih kategori lengkap dengan tab pengeluaran/pendapatan, search bar, dan tata letak split-view interaktif.' },
      { type: 'fix', text: 'Anti Pull-Down Reload pada Mobile: Memblokir gesture tarik-ke-bawah (overscroll reload) browser yang tidak disengaja agar foto struk dan teks input mutasi tidak ter-reset saat di-scroll.' },
      { type: 'improve', text: 'Debt Engine 2.0 (Pembaruan Inti Hutang & Piutang): Penulisan ulang sistem kalkulasi hutang dengan akurasi tinggi, penanda peran transaksi (Pokok, Cicilan, Offset), dan pencegahan kehilangan data riwayat transaksi saat mengedit atau menghapus penambahan pokok hutang.' },
      { type: 'new', text: 'Modernisasi Tab Lunas: Tampilan catatan hutang/piutang yang telah selesai kini dilengkapi opsi Pengelompokan (Per Bulan, Per Kontak, atau Flat List), Pengurutan (Terbaru, Nominal Terbesar, Nama Kontak A-Z), serta Sub-filter cepat.' },
      { type: 'new', text: 'Pengaturan Potong Silang (Auto-Offset): Pilihan di Pengaturan untuk mengaktifkan potong silang otomatis per kontak atau secara manual melalui tombol konfirmasi.' },
      { type: 'fix', text: 'Penyelarasan Branding & Perbaikan UI: Memperbarui tampilan splash card ke Monetiq, menyelaraskan kartu ringkasan, dan memperbaiki layering menu dropdown agar tidak tertutup kartu.' }
    ]
  },
  {
    version: 'v2.3.2', date: 'Agu 2026',
    entries: [
      { type: 'improve', text: 'AI Financial Advisor & Survival Guide: MoneyBot kini lebih cerdas dan empatik dalam memberikan strategi penghematan saat uang menipis di pertengahan bulan, lengkap dengan kalkulasi batas belanja harian (Daily Spending Cap) dan audit pengeluaran.' },
      { type: 'improve', text: 'Keamanan Prompt Injection AI: Perlindungan menyeluruh pada MoneyBot, OCR Scanner, dan Bulk Input dari upaya manipulasi instruksi maupun injeksi data tidak sah.' },
      { type: 'fix', text: 'Perbaikan Tipe & Stabilitas Kode: Mengoptimalkan pemetaan kategori transaksi pada Bulk Input & Scanner serta membersihkan variabel yang tidak terpakai.' }
    ]
  },
  {
    version: 'v2.3.0', date: 'Jul 2026',
    entries: [
      { type: 'new', text: 'Toko Penukaran Poin (Rewards Store): Tukarkan poin streak login harian Anda langsung di dalam aplikasi untuk ditukar dengan token scan struk, sesi AI Chat, bulk input, atau akses Premium (1 hari hingga 1 bulan).' },
      { type: 'new', text: 'Login Streak Harian: Dapatkan poin reward setiap hari dengan melakukan login beruntun. Multiplier bonus akan meningkat setiap 3 hari berturut-turut.' },
      { type: 'new', text: 'Weekend Lucky Draw: Di hari Sabtu & Minggu, dapatkan peluang bonus multiplier poin login yang lebih besar (hingga 10x!). Pantau banner info weekend yang muncul setiap Jumat sore.' },
      { type: 'improve', text: 'Perbaikan Keandalan Profil: Memperbaiki bug sinkronisasi data profil pengguna agar pengaturan kustomisasi tersimpan dengan aman di database.' }
    ]
  },
  {
    version: 'v2.1.1', date: 'Jun 2026',
    entries: [
      { type: 'new', text: 'Tombol Tukar Aset: Kini Anda dapat menukar (swap) posisi Asset Asal dan Asset Tujuan dengan satu klik saat membuat transaksi Transfer.' },
      { type: 'fix', text: 'Pesan Error Scanner Lebih Jelas: Jika proses pindai struk gagal, aplikasi kini akan menampilkan alasan yang tepat (misalnya Kuota Habis) alih-alih pesan gagal yang membingungkan.' },
      { type: 'fix', text: 'Perbaikan Form Tambah Transaksi: Form kini dibersihkan dengan sempurna tanpa menyisakan nominal transaksi sebelumnya ketika Anda ingin mencatat transaksi baru.' },
      { type: 'fix', text: 'Notifikasi Lebih Rapi: Mengatasi masalah di mana notifikasi pengumuman yang sudah ditutup terkadang muncul kembali.' },
    ]
  },
  {
    version: 'v2.1.0', date: 'Jun 2026',
    entries: [
      { type: 'improve', text: 'Aplikasi Terasa Lebih Cepat: Kami telah memperhalus perpindahan antar halaman agar navigasi terasa instan dan bebas hambatan (ngelag).' },
      { type: 'improve', text: 'Pemuatan Data Super Kilat: Proses sinkronisasi kini berjalan hening di latar belakang sehingga Anda bisa langsung menggunakan aplikasi seketika tanpa layar tunggu (loading) yang lama.' },
      { type: 'new', text: 'Tautkan ke Google: Pengguna yang awalnya mendaftar menggunakan Email & Password biasa, kini dapat menghubungkan akunnya ke Google agar login lebih praktis.' },
      { type: 'improve', text: 'Daftar Kontak Terurut: Memilih kontak pada Split Bill & Hutang kini lebih mudah karena daftar otomatis terurut sesuai abjad.' },
      { type: 'fix', text: 'Peningkatan Stabilitas: Aktivitas catat-mencatat keuangan Anda kini berjalan lebih lancar tanpa kendala visual.' },
    ],
  },
  {
    version: 'v2.0.0', date: 'Jun 2026',
    entries: [
      { type: 'new', text: 'Desain UI Lebih Modern: Antarmuka aplikasi dirombak total dengan gaya Bento Grid yang lebih bersih, segar, dan profesional' },
      { type: 'improve', text: 'Smart Receipt Scanner: Pindai struk kini jauh lebih mudah dengan desain baru, panduan interaktif, dan dukungan tarik-dan-lepas (Drag & Drop)' },
      { type: 'new', text: 'Rekening Penerima Split Bill: Saat menalangi biaya, Anda kini bisa menentukan rekening khusus (seperti BCA/Mandiri) untuk menerima transfer pengganti dari teman' },
      { type: 'improve', text: 'Bento Grid Trip Detail: Halaman detail perjalanan kini jauh lebih estetik dengan informasi yang dikelompokkan secara visual untuk keterbacaan maksimal' },
      { type: 'improve', text: 'Penyempurnaan Statistik: Grafik dan ringkasan keuangan bulanan Anda kini hadir dalam balutan desain yang lebih interaktif dan mudah dipahami' }
    ],
  },
];
