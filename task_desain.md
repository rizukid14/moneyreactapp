# Tasks: Bento UI System Refactor (Component-Based)

## Phase 1: Design System Foundation
- `[/]` Update `tailwind.config.js` — add missing tokens (`primary-color`, `income`, `expense`)
- `[ ]` Audit `index.css` — verify all Tailwind utilities work

## Phase 2: Reusable Component Library

### Existing Components — UPDATE
- `[ ]` Update `Card.tsx` → BentoCard (Tailwind wrapper)
- `[ ]` Update `Button.tsx` → Tailwind classes
- `[ ]` Update `Input.tsx` → Remove marginBottom, Tailwind classes
- `[ ]` Update `Modal.tsx` → Tailwind header/body
- `[ ]` Update `TabBar.tsx` → SegmentedControl pattern

### New Components — CREATE
- `[ ]` Create `PageWrapper.tsx`
- `[ ]` Create `PageHeader.tsx`
- `[ ]` Create `SectionHeader.tsx`
- `[ ]` Create `IconBlock.tsx`
- `[ ]` Create `StatusBadge.tsx`
- `[ ]` Create `ProgressBar.tsx`
- `[ ]` Create `ListItem.tsx`
- `[ ]` Create `SearchInput.tsx`
- `[ ]` Create `MetricCard.tsx`
- `[ ]` Create `EmptyState.tsx`
- `[ ]` Create `FilterChip.tsx`

### Build Verification (Phase 2)
- `[ ]` Run `npm run build` — zero errors

## Phase 3: Page-Level Refactor
- `[ ]` Assets.tsx
- `[ ]` Debts.tsx
- `[ ]` Statistics.tsx
- `[ ]` Settings.tsx
- `[ ]` BulkInput.tsx
- `[ ]` Trips.tsx
- `[ ]` TripDetail.tsx
- `[ ]` SharedSplitBill.tsx
- `[ ]` ReceiptScanner.tsx

## Phase 4: Component-Level Refactor
- `[ ]` AssetSummaryCarousel.tsx
- `[ ]` BudgetManagement.tsx
- `[ ]` GoalManagement.tsx
- `[ ]` QuotaBanner.tsx
- `[ ]` AuthScreen.tsx / LockScreen.tsx / SplashScreen.tsx
- `[ ]` ConfirmDialog.tsx / Toast.tsx / CurrencyInput.tsx
- `[ ]` TransactionItem.tsx / BulkResultsEditor.tsx
- `[ ]` ChatBot.tsx
- `[ ]` Modal components (27 files)

## Phase 5: Final Cleanup
- `[ ]` Remove unused Lucide imports
- `[ ]` Remove deprecated CSS classes
- `[ ]` Final build verification
