# Audit Kode — MoneyApp (moneyreactapp) v2.3.3

> **Jenis:** Read-only source audit (tidak ada perubahan kode).
> **Tanggal:** 10 Oktober 2026
> **Stack:** React 19 + TypeScript + Vite + Firebase (Firestore/Auth/FCM) + Vercel Serverless Functions
> **Cakupan:** ±150 file pada `src/` dan `api/`

---

## Ringkasan Eksekutif

Ditemukan **13 isu KRITIS**, **±30 TINGGI**, **±45 SEDANG**, dan puluhan LOW.

Empat pola akar yang berulang di hampir seluruh codebase:

1. **Parsing tanggal UTC** — `new Date('YYYY-MM-DD')` diparse sebagai UTC, padahal helper lokal `parseLocalDate()` sudah tersedia. Menyebabkan transaksi bergeser hari/bulan di zona waktu non-UTC.
2. **Trust penuh ke client** — premium, kuota, poin, hadiah spin, dan PIN ditegakkan/dihitung di client dan disimpan lokal.
3. **Effect cleanup bocor** — cleanup diletakkan di dalam `.then()` / di dalam fungsi async sehingga tidak pernah dipasang oleh React.
4. **Object URL bocor** — `URL.createObjectURL` tanpa `revokeObjectURL`.

Tiga pola sistemik tambahan (sempat kurang terwakili):

5. **Konvensi bulan tidak konsisten** — sebagian modul memakai 0–11 (`getMonth()`), sebagian 1–12 (`api/chat.ts`, `ChatBot.tsx` dengan normalisasi). Sumber K6.
6. **Soft-delete tidak konsisten** — sebagian query menghormati `isDeleted`, sebagian tidak (mis. `getAssetBalance`, net-worth, memo transaksi). Sumber T10/T22.
7. **Firestore Security Rules tidak ada di repo** — keamanan data multi-user sebenarnya bergantung pada rules ter-deploy; tidak masuk cakupan audit ini.

**Status tooling:** `npm run lint` **GAGAL** (566 error, 41 warning). `tsc -b` bersih.

---

## Legenda Severity

| Level | Arti |
|---|---|
| 🔴 KRITIS | Data loss / bypass keamanan / crash / korupsi uang |
| 🟠 TINGGI | Fitur rusak / perhitungan salah / kebocoran privasi |
| 🟡 SEDANG | Bug perilaku / anti-pattern / race condition |
| ⚪ LOW | Kebersihan kode / aksesibilitas / dead code |

---

## Status Verifikasi & Batasan (Kejujuran Cakupan)

- **Metode:** pembacaan statis kode (manual + pass otomatis per-area). **Bukan** audit runtime, bukan pengujian, bukan review Firestore rules, bukan `npm audit`.
- **Sudah diverifikasi ulang langsung di HEAD** (hasil cocok): K1, K2, K3, K4, K5, K6, K7, K11, K12, T1, T10, T20, T21, dan recurring R1–R6.
- **Belum diverifikasi ulang** (berasal dari pass otomatis per-area; perlu spot-check bila dikerjakan): sebagian besar item SEDANG & LOW (mis. detail `excelImport`, `fileValidation`, modal-modal kecil).
- **Tidak termasuk cakupan — berpotensi menyembunyikan isu:**
  1. **Firestore Security Rules** — tidak ada `firestore.rules` / `firebase.json` di repo. Keamanan data multi-user sebenarnya bergantung pada rules yang di-deploy; K10 (`shared_splits`) dsb. belum bisa dinilai final tanpa rules.
  2. **Kerentanan dependency** (`npm audit`), lisensi.
  3. **Runtime nyata** — PWA cache, offline, perangkat/latency, cron ter-deploy.
  4. **Profil performa & ukuran bundle** sebenarnya.
  5. **Firestore indexes / quota / biaya.**
- **Konsep yang sempat terlewat lalu ditambahkan:** bug recurring (lihat "Kasus Khusus: Transaksi Rutin"), konvensi bulan campur, soft-delete tidak konsisten, dan absennya Firestore rules.

---

## 🔴 KRITIS

### K1. Backdoor bypass autentikasi ikut ter-build ke produksi
- **Lokasi:** `src/contexts/MoneyContext.tsx:520-535, 583-587, 642`
- **Deskripsi:** Jika `localStorage.test_bypass_auth === 'true'`, aplikasi memakai `authUser = { uid: 'test-user-uid', email: 'test@example.com' }` dan melewati Firebase Auth sepenuhnya. Siapa pun bisa mengaktifkannya lewat DevTools.
- **Konteks:** Dipakai oleh e2e (`e2e/helpers/seed.ts:8`) tetapi tidak di-gate ke environment dev.
- **Saran:** Bungkus dengan `import.meta.env.DEV` atau flag `VITE_E2E`, dan hapus dari build produksi.

