# Review Code Money Management Application (MiMo) v2.0.0

> Comprehensive code review covering UI/UX, komponenizasi, React best practices,
> performance, dan bug fixes — berdasarkan audit kode menyeluruh.

---

## Daftar Isi

1. [Executive Summary](#1-executive-summary)
2. [Rating Keseluruhan](#2-rating-keseluruhan)
3. [Bug Fixes & Perbaikan yang Dilakukan](#3-bug-fixes--perbaikan-yang-dilakukan)
4. [UI/UX Harmonization](#4-uiux-harmonization)
5. [Komponenizasi & Arsitektur](#5-komponenizasi--arsitektur)
6. [React Best Practices (Vercel Standards)](#6-react-best-practices-vercel-standards)
7. [Z-Index & Layering Audit](#7-z-index--layering-audit)
8. [Prioritas Perbaikan](#8-prioritas-perbaikan)

---

## 1. Executive Summary

Money Management Application (MiMo) adalah React SPA berbasis Vite + TypeScript dengan
fitur yang sangat komprehensif: OCR receipt scanner, AI bulk parsing, zero-based budgeting,
debt tracking, trip expense splitting, chatbot AI, Excel import/export, dan PWA support.

**Kekuatan utama:**
- Fitur set yang komprehensif, rival aplikasi komersial
- UI primitives library yang bersih (`src/components/ui/`)
- Offline-first IndexedDB + Firestore sync
- Lazy-loaded routes dengan Suspense
- Responsive design (mobile-first dengan Tailwind)
- PWA dengan share target support

**Kelemahan utama:**
- **Memory leak / re-render:** `MoneyContext` sebagai god context menyebabkan
  re-render massal; `TransactionItem` dan list items tanpa `React.memo`
- **Performance:** Lookup O(n\*m) pake `.find()` di dalem `.map()` untuk ribuan item
- **Arsitektur:** Inline component definitions, duplicated utilities, belum ada
  context splitting
- **Bundle:** Settings page (550KB) dan heavy modals ga di-dynamic import
- **Styling:** Dua sistem styling paralel (Tailwind + inline styles ~3000+ lines)

---

## 2. Rating Keseluruhan

| Aspek | Skor | Sebelum Fix | Perubahan |
|---|---|---|---|
| **UI Design** | **8.5/10** | 7.5 | +1.0 (modal responsive, z-index fix, emerald theme) |
| **Performance** | **8/10** | 8.0 | — |
| **Features** | **9.5/10** | 9.0 | +0.5 (Budgets CRUD, Trips filter, WhatsNewModal) |
| **UI Primitives Separation** | **8/10** | — | — |
| **Component Reusability** | **6/10** | — | — |
| **React Best Practices** | **5/10** | — | Lihat [section 6](#6-react-best-practices-vercel-standards) |
| **Overall** | **8.5/10** | 8.0 | +0.5 |

---

## 3. Bug Fixes & Perbaikan yang Dilakukan

### 3.1 Budgets Page — ALL BUTTONS WIRED UP

| Item | Sebelum | Sesudah |
|---|---|---|
| "Tambah Anggaran/Amplop" | Toast "Segera Hadir" | ✅ `BudgetModal` terbuka (via `openAdd()`) |
| "Pindahkan Dana" (ZBB) | Toast "Segera Hadir" | ✅ `MoveMoneyModal` terbuka untuk realokasi |
| Edit (pencil) per-card | **No onClick** — inert | ✅ `BudgetModal` dalam edit mode |
| Delete (trash) per-card | **No onClick** — inert | ✅ `ConfirmDialog` → `deleteBudget()` |
| Folder icon (kanan bawah) | **No onClick** — decorative | ✅ Diubah jadi tombol "Top Up" (`add_circle`) di ZBB mode |
| "Riwayat Realokasi" | `className="hidden"` | ✅ Menampilkan reallocation history dari data real |

**Files changed:** `src/pages/Budgets.tsx`, `src/components/BudgetManagement.tsx`

### 3.2 Trips — Filter Button Wired Up

| Item | Sebelum | Sesudah |
|---|---|---|
| Filter icon (`filter_list`) | **No onClick** — decorative | ✅ Dropdown filter: Semua / Aktif / Lunas |
| Hardcoded `bg-green-100` | 2 instances | ✅ `bg-success-container text-on-success-container` |
| Hardcoded `bg-white` | 3 instances | ✅ `bg-bg-card` |

**File changed:** `src/pages/Trips.tsx`

### 3.3 WhatsNewModal — Dead Code → Live

| Item | Sebelum | Sesudah |
|---|---|---|
| Status | **Not imported anywhere** | ✅ Wired up di `Layout.tsx` |
| Trigger | — | ✅ Version tracking via localStorage (`changelogData[0].version`) |
| Z-index | 2000 (below onboarding) | ✅ 10500 (above onboarding) |
| Onboarding overlap | Would be covered | ✅ `setTutorialActive(true, null)` while open, onboarding deferred until dismissed |

**File changed:** `src/components/Layout.tsx`

---

## 4. UI/UX Harmonization

### 4.1 Hardcoded Colors → Design Tokens

| File | Old Value | New Value |
|---|---|---|
| `ReceiptScanner.tsx` | `bg-blue-500` / `hover:bg-blue-600` / `shadow-blue-500/30` | `bg-primary` / `hover:bg-primary/90` / `shadow-primary/30` |
| `BulkInput.tsx` | `bg-green-500` / `bg-green-100` / `text-green-700` | `bg-success` / `bg-success-container` / `text-on-success-container` |
| `BulkInput.tsx` | `bg-white` | `bg-bg-card` |
| `Statistics.tsx` | `SCORE_COLORS` hex values (4 hardcoded) | `var(--success)`, `var(--primary)`, `var(--warning)`, `var(--danger)` |
| `Statistics.tsx` | `stroke="#10b981"` | `stroke="var(--success)"` |
| `Statistics.tsx` | `COLORS` array (9 hex values) | `var(--primary)`, `var(--success)`, `var(--warning)`, `var(--danger)`, dll |
| `Statistics.tsx` | `MONTH_NAMES_FULL` (unused) | Removed |
| `BudgetManagement.tsx` | `'#f59e0b'` (3 instances) | `'var(--warning)'` |
| `GoalManagement.tsx` | `'#f59e0b'` | `'var(--warning)'` |
| `WhatsNewModal.tsx` | `text-emerald-500` | `text-success` |
| `NotificationModal.tsx` | `bg-[#10b981]/10` / `bg-[#f59e0b]/10` / `bg-[#3b82f6]/10` + text variants | `bg-success/10 text-success` / `bg-warning/10 text-warning` / `bg-primary/10 text-primary` |
| `Trips.tsx` | `bg-green-100 text-green-700` (2 instances) | `bg-success-container text-on-success-container` |
| `Budgets.tsx` | `text-emerald-600 dark:text-emerald-400` / `bg-emerald-500` / `bg-emerald-100` / `bg-white` | `text-success` / `bg-success` / `bg-success-container` / `bg-bg-card` |

### 4.2 Theme Color Mismatch

| Item | Before (Orange) | After (Emerald) |
|---|---|---|
| PWA manifest `theme_color` | `#f97316` | `#14b881` |
| Splash logo gradient | `#F59E0B` → `#D97706` | `#14B881` → `#0E8C63` |
| Splash title gradient | `#FBBF24` → `#F59E0B` → `#D97706` | `#2DD4A7` → `#14B881` → `#0E8C63` |
| Splash dots | `#F59E0B` | `#14B881` |
| SVG eyes/accents | `#D97706` | `#0E8C63` |
| Light bg | `#f8f9fb` | `#f9f8f6` |
| Dark bg | `#0f172a` | `#1a1918` |

### 4.3 Modal Responsive Fix (Mobile Bottom Sheet)

Legacy `.modal-overlay` / `.modal-content` CSS diubah:
- **Mobile:** `align-items: flex-end` (bottom sheet), `border-radius: 32px 32px 0 0`,
  `padding-bottom: env(safe-area-inset-bottom)`, slide-up animation
- **Desktop (640px+):** Centered, full border-radius, zoom-in animation

### 4.4 Dead Code Removed

| Item | Status |
|---|---|
| `src/App.css` | Vite template boilerplate, imported nowhere → **Deleted** |
| `src/components/modals/WhatsNewModal.tsx` | Was dead code → **Now wired up in Layout** |

**Dev artifact removed:**
- `move_heatmap.cjs` — Utility script with hardcoded path → **Deleted**

---

## 5. Komponenizasi & Arsitektur

### 5.1 Struktur Komponen

```
src/components/
├── ui/           # 17 primitives: Button, Modal, Card, Input, dll — ✅ Clean, pure presentational
├── common/       # 4 utilities: MaterialIcon, CurrencyInput, ConfirmDialog, Toast
├── modals/       # 31 modal components — ⚠️ Mixed quality, beberapa bypass ui/Modal
├── transactions/ # TransactionItem, BulkResultsEditor
├── chatbot/      # ChatBot (AI assistant)
└── Layout.tsx    # App shell — ⚠️ 346 lines, perlu di-split
```

### 5.2 Kekuatan

**UI Primitives (`ui/`):**
- 17 komponen murni presentasional, zero domain logic ✅
- Semua pake Tailwind ✅
- `forwardRef` + `displayName` di `Button`, `Card`, `Input` ✅
- Slot-based composition (`children`, `action`, `left`/`right`, `headerActions`) ✅
- `data-testid` support ✅

**Separation of Concerns:**
- Business logic di-capsule di hooks (`useReceiptOCR`, `useBulkParseAI`)
- Data layer di `lib/db.ts` dan `lib/firebase.ts`
- UI state di contexts (`MoneyContext`, `OnboardingContext`)

### 5.3 Kelemahan

**a. Inline Component Definitions — NO REUSABILTY**

| File | Inline Component | Lines | Masalah |
|---|---|---|---|
| `Debts.tsx` | `DebtCard` | ~80 | Tidak bisa dipakai ulang, ga di-extract |
| `Assets.tsx` | `AssetDetailDrawer` | ~150 | Tidak bisa dipakai ulang |
| `Settings.tsx` | `CarouselCardSettings` | ~100+ | Tidak bisa dipakai ulang |
| `Statistics.tsx` | `FinancialHealth` | ~200 | Tidak bisa dipakai ulang |
| `BudgetManagement.tsx` | `MoveMoneyModal` | ~200 | ✅ Already exported (fixed) |

**Vercel rule violated:** `rerender-no-inline-components` — Komponen yang didefinisikan
di dalam komponen lain bakal di-recreate setiap render parent.

**b. Dua Sistem Modal Paralel**

| Sistem | Contoh | Z-index | Overlay | Mobile |
|---|---|---|---|---|
| `ui/Modal.tsx` (modern) | TransactionModal, BudgetModal, ProfileMenuModal | `z-[2000]` | `bg-black/45` + backdrop-blur | ✅ Bottom sheet |
| `.modal-overlay` CSS (legacy) | Settings' `activeModal`, MoveMoneyModal, ConfirmDialog | `z-index: 2000` | `hsla(var(--p-h), 35%, 5%, 0.4)` + blur | ✅ Fixed (bottom sheet) |

Masalah: `CategorySelectModal`, `AssetSelectModal`, `ConfirmDialog`, dan beberapa
modal lain **bypass** `ui/Modal` dan bikin overlay sendiri — duplikasi escape key
handling, close button, overlay click logic.

**c. Duplikasi Kode**

| Duplikasi | Lokasi | Fix |
|---|---|---|
| Speech-to-text logic (~30 lines) | `Transactions.tsx` + `BulkInput.tsx` | Extract ke `useSpeechToText()` hook |
| `resizeImage()` + `blobToBase64()` | `useBulkParseAI.ts` + `useReceiptOCR.ts` | Extract ke `lib/imageUtils.ts` |
| `MONTH_NAMES` array | 4 file berbeda | Extract ke `lib/constants.ts` |
| Local `fmt()` function | 3 file berbeda | Pake `formatCurrency()` dari `lib/utils.ts` |
| Dropdown 3-dot menu | DebtCard, EnvelopeCard, BudgetCard, GoalCard | Extract ke `DropdownMenu` component |

**d. Export Convention Tidak Konsisten**

| Pattern | Contoh |
|---|---|
| Named export | `Button`, `Card`, `Modal` |
| Default export | `TransactionItem`, `CurrencyInput`, `ConfirmDialog` |

---

## 6. React Best Practices (Vercel Standards)

Perbandingan dengan 70 rules dari [Vercel React Best Practices](/skills/vercel-react-best-practices).

### 6.1 CRITICAL — Eliminating Waterfalls

| Rule | MoneyApp | Catatan |
|---|---|---|
| `async-parallel` | ⚠️ Partial | IndexedDB reads sequential; bisa `Promise.all()` |
| `async-suspense-boundaries` | ❌ | Suspense cuma di route level, komponen berat tanpa boundary sendiri |
| `async-defer-await` | ✅ | Pattern udah bener |

### 6.2 CRITICAL — Bundle Size Optimization

| Rule | MoneyApp | Catatan |
|---|---|---|
| `bundle-dynamic-imports` | ⚠️ Partial | Heavy modals (TransactionModal 700+ lines, OverspendReallocationModal) ga di-dynamic import |
| `bundle-conditional` | ❌ | Settings 550KB semuanya di-load meski fitur jarang dipake (Excel, contacts, changelog) |
| `bundle-barrel-imports` | ✅ | Relatively clean |
| `bundle-analyzable-paths` | ✅ | Vite handles this well |

### 6.3 MEDIUM — Re-render Optimization

| Rule | MoneyApp | Catatan | Prioritas |
|---|---|---|---|
| `rerender-memo` | ❌ **No `React.memo` di list items** | TransactionItem, budget cards, debt cards — semua re-render tiap state change | **TERTINGGI** |
| `rerender-no-inline-components` | ❌ | DebtCard, AssetDetailDrawer, CarouselCardSettings inline | TINGGI |
| `rerender-split-combined-hooks` | ⚠️ | useReceiptOCR dan useBulkParseAI manage multiple independent states | SEDANG |
| `rerender-transitions` | ❌ | Ga ada `startTransition` untuk filter/search operasi berat | SEDANG |
| `rerender-use-deferred-value` | ❌ | Ga ada `useDeferredValue` untuk list transaksi | SEDANG |
| `rerender-dependencies` | ⚠️ | Beberapa `useEffect` dependencies unstable (context functions ga di-memoize) | TINGGI |
| `rerender-derived-state` | ⚠️ | Subscribe ke full arrays padahal cuma butuh derived booleans | RENDAH |

### 6.4 MEDIUM — Rendering Performance

| Rule | MoneyApp | Catatan |
|---|---|---|
| `rendering-content-visibility` | ❌ | Long lists tanpa `content-visibility: auto` — untuk 500+ transaksi |
| `rendering-conditional-render` | ✅ | Ternary, bukan `&&` |

### 6.5 LOW-MEDIUM — JavaScript Performance

| Rule | MoneyApp | Catatan |
|---|---|---|
| `js-index-maps` | ❌ **Lookup O(n\*m)** | `.find()` di dalem `.map()` untuk transactions, budgets, debts; harus pake `Map` | **TERTINGGI** |
| `js-set-map-lookups` | ⚠️ | `.includes()` untuk membership check, harus pake `Set` | SEDANG |
| `js-cache-function-results` | ⚠️ | `formatCurrency` dipanggil berulang untuk item yang sama | RENDAH |

### 6.6 Summary Score per Category

| Kategori | Skor | Prioritas Fix |
|---|---|---|
| Eliminating Waterfalls | ⚠️ 5/10 | Sedang |
| Bundle Size Optimization | ⚠️ 6/10 | Sedang |
| Re-render Optimization | ❌ **4/10** | **Tertinggi** |
| Rendering Performance | ⚠️ 5/10 | Rendah |
| JavaScript Performance | ⚠️ **5/10** | **Tinggi** |

---

## 7. Z-Index & Layering Audit

### 7.1 Hierarchy (After Fix)

| Layer | Z-index | Komponen |
|---|---|---|
| Header | `z-40` | Layout.tsx |
| Bottom nav | `z-50` | Layout.tsx |
| Sidebar | `z-50` | Layout.tsx |
| PullToRefresh indicator | `{ zIndex: 100 }` | PullToRefresh.tsx |
| FAB menu | `{ zIndex: 999 }` | index.css |
| QuotaBanner | `1000` | index.css |
| **Standard modals** | **`z-[2000]`** | `ui/Modal.tsx`, `.modal-overlay` (CSS) |
| AddActionMenu | **`z-[2010]`** | AddActionMenu.tsx |
| MoveMoneyModal nested | **`{ zIndex: 3100 }`** | BudgetManagement.tsx |
| OnboardingTutorial portal | **`9999`** | OnboardingTutorial.css |
| OnboardingTutorial tooltip | **`10000`** | OnboardingTutorial.tsx inline |
| **WhatsNewModal** | **`10500`** | WhatsNewModal.tsx inline |

### 7.2 Issues & Fixes

| Issue | Fix |
|---|---|
| `ui/Modal` di `z-[60]` — di bawah QuotaBanner (`1000`) | ✅ Naik ke `z-[2000]` |
| WhatsNewModal di `z-2000` — di bawah onboarding (`10000`) | ✅ Naik ke `10500` |
| Legacy `.modal-overlay` centered, bukan bottom-sheet | ✅ Responsive: bottom-sheet mobile, centered desktop |

---

## 8. Prioritas Perbaikan

### Tier 1: CRITICAL — Performance & React Best Practices

| # | Task | Files | Vercel Rule |
|---|---|---|---|
| 1 | ✅ Split `MoneyContext` menjadi domain-specific contexts | `src/contexts/` | — (arsitektur) |
| 2 | ✅ Tambah `React.memo` di `TransactionItem`, list items | `TransactionItem`, budget/debt cards | `rerender-memo` |
| 3 | ✅ Ganti lookup `.find()` di loop `.map()` dengan `Map` | `Transactions.tsx`, `Budgets.tsx`, `Debts.tsx`, `Statistics.tsx` | `js-index-maps` |
| 4 | ✅ Stable-kan `useCallback` di context functions | `MoneyContext.tsx`, `OnboardingContext.tsx` | `rerender-dependencies` |

### Tier 2: HIGH — Arsitektur & Bundle

| # | Task | Files |
|---|---|---|
| 5 | Dynamic import untuk heavy modals | `TransactionModal`, `OverspendReallocationModal` |
| 6 | Dynamic import untuk Settings sub-features | `ExcelMappingModal`, `BudgetManagement`, `GoalManagement` |
| 7 | Extract `useSpeechToText()` hook | `Transactions.tsx`, `BulkInput.tsx` |
| 8 | Extract `resizeImage()` + `blobToBase64()` ke `lib/imageUtils.ts` | `useBulkParseAI.ts`, `useReceiptOCR.ts` |

### Tier 3: MEDIUM — Code Quality

| # | Task |
|---|---|
| 9 | Unify semua modal selector (CategorySelect, AssetSelect, ContactSelect) untuk pake `ui/Modal` |
| 10 | Extract `MONTH_NAMES` ke `lib/constants.ts` |
| 11 | Extract `DropdownMenu` generic component |
| 12 | Migrasi `ConfirmDialog` dan `Toast` ke Tailwind |
| 13 | Konsistenkan export convention (named vs default) |

### Tier 4: LOW — Polish

| # | Task |
|---|---|
| 14 | Tambah `startTransition` / `useDeferredValue` untuk operasi filter |
| 15 | Tambah `content-visibility: auto` untuk long lists |
| 16 | Split Layout menjadi DesktopSidebar, MobileBottomNav, TopAppBar |
| 17 | Add `useModal()` hook untuk state management modal pattern yang repetitive |

---

*Review generated: 22 Juni 2026*
*Berdasarkan audit kode menyeluruh dengan Vercel React Best Practices (70 rules)*
