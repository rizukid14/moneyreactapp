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
    version: 'v2.1.1', date: 'Jun 2026', badge: 'Terbaru',
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