### K2. Webhook Lynk.id membocorkan data signature & event test tanpa auth
- **Lokasi:** `api/lynkid-webhook.ts:120-147`
- **Deskripsi:** Response HTTP 401 mengembalikan `debug_info` berisi `received`, `expected`, dan `hashed_string`. Event `test`/`ping` juga diterima tanpa token/signature.
- **Saran:** Hapus `debug_info` dari response produksi; wajibkan verifikasi signature untuk semua event.

### K3. Race condition kuota AI
- **Lokasi:** `api/_admin.ts:116-137`
- **Deskripsi:** Pola read-modify-write pada dokumen kuota (bukan transaksi atomic). Dua request paralel dapat membaca nilai yang sama dan melewati limit.
- **Saran:** Gunakan `FieldValue.increment()` atau `db.runTransaction()`.

### K4. `window.__dbHelper` terekspos di produksi
- **Lokasi:** `src/lib/db.ts:151-172`
- **Deskripsi:** Menyediakan `clearAll()` (hapus seluruh IndexedDB) dan `put()` ke window global. Dapat dipanggil dari konsol atau injeksi XSS.
- **Saran:** Guard dengan `import.meta.env.DEV` atau hapus.

### K5. Konfirmasi transaksi ChatBot salah tulis
- **Lokasi:** `src/components/chatbot/ChatBot.tsx:346-402`
- **Deskripsi:** Blok `addTransaction` generik (`:377`) dan debt (`:387`) berada **di dalam** `if (toolArgs.type === 'transfer')`.
  - Transaksi non-transfer → **tidak menulis apa pun**, tetapi UI menampilkan "✅ Transaksi berhasil dicatat!" (`:405-414`).
  - Transfer → menulis **dua** record transfer (`:355` dan `:377`).
- **Saran:** Pindahkan blok generik ke `else` (non-transfer).

### K6. Perbandingan bulan budget salah → skor kesehatan finansial rusak
- **Lokasi:** `src/pages/Statistics.tsx:1675` (dan `:1682`)
- **Deskripsi:** Membaca `b.month === currentMonth.month + 1` (skema 1–12), sementara budget disimpan `month = getMonth()` (0–11) — terverifikasi: `BudgetManagement.tsx:184,243` (`selectedMonth = viewDate.getMonth()`), `currentMonth.month` = `d.getMonth()` (`Statistics.tsx:185,193`). Akibatnya `activeBudgets` hampir selalu kosong, `adherenceRate` default 100, `budgetScore` selalu maksimum. Baris `:1682` juga memakai `new Date(tx.date).getMonth()` (UTC) → bug kedua.
- **Saran:** Samakan konvensi bulan (0–11) dan sertakan logika tahun/siklus finansial; gunakan `parseLocalDate`.

### K7. Parse angka aset mengubah saldo menjadi 0
- **Lokasi:** `src/components/modals/AssetModal.tsx:85` (dan dipakai di `:155`)
- **Deskripsi:** `parseNumber` menghapus semua non-digit-setelah-mengganti koma menjadi titik. Form mengisi `initialBalance` dengan `toLocaleString('id-ID')` = `"5.000.000"`; `Number("5.000.000")` = `NaN` → `0`. Edit aset tanpa mengetik ulang saldo akan menyimpan `initialBalance: 0` (korupsi data finansial).
- **Saran:** Parse murni digit: `Number(val.replace(/\D/g, ''))`; jangan pernah memberi string ter-format ke `parseNumber`.

### K8. Pelanggaran rules-of-hooks → crash
- **Lokasi:** `src/components/modals/DebtOffsetModal.tsx:26-28`
- **Deskripsi:** `if (!isOpen) return null;` berada **sebelum** `const [date, setDate] = React.useState(...)`. Saat `isOpen` berubah, jumlah hook berubah → "Rendered more hooks than during the previous render".
- **Saran:** Pindahkan `useState` ke atas guard, atau buat wrapper yang mengembalikan `null` sebelum merender body.

