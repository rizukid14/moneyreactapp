# Plan: Merombak Semua Desain ke Bento UI System (Component-Based)

Refaktor seluruh UI di folder `/components` dan `/pages` agar konsisten dengan design language di [Transactions.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/pages/Transactions.tsx), mengacu ketat pada [design-MII-Naufal.md](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/design-MII-Naufal.md).

## Keputusan Desain (Dari Feedback User)

| Keputusan | Pilihan |
|---|---|
| Lucide → MaterialIcon | ✅ **Full migration** di semua file |
| `<Card>` component | ✅ **Update** jadi thin Tailwind wrapper |
| Arsitektur | ✅ **Component-based** — semua pola UI yang berulang dijadikan reusable component |

---

## Analisis: Pola UI Berulang yang Harus Jadi Component

Dari audit seluruh codebase, berikut pola yang muncul berulang kali dan HARUS dijadikan component reusable:

| Pola | Muncul di | Component Baru |
|---|---|---|
| Card wrapper (`bg-bg-card p-5 rounded-3xl shadow-bento`) | Semua page | `<BentoCard>` (update `Card.tsx`) |
| Page title + subtitle | Semua page | `<PageHeader>` |
| Page wrapper dengan max-width & padding | Semua page | `<PageWrapper>` |
| Section header (title + action button) | Transactions, Assets, Debts, Settings | `<SectionHeader>` |
| Icon dalam kotak pastel (`w-8 h-8 rounded-lg bg-*-container`) | Semua card | `<IconBlock>` |
| Status badge (percentage, status label) | Transactions, Debts | `<StatusBadge>` |
| Segmented control / filter tabs | Transactions, Debts, Statistics, Settings | `<SegmentedControl>` (update `TabBar.tsx`) |
| Progress bar (`bg-surface-container-highest rounded-full`) | Transactions, Debts, Statistics, BudgetMgmt | `<ProgressBar>` |
| List item (floating, hover-able) | Assets, Debts, Settings, Modals | `<ListItem>` |
| Search input (`bg-surface-container-low rounded-lg`) | Transactions, Settings | `<SearchInput>` |
| Metric card (label + large number + badge) | Transactions, Statistics, Debts | `<MetricCard>` |
| Empty state (icon + title + description + CTA) | Assets, Debts, Trips | `<EmptyState>` |
| Filter chip / pill button | Transactions | `<FilterChip>` |
| Blurred glow blob (ornamen visual) | Transactions, Debts | Prop di `<BentoCard>` |

---

## Phase 1: Design System Foundation

### [MODIFY] [index.css](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/index.css)
- Audit semua Tailwind utilities yang digunakan design system
- Pastikan: `bg-bg-card`, `shadow-bento`, `border-border-light`, `text-on-surface`, `text-on-surface-variant`, `bg-surface-container-*`, `bg-primary-container`, `bg-secondary-container`, `text-primary-color`, `bg-income`, `bg-expense`, `font-headline-md`, `text-headline-md`, `font-label-md`, `text-label-md`, `pb-safe`, `max-w-container-max`
- **Deprecate** (jangan hapus dulu) global `.page`, `.title`, `.subtitle`, `.card` agar backward compatible sementara

### [MODIFY] [tailwind.config.js](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/tailwind.config.js)
- Verifikasi semua custom tokens tersedia
- Verifikasi `shadow-bento`, `shadow-soft` terdefinisi

---

## Phase 2: Reusable Component Library

> [!IMPORTANT]
> Ini adalah **inti dari refaktor**. Setelah semua component ini selesai, refaktor pages menjadi jauh lebih mudah — tinggal ganti markup lama dengan component baru.

### Existing Components — **UPDATE**

