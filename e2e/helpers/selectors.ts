export const SELECTORS = {
  // Navigation & Layout
  navTransactions: '[data-testid="nav-transactions"] >> visible=true',
  navAssets: '[data-testid="nav-assets"] >> visible=true',
  navDebts: '[data-testid="nav-debts"] >> visible=true',
  navSettings: '[data-testid="nav-settings"] >> visible=true',
  navTrips: '[data-testid="nav-trips"] >> visible=true',
  navStatistics: '[data-testid="nav-statistics"] >> visible=true',
  navReceiptScanner: '[data-testid="nav-receipt-scanner"] >> visible=true',
  navBulkInput: '[data-testid="nav-bulk-input"] >> visible=true',
  sidebarToggle: '[data-testid="sidebar-toggle"]',

  // Auth Screen
  authEmail: '[data-testid="auth-email"]',
  authPassword: '[data-testid="auth-password"]',
  authSubmitBtn: '[data-testid="auth-signin-btn"]', // default submit button
  authSignUpBtn: '[data-testid="auth-signup-btn"]',
  authToggleBtn: '[data-testid="auth-toggle-mode"]',
  authErrorMsg: '[data-testid="auth-error"]',

  // Transactions
  txAddFAB: '[data-testid="transaction-add-fab"]',
  txSearchToggle: '[data-testid="transaction-search-toggle"]',
  txModal: '[data-testid="transaction-modal"]',
  txModalAmount: '[data-testid="transaction-modal-amount"]',
  txModalCategory: '[data-testid="transaction-modal-category"]',
  txModalAsset: '[data-testid="transaction-modal-asset"]',
  txModalSubmit: '[data-testid="transaction-modal-submit"]',

  // Assets
  assetAddBtn: '[data-testid="asset-add-btn"]',
  assetModal: '[data-testid="asset-modal"]',
  assetModalName: '[data-testid="asset-modal-name"]',
  assetModalType: '[data-testid="asset-modal-type"]',
  assetModalBalance: '[data-testid="asset-modal-balance"]',
  assetModalSubmit: '[data-testid="asset-modal-submit"]',

  // Debts
  debtAddFAB: '[data-testid="debt-add-fab"]',
  debtModal: '[data-testid="debt-modal"]',
  debtModalContact: '[data-testid="debt-modal-contact"]',
  debtModalDesc: '[data-testid="debt-modal-description"]',
  debtModalAmount: '[data-testid="debt-modal-amount"]',
  debtModalSubmit: '[data-testid="debt-modal-submit"]',

  // Settings
  themeToggle: '[data-testid="settings-theme-toggle"]',
  budgetModeToggle: '[data-testid="settings-budget-mode-toggle"]',
  currencyInput: '[data-testid="settings-currency-input"]',

  // AI & OCR Scanner
  ocrFileInput: '[data-testid="ocr-file-input"]',
  ocrTotalAmount: '[data-testid="ocr-total-amount"]',
  ocrMerchantInput: '[data-testid="ocr-merchant-input"]',
  ocrSaveTotalBtn: '[data-testid="ocr-save-total-btn"]',
  ocrSplitBillBtn: '[data-testid="ocr-split-bill-btn"]',
  cameraBtn: '[data-testid="camera-button"]',
  runScanBtn: '[data-testid="run-scan-btn"]',
  scanModeStruk: '[data-testid="scan-mode-struk"]',
  scanModeMutasi: '[data-testid="scan-mode-mutasi"]',

  // Bulk Input
  bulkTextarea: '[data-testid="bulk-input-textarea"]',
  bulkParseBtn: '[data-testid="bulk-parse-btn"]',
  bulkSaveBtn: '[data-testid="bulk-save-btn"]',
  bulkGlobalAssetBtn: '[data-testid="bulk-global-asset-btn"]',
};

export function testId(id: string) {
  return `[data-testid="${id}"]`;
}