### K9. Injeksi role pada prompt API chat
- **Lokasi:** `api/chat.ts:1113`
- **Deskripsi:** `const apiMessages = [{ role: "system", content: systemPrompt }, ...messages]`. `messages` hanya divalidasi sebagai array (`:48`). Caller dapat menambahkan `{ role: 'system', content: '...' }` setelah system prompt dan menembus semua aturan anti-injection.
- **Saran:** Whitelist `role ∈ {user, assistant}`, normalisasi, dan batasi jumlah/panjang pesan.

### K10. `shared_splits` dapat dibaca tanpa autentikasi (IDOR)
- **Lokasi:** `src/lib/db.ts:812-823` + `src/pages/SharedSplitBill.tsx:33`
- **Deskripsi:** `dbGetSharedSplit(id)` tidak memeriksa auth, ownership, atau kedaluwarsa (hanya `isFirebaseConfigured`). Siapa pun yang memiliki link dapat membaca seluruh isi split, termasuk nama anggota dan **nomor rekening** (`SharedSplitBill.tsx:290-291`).
- **Saran:** Batasi akses berdasarkan token/`creatorId` bertanda tangan, tambahkan masa berlaku, dan jangan render nomor rekening penuh untuk pengunjung anonim.

### K11. Tidak ada Error Boundary pada lazy route
- **Lokasi:** `src/App.tsx:19-86`
- **Deskripsi:** Semua route lazy hanya dibungkus `<Suspense>`; tidak ada `ErrorBoundary`/`componentDidCatch` di seluruh codebase. Jika dynamic `import()` gagal (offline atau chunk stale pasca-deploy), seluruh aplikasi menjadi blank tanpa UI pemulihan.
- **Saran:** Tambahkan ErrorBoundary top-level (dan per-route) dengan tombol coba lagi.

### K12. Entitlement premium, kuota, poin, dan hadiah spin 100% client-side
- **Lokasi:** `src/contexts/PremiumContext.tsx:210-291`, `src/components/common/PremiumGate.tsx:17-19`, `src/hooks/useLoginStreak.ts:75-96`, `src/components/ui/SpinWheel.tsx:46-71`
- **Deskripsi:** `redeemReward` memercayai `pointCost` dari pemanggil, menetapkan `premium` lokal, dan menulis hanya ke IndexedDB ("NO SYNC to Firestore"). `checkQuota`/`PremiumGate` hanya membaca nilai lokal. Pengguna bisa membuka semua fitur premium tanpa bayar, dan membersihkan IndexedDB = reset kuota.
- **Saran:** Verifikasi entitlement di server (Cloud Function / Firestore rules) sebelum mengaktifkan fitur.

### K13. `logOut` menghapus seluruh data lokal
- **Lokasi:** `src/contexts/MoneyContext.tsx:994-996` (definisi/pemakaian `logOut` di sekitar `2560`)
- **Deskripsi:** `await dbClearAllData()` menghapus seluruh IndexedDB setelah `signOut`. Pada perangkat bersama, data pending/belum tersinkron milik akun lain ikut hilang.
- **Saran:** Scope penghapusan ke `uid` yang sign-out, atau jangan hapus sama sekali.

---

## 🟠 TINGGI

### Keamanan & Integritas

- **T1.** `src/lib/utils.ts:128-135` + `src/contexts/MoneyContext.tsx:2350-2371` — PIN 6-digit di-hash SHA-256 **tanpa salt**, dan di-sync ke Firestore. Ruang hanya 10^6 → brute-force offline instan. `unlockApp` tanpa batas percobaan/backoff. *Saran:* PBKDF2/Argon2 + salt per-device, simpan lokal saja, tambah lockout.
- **T2.** `src/components/FamilyManagement.tsx:45-53, 84-102` — Batas slot workspace & pembelian slot (potong 300 poin) hanya di client, tanpa transaksi server → bisa dilewati/race.
- **T3.** `src/components/modals/ReauthenticateModal.tsx:19-39` — Akun Google-only gagal reauth (`EmailAuthProvider.credential`); `auth/too-many-requests` jatuh ke pesan generik tanpa panduan pemulihan.
- **T4.** `src/components/modals/SplitBillModal.tsx:326-347` — `handleSave` selalu memanggil `dbSaveSharedSplit` (membuat record publik `/shared-split/:id`) meski user tidak menekan Share → kebocoran nama/nominal/rekening.
- **T5.** `src/components/modals/SettleUpModal.tsx:231-233, 368-385` — Status pembayaran dikunci dengan `idx` (`${t.from}-${t.to}-${idx}`). Saat urutan transaksi berubah, pembayaran parsial menempel ke pasangan yang salah.

