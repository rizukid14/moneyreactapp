# Panduan Sistem Desain (Berdasarkan Halaman Transactions)

Dokumen ini menjadi patokan (*benchmark*) utama untuk membangun atau memodifikasi komponen antarmuka (*UI*) lain dalam aplikasi agar seragam dengan estetika **Nordic Bento Box** yang digunakan pada halaman *Dashboard* (`Transactions.tsx`).

## 1. Tata Letak (Grid Layout)
Aplikasi ini menggunakan sistem grid 12-kolom khas majalah / Bento Box pada layar *desktop*, dan menumpuk satu kolom (*stack*) pada *mobile*.

- **Bungkus Utama Grid:** `<section className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">`
- **Kartu Besar (Utama):** `className="col-span-1 md:col-span-8"` (Untuk saldo utama)
- **Kartu Kecil (Sekunder):** `className="col-span-1 md:col-span-4"` (Untuk kartu penghasilan/pengeluaran)
- **Kartu Lebar Penuh:** `className="col-span-1 md:col-span-12"` (Untuk notifikasi atau Insight AI)

## 2. Gaya Kartu (Bento Box Cards)
Setiap panel informasi atau kotak wajib menggunakan struktur kelas berikut ini agar memiliki batas kelengkungan (*border radius*) dan bayangan melayang (*drop shadow*) yang seragam:

```tsx
<div className="bg-bg-card p-6 rounded-3xl shadow-bento flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-all">
  {/* Konten Anda di sini */}
</div>
```
*Aturan Emas:* **TIDAK ADA garis tepi (border) kaku** pada kartu utama, biarkan bayangan `shadow-bento` yang membentuk batas antar kartu.

## 3. Tipografi
- **Judul Kartu (Label):** Harus menggunakan huruf kapital (*uppercase*) dan berjarak lebar.
  `className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider"`
- **Angka Utama (Headline):** Cetak tebal dengan ukuran besar, menggunakan elipsis jika terlalu panjang.
  `className="text-2xl md:text-4xl font-bold text-on-surface truncate"`

## 4. Ornamen Visual (Glow & Icon Blocks)
Untuk membuat desain "hidup" dan tidak kaku, kartu-kartu metrik membutuhkan ornamen pastel berikut:

### A. Latar Belakang Cahaya (Blurred Blob)
Setiap kartu penting harus memiliki pendaran cahaya abstrak di salah satu sudutnya. Letakkan elemen ini sebagai *child* pertama di dalam wadah kartu yang memiliki atribut `relative overflow-hidden`:
```tsx
<div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
```
*(Ganti `bg-primary` dengan warna lain sesuai tema kartu, misalnya `bg-secondary` atau `bg-error`)*

### B. Kotak Ikon Besar
Ikon tidak boleh berdiri sendiri sebagai teks. Ikon harus dimasukkan ke dalam blok pastel bersudut bulat (*squircle*):
```tsx
<div className="w-12 h-12 rounded-2xl bg-income flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
  <MaterialIcon name="trending_up" className="text-primary-color text-2xl" />
</div>
```
**Warna Background Kotak Ikon Tersedia:**
- `bg-primary-container` (Tema Utama)
- `bg-secondary-container` (Tema Sekunder/Tabungan)
- `bg-income` (Pastel Sage Green untuk Pemasukan)
- `bg-expense` (Pastel Coral untuk Pengeluaran)

## 5. Daftar Item (List)
Berbeda dengan baris tabel yang dibatasi oleh garis (`divide-y`), item daftar (seperti transaksi atau daftar aset) di dalam *Bento* harus dibuat terpisah (mengambang) dan berubah warna saat di-hover:
```tsx
<div className="flex justify-between items-center bg-surface-container-lowest p-2 rounded-xl border border-outline-variant hover:bg-surface-container transition-colors">
  {/* Konten Item */}
</div>
```

---
*Gunakan panduan ini secara ketat setiap kali membangun layar atau modul baru (seperti halaman Hutang, Tabungan, atau Pengaturan).*
