# 💰 MoneyApp

> **A premium, full-featured personal finance manager** — built with React, TypeScript, Firebase, and a focus on beautiful mobile UX.

![Version](https://img.shields.io/badge/version-1.0.8-blue)
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
| Build | Vite 5 |
| Deploy | Vercel |
| CSS | Vanilla CSS (design tokens, dark/light) |

---

## Changelog

### v9 — Debt Tracker + Excel Import + UI Polish *(Current)*
> Branch: `money-v9`

**Debt & Loan Tracker (`/debts`)**
- New `Debt` data model with full CRUD persisted to IndexedDB & Firestore
- Track **Hutang** (I owe) and **Piutang** (they owe me) with contact name, description, amount, and due date
- Color-coded status badges: `JATUH TEMPO` (overdue, red) · `SEGERA` (due ≤ 7 days, amber) · `LUNAS` (paid, green)
- Net position calculation (total piutang − total hutang)
- Filter tabs: Aktif / Hutang / Piutang / Lunas
- **Installment / Cicilan mode**: set monthly amount, due day, and total months
- Animated installment progress bar + remaining amount display
- **"Bayar Cicilan" button** → auto-generates a `pengeluaran`/`pendapatan` transaction, increments `paidInstallments`, auto-marks as LUNAS when complete
- Toggle mark as paid/unpaid per entry

**Excel Import (Settings → Backup & Restore)**
- Download a pre-filled **contoh format Excel** (2 sheets: Transaksi + Panduan)
- Import `.xlsx` / `.xls` files — validates type, date, amount, category, and asset name per row
- Detailed per-row error/skip feedback shown inline in the modal
- Powers bulk data entry without the AI endpoint

**Navigation & Settings Refactor**
- OCR moved out of bottom nav → into Speed Dial FAB (now 5 actions: Pengeluaran, Pendapatan, Transfer, Bulk AI, Scan OCR)
- Bottom nav stays clean at 5 items; Debt nav item added to **desktop sidebar only**
- Settings: **Backup & Restore** moved into the menu list (opens as modal), not a standalone section
- DebtModal: type toggle, installment toggle with a live preview of monthly fields

---

### v8 — Budgeting + Budget Alerts + Asset Detail
> Branch: `money-v8` / `money-v9` (continued)

**Budgeting Page (`/budgets`)**
- Data model: `Budget { categoryId, limit, period, month, year }` — `categoryId: null` = Global Budget
- Hero card for global budget with animated ring progress indicator
- Category budget cards with progress bars, remaining amount, status (safe/warning/danger)
- Add/Edit/Delete budgets via inline dropdown menu
- Persisted to IndexedDB + Firestore

**Real-time Budget Alert in TransactionModal**
- Before saving a `pengeluaran`, computes current-month spending vs. active budgets
- Shows a non-blocking `⚠️ Peringatan Anggaran` banner if the transaction would exceed:
  - Global monthly budget
  - Category-specific budget
- Transaction can still be saved (alert is informational, not blocking)

**Asset Detail Drawer**
- Click any asset card → bottom-sheet drawer slides up
- Shows: current balance, total income/expense/count stats for that asset
- Full transaction history list for the asset (assetId, fromAssetId, toAssetId)
- Inline edit button per transaction; edit modal opens on top

**Speed Dial FAB Upgrade**
- Added Camera (OCR) as 5th action button (purple)
- Added `title` tooltips to each FAB mini button

---

### v7 — Firebase Cloud Sync + Vercel Cron Notifications
> Branch: `money-v7`

**Firebase Auth & Firestore Sync**
- Google Sign-in via Firebase Auth
- All data (assets, transactions, categories, budgets, settings) synced to Firestore per user UID
- Automatic migration from local IndexedDB → Firestore on first login
- `sanitizeForFirestore()` utility strips `undefined` values before writes

**Vercel Cron Push Notifications**
- `api/daily-cron.ts` — runs daily, sends spending summary via FCM
- `api/weekly-cron.ts` — runs weekly, sends 7-day financial report
- `vercel.json` configured with cron schedules and auth header
- FCM admin SDK initialized with `FIREBASE_SERVICE_ACCOUNT_KEY` env var
- VAPID key support for PWA web push

**Notifications Settings**
- Auto-setup on login if permission already granted
- Status badge (AKTIF / NONAKTIF) in Settings
- "Aktifkan Izin Notifikasi" button for first-time setup

---

### v6 — Collapsible Sidebar + UI Design Refresh
> Branch: `money-v6`

**Layout Overhaul**
- Collapsible desktop sidebar with `PanelLeftClose` / `PanelLeftOpen` toggle
- Responsive breakpoints: sidebar on ≥ 768px, bottom nav on mobile
- App container centered with max-width, proper overflow handling
- `100dvh` fix for mobile to prevent iOS bouncing/over-scroll

**UI Improvements**
- Vibrant color accent system (HSL-based CSS variables)
- Card hover states and micro-animations throughout
- Standardized page headers and spacing across all modules
- Summary cards redesigned: income in blue, expense in orange/red
- Restored desktop responsive layout after mobile-first regression

**Logout**
- Logout button added to Settings page
- `logOut()` function clears local state and signs out from Firebase

---

### v5 — OCR Backend Migration + Subcategories + IndexedDB
> Branch: `money-v5`

**OCR Pipeline**
- Migrated from client-side PaddleOCR (memory crash on mobile) → **Vercel serverless** endpoint
- `api/receipt-scan.ts` — accepts base64 image, calls OpenAI GPT-4o-mini with Indonesian receipt prompt
- Context-aware: sends user's existing categories and assets for smart auto-matching
- Image resizing client-side (max 800px, JPEG 0.7) before upload to minimize tokens
- Crop tool for selecting receipt area before submission
- Inline editing of detected line items (name, amount, delete, add manual)
- Confidence scoring display per detected field
- Date context injected into prompt to prevent year hallucinations

**Subcategories**
- `Category.subcategories: SubCategory[]` — each category can have N sub-items
- Subcategory selector appears in TransactionModal when parent category is selected
- Category management in Settings with expand/collapse per category and subcategory add/delete

**IndexedDB Migration**
- Replaced `localStorage` with IndexedDB via `idb` for larger storage capacity
- `localDbGetAll*` helpers for offline-first reads
- Export/Import JSON backup in Settings

**Asset Improvements**
- Soft-delete assets (mark as `isDeleted`) instead of hard delete to preserve transaction references
- New asset types: `Savings`, `Investment`, `Loan`
- Asset grouping by type with section headers
- Manual balance correction via "Koreksi Saldo" transaction
- Privacy mode: mask all balances with `Rp ••••••••` (toggle eye icon)

**Statistics**
- Category pie charts with Recharts
- Top spending categories list
- Drill-down by month/year

---

### v4 — Edit Transactions + Asset Editing + Layout Precision
> Branch: `money-v4`

**Edit Functionality**
- Edit any existing transaction — pre-fills modal with existing data
- Edit any asset — pre-fills AssetModal with current data and computed balance
- `updateTransaction(id, partial)` and `updateAsset(id, partial)` in MoneyContext

**Layout Polish**
- App container widened to 800px for tablet support
- `100dvh` viewport fix for mobile browsers (prevents iOS bottom bar overlapping)
- Tighter card spacing, inner padding standardized
- Transfer row: from/to asset selector with `ArrowRightLeft` icon

---

### v3 — Architecture Modernization + Theme System
> Branch: `money-v3`

**Comprehensive Refactor**
- Full TypeScript strict typing across all components
- MoneyContext: centralized state with `useCallback` + `useMemo` for performance
- CSS design token system (`--primary`, `--secondary`, `--bg-card`, etc.)
- Dark / Light theme toggle with `localStorage` persistence
- `toggleTheme()` in context, `<html class="dark">` switched at root

**Statistics**
- Connected to real transaction data (was previously mocked)
- Bar chart (Recharts) for monthly income vs expense
- Month/year navigation

**Settings**
- Profile: name, email, avatar (canvas-compressed photo upload)
- PIN security: set 6-digit PIN, lock app, unlock screen
- Category management: add/delete expense and income categories
- Support email button

---

### v2 — Dark Mode + OCR + Month Switcher
> Branch: `money-v2`

**Dark Mode**
- System-aware dark mode with manual toggle
- Persisted to `localStorage`
- All modals, cards, and inputs themed

**Receipt Scanner (OCR)**
- Multi-entry OCR — scan one receipt, generate multiple line-item transactions
- Image preview before scanning
- Tesseract.js (later replaced in v5)

**Month Switcher**
- `ChevronLeft` / `ChevronRight` navigation for months in Transactions
- "Today" button to jump back to current month
- Grid-style Month/Year Picker modal

**Settings**
- Stable inline dark mode toggle switch
- User profile basics

---

### v1 — Initial Release
> First commit: `729c433`

**Core Features**
- PWA setup with Vite + `vite-plugin-pwa`
- `manifest.json`, `service-worker.js`, icons
- `vercel.json` with SPA rewrites for PWA routing
- Multi-account asset management (Cash, Bank, eWallet, Credit Card)
- Add income / expense / transfer transactions
- Transaction list grouped by date
- Floating Action Button (FAB) with speed dial
- Basic statistics tab
- `localStorage`-based persistence
- Basic light theme

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

### ☁️ Cloud Sync
- Firebase Firestore for real-time cross-device sync
- Automatic migration from local IndexedDB on first login
- Offline-first: IndexedDB fallback when not logged in

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