### Perhitungan & Data

- **T6.** `src/lib/excelImport.ts:278-287, 289, 129-138` — Baris bank (BCA/Mandiri) dipaksa `pengeluaran`; nominal `1.000.000,00` → `NaN` (baris dibuang); `MM/DD/YYYY` → tanggal invalid `2026-15-01` tanpa validasi.
- **T7.** `src/components/chatbot/ChatBot.tsx:380, 603, 676` — Tools di `api/chat.ts:914, 968, 1026` mendefinisikan param `category`, tetapi handler membaca `toolArgs.categoryId` → kategori pilihan AI hilang.
- **T8.** `api/chat.ts:250, 261, 416-425, 571-581` — Nama kategori/goal/`note`/`topIncomeSources` disuntik ke system-prompt **tanpa** `sanitize()` → potensi prompt injection lewat nama kategori/note berisi newline.
- **T9.** `src/contexts/MoneyContext.tsx:1426-1463` — `updateTransaction` menetapkan `targetDebtId` sebagai efek samping di dalam updater `setTransactions` lalu membacanya sinkron; React bisa menjalankan updater belakangan → sync debt tidak andal.
- **T10.** `src/contexts/MoneyContext.tsx:2295-2307` — `getAssetBalance` tidak memfilter `!tx.isDeleted` dan mengabaikan `currency`/`exchangeRate` → saldo salah & mencampur mata uang.
- **T11.** `src/components/GoalManagement.tsx:123-126` — Semua `transfer` dihitung sebagai progres goal (`sum + tx.amount`), termasuk transfer keluar.
- **T12.** `src/components/CreditCardOptimizerCard.tsx:37-42` — `new Date(year, month, cutoffDay)` + `+= 30` salah untuk bulan pendek / cutoff 29-31 (Feb 31 roll ke Maret) → jumlah unbilled & rekomendasi kartu salah.
- **T13.** `src/components/modals/DebtPaymentModal.tsx:68-79` — Validasi hanya menolak `<= 0`; pembayaran dapat melebihi sisa hutang → residual negatif.
- **T14.** `src/components/modals/OverspendReallocationModal.tsx:95-105` — Realokasi selalu sebesar `deficitAmount` walau sumber lebih kecil (tombol "Sebagian" aktif) → envelope sumber negatif / dana dibuat dari nol.
- **T15.** `src/components/modals/AddTripExpenseModal.tsx:332-349` — `addDebt({... totalAmount: s.amount ...})` tanpa `principalAmount`, yang dipakai perhitungan payoff.
- **T16.** `src/pages/ReceiptScanner.tsx:155-172, 314-317, 583` — Kebocoran object URL: dep `reset` memakai `croppedImageUrl` yang stale; URL lama tidak di-revoke saat re-scan; tidak ada cleanup saat unmount.
- **T17.** `src/pages/ReceiptScanner.tsx:544-564` — Distribusi pajak/service proporsional lalu `Math.round` per item → total bisa drift; diskon > subtotal+tax+service → `factor` negatif & line item negatif.
- **T18.** `src/pages/ReceiptScanner.tsx:811-862` — Jika `fromAsset`/`toAsset` tak ter-resolve, keduanya jadi `batchAssetId` (self-transfer); save juga menghilangkan `time`.
- **T19.** `src/hooks/useLoginStreak.ts:45-62, 121` — Parse `'YYYY-MM-DD'` UTC + `Math.ceil(Math.abs(...))` + tanpa guard StrictMode → poin bisa diberikan dua kali.
- **T20.** `src/components/ui/Button.tsx:53-57` — `disabled={isLoading || props.disabled}` ditimpa oleh `{...props}` di akhir (karena `disabled` tidak di-destructure) → tombol loading tetap clickable (double submit).
- **T21.** `src/components/DailyFinancialCalendar.tsx:51-54` — `new Date(tx.date)` UTC + baca komponen lokal → transaksi tanggal 1 bisa masuk cell/bulan salah.
- **T22.** `src/pages/Statistics.tsx:1620-1636` — Loop net-worth menjumlah transaksi tanpa `!isDeleted` dan mengabaikan tipe `piutang_*`/`hutang_*` → `currentNetWorth`, rasio emergency fund, tier profil salah.
- **T23.** `src/pages/Statistics.tsx:423` — `useMemo` tanpa dep `categories`/`categoryMap`/`startOfMonthDay` → nama kategori stale setelah rename/sync.
- **T24.** `src/pages/Transactions.tsx:378` — `useMemo` tanpa dep `categoryMap` → judul grup tidak update setelah rename kategori.
- **T25.** `src/contexts/MoneyContext.tsx:1222-1239` — Cleanup listener delta (`stopDeltaListeners`, `visibilitychange`) berada di dalam `.then()` → tidak pernah dipasang; listener menumpuk.
- **T26.** `src/contexts/FamilyContext.tsx:53-80` — `unsubscribe` dari `onAuthStateChanged` dibuang (`return` di dalam `init` async) → listener menumpuk tiap remount.
- **T27.** `src/contexts/FamilyContext.tsx:60-70, 232-250` — `activeWorkspaceId` dari localStorage dipercaya tanpa verifikasi keanggotaan → berpotensi menampilkan data family lain.
- **T28.** `src/contexts/MoneyContext.tsx:2331-2337` + `src/hooks/useLoginStreak.ts:108-115` — `updateUser` last-writer-wins dari closure `user` stale → poin/streak bisa saling menimpa.