#### [MODIFY] [Card.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/Card.tsx) → **BentoCard**
```tsx
// Target API:
<BentoCard 
  variant="solid" | "glass" | "surface"  
  padding="sm" | "md" | "lg" | "none"
  interactive?         // adds hover:-translate-y-1
  glowColor?          // "primary" | "secondary" | "error" → blurred blob
  className?
>
```
- Render: `bg-bg-card p-5 rounded-3xl shadow-bento relative overflow-hidden group`
- Glass: `bg-surface-container rounded-3xl border border-outline-variant`
- Glow blob sebagai optional child: `absolute w-32 h-32 bg-{color} opacity-10 rounded-full blur-2xl`
- **Backward compatible**: Keep `Card` as alias export

#### [MODIFY] [Button.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/Button.tsx)
- Migrasi semua inline styles → Tailwind classes
- Primary: `bg-primary text-white rounded-xl font-bold shadow-sm hover:opacity-90`
- Danger: `bg-error text-white rounded-xl font-bold`
- Ghost: `bg-transparent text-on-surface-variant`
- Outline: `border border-outline-variant text-on-surface bg-transparent`
- Loading icon: → `<MaterialIcon name="progress_activity" />` (atau keep Loader2 for animation)

#### [MODIFY] [Input.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/Input.tsx)
- **Hapus `marginBottom: '16px'`** — spacing dikontrol parent
- Default styling: `bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface`
- Icon support via `<MaterialIcon>`
- Error state: `border-error`

#### [MODIFY] [Modal.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/Modal.tsx)
- Title: `font-headline-md text-headline-md text-on-surface`
- Close button: `<MaterialIcon name="close" />`
- Body: `space-y-4`
- Migrasi inline styles → Tailwind

#### [MODIFY] [TabBar.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/TabBar.tsx) → **SegmentedControl**
- Container: `bg-surface-container rounded-lg p-0.5 flex`
- Active: `bg-primary text-white shadow-sm rounded-md px-3 py-1.5 text-xs font-bold`
- Inactive: `text-on-surface-variant hover:text-on-surface`
- Export both `SegmentedControl` dan `TabBar` (alias)

### New Components — **CREATE**

#### [NEW] [PageWrapper.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/PageWrapper.tsx)
```tsx
// Mengganti <div className="page"> di semua halaman
<PageWrapper>
  {children}
</PageWrapper>
// Render: <div className="px-4 lg:px-6 space-y-6 max-w-container-max mx-auto pb-safe pt-6">
```

#### [NEW] [PageHeader.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/PageHeader.tsx)
```tsx
<PageHeader 
  title="Ringkasan Finansial"
  subtitle="Pantau arus kas Anda bulan ini"
  action={<DatePicker />}  // optional right-side action
/>
// Render: flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-light pb-4
```

#### [NEW] [SectionHeader.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/SectionHeader.tsx)
```tsx
<SectionHeader title="Input Cepat" action={<button>Edit Presets</button>} />
// Render: flex items-center justify-between
// Title: font-headline-md text-headline-md text-on-surface
```

#### [NEW] [IconBlock.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/IconBlock.tsx)
```tsx
<IconBlock 
  icon="account_balance_wallet"
  color="primary" | "secondary" | "income" | "expense" | "error"
  size="sm" | "md" | "lg"  // w-8 h-8, w-10 h-10, w-12 h-12
/>
// Render: rounded-lg/2xl bg-{color}-container flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm
// + <MaterialIcon name={icon} className="text-{color} text-base/lg/2xl" />
```

#### [NEW] [StatusBadge.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/StatusBadge.tsx)
```tsx
<StatusBadge 
  type="positive" | "negative" | "neutral" | "success" | "danger" | "warning"
  label="5.2% vs bulan lalu"
  icon="arrow_upward"  // optional MaterialIcon
/>
// Render: inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold
// bg-primary-container/20 text-primary-color (positive)
// bg-error-container/20 text-error (negative)
```

