---
trigger: always_on
---

## ⛔ ATURAN MUTLAK: WAJIB KONFIRMASI SEBELUM EDIT (ZERO TOLERANCE)

1. **DILARANG KERAS MEMODIFIKASI FILE APAPUN** (menggunakan tool `replace_file_content`, `multi_replace_file_content`, `write_to_file`) TANPA persetujuan eksplisit dari user di chat sebelumnya.
2. **ALUR WAJIB UNTUK SEMUA PERBAIKAN / EDIT KODE**:
   - Langkah 1: Analisis masalah dan jelaskan secara singkat di chat:
     - Apa akar masalahnya.
     - File dan baris apa yang akan diubah.
     - Ringkasan kode yang akan diubah.
   - Langkah 2: Tanyakan konfirmasi persetujuan ke user.
   - Langkah 3: **SEGERA BERHENTI (STOP)**. Jangan panggil tool edit apapun. Tunggu sampai user membalas "Ya / Lanjut / OK" di chat.
   - Langkah 4: HANYA setelah ada izin eksplisit dari user, eksekusi pengeditan file.
3. **ATURAN ARTIFACT**:
   - Untuk perubahan arsitektur/logika inti yang masif: Buat dokumen `implementation_plan.md`.
   - Untuk bug fix, frontend, styling, tweak kecil/menengah: **JANGAN buat `implementation_plan.md`**, cukup jelaskan ringkas di chat sesuai Langkah 1 di atas.