---

## 🟡 SEDANG (seleksi)

### Modal & Form
- `src/components/modals/TransactionModal.tsx:347-348` — Payload reallocation ZBB memakai `new Date(date).getMonth()/getFullYear()` mentah, mengabaikan `startOfMonthDay` (padahal `budgetAlerts` sudah geser).
- `src/components/modals/TransactionModal.tsx:114-117` — `JSON.parse` localStorage `tx_drafts` tanpa try/catch → crash jika korup.
- `src/components/modals/TransactionModal.tsx:236` — Effect draft tanpa dep `goalId` → tautan goal tidak tersimpan.
- `src/components/modals/SplitBillModal.tsx:242-252` — `setSplits` dipanggil di dalam updater `setItemAssignments` (side effect di updater).
- `src/components/modals/BudgetModal.tsx:49-78` — `isSubmitting` tidak di-reset pada jalur duplikat → tombol submit stuck.
- `src/components/modals/PresetManagerModal.tsx:41-42, 204` — Menyimpan **nama** kategori di `categoryId` (`value={c.name}`).
- `src/components/modals/ProfileMenuModal.tsx:78` — Semua user ditampilkan "Pro Plan Member".
- `src/components/modals/ExcelMappingModal.tsx:25-34` — State `mapping` tidak di-reset saat reopen/ganti file.
- `src/components/modals/DebtModal.tsx:147-154` — Memakai `alert()` (inkonsisten dengan toast).
- `src/components/modals/AddTripExpenseModal.tsx:45-97` — Effect bergantung pada identitas objek `trip` → form reset saat parent re-render.
- `src/components/modals/SettlementExplanationModal.tsx:108` — `useMemo` membaca `settlementData` tapi tidak ada di deps.

### ChatBot & API
- `api/chat.ts:15-21` — `config.bodyParser.sizeLimit` adalah konvensi Next.js; **inert** di Vercel function (limit 1MB tidak berlaku).
- `api/chat.ts:31-54` — `checkAndConsumeQuota` dipanggil sebelum validasi input & cek API key → request invalid tetap membakar kuota.
- `api/chat.ts:210` — `endMonthVal` 1–12 vs budget client 0–11 → `currentBudget` tidak pernah cocok, selalu fallback.
- `api/chat.ts:1282-1285` — `error.message` internal dikembalikan ke client.
- `src/components/chatbot/ChatBot.tsx:476-478` — Normalisasi bulan budget salah geser April bila `targetMonth === currentJsMonth + 1`.
- `src/components/chatbot/ChatBot.tsx:579` — Typo `categoryIdName` (harus `categoryName`) → baris budget menampilkan ID mentah.
- `src/components/chatbot/ChatBot.tsx:619-647` — Rekomendasi transfer bisa menyimpan `NaN` (`Number(tf.amount)` tanpa validasi).

### Excel / File
- `src/lib/excelImport.ts:237-238, 316-319` — Fallback kedua tanpa `!isDeleted` → aset/kategori terhapus bisa ter-bind.
- `src/lib/excelImport.ts:87-95` — `extractExcelHeaders` membuang header kosong → indeks kolom bergeser vs parser.
- `src/lib/excelExport.ts:91, 164` — `.sort()` memutasi array state pemanggil (harus `[...transactions].sort`).
- `src/lib/fileValidation.ts:52, 66-77` — MIME kosong auto-lolos; hanya PNG/JPEG dicek signature (webp/gif lolos); jalur share PWA (`ReceiptScanner.tsx:114-136`) melewati `validateFileSecure`.
- `src/lib/imageUtils.ts:1-29` — Tanpa `img.onerror`, promise menggantung, object URL bocor, `toBlob` bisa resolve `null`.
- `src/hooks/useSpeechToText.ts:23-59` — Recognition tidak di-`stop()` saat unmount.

