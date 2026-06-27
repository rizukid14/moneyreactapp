# 💰 MoneyApp


> **A premium, full-featured personal finance manager** — built with React, TypeScript, Firebase, and a focus on beautiful mobile UX.

![Version](https://img.shields.io/badge/version-1.0.15-blue)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20TypeScript%20%7C%20Firebase-informational)
![Deployment](https://img.shields.io/badge/deploy-Vercel-black)
![PWA](https://img.shields.io/badge/PWA-ready-brightgreen)

---

## 📖 Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [Changelog](#changelog)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)

---

## Overview

MoneyApp is a Progressive Web App (PWA) for personal finance management. It supports multi-account tracking, AI-powered receipt scanning, budgeting, debt tracking, and automated push notifications — all with a premium dark-mode glassmorphism UI designed for mobile-first use.

---

## Live Demo

> Deploy to Vercel. See [Getting Started](#getting-started) for setup instructions.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | React 19 + TypeScript |
| Routing | React Router v7 |
| State | React Context + useReducer/useState |
| Local DB | IndexedDB (via `idb`) |
| Cloud Sync | Firebase Firestore |
| Auth | Firebase Auth (Google Sign-in) |
| Push Notifications | Firebase Cloud Messaging (FCM) + VAPID |
| Cron Jobs | Vercel Serverless Functions |
| OCR Backend | OpenAI GPT-4o-mini |
| AI Input | OpenAI GPT-4o-mini (Bulk Parse) |
| Charts | Recharts |
| Icons | Lucide React |
| Excel | SheetJS (xlsx) |
| Deploy | Vercel |
| CSS | Vanilla CSS (design tokens, dark/light) |

---

## Changelog (Old History)

### v1.0.18 — Mei 2026
- **[BARU]** Sistem Zero-Based Budgeting (ZBB): Ekosistem alokasi anggaran ketat berbasis Envelope System dengan penguncian pendapatan bulanan
- **[BARU]** Strict ZBB Mode: Mekanisme pencegatan/intersepsi transaksi pintar yang menahan pengeluaran jika melebihi batas kategori dan meminta proses realokasi dana seketika
- **[IMPROVE]** ZBB Scanner Integration: Fitur scan struk (Receipt Scanner) dan Import Teks Mutasi kini mendukung penuh validasi ZBB Strict Mode secara berkelompok (batch)
- **[IMPROVE]** AI Chatbot ZBB Knowledge: Chatbot kini memahami cara kerja fitur Zero-Based Budgeting (ZBB) dan aturan Strict Mode aplikasi

---

### v1.0.17 — Mei 2026
- **[BARU]** Ekosistem Holiday Trip Premium: Perombakan total UI input pengeluaran trip dengan nominal premium, scroll pembayar horizontal, dan integrasi aset riil (langsung potong saldo rek)
- **[IMPROVE]** OCR Trip Full-Edit: Kemampuan mengedit nama item, harga, menambah atau menghapus item hasil scan struk secara manual pada modal trip
- **[BARU]** Smart Settle-Up Trip: Fitur pelunasan bagi biaya dengan dukungan tombol "Buka Link" (Open in App) dan identifikasi visual warna rekening
- **[IMPROVE]** Grouped Settings Menu: Penataan ulang menu pengaturan ke dalam kategori logis (Akun, Keuangan, Sosial, Sistem) untuk navigasi yang lebih efisien
- **[IMPROVE]** Chatbot Knowledge Injection: Pembaharuan basis pengetahuan AI Chatbot agar lebih cerdas dalam menjelaskan fitur-fitur terbaru aplikasi

---

### v1.0.16 — Mei 2026
- **[BARU]** Manajemen Kategori Fleksibel: Kemampuan untuk mengubah (Edit) nama Kategori dan Sub-kategori secara inline secara langsung, lengkap dengan pembaharuan nama otomatis pada seluruh riwayat transaksi terkait
- **[IMPROVE]** Legend Kategori Responsif: Desain scrollable kustom pada grafik donat yang mencegah tumpukan tulisan saat subkategori terlalu banyak
- **[BARU]** Financial Member Pass Card: Tampilan baru halaman Profil berbentuk kartu keanggotaan digital premium dengan gamifikasi tier level kekayaan riil, statistik saldo aktif, dan hitungan transaksi bulanan
- **[BARU]** Heatmap Centering & Smooth Scroll: Deteksi otomatis bulan berjalan pada heatmap aktivitas harian agar selalu fokus tepat di tengah layar secara langsung
- **[IMPROVE]** Penyelarasan Tema Piutang: Tab, tombol "+ Tambah Sekarang", rincian piutang, dan modal masukan "Piutang Saya" kini sepenuhnya selaras berwarna hijau sukses

---

### v1.0.15 — Mei 2026
- **[BARU]** Asisten AI Finansial Pintar: Fitur interaksi ChatBot cerdas terintegrasi langsung untuk membantu memantau riwayat pengeluaran & memberikan analisis mutasi bulanan
- **[IMPROVE]** Pencadangan Instan Cloud: Tombol sinkronisasi manual untuk memaksa pencadangan data ke penyimpanan cloud dalam satu ketukan

---

### v1.0.14 — Mei 2026
- **[BARU]** Split Bill (OCR): Bagi tagihan belanja ke banyak orang sekaligus langsung dari hasil scan struk
- **[BARU]** Penggabungan Hutang Otomatis: Tambah piutang/hutang ke kontak yang sama kini otomatis digabung (Tips: Kosongkan aset jika ingin pembayaran tercatat sebagai Pengeluaran)
- **[IMPROVE]** Auto-Collapse Transaksi: Daftar transaksi hanya membuka hari ini agar tampilan lebih rapi
- **[FIX]** Kalkulasi saldo sisa piutang yang salah saat penambahan nominal dengan catatan kustom

---

### v1.0.13 — Mei 2026
- **[BARU]** Sistem Potong Silang (Offset) otomatis untuk Hutang & Piutang dari kontak yang sama
- **[BARU]** Support tipe transaksi "Transfer" pada fitur Input Sekaligus & OCR Mutasi
- **[BARU]** Input Biaya Admin pada mode Bulk/OCR dengan pemisahan transaksi pengeluaran otomatis
- **[BARU]** Statistik perbandingan pertumbuhan (growth) pendapatan & pengeluaran dari bulan lalu
- **[IMPROVE]** Penyempurnaan parsing AI untuk mendeteksi rekening asal/tujuan pada transfer
- **[FIX]** Reference error pada halaman statistik saat menghitung perbandingan bulan

---

### v1.0.12 — Mei 2026
- **[BARU]** Kalkulator Matematika Instan: Modul kalkulator mini terintegrasi langsung pada modal masukan nominal transaksi
- **[IMPROVE]** Pemisah Ribuan Real-time: Masukan angka nominal kini otomatis terformat dengan titik ribuan secara langsung saat mengetik

---

### v1.0.11 — Mei 2026
- **[BARU]** Pintasan Tanggal Cepat: Tombol cepat (Kemarin, Hari Ini) di modal transaksi untuk mempercepat pencatatan pengeluaran harian
- **[IMPROVE]** Auto-Focus Input: Mengetik nominal atau catatan kini otomatis memindahkan kursor tanpa ketukan tambahan

---

### v1.0.10 — Apr 2025
- **[BARU]** Pencarian Transaksi Lanjutan: Fitur filter pencarian (Advanced Search) transaksi berdasarkan teks catatan, kategori, dan rentang jumlah saldo
- **[IMPROVE]** Scroll-Performance: Optimasi virtual list scroll pada riwayat ribuan transaksi agar tidak patah-patah

---

### v1.0.9 — Apr 2025
- **[BARU]** Widget Ringkasan Finansial: Penambahan panel pintasan statistik cepat di bagian dashboard utama
- **[IMPROVE]** Liquid Fill Loading: Efek ombak air mengalir premium saat memuat grafik perkembangan tabungan

---

### v1.0.8 — Apr 2025
- **[BARU]** Gacha tier system: 9 tingkatan kekayaan (Bronze → Sultan 👑)
- **[BARU]** Liquid wave fill animation pada kartu aset carousel
- **[BARU]** Pesan motivasi berputar (3 per tier) setiap 4 detik
- **[BARU]** Progress "berapa lagi ke tier berikutnya" langsung di kartu
- **[BARU]** OCR Struk: pajak & service charge didistribusikan proporsional ke setiap item
- **[BARU]** Toast notification system — tidak ada lagi dialog browser bawaan
- **[IMPROVE]** Warna section pada modal Hutang/Piutang lebih distinct (filled + border)
- **[IMPROVE]** Summary card Hutang/Piutang: fill lebih pekat, tanpa border
- **[FIX]** Build error: field tier.name → tier.rank setelah refactor gacha

---

### v1.0.7 — Mar 2025
- **[BARU]** Asset carousel swipeable dengan konfigurasi kartu di Settings
- **[BARU]** Hidden Assets accordion — aset tersembunyi tidak hilang dari neraca
- **[BARU]** OCR Struk via OpenAI GPT-4o-mini dengan auto-kategori & aset
- **[BARU]** Modul Hutang & Piutang dengan cicilan, jatuh tempo, dan riwayat
- **[IMPROVE]** Subcategory tersedia di BulkInput, DebtModal, dan ReceiptScanner
- **[FIX]** Default aset tidak tersimpan dengan benar di beberapa modul input

---

### v1.0.6 — Feb 2025
- **[BARU]** Scan mutasi bank (bulk import via foto/PDF)
- **[BARU]** Recurring transactions — transaksi berulang otomatis
- **[BARU]** PIN lock untuk keamanan aplikasi
- **[IMPROVE]** Dark mode dengan CSS variable full-coverage

---

### v1.0.5 — Jan 2025
- **[BARU]** Modul Anggaran Belanja (Budgeting): Set batas pengeluaran bulanan per kategori dengan indikator bar persentase
- **[IMPROVE]** Alert Overbudget: Peringatan visual instan jika pencatatan transaksi melebihi anggaran yang dibuat

---

### v1.0.4 — Des 2024
- **[BARU]** Ekspor Data CSV: Kemampuan mengunduh laporan bulanan mutasi langsung dalam berkas lembar sebar excel/CSV
- **[IMPROVE]** Filter Rentang Tanggal: Filter riwayat mutasi berdasarkan hari, pekan, bulan berjalan, atau custom range

---

### v1.0.3 — Nov 2024
- **[BARU]** Backup Otomatis Terenkripsi: Data disimpan dengan enkripsi sandi lokal ke IndexedDB browser
- **[IMPROVE]** Pemuatan Gambar Cepat: Dukungan optimasi cache pada file foto profil & avatar kontak

---

### v1.0.2 — Okt 2024
- **[BARU]** Dukungan Multi-Akun Aset: Menambahkan kemampuan mencatat saldo di berbagai dompet (Tunai, Bank, Dompet Digital)
- **[IMPROVE]** Kalkulasi Gabungan Otomatis: Jumlah total bersih saldo seluruh akun dikalkulasi real-time secara instan

---

### v1.0.1 — Sep 2024
- **[BARU]** Rilis Perdana MoneyApp: Peluncuran dasar aplikasi pencatatan keuangan pribadi dengan modul mutasi keluar masuk dasar, kategori statis, dan tema gelap otomatis

---
## Features

### 💳 Transaction Management
- Add, edit, delete: **Pengeluaran**, **Pendapatan**, **Transfer**
- Category + subcategory selection
- Asset/wallet picker
- Date picker
- Optional notes
- Grouped list view: by Date / Category / Asset / None
- Month navigation with Year picker modal

### 🏦 Asset / Account Management
- Types: Cash, Bank Account, eWallet, Savings, Investment, Credit Card, Loan
- Computed balance (initial + all transactions)
- Privacy mode (mask balances)
- Soft-delete assets
- Asset detail drawer with full transaction history
- Manual balance correction

### 📊 Statistics
- Monthly Income vs Expense bar chart
- Category pie chart
- Top spending categories
- Month/Year navigation

### 🎯 Budgeting
- Global monthly budget
- Per-category budget
- Real-time progress bars (safe / warning / danger)
- Budget alert in TransactionModal before overspending

### 💸 Debt & Loan Tracker
- Track Hutang (I owe) and Piutang (they owe me)
- Due date with countdown (overdue / due soon badges)
- Installment mode with per-month auto-transaction generation
- Progress bar + remaining amount
- Net position summary

### 📷 AI Receipt Scanner
- Camera/upload image
- OpenAI GPT-4o-mini backend (Vercel API)
- Context-aware: matches your categories and assets
- Inline result editing before saving

### ✨ Bulk AI Input
- Type transactions in natural language (e.g. "beli makan 15k, bensin 50k, gaji 5jt")
- GPT-4o-mini parses into structured transaction rows
- Review, adjust, and bulk-save

### 📥 Import / Export
- **JSON backup**: full export/import of all data
- **Excel import**: upload `.xlsx` with transaction rows; download sample template
- Field validation with per-row error reporting

### 🔔 Push Notifications
- Daily spending summary
- Weekly financial report
- Powered by Firebase Cloud Messaging + Vercel Cron

### 🔒 Security
- 6-digit PIN app lock
- Lock on demand / lock screen on next visit
- Firebase Auth (Google login) for cloud sync

### ☁️ Cloud Sync & Quota Fallback
- **Firebase Firestore** for real-time cross-device sync.
- **Automatic migration** from local IndexedDB on first login.
- **Firestore Quota Fallback**: Uses a local-first sync queue (IndexedDB) to prevent data loss when Firebase limits are hit.
- **Offline-first logic**: Robust background synchronization with conflict-aware deduplication.
- **Real-time Sync Status**: Premium UI banner for tracking pending cloud records.

---

## Getting Started

```bash
# Clone
git clone https://github.com/rizukid14/moneyreactapp.git
cd moneyreactapp

# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env.local

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## Environment Variables

Create a `.env` file at the root:

```env
# Firebase (client-side)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=

# OpenAI (for Vercel API routes)
OPENAI_API_KEY=

# Firebase Admin SDK (for Vercel Cron)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Vercel Cron auth
CRON_SECRET=your-secret-here
```

> **Note:** For Vercel deployment, add all variables in the Vercel dashboard under Project → Settings → Environment Variables.

---

## Project Structure

```
moneyreactapp/
├── api/                          # Vercel Serverless Functions
│   ├── bulk-parse.ts             # POST /api/bulk-parse — AI bulk transaction parsing
│   ├── receipt-scan.ts           # POST /api/receipt-scan — OCR via OpenAI
│   ├── daily-cron.ts             # GET /api/daily-cron — daily push notification
│   └── weekly-cron.ts            # GET /api/weekly-cron — weekly push notification
├── public/
│   ├── sw.js                     # Service Worker (PWA)
│   └── icons/                    # PWA icons
├── src/
│   ├── components/
│   │   ├── Layout.tsx            # Sidebar + bottom nav shell
│   │   ├── LockScreen.tsx        # PIN unlock screen
│   │   ├── modals/
│   │   │   ├── TransactionModal.tsx   # Add/Edit transaction + budget alert
│   │   │   ├── AssetModal.tsx         # Add/Edit asset + balance correction
│   │   │   ├── DatePickerModal.tsx    # Month/year picker
│   │   │   └── DebtModal.tsx          # Add/Edit debt/loan
│   │   └── transactions/
│   │       └── TransactionItem.tsx    # Single transaction row
│   ├── contexts/
│   │   └── MoneyContext.tsx      # Global state: transactions, assets, categories,
│   │                              #   budgets, debts, user, theme, privacy
│   ├── lib/
│   │   ├── db.ts                 # IndexedDB + Firestore CRUD layer
│   │   ├── firebase.ts           # Firebase app init
│   │   ├── notifications.ts      # FCM push setup
│   │   └── excelImport.ts        # SheetJS Excel parse + sample generator
│   ├── pages/
│   │   ├── Transactions.tsx      # Main transactions view + FAB
│   │   ├── Statistics.tsx        # Charts and spending analysis
│   │   ├── Budgets.tsx           # Budget management dashboard
│   │   ├── Assets.tsx            # Asset list + detail drawer
│   │   ├── Debts.tsx             # Debt & installment tracker
│   │   ├── Settings.tsx          # Profile, security, categories, backup
│   │   ├── ReceiptScanner.tsx    # OCR receipt scanner
│   │   └── BulkInput.tsx         # AI bulk transaction input
│   ├── App.tsx                   # Router + lazy page loading
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Design tokens + component styles
├── vercel.json                   # SPA rewrites + cron config
├── vite.config.ts
└── package.json
```

---

## Contributing

This is a personal project. Feel free to fork and adapt for your own use.

---

## License

MIT © 2025 Dappal (rizukid14)