#### [NEW] [ProgressBar.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/ProgressBar.tsx)
```tsx
<ProgressBar 
  segments={[
    { percent: 40, color: "primary", label: "Tunai" },
    { percent: 35, color: "secondary", label: "Rekening" },
    { percent: 25, color: "outline", label: "eWallet" },
  ]}
  height="sm" | "md"  // h-1.5, h-2
/>
// Render: w-full bg-surface-container-highest rounded-full overflow-hidden flex gap-0.5 shadow-inner
```

#### [NEW] [ListItem.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/ListItem.tsx)
```tsx
<ListItem 
  left={<IconBlock icon="..." />}
  title="Makan Siang"
  subtitle="12 Jun 2026 • Gopay"
  right={<span>-Rp50.000</span>}
  onClick={() => {}}
/>
// Render: flex justify-between items-center bg-surface-container-lowest p-2 rounded-xl 
//         border border-outline-variant hover:bg-surface-container transition-colors
```

#### [NEW] [SearchInput.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/SearchInput.tsx)
```tsx
<SearchInput 
  value={query}
  onChange={setQuery}
  placeholder="Cari transaksi..."
  maxWidth="220px"
/>
// Render: flex items-center gap-2 bg-surface-container-low rounded-lg px-3 py-1.5 
//         border border-outline-variant
// + <MaterialIcon name="search" /> + <input className="!p-0 !mb-0 bg-transparent border-none" />
```

#### [NEW] [MetricCard.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/MetricCard.tsx)
```tsx
<MetricCard
  label="Total Saldo Likuid"
  value={formatCurrency(amount)}
  icon="account_balance_wallet"
  iconColor="primary"
  badge={<StatusBadge type="positive" label="5.2% vs bulan lalu" />}
  details={[
    { label: "Tunai", value: "Rp1.000.000", color: "primary" },
    { label: "Rekening", value: "Rp5.000.000", color: "secondary" },
  ]}
  progressBar={<ProgressBar segments={[...]} />}
  colSpan={6}  // grid column span
  glowColor="primary"
  onClick={() => {}}
/>
// Ini adalah gabungan BentoCard + IconBlock + StatusBadge + ProgressBar
```

#### [NEW] [EmptyState.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/EmptyState.tsx)
```tsx
<EmptyState
  icon="receipt_long"
  title="Tidak ada transaksi"
  description="Tambah transaksi pertamamu."
  action={<Button onClick={...}>Tambah</Button>}
/>
// Render: p-12 text-center text-on-surface-variant
```

#### [NEW] [FilterChip.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/ui/FilterChip.tsx)
```tsx
<FilterChip 
  label="Semua"
  isActive={true}
  onClick={() => {}}
/>
// Active: bg-primary text-white font-bold rounded-lg
// Inactive: bg-transparent text-on-surface-variant hover:bg-surface-container rounded-lg
```

---

## Phase 3: Page-Level Refactor

Setelah component library siap, refaktor pages dengan **mengganti markup lama** dengan component baru.

### 3A. [MODIFY] [Assets.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/pages/Assets.tsx) — **PRIORITAS 1**

**Sebelum → Sesudah:**
```diff
- <div className="page">
-   <h1 className="title">Aset Saya</h1>
+ <PageWrapper>
+   <PageHeader title="Aset Saya" />

- <Card variant="default" onClick={...} style={{ display: 'flex', ... }}>
-   <div style={{ width: 48, height: 48, ... }}><Icon size={24} /></div>
+ <BentoCard interactive onClick={...}>
+   <div className="flex items-center gap-4">
+     <IconBlock icon="account_balance_wallet" color="primary" size="md" />

- <h2 className="subtitle">Daftar Rekening</h2>
- <button style={{ ... }}><Plus size={20} /> Tambah</button>
+ <SectionHeader title="Daftar Rekening" action={...} />
```

- Semua Lucide icons → `<MaterialIcon>`
- AssetDetailDrawer: inline styles → Tailwind + reusable components
- Asset group labels → `<SectionHeader>` atau custom label with `font-label-md`
- Hidden assets toggle → `<ListItem>` pattern
- Empty state → `<EmptyState>`