### State & Sync
- `src/contexts/MoneyContext.tsx:1294-1316, 1354-1364, 1472-1488, 1568-1586, 2735-2744` — Panggilan DB & `setState` bersarang di dalam updater `useState` (impure; dobel saat StrictMode).
- `src/contexts/MoneyContext.tsx:2775-2952` — Effect notifikasi menyertakan `notifications` di deps sambil memanggil `setNotifications` → churn & reset timer.
- `src/contexts/MoneyContext.tsx:1277-1291` — Effect poll sync dibuat ulang tiap perubahan `transactions`/`assets`/`debts`.
- `src/contexts/MoneyContext.tsx:2542-2558` — `importData` tanpa validasi/try-catch; hanya memuat ulang sebagian koleksi.
- `src/contexts/MoneyContext.tsx:1748-1777` — `updateDebt` hanya menyesuaikan principal tx pertama (bisa >1).
- `src/contexts/MoneyContext.tsx:2698-2701` — `setMonthIncome` id `${year}-${month}` tidak zero-padded, kontrak `"YYYY-MM"`.
- `src/contexts/PremiumContext.tsx:210-235, 254-290` — `quota` closure stale & `redeemReward` tidak atomik (state di-update sebelum write; tanpa rollback).
- `src/hooks/useTransactionPresets.ts:80-141` — `useMemo` `habitPresets` tanpa dep `categories` → label stale.
- `src/hooks/useInsightData.ts:79-133` — `startOfMonthDay > 28` → `endDay` rollover (mis. "31 Februari") & `daysToEOM` salah.
- `src/hooks/useSwipeGesture.ts:19-30` — `setSwipeOffset` tiap frame drag; threshold haptic pakai nilai stale (render sebelumnya).

### Halaman
- `src/pages/Transactions.tsx:387-396` — Pace/budget insight terkontaminasi filter aktif; `daysPassed = now.getDate()` abaikan `startOfMonthDay`.
- `src/pages/Transactions.tsx:508-541` — Memo saldo bulan lalu menghitung transaksi terhapus & 2× O(assets×transactions).
- `src/pages/Statistics.tsx:920-935` — Tooltip heatmap dead code (`closest('.card.glass')` tak pernah cocok).
- `src/pages/Statistics.tsx:1283-1289` — Legend menampilkan "Pendapatan" padahal seri income tidak di-plot.
- `src/pages/Statistics.tsx:1591-1744` — FinancialHealth O(assets×transactions) & O(budgets×transactions).
- `src/pages/Settings.tsx:1212, 2206, 2214` — `await` tanpa try/catch → unhandled rejection & spinner stuck; `if (r.success >= 0)` selalu true.
- `src/pages/Assets.tsx:113-114, 375` — Nominal mata uang asing tidak dikonversi di statistik/drawer.
- `src/pages/Budgets.tsx:101, 124` — `new Date(tx.date)` UTC vs `periodStart/End` lokal.
- `src/pages/Debts.tsx:411-422` — Auto-offset memutasi data tanpa aksi user; dep disembunyikan via `eslint-disable`.
- `src/pages/Debts.tsx:731, 768` — "Tandai Belum Lunas" no-op untuk debt yang lunas karena saldo (`isPaid` tetap true dari `calculateDebtBalance`).
- `src/pages/BulkInput.tsx:181-217` — Dep `handleParse` berubah tiap ketikan → re-subscribe effect.
- `src/components/BudgetManagement.tsx:560-579` — Effect `MoveMoneyModal` reset input saat array parent berubah identitas.
- `src/components/modals/StreakRewardModal.tsx:58-61` — `setTimeout` 800ms tanpa cleanup.

### Komponen/UI
- `src/components/ui/Modal.tsx:20-59` — Effect re-run tiap render (dep `onClose` inline) → churn scroll-lock; `overflow` tidak dipulihkan ke nilai sebelumnya.
- `src/components/ui/MetricCard.tsx:59, 72` & `src/components/ui/ProgressBar.tsx:42` — Class Tailwind dinamis (`md:col-span-${x}`, `bg-${color}`) di-purge JIT.
- `src/components/common/Toast.tsx:111-124` — Timer tidak dibersihkan saat provider unmount; container tanpa `role="status"`/`aria-live`.
- `src/components/QuotaBanner.tsx:30-40` — `setTimeout` reset state tanpa cleanup.
- `src/components/AssetSummaryCarousel.tsx:461-467` — `setTimeout` animasi tanpa cleanup.
- `src/polyfills.ts:17-22` — `process.env.NODE_ENV` di-hardcode `'development'` di semua build.
- `src/App.tsx:43-47` + `src/lib/notifications.ts:13` — `Notification.requestPermission()` otomatis saat mount (bukan dari gesture user).

