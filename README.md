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

## Changelog

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