### 3B. [MODIFY] [Debts.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/pages/Debts.tsx) — **PRIORITAS 2**

- `<div className="page">` → `<PageWrapper>`
- Header → `<PageHeader>`
- Summary cards → `<MetricCard>` atau `<BentoCard>` + inline content
- DebtCard → gunakan `<BentoCard>`, `<IconBlock>`, `<StatusBadge>`, `<ProgressBar>`
- Filter tabs → `<SegmentedControl>`
- Offset banner → `<BentoCard variant="surface">` dengan gradient
- All Lucide icons → `<MaterialIcon>`
- Empty state → `<EmptyState>`

### 3C. [MODIFY] [Statistics.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/pages/Statistics.tsx) — **PRIORITAS 3**

> [!WARNING]
> File terbesar (2523 lines). Refaktor harus sangat hati-hati.

- Page wrapper → `<PageWrapper>`
- Header → `<PageHeader>`
- View carousel → `<FilterChip>` group dalam scrollable container
- Month switcher → `<BentoCard>` wrapper
- Income/Expense cards → `<MetricCard>` dengan `<StatusBadge>`
- Chart containers → `<BentoCard variant="glass">`
- Category list → `<ListItem>` components
- All sub-views (FinancialHealth, BudgetStatistics, GoalStatistics, etc.): Apply same patterns
- Semua Lucide icons → `<MaterialIcon>`

### 3D. [MODIFY] [Settings.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/pages/Settings.tsx) — **PRIORITAS 4**

- Page wrapper → `<PageWrapper>`
- Profile card → `<BentoCard>` 
- Menu groups → `<SectionHeader>` + `<ListItem>` list
- All modal content → gunakan updated `<Input>`, `<Button>`, `<SegmentedControl>`
- Category tabs → `<SegmentedControl>`
- Carousel/Stats settings → `<ListItem>` with drag handle
- Semua Lucide icons → `<MaterialIcon>`

### 3E-3I. Remaining Pages (PRIORITAS 5-6)

#### [MODIFY] [BulkInput.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/pages/BulkInput.tsx)
- `<PageWrapper>`, `<PageHeader>`, updated `<BentoCard>`, `<Button>`
- Lucide → MaterialIcon

#### [MODIFY] [Trips.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/pages/Trips.tsx)
- `<PageWrapper>`, `<PageHeader>`, `<BentoCard>`, `<EmptyState>`
- Trip cards → `<BentoCard interactive>` + `<IconBlock>`
- Lucide → MaterialIcon

#### [MODIFY] [TripDetail.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/pages/TripDetail.tsx)
- Same treatment

#### [MODIFY] [SharedSplitBill.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/pages/SharedSplitBill.tsx)
- Same treatment

#### [MODIFY] [ReceiptScanner.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/pages/ReceiptScanner.tsx)
- Same treatment

---

## Phase 4: Component-Level Refactor

### [MODIFY] [Layout.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/Layout.tsx)
- ✅ Sudah Tailwind-based — **minimal changes**
- Sidebar nav items: verify MaterialIcon usage
- Profile section → consistent with Bento tokens

### [MODIFY] [AssetSummaryCarousel.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/AssetSummaryCarousel.tsx)
- Migrasi Typography inline → Tailwind classes
- Lucide `Eye`/`EyeOff` → `<MaterialIcon name="visibility"/"visibility_off">`
- Tier badge → `<StatusBadge>`
- Dynamic gradients tetap inline (karena computed)

### [MODIFY] [BudgetManagement.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/BudgetManagement.tsx)
- Cards → `<BentoCard>`
- Progress bars → `<ProgressBar>`
- Tabs → `<SegmentedControl>`
- Lucide → MaterialIcon

### [MODIFY] [GoalManagement.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/GoalManagement.tsx)
- Same treatment

### [MODIFY] [QuotaBanner.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/QuotaBanner.tsx)
- → `<BentoCard variant="surface">` + MaterialIcon