---

## ⚪ LOW (ringkas)

- `key={index}` di: `SplitBillModal.tsx:840`, `SharedExpenseDetailModal.tsx:50`, `SettlementExplanationModal.tsx:142`, `WhatsNewModal.tsx:64`, `ChatBot.tsx:806,1727,1982,2057`, `DropdownMenu.tsx:50`, `MetricCard.tsx:101`.
- `console.log` produksi: `src/contexts/MoneyContext.tsx:1094` (mencetak seluruh dokumen delta), blok diagnostik `:1003-1026`.
- Dead code: `Statistics.tsx:800-801, 1325, 1359, 1416, 1450`, `Assets.tsx:604-624` (`totalNetWorth` tak dipakai), `Layout.tsx:325-341`, `ContactSelectModal.tsx:30`, `BudgetManagement.tsx:42-53` (`isMenuOpen` tak dipakai).
- Timer bocor: `Settings.tsx:214-228`, `Transactions.tsx:202-212`, `ReceiptScanner.tsx:104-111`.
- `src/lib/currency.ts:63-68` — Mata uang tak dikenal dianggap rate 1 (IDR); `:73` `customRate ||` mengabaikan nilai `0`.
- `src/lib/utils.ts` — `getNextDateSafe` sudah benar; tetapi pemakaian `new Date(date)` yang tersebar tetap perlu audit.
- `src/App.tsx:80` — Route `path="goals"` merender `<Budgets/>` (verifikasi apakah disengaja).
- `src/components/common/AuthScreen.tsx:30-31` — Menampilkan `err.message` mentah Firebase.
- `src/components/ui/PullToRefresh.tsx:89-98` — Listener touch didaftarkan ulang di tengah gesture.
- `src/components/AssetSummaryCarousel.tsx:327` — Ternary no-op `def.negate ? value : value`.
- Junk ter-commit: `case.md`, `test-admin2.js`, `TransactionModal_v1_8_1.tsx.tmp`.

---

## Tooling & Kualitas Kode

| Item | Temuan |
|---|---|
| ESLint | `npm run lint` gagal: **566 error, 41 warning** (mayoritas `no-explicit-any` di `api/*`). |
| TypeScript | `tsc -b` bersih. |
| God files | `MoneyContext.tsx` 3107, `ChatBot.tsx` 2660, `Settings.tsx` 2577, `Statistics.tsx` 2306 baris. |
| Duplikasi | `initializeAdmin()` disalin identik di 4 file API. |
| `.gitignore` | `.env` & `dist/` sudah diabaikan (baik); file junk di atas tetap ter-commit. |

---

## Pola Akar (Root Causes)

1. **Timezone:** Ganti semua `new Date('YYYY-MM-DD')` / `new Date(tx.date)` dengan `parseLocalDate()` dari `src/lib/utils.ts:20`. **Catatan:** generator recurring sudah diperbaiki (commit `f78614b`), jadi ini berlaku untuk file lain (Statistics, Transactions, DailyFinancialCalendar, Budgets, ChatBot).
2. **Client trust:** Pindahkan enforcement premium, kuota, poin, spin, dan slot family ke server (Cloud Function / Firestore rules).
3. **Cleanup effect:** Jangan letakkan `return () => {...}` di dalam `.then()` / fungsi async; simpan cleanup di ref.
4. **Object URL:** Selalu `revokeObjectURL` di `useEffect` cleanup dan sebelum menimpa URL lama.

---

## Kasus Khusus: Transaksi Rutin (Recurring)

> Ditambahkan setelah verifikasi commit. Lihat desain perbaikan lengkap di [`RECURRING_REDESIGN.md`](./RECURRING_REDESIGN.md).

### Gejala yang dilaporkan
Rutin bulanan tanggal 4 (bayar kos Rp1,4 jt) muncul di tanggal 2/3; `lastProcessedDate` berhenti di tanggal 2; menghapus transaksi justru membuatnya terbuat lagi.

