# UI Review — MoneyApp v2.0.0 (`money-v2.0.0`)

> Reviewed: 2026-06-19  
> Scope: Full app UI, with focus on mobile (flex) responsiveness  
> Benchmark: YNAB, Copilot Money, Monarch Money

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Strengths](#2-strengths)
3. [Mobile Grid Collapse Issues](#3-mobile-grid-collapse-issues)
4. [Charts & Data Visualization](#4-charts--data-visualization)
5. [Typography Scaling](#5-typography-scaling)
6. [Missing Mobile Patterns](#6-missing-mobile-patterns)
7. [Modal System — Comprehensive Review](#7-modal-system--comprehensive-review)
8. [Desktop Spacing](#8-desktop-spacing--content-too-tight-to-screen-edges)
9. [Minor Polish Issues](#9-minor-polish-issues)
10. [Benchmark vs Industry Leaders](#10-benchmark-vs-industry-leaders)
11. [Top Fixes (Prioritized)](#11-top-fixes-prioritized)

---

## 1. Architecture Overview

| Aspect | Details |
|---|---|
| **Framework** | React + TypeScript |
| **Styling** | Tailwind CSS + CSS custom properties (Material Design 3 tokens) |
| **Design System** | Bento Box inspired — `BentoCard`, `MetricCard`, `IconBlock`, `StatusBadge`, `EmptyState` |
| **Animations** | Framer Motion (`AnimatePresence`, hover transitions, entrance animations) |
| **Charts** | Recharts (`ResponsiveContainer`, tooltips, gradient fills) |
| **State** | React Context (`MoneyContext`) with local storage persistence |
| **Pages** | Transactions (Dashboard), Statistics (6 analysis views), Assets, Budgets, Debts |
| **Modals** | 31 modal components using a shared `Modal` base component |

---

## 2. Strengths

| Area | What's Good |
|---|---|
| **Design System** | `BentoCard`, `MetricCard`, `IconBlock`, `StatusBadge`, `EmptyState` — consistent, composable, visually polished |
| **Animations** | Framer Motion `AnimatePresence` on view transitions, hover states, entrance animations. Feels premium. |
| **Dark Mode** | Full CSS variable support with `dark:` Tailwind variants throughout |
| **Charts** | Recharts with `ResponsiveContainer`, proper tooltips, gradient fills |
| **Tutorials** | Per-page `OnboardingTutorial` — excellent first-time user experience |
| **Debts** | Auto-offset (`potong silang`) is a genuinely unique and clever feature |
| **Privacy Mode** | `isPrivateMode` toggle with `••••••••` masking — unique feature not found in competitors |
| **Presets** | `useTransactionPresets` with pinning and habit tracking — smart UX |
| **Drafts** | Transaction drafts saved to localStorage per-type — prevents data loss |
| **Budget Alerts** | Real-time budget warning banners in TransactionModal |

---

## 3. Mobile Grid Collapse Issues

### 🔴 Critical: Multi-column grids don't respond to small screens

**Exact line numbers from `rg` scan — 7 grids with no responsive prefix across 5 files:**

| File | Line | Code | Problem |
|---|---|---|---|
| `Statistics.tsx` | 2390 | `grid grid-cols-3 gap-3` | 🔴 **Worst.** 3 cards at ~110px each on 375px screen |
| `Statistics.tsx` | 1815 | `grid grid-cols-2 gap-3` | 🟡 2 cols at ~170px — tight but borderline |
| `Settings.tsx` | 2507 | `grid grid-cols-2 gap-3` | 🟡 Card management grid |
| `Settings.tsx` | 2488 | `grid grid-cols-2 gap-3` | 🟡 Card management grid |
| `Debts.tsx` | 382 | `grid grid-cols-2 gap-3` | 🟡 Debt summary cards |
| `Budgets.tsx` | 249 | `grid grid-cols-2 gap-4` | 🟡 Inside budget item breakdown |
| `Trips.tsx` | 242 | `grid grid-cols-2 gap-4` | 🟡 Trip statistics |

> ✅ **16 grids already correct**: `grid-cols-1 md:grid-cols-2`, `grid-cols-1 lg:grid-cols-12`, etc. — no issues.

**Best practice (Copilot/Monarch)**: `grid-cols-1` on mobile, `grid-cols-2` on tablet, `grid-cols-3/4` on desktop.

### Fix:
```tsx
// ❌ Current
className="grid grid-cols-3 gap-3"

// ✅ Should be
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
```

---

## 4. Charts & Data Visualization

### 🟡 Issues

| Issue | Location | Severity |
|---|---|---|
| Heatmap calendar — cells are ~13px squares, impossible to tap on mobile. Horizontal scroll required. | `Statistics.tsx` (finance health) | High |
| 6-month bar chart — Y-axis is hidden (`hide`), so users can't read values on mobile | `Statistics.tsx` (chart) | Medium |
| 90-day forecast AreaChart — X-axis labels become unreadable at 90 data points | `CashFlowForecast` | Medium |
| Pie charts — standard Recharts has poor mobile touch targets (no tap-to-drill-down) | Statistics category pie | Low |

### Recommendations:
- Replace heatmap calendar with weekly summary list on screens `< 640px`
- Always show at least a minimal Y-axis with abbreviated values
- Reduce forecast data points on mobile (show monthly instead of daily)

---

## 5. Typography Scaling

### 🟡 Issues

| Problem | Details |
|---|---|
| `text-3xl` (30px) on some metric cards | Should use `text-2xl sm:text-3xl` |
| `text-xl` (20px) asset balances with `font-black` + `tracking-tight` | Can clip on narrow screens |
| `headline-xl` defined as 48px | Only `headline-lg-mobile` at 28px exists — Budgets page uses `headline-xl` directly |
| No responsive typography classes | Fixed sizes everywhere, no `sm:` or `lg:` prefixes |

**Best practice (YNAB)**: All headings should scale with `text-2xl sm:text-3xl lg:text-4xl`.

### Fix:
```tsx
// ❌ Current
className="text-3xl"

// ✅ Should be
className="text-2xl sm:text-3xl"
```

---

## 6. Missing Mobile Patterns

| Missing Pattern | Why It Matters | Priority |
|---|---|---|
| **Bottom Sheets** | Current modals are center-of-screen overlays. Mobile users expect bottom sheets. Modal at `maxHeight: 88vh` with scroll inside is clunky. | 🔴 High |
| **Swipe Actions** | No `swipe-to-delete` or `swipe-to-edit` on transaction/asset/debt cards. YNAB and Copilot both use this. | 🟡 Medium |
| **Pull-to-Refresh** | No pull-to-refresh on any list. Users expect this on the Transactions page. | 🟡 Medium |
| **Snap Scrolling** | The stats view carousel uses `overflow-x: auto` without `scroll-snap-type`. | 🟢 Low |
| **Haptic Feedback** | No `navigator.vibrate()` on critical actions (delete, mark paid). | 🟢 Low |
| **Bottom Navigation Bar** | Currently sidebar-only navigation. Mobile users expect bottom tab bar with 4-5 key destinations. | 🟡 Medium |

---

## 7. Modal System — Comprehensive Review

### 7.1 Base Modal Component (`Modal.tsx`)

The base modal provides a solid foundation:
```tsx
// Structure
<div className="fixed inset-0 z-50 flex items-center justify-center">
  <Overlay />
  <div className="relative ... max-h-[90vh] flex flex-col">
    <header className="shrink-0 px-6 py-5">  {/* Sticky header */}
      {title}
    </header>
    <div className="flex flex-col h-full px-6 pb-6 gap-4 overflow-y-auto">
      {children}  {/* ← gap-4 = 16px between each child */}
    </div>
  </div>
</div>
```

The `gap-4` on the children container provides **built-in 16px spacing** between each direct child — but this system is defeated by every modal.

---

### 7.2 🔴 Issue A: Double-Wrapping Defeats Gap System

Every modal wraps content in an extra `<div>` or `<form>`, killing the `gap-4` system:

```tsx
// ❌ Current pattern (ALL 31 modals)
<Modal isOpen={...} onClose={...} title="...">
  <div>                              // ← Unnecessary wrapper
    <form onSubmit={handleSave}>    // ← Sometimes double-wrapped
      <div style={{ marginBottom: 16 }}>Section A</div>
      <div style={{ marginBottom: 12 }}>Section B</div>
      <div style={{ marginBottom: 20 }}>Section C</div>
    </form>
  </div>
</Modal>
```

```tsx
// ✅ Correct pattern
<Modal isOpen={...} onClose={...} title="...">
  <SectionA />           // gap-4 auto-applied
  <SectionB />           // gap-4 auto-applied
  <div className="flex flex-col gap-2">  // ← Only wrap when you need TIGHTER spacing
    <RelatedField1 />
    <RelatedField2 />
  </div>
  <SectionC />           // gap-4 auto-applied
</Modal>
```

---

### 7.3 🔴 Issue B: Inconsistent Spacing Across All Modals

Every modal uses manual `marginBottom` with different values. Here's the complete breakdown:

| Modal | 4px | 6px | 8px | 10px | 12px | 14px | 16px | 20px | 24px | Uses Tailwind? |
|---|---|---|---|---|---|---|---|---|---|---|
| **TransactionModal** | ✅ | — | ✅ | — | ✅ | — | ✅ | — | — | ❌ |
| **AssetModal** | ✅ | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ❌ |
| **DebtModal** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ❌ |
| **BudgetModal** | — | — | ✅ | — | — | — | ✅ | ✅ | — | ❌ |
| **SplitBillModal** | ✅ | — | ✅ | — | — | — | ✅ | — | — | ❌ |
| **SharedExpenseDetail** | ✅ | — | ✅ | — | ✅ | — | — | ✅ | ✅ | ❌ |
| **StatDetailModal** | — | — | ✅ | — | — | — | ✅ | ✅ | ✅ | ❌ |
| **ProfileMenuModal** | — | — | — | — | — | — | — | — | — | ✅ |

> **DebtModal uses 8 different spacing values** (4, 6, 8, 10, 12, 14, 16, 24).  
> **ProfileMenuModal is the ONLY modal using Tailwind classes** — and it looks the most consistent.

**Result**: Two adjacent buttons can be 12px apart, the next section 16px, and the final section 24px — with no logic behind the choice.

---

### 7.4 🔴 Issue C: TransactionModal — Spacing Chaos

The most complex modal has the most inconsistent spacing:

```
┌──────────────────────────────────────────┐
│ Header: "Tambah Transaksi"               │ ← shrink-0 (good)
├──────────────────────────────────────────┤
│ TabBar              marginBottom: 16px   │
│ Presets             marginBottom: 12px   │  ← Why 12 and not 16?
│ Amount row          marginBottom: 12px   │
│ Category button     marginBottom: 16px   │  ← Why 16 and not 12?
│ Asset button        marginBottom: 16px   │
│ Goal button         marginBottom: 16px   │
│ Date + Time grid    marginBottom: 16px   │
│ Note input          (no margin)          │  ← Relying on Input's own margin
│ Description area    marginBottom: 16px   │
│ Recurring toggle    margin: 12px 0       │  ← Different from all others
│ Recurring fields    marginTop: 12px      │
│ Budget alert        (CSS class)          │
│ Buttons             padding: 12px 0 4px  │  ← Asymmetric
└──────────────────────────────────────────┘
```

**No logical hierarchy** — is "Category" more related to "Amount" or to "Asset"? They all get 16px indiscriminately.

---

### 7.5 🔴 Issue D: SplitBillModal — Triple Nested Scroll Containers

Exact locations from codebase:

| Container | Location | Constraint | Scroll |
|---|---|---|---|
| Modal body (base) | `Modal.tsx` body div | `max-h-[90vh]` + `overflow-y-auto` | **Scroll 1** |
| Split panel | `SplitBillModal.tsx:596-597` | `maxHeight: 200\|300` + `overflowY: 'auto'` | **Scroll 2** |
| Item list | `SplitBillModal.tsx:774` | `maxHeight: 250` + `overflowY: 'auto'` | **Scroll 3** |

Also found in other modals:
- `OverspendReallocationModal.tsx:132` — outer `maxHeight: 80vh, overflowY: auto`
- `OverspendReallocationModal.tsx:169` — inner `maxHeight: 240px, overflowY: auto` → **double scroll**
- `SharedBillsManagerModal.tsx:94` — inner `maxHeight: 60vh, overflowY: auto`
- `AddTripExpenseModal.tsx:376,618` — outer `maxHeight: 90vh, overflowY: auto`

**Triple scrollbars on mobile = scroll trap nightmare.**  
User scrolls inner list to bottom → tries to scroll further → nothing happens (hitting inner scroll limit) → confused, thinks app is frozen.

**Fix**: Remove inner `maxHeight` + `overflowY`. Let the modal body be the single scroll container.

---

### 7.6 🟡 Issue E: Content Overflow on Mobile (375px)

**TransactionModal** has ~14 form sections. On mobile, the "Simpan" buttons are below the fold by the time the user fills category + asset. The recurring transaction toggle and budget alerts push critical actions even further down.

**Recommendations**:
- Collapse recurring toggle into a `<details>` / accordion pattern
- Move "Preset Kebiasaan" into a collapsible section
- Consider a sticky footer for the save buttons
- Remove the `paddingBottom: 4` from the button area (too tight, looks cramped)

---

### 7.7 🟡 Issue F: Modal Content Wrapping on Narrow Screens

Custom `title` elements with inline icons + text can wrap awkwardly:

```tsx
// BudgetModal — icon + text can break to 2 lines at 320px
title={
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <MaterialIcon name="track_changes" className="text-[24px]" />
    <span>{editingBudget ? 'Edit Anggaran' : 'Set Anggaran'}</span>
  </div>
}
```

The icon's fixed 24px + the modal's `px-6` padding (48px total) leaves only ~270px for text on a 375px screen. If the translated text is long, it wraps.

---

### 7.8 Spacing Standardization Proposal

```css
:root {
  --modal-section-gap: 16px;   /* Between major sections (gap-4) */
  --modal-field-gap: 12px;     /* Between related fields (gap-3) */
  --modal-tight-gap: 8px;      /* Very related elements (gap-2) */
}
```

| Gap | Tailwind | Use Case |
|---|---|---|
| 16px | `gap-4` | Distinct sections (Base Modal default) |
| 12px | `gap-3` | Related form fields within a section |
| 8px | `gap-2` | Very tightly coupled elements (label + input, icon + text) |

---

### 7.9 Modal Reference Implementation: ProfileMenuModal ✅

This is the ONLY modal that follows best practices:

```tsx
<Modal isOpen={isOpen} onClose={onClose} maxWidth="360px">
  {/* Child 1: Avatar + name */}
  <div className="flex flex-col items-center pt-2 pb-6">
    <img className="w-20 h-20 rounded-full ..." />
    <h3 className="font-headline-md ...">Name</h3>
    <p className="text-sm ...">Pro Plan Member</p>
  </div>

  {/* Child 2: Menu items */}
  <div className="flex flex-col gap-2 pb-2">
    <button className="w-full flex items-center gap-4 p-4 ...">Profile</button>
    <button className="w-full flex items-center gap-4 p-4 ...">Settings</button>
    <div className="h-px bg-border-light my-2" />
    <button className="w-full flex items-center gap-4 p-4 ...">Logout</button>
  </div>
</Modal>
```

- Uses base Modal's `gap-4` between the two children ✅
- Uses Tailwind `gap-2` and `gap-4` internally ✅
- Consistent padding (`p-4`) on all buttons ✅
- Clean separator with `my-2` ✅
- No manual `marginBottom: Xpx` ✅

---

### 7.10 🔢 Ripgrep Audit — Concrete Numbers

Full codebase scan via `rg` (ripgrep):

**Inline styles (`style={{`) per modal:**

| Modal | `style={{` count | Severity |
|---|---|---|
| DebtModal | 82 | 🔴 Extreme |
| AddTripExpenseModal | 73 | 🔴 Extreme |
| SplitBillModal | 73 | 🔴 Extreme |
| TransactionModal | 62 | 🔴 Extreme |
| GoalModal | 33 | 🟡 High |
| SettlementExplanationModal | 33 | 🟡 High |
| DebtPaymentModal | 32 | 🟡 High |
| DebtOffsetModal | 31 | 🟡 High |
| OverspendReallocationModal | 28 | 🟡 High |
| CategorySelectModal | 28 | 🟡 High |
| AssetSelectModal | 26 | 🟡 High |
| AssetModal | 25 | 🟡 High |
| CalculatorModal | 21 | 🟡 Medium |
| StatDetailModal | 18 | 🟡 Medium |
| CategoryModal | 15 | 🟡 Medium |
| ContactModal | 14 | 🟡 Medium |
| AssetDetailDrawer | 13 | 🟡 Medium |
| SharedExpenseDetailModal | 12 | 🟡 Medium |
| WhatsNewModal | 10 | 🟡 Medium |
| GoalSelectModal | 8 | 🟢 Low |
| ContactSelectModal | 8 | 🟢 Low |
| SharedBillsManagerModal | 8 | 🟢 Low |
| ExcelMappingModal | 6 | 🟢 Low |
| PresetManagerModal | 5 | 🟢 Low |
| BudgetModal | 4 | 🟢 Low |
| ProfileMenuModal | 1 | 🟢 Low |
| ExportModal | 1 | 🟢 Low |
| ConfirmModal | 1 | 🟢 Low |
| SyncModal | 0 | ✅ Clean |
| DateQuickSelectModal | 0 | ✅ Clean |
| PaymentMethodSelectModal | 0 | ✅ Clean |

**Grids without responsive collapse prefix — 7 occurrences across 5 files:**

| File | Line | Code | Fix |
|---|---|---|---|
| `Statistics.tsx` | 2390 | `grid grid-cols-3 gap-3` | 🔴 Hero grid — 3 cols at 375px = ~110px each |
| `Statistics.tsx` | 1815 | `grid grid-cols-2 gap-3` | 🟡 |
| `Settings.tsx` | 2507 | `grid grid-cols-2 gap-3` | 🟡 |
| `Settings.tsx` | 2488 | `grid grid-cols-2 gap-3` | 🟡 |
| `Debts.tsx` | 382 | `grid grid-cols-2 gap-3` | 🟡 |
| `Budgets.tsx` | 249 | `grid grid-cols-2 gap-4` | 🟡 |
| `Trips.tsx` | 242 | `grid grid-cols-2 gap-4` | 🟡 |

> ✅ Grids that already have responsive prefixes: 16 occurrences correctly use `md:`, `lg:`, `sm:` breakpoints.

**`alert()` placeholder calls — 5 occurrences:**

| File | Line | Content | Impact |
|---|---|---|---|
| `Budgets.tsx` | 187 | `alert('Tambah Amplop')` | Broken UX |
| `Budgets.tsx` | 168 | `alert('Fitur pindahkan dana...')` | Broken UX |
| `Budgets.tsx` | 307 | `alert('Edit Anggaran')` | Broken UX |
| `Budgets.tsx` | 308 | `alert('Hapus Anggaran')` | Broken UX |
| `Transactions.tsx` | 733 | `alert('Speech-to-text...')` | Degraded UX |

**Nested overflow containers (overflow inside overflow):**

| File | Outer | Inner | Levels |
|---|---|---|---|
| `SplitBillModal.tsx` | Modal body `overflow-y-auto` | Line 597: `overflowY: 'auto'` + Line 774: `overflowY: 'auto'` | **3** |
| `OverspendReallocationModal.tsx` | Line 132: `overflowY: 'auto'` | Line 169: `overflowY: 'auto'` | **2** |
| `AddTripExpenseModal.tsx` | Line 376: `overflowY: 'auto'` | (none, but redundant with Modal body) | **2** |
| `AssetSelectModal.tsx` | `overflow: 'hidden'` outer | Inner: `overflowY: 'auto'` × 2 | **3** |
| `CategorySelectModal.tsx` | `overflow: 'hidden'` outer | Inner: `overflowY: 'auto'` × 2 | **3** |

---

## 8. Desktop Spacing — Content Too Tight to Screen Edges

### 🔴 Issue: PageWrapper Double-Wrapping + Insufficient Desktop Padding

`PageWrapper.tsx` has a **redundant nested div** pattern that restricts content and provides too little padding on desktop:

```tsx
// ❌ Current — PageWrapper.tsx
export const PageWrapper = ({ children, className = '' }) => {
  return (
    <div className={`px-4 lg:px-6 space-y-6 max-w-container-max mx-auto pb-safe pt-6 ${className}`}>
      {/* ⚠️ INNER WRAPPER: redundant max-w + padding, kills outer spacing intent */}
      <div className="max-w-container-max mx-auto px-4 md:px-gutter space-y-8">
        {children}
      </div>
    </div>
  );
};
```

**Three problems compound:**

| # | Problem | Effect |
|---|---|---|
| 1 | **Double-wrapped div** — outer div has `px-4 lg:px-6`, inner div has `px-4 md:px-gutter` | Adds up to 2×24px but the duplication is accidental, not intentional |
| 2 | **Only 48px total desktop padding** — 24px (outer `lg:px-6`) + 24px (inner `md:px-gutter`) per side | Modern apps use **64–96px** on desktop (Copilot, Monarch, YNAB Web) |
| 3 | **`max-w-container-max` (1280px) applied twice** — both divs have it | Redundant constraint; outer `max-w` is functionally overridden by inner anyway |

**Visual comparison on a 1920px desktop monitor:**
```
MoneyApp v2.0:  [sidebar 256px] [24px+24px=48px] [content...............] [24px+24px=48px]      ← cramped
Monarch Money: [sidebar 240px] [80px...................] [content...............] [80px...................]  ← comfortable
Copilot:       [sidebar 220px] [96px..........................] [content...............] [96px..........................]  ← spacious
```

**Additionally**, the `<main>` in `Layout.tsx` has:
```tsx
<main className="lg:pl-64 pt-16 min-h-screen pb-24 lg:pb-0">
  <Outlet />
</main>
```
- `lg:pl-64` (256px) for the sidebar — **but no right padding at all**
- No horizontal padding on mobile either (that comes from PageWrapper)
- This means if a page doesn't use `PageWrapper`, content goes edge-to-edge

### Fix:
```tsx
// ✅ Corrected — PageWrapper.tsx
export const PageWrapper = ({ children, className = '' }) => {
  return (
    <div className={`px-4 sm:px-6 lg:px-12 xl:px-16 space-y-6 max-w-container-max mx-auto pb-safe pt-6 ${className}`}>
      {children}
    </div>
  );
};
```

- Remove the inner wrapper entirely
- Use responsive padding: 16px mobile → 24px sm → 48px lg → 64px xl
- Single `max-w-container-max mx-auto` container

---

## 9. Minor Polish Issues

| Issue | Location | Severity |
|---|---|---|
| Carousel cards use inline `margin: '0 -4px'` — should be Tailwind `-mx-1` | Statistics view selector | Low |
| `filter === 'all'` tab on Debts shows "Aktif" — means "active", not "all" (confusing) | `Debts.tsx` | Low |
| FAB button at `bottom-20` overlaps with potential bottom navigation | All pages with FAB | Low |
| `AssetDetailDrawer` uses inline styles extensively instead of Tailwind | Asset detail | Low |
| Budget "Pindahkan Dana" card uses `alert()` as placeholder | `Budgets.tsx:168` | Low |
| `onClick` alert placeholders on "Tambah Amplop" (`:187`), "Edit" (`:307`), "Delete" (`:308`) — broken UX | `Budgets.tsx` | Medium |
| Speech-to-text fallback uses `alert()` instead of toast — degraded UX | `Transactions.tsx:733` | Low |
| `Layout.tsx` `<main>` has `lg:pl-64` but no `lg:pr` — asymmetric, no right guard | `Layout.tsx` | Low |

---

## 10. Benchmark vs Industry Leaders

| Feature | MoneyApp v2.0 | YNAB | Copilot | Monarch |
|---|---|---|---|---|
| **Bento Grid Dashboard** | ✅ Beautiful | ⚠️ List-based | ✅ Best-in-class | ✅ Clean |
| **Mobile Grid Collapse** | ❌ Missing on several pages | ✅ Perfect | ✅ Perfect | ✅ Perfect |
| **Bottom Sheets** | ❌ Modal overlays only | ✅ | ✅ | ✅ |
| **Swipe Gestures** | ❌ | ✅ (approve/clear) | ✅ Best-in-class | ⚠️ Partial |
| **Pull-to-Refresh** | ❌ | ✅ | ✅ | ✅ |
| **Charts on Mobile** | ⚠️ Functional, cramped | ✅ Simple bars | ✅ Gorgeous | ✅ Good |
| **Dark Mode** | ✅ CSS vars | ✅ | ✅ | ✅ |
| **Animations** | ✅ Framer Motion | ⚠️ Minimal | ✅ Fluid | ⚠️ Minimal |
| **Onboarding** | ✅ Per-page tutorials | ✅ Good | ✅ Excellent | ✅ Good |
| **Privacy Mode** | ✅ Unique | ❌ | ❌ | ❌ |
| **Auto-Offset (Debts)** | ✅ Unique | ❌ | ❌ | ❌ |
| **Modal Spacing** | ❌ Inconsistent | ✅ Consistent | ✅ Consistent | ✅ Consistent |
| **Desktop Content Spacing** | ❌ Only 48px from sidebar to content | ✅ 80px+ | ✅ 96px+ | ✅ 64px+ |
| **Bottom Nav** | ❌ Sidebar only | ✅ | ✅ | ✅ |

---

## 11. Top Fixes (Prioritized)

### Priority 1 — Critical (User-Visible Bugs)

| # | Fix | Files | Effort |
|---|---|---|---|
| 1 | **Fix PageWrapper double-wrapping + desktop spacing** — remove inner div, increase desktop padding to 48-64px | `PageWrapper.tsx` | Small |
| 2 | **Remove double-wrapping from all modals** — let base Modal's `gap-4` handle spacing | All 31 modals | Medium |
| 3 | **Standardize modal spacing** — replace all `marginBottom: Xpx` with Tailwind gap classes | All 31 modals | Medium |
| 4 | **Fix SplitBillModal triple scroll** — remove inner `overflowY: auto` containers | `SplitBillModal.tsx` | Small |
| 5 | **Fix mobile grid collapse** — add `grid-cols-1 sm:grid-cols-2` to 7 grids across 5 files | `Statistics.tsx:1815,2390`, `Settings.tsx:2488,2507`, `Debts.tsx:382`, `Budgets.tsx:249`, `Trips.tsx:242` | Small |

### Priority 2 — High Impact

| # | Fix | Files | Effort |
|---|---|---|---|
| 5 | **Add responsive typography** — use `text-2xl sm:text-3xl` pattern | All pages with metric values | Small |
| 6 | **Add Bottom Sheet component** — convert modals on mobile via `useMediaQuery` | New component + all modals | Large |
| 7 | **Collapse heatmap on mobile** — replace with weekly summary list | `Statistics.tsx` | Medium |

### Priority 3 — Polish

| # | Fix | Files | Effort |
|---|---|---|---|
| 8 | **Swipe-to-delete** on transaction/asset/debt list items | `Transactions.tsx`, `Assets.tsx`, `Debts.tsx` | Large |
| 9 | **Pull-to-refresh** on Transactions page | `Transactions.tsx` | Medium |
| 10 | **Snap scrolling** on statistics carousel | `Statistics.tsx` | Small |
| 11 | **Bottom navigation bar** for mobile | New component | Large |
| 12 | **Fix placeholder `alert()` buttons** on Budgets page | `Budgets.tsx` | Small |

---

## Overall Score: 5.8 / 10

**Desktop**: 7.0/10 — Beautiful design system, but cramped content padding (48px vs industry 64-96px) and double-wrapped PageWrapper.  
**Mobile**: 4.5/10 — Functional but inconsistent spacing, missing gestures, cramped modals, no bottom sheets.  
**Modal System**: 3.5/10 — 27/31 modals use inline `style={{}}` (up to 82 per file); triple scroll bugs; nested overflow in 5 modals; spacing chaos across 24+ modals.

*Audited via `rg` (ripgrep): inline styles, `marginBottom`, `overflowY`, `grid-cols`, `alert()` placeholders — all concrete numbers in [§7.10](#710--ripgrep-audit--concrete-numbers).*