### [MODIFY] [SplashScreen.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/SplashScreen.tsx)
- Minimal: color tokens update

### [MODIFY] [AuthScreen.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/AuthScreen.tsx)
- Form → updated `<Input>`, `<Button>`
- Card → `<BentoCard>`

### [MODIFY] [LockScreen.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/LockScreen.tsx)
- Minimal: token consistency

### Common:
- [ConfirmDialog.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/common/ConfirmDialog.tsx): → `<BentoCard>`, `<Button>`, MaterialIcon
- [Toast.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/common/Toast.tsx): → Bento surface + MaterialIcon
- [CurrencyInput.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/common/CurrencyInput.tsx): → updated Input pattern
- [MaterialIcon.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/common/MaterialIcon.tsx): ✅ Keep as-is

### Transactions:
- [TransactionItem.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/transactions/TransactionItem.tsx): → `<ListItem>` + `<IconBlock>` + MaterialIcon
- [BulkResultsEditor.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/transactions/BulkResultsEditor.tsx): → `<BentoCard>`, `<ListItem>`

### Modals (27 files):
> [!NOTE]
> Setelah `Modal.tsx` di-update, semua modal otomatis mendapat header/body konsisten. Per-modal fokus pada konten internal: forms, lists, buttons.

**High-impact modals:**
- [TransactionModal.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/modals/TransactionModal.tsx) — form layout, `<SegmentedControl>` for type tabs
- [DebtModal.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/modals/DebtModal.tsx)
- [CategorySelectModal.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/modals/CategorySelectModal.tsx) — grid items → `<ListItem>`
- [AssetSelectModal.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/modals/AssetSelectModal.tsx) — list items
- [SplitBillModal.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/modals/SplitBillModal.tsx)

**Lower-priority modals** (use updated primitives automatically):
- DatePickerModal, ContactModal, GoalModal, BudgetModal, CalculatorModal, etc.

### Chatbot:
- [ChatBot.tsx](file:///c:/Users/DELL/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/chatbot/ChatBot.tsx) — message bubbles, header, input area → Bento tokens + MaterialIcon

---

## Phase 5: Final Cleanup & Verification

### Cleanup
- Remove Lucide imports yang sudah tidak digunakan dari semua files
- Audit: pastikan tidak ada `var(--text-main)` yang tersisa (harus `text-on-surface`)
- Audit: pastikan tidak ada `var(--text-muted)` yang tersisa (harus `text-on-surface-variant`)
- Remove deprecated `.page`, `.title`, `.subtitle` CSS jika sudah aman

### Verification Plan

#### Build Test
```bash
npm run build
```

#### Per-Page Visual Verification
- [ ] Transactions — baseline ✅
- [ ] Assets — cards, drawer, carousel, hidden section
- [ ] Debts — summary, debt list, filters, modals
- [ ] Statistics — charts, heatmap, cards, sub-views
- [ ] Settings — menu, all modal panels
- [ ] BulkInput — input area, results
- [ ] Trips/TripDetail — cards, empty states
- [ ] SharedSplitBill — settlement UI
- [ ] ReceiptScanner — camera/upload area
- [ ] All Modals — header, body, forms
- [ ] Dark Mode — semua pages

---

## Estimasi Scope

| Phase | Files | Effort |
|---|---|---|
| Phase 1: Foundation | 2 files | Kecil |
| Phase 2: Component Library | 5 update + **12 baru** = 17 files | **Besar** |
| Phase 3: Pages | 9 files | **Besar** |
| Phase 4: Components | ~20 files | Sedang-Besar |
| Phase 5: Cleanup | Across all | Kecil |
| **Total** | **~48 files** | **Sangat Besar** |

---

## Execution Order

> [!IMPORTANT]
> Saya akan kerjakan **Phase 1 + Phase 2** dulu (Foundation + Component Library), build & verify, lalu lanjut Phase 3 (Pages) satu per satu. Setiap page selesai akan di-build untuk memastikan tidak ada regresi.