### Status perbaikan kode (sudah ada di HEAD)
- `f78614b` — "fix timezone shift, cron duplication, leap year and date overflow": client & `api/daily-cron.ts` kini pakai `parseLocalDate` + `originalDay` + `getLocalDate`/`formatDateStr` (bukan `toISOString`), plus clamp hari ke akhir bulan.
- `0f5b195` — "resolve soft-delete resurrection and daily-cron filtering": guard `isDeleted` pada recurrent + loop cron.

**Terverifikasi:** `getNextDateSafe(..., 'monthly', 4)` di HEAD benar (chain: 09-04, 10-04, 11-04, ...). Jadi **rumus sudah benar**.

### Mengapa bug bisa masih terlihat (akar desain belum tertutup)
| # | Akar | Bukti / catatan |
|---|---|---|
| R1 | Hari diturunkan runtime dari `startDate.getDate()` | `MoneyContext.tsx:1842-1843`, `daily-cron.ts:119-120`. Data lama yang sudah bergeser tetap hasilkan hari salah **selamanya**. |
| R2 | Cursor tunggal `lastProcessedDate` | Tidak bisa membedakan "belum dibuat" vs "sengaja dihapus user" → resurrect. |
| R3 | Dua penulis client + cron | `MoneyContext.tsx:1859-1889` & `daily-cron.ts:141-184`; id `auto-<rtId>-<tgl>` hanya sama bila tanggal sama; timezone berbeda → id beda → dobel. |
| R4 | Regenerasi cek `exists` dari state in-memory | `MoneyContext.tsx:1865,1924` — data server yang belum tersinkron dianggap "hilang". |
| R5 | Tidak ada **migrasi** untuk `recurring_transactions` | `grep "migrat.*recurring"` → kosong. Fix bebas forward-only. |
| R6 | Jalur pembuat rutin salah hari | `ChatBot.tsx:679` `startDate: getLocalDate()` (hari chat); `GoalModal.tsx:105`, `Settings.tsx:1312` pakai tanggal lain. |

### Pendekatan baru yang disarankan — "Rule + Pure Schedule + Idempotent Materialize + Exception Ledger"
1. **Jadwal eksplisit:** simpan `anchorDate` (+ `time`, `timezone`, `catchUp`), hapus ketergantungan `lastProcessedDate`.
2. **Fungsi murni:** `schedule(rule, from, to)` deterministik dari `anchorDate` + `frequency`; pakai string `YYYY-MM-DD`, tanpa `toISOString`.
3. **Idempotent:** id deterministik `auto_${rtId}_${date}` + `create-if-absent` dalam `runTransaction` → client & cron aman, mustahil dobel, editan tidak tertimpa.
4. **Ledger:** `recurring_exceptions/{rtId}.skipped[date]` → hapus tak resurrect.
5. **Migrasi + UI "Perbaiki Jadwal"** untuk data lama yang sudah bergeser.

**Pemetaan ke audit:** menutup R1–R6; juga bagian dari Pola Akar #1 (timezone) **khusus recurring**, dan berhubungan dengan T25 (listener) hanya secara tidak langsung.

**Rencana uji:** `scripts/test_recurring_comprehensive.js` diperluas → T1 timezone, T2 idempotensi (jalankan 2×), T3 hapus, T4 edit, T5 clamp bulan, T6 catch-up, T7 migrasi.

---

## Urutan Perbaikan yang Disarankan

1. **Keamanan cepat:** K1 (backdoor), K4 (`__dbHelper`), K2 (webhook), K3 (kuota).
2. **Data-loss/crash:** K5 (ChatBot), K7 (AssetModal), K8 (DebtOffsetModal), K13 (logOut).
3. **Perhitungan:** K6 (bulan budget), T6 (Excel), T10/T22 (saldo/net-worth), T21 (kalender).
4. **Privasi/entitlement:** K10 (shared_splits), K11 (ErrorBoundary), K12/T2 (premium & poin server-side), T1 (PIN).
5. **Stabilitas:** T25/T26 (leak listener), T16/T17 (object URL & distribusi pajak), T20 (Button).
6. **Kebersihan:** Lint, hapus dead code/log, pecah god files, hapus file junk.
7. **Transaksi Rutin (R1–R6):** idempotensi `create-if-absent` + ledger `skipped` (Fase 1), lalu `anchorDate` + `schedule()` murni + migrasi (Fase 2). Lihat `RECURRING_REDESIGN.md`.

---

*Dokumen ini dihasilkan dari audit read-only. Tidak ada kode sumber yang diubah.*
