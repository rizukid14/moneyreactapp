# Goal: AI Smart Input Terintegrasi di Halaman Utama

Mengubah komponen "Input Sekaligus" yang awalnya hanya sebagai "pintu masuk" menjadi area interaktif (*Smart AI Input*) langsung di halaman utama.

## Proposed Changes

### `src/pages/Transactions.tsx`
- Mengubah `textarea` agar tidak lagi `readOnly`. Pengguna bisa langsung mengetik banyak transaksi di halaman utama.
- Menambahkan fungsionalitas **Voice Input (Dikte)** langsung di halaman utama. Kita akan menambahkan tombol mikrofon di pojok atau di samping kotak teks.
- Menambahkan shortcut **Kamera (Pindai Struk)**. Tombol ini akan otomatis membawa pengguna ke halaman `/scan` (Receipt Scanner).
- Ketika pengguna menekan tombol "Buka AI Parser Cerdas", teks yang sudah diketik/didiktekan akan dikirimkan ke halaman `/bulk-input` sebagai parameter awal.

### `src/pages/BulkInput.tsx`
- Menangkap parameter teks bawaan dari halaman utama (melalui *React Router state*).
- Jika teks bawaan ini ada, halaman `/bulk-input` akan otomatis berjalan dan langsung melakukan analisis menggunakan AI tanpa harus menunggu pengguna mengeklik "Mulai Analisa" lagi.

## User Review Required
> [!NOTE]
> 1. Apakah Anda setuju dengan pendekatan ini (tombol Mic langsung mendikte ke dalam kotak teks di halaman utama, dan tombol Kamera memindahkan ke halaman scanner)?
> 2. Ketika "Buka AI Parser Cerdas" diklik, apakah sebaiknya halaman utama langsung otomatis mengirimkannya dan membuka hasil AI-nya, atau Anda lebih suka hasil AI-nya langsung diproses di halaman utama tanpa harus pindah halaman sama sekali? (Saya menyarankan pindah ke `/bulk-input` karena halaman hasil parser itu panjang dan memiliki *editor* interaktif, sehingga layar utama tidak menjadi penuh/berantakan).
