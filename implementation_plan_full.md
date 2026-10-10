# Implementation Plan — FULL (per-point, self-contained)

> **Sumber temuan:** [`AUDIT_REPORT.md`](./AUDIT_REPORT.md).
> **Tujuan:** Setiap temuan punya rencana implementasi sendiri (lokasi, akar, langkah, uji, acceptance, rollback) agar tidak ada yang missed.
> **Termasuk recurring (R1–R6) secara inline.** Detail desain recurring tetap ada di [`RECURRING_REDESIGN.md`](./RECURRING_REDESIGN.md).
> **Status:** Rencana (belum ada kode yang diubah).

### Konvensi
- **Effort:** S (<½ hari), M (½–1 hari), L (>1 hari).
- **Rollback umum:** revert commit terkait (tidak ada migrasi destruktif).
- **Wajib tiap PR:** `npx tsc -b` bersih; `npm run lint` tidak menambah error baru.

### Indeks
- KRITIS: [K1](#k1) [K2](#k2) [K3](#k3) [K4](#k4) [K5](#k5) [K6](#k6) [K7](#k7) [K8](#k8) [K9](#k9) [K10](#k10) [K11](#k11) [K12](#k12) [K13](#k13)
- TINGGI: [T1](#t1) … [T28](#t28)
- SEDANG: [M1](#m1) … [M36](#m36)
- LOW: [L1](#l1) … [L10](#l10)
- RECURRING: [R1](#r1) … [R6](#r6)

---

# KRITIS

## K1
**Hapus/gate backdoor auth**
- **Lokasi:** `src/contexts/MoneyContext.tsx:520-535, 583-587, 642`
- **Akar:** Cabang `localStorage.test_bypass_auth === 'true'` aktif di build produksi.
- **Perubahan:**
  1. Ekstrak `const E2E = import.meta.env.DEV && import.meta.env.VITE_E2E === 'true';`
  2. Semua cek `test_bypass_auth` → `if (E2E && localStorage.getItem(...) === 'true')`.
  3. Update `e2e/helpers/seed.ts` & `playwright.config.ts` set `VITE_E2E=true` untuk test.
- **Uji:** `npm run build` → di produksi `test_bypass_auth` tidak mem-bypass.
- **Acceptance:** grep `test_bypass_auth` hanya muncul di balik guard `E2E`.
- **Effort:** S

## K2
**Amankan webhook Lynk.id**
- **Lokasi:** `api/lynkid-webhook.ts:120-147`
- **Akar:** Response 401 mengembalikan `debug_info`; event `test`/`ping` lolos tanpa verifikasi.
- **Perubahan:**
  1. Hapus objek `debug_info` dari semua response.
  2. `test`/`ping` hanya lolos bila `signature` valid (bukan tanpa syarat).
  3. Jaga `timingSafeEqual` (sudah ada).
- **Uji:** curl tanpa signature → 401 tanpa field sensitif; dengan signature valid → 200.
- **Acceptance:** tidak ada `expected`/`hashed_string` di response.
- **Effort:** S

## K3
**Kuota AI atomic**
- **Lokasi:** `api/_admin.ts:116-137`
- **Akar:** read-modify-write non-atomic.
- **Perubahan:**
  1. Bungkus cek+increment dalam `db.runTransaction`.
  2. Di dalam: baca dokumen kuota, cek `used >= limit`, lalu `t.set({ value: {...used+1} })`.
- **Uji:** 2 request paralel fitur `scan` (limit 3) → tidak melebihi.
- **Acceptance:** tidak ada overshoot pada concurrency test.
- **Effort:** M

## K4
**Sembunyikan `window.__dbHelper`**
- **Lokasi:** `src/lib/db.ts:151-172`
- **Akar:** blok debug terekspos di produksi.
- **Perubahan:** guard `if (import.meta.env.DEV) { (window as any).__dbHelper = {...} }` atau hapus.
- **Uji:** bundle produksi tidak memuat `__dbHelper`.
- **Acceptance:** grep bundle → kosong.
- **Effort:** S

## K5  ⚠️ (terverifikasi)
**Perbaiki konfirmasi transaksi ChatBot**
- **Lokasi:** `src/components/chatbot/ChatBot.tsx:346-403`
- **Akar:** `addTransaction` generik (`:377`) + blok debt (`:387`) berada di dalam `if (toolArgs.type === 'transfer')`.
- **Perubahan:**
  1. Bagi menjadi `if (transfer) { ... }` dan `else { addTransaction(generic); if (linkDebt) {...} }`.
  2. Pastikan toast sukses hanya saat benar-benar menulis.
- **Uji:** konfirmasi `pengeluaran` → 1 tx; `transfer` → 1 tx (+ admin fee).
- **Acceptance:** jumlah tx sesuai tipe.
- **Effort:** S

## K6  ⚠️ (terverifikasi)
**Perbandingan bulan budget + UTC**
- **Lokasi:** `src/pages/Statistics.tsx:1675, 1682`
- **Akar:** `b.month === currentMonth.month + 1` (0–11 vs +1); `new Date(tx.date).getMonth()` UTC.
- **Perubahan:**
  1. `b.month === currentMonth.month` (0–11) + `b.year === currentMonth.year`.
  2. `parseLocalDate(tx.date).getMonth()`.
- **Uji:** budget bulan berjalan terdeteksi; adherenceRate akurat.
- **Acceptance:** `activeBudgets.length > 0` saat ada budget bulan ini.
- **Effort:** S

## K7  ⚠️ (terverifikasi)
**Perbaiki parsing nominal aset**
- **Lokasi:** `src/components/modals/AssetModal.tsx:85-91`
- **Akar:** `parseNumber("5.000.000")` = `NaN → 0`; form mengisi nilai `toLocaleString`.
- **Perubahan:** `const clean = val.replace(/[^\d-]/g,'')` ambil digit (tangani minus); jangan kirim string ter-format ke parser.
- **Uji:** edit aset tanpa retype → saldo tetap.
- **Acceptance:** initialBalance tidak jadi 0.
- **Effort:** S

## K8
**Perbaiki rules-of-hooks DebtOffsetModal**
- **Lokasi:** `src/components/modals/DebtOffsetModal.tsx:26-28`
- **Akar:** `useState` setelah `if (!isOpen) return null`.
- **Perubahan:** pindahkan semua hook ke atas guard; atau wrapper yang merender `<Body/>` setelah guard.
- **Uji:** buka/tutup modal berkali-kali → tidak error hooks.
- **Acceptance:** tidak ada perubahan jumlah hook.
- **Effort:** S

## K9
**Sanitasi role prompt API chat**
- **Lokasi:** `api/chat.ts:1108-1120`
- **Akar:** `...messages` tanpa whitelist role.
- **Perubahan:**
  1. `const safe = messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: String(m.content).slice(0, 4000) }));`
  2. Batasi jumlah pesan (mis. 40).
- **Uji:** kirim `{role:'system'}` → diabaikan.
- **Acceptance:** tidak ada role selain user/assistant di `apiMessages`.
- **Effort:** S

## K10
**Authz `shared_splits`**
- **Lokasi:** `src/lib/db.ts:812-823`, `src/pages/SharedSplitBill.tsx`
- **Akar:** read tanpa cek creator/token/expiry; nomor rekening terekspos.
- **Perubahan (bertahap):**
  1. Tambah `shareToken` + `expiresAt` saat `dbSaveSharedSplit`.
  2. `dbGetSharedSplit(id, token?)` validasi token/expiry.
  3. Tampilkan `accountNumber` hanya bila pemilik/login; anonim disembunyikan.
  4. (Fase F) rules Firestore.
- **Uji:** akses anonim → data terbatas.
- **Acceptance:** nomor rekening tidak tampil ke anonim.
- **Effort:** M

## K11
**Tambah ErrorBoundary**
- **Lokasi:** `src/App.tsx:19-86`
- **Akar:** tidak ada error boundary.
- **Perubahan:**
  1. Buat `src/components/ErrorBoundary.tsx` (class, `componentDidCatch`, UI retry + tombol reload).
  2. Bungkus `<BrowserRouter>`/route. Tambah `key` per-route agar reset on navigate.
- **Uji:** paksa import gagal → UI pemulihan.
- **Acceptance:** tidak blank.
- **Effort:** M

## K12
**Enforce premium/kuota/poin/spin di server**
- **Lokasi:** `src/contexts/PremiumContext.tsx:210-291`, `useLoginStreak.ts`, `SpinWheel.tsx`, `FamilyManagement.tsx`
- **Akar:** entitlement dihitung/disimpan di client.
- **Perubahan (butuh keputusan produk + Cloud Function/Firestore rules):**
  1. Terima hadiah/poin via endpoint server yang memvalidasi & menulis `users/{uid}`.
  2. `checkQuota` baca status server (atau hasil endpoint), bukan IndexedDB.
  3. Cegah write langsung client ke `premium`/`rewardPoints` via rules.
- **Uji:** edit IndexedDB → tidak membuka fitur.
- **Acceptance:** entitlement hanya berubah lewat server.
- **Effort:** L

## K13
**Perbaiki `logOut`**
- **Lokasi:** `src/contexts/MoneyContext.tsx:994-996, 2560`
- **Akar:** `dbClearAllData()` menghapus seluruh IndexedDB.
- **Perubahan:** hapus panggilan global; bila perlu bersihkan, scope per-`uid` (mis. hapus key `last_synced_uid`, cache user) tanpa mengosongkan store bersama.
- **Uji:** sign-out tidak menghapus data akun lain.
- **Acceptance:** data akun lain utuh setelah sign-out.
- **Effort:** S

---

# TINGGI

## T1
**Perkuat PIN** — `src/lib/utils.ts:128-135`, `MoneyContext.tsx:2350-2371`
- **Akar:** SHA-256 tanpa salt, tanpa lockout, ikut sync.
- **Langkah:** PBKDF2 + salt per-device (Web Crypto); migrasi hash lama (verifikasi sekali, lalu re-hash); jangan `dbPutSetting('pin')` ke cloud; tambah backoff setelah 5 gagal.
- **Uji:** brute-force terhambat; PIN lama masih bisa login lalu ter-upgrade.
- **Acceptance:** hash tersalt; lockout aktif. **Effort:** M

## T2
**Slot family server-side** — `FamilyManagement.tsx:45-53, 84-102`
- **Langkah:** endpoint server untuk beli slot (validasi poin + atomic decrement); batas dicek di rules/Cloud Function.
- **Uji:** concurrent purchase tidak melebihi poin. **Effort:** L (Fase F)

## T3
**Reauth Google-only** — `modals/ReauthenticateModal.tsx:19-39`
- **Langkah:** deteksi `providerData`; bila passwordless, arahkan re-login Google (`reauthenticateWithPopup`); map `auth/too-many-requests` ke pesan khusus.
- **Uji:** akun Google bisa reauth. **Effort:** M

## T4
**Auto-publish split** — `modals/SplitBillModal.tsx:326-347`
- **Langkah:** jangan `dbSaveSharedSplit` otomatis; simpan hanya saat tombol Share; atau tandai `private` dulu.
- **Uji:** simpan tanpa Share → tidak ada record publik. **Effort:** S

## T5
**Settle-up index-keyed** — `modals/SettleUpModal.tsx:231-233, 368-385`
- **Langkah:** kunci identitas stabil (pair `from→to` + id expense) bukan `idx`.
- **Uji:** tambah expense → pembayaran lama tetap benar. **Effort:** M

## T6
**Excel import** — `lib/excelImport.ts:278-289, 129-138, 237, 316`
- **Langkah:** arah dari DB/CR per baris; parser angka locale (`1.234,56` vs `1,234.56`); validasi `mm<=12, dd<=31`; hapus fallback tanpa `!isDeleted`.
- **Uji:** sample bank & format ID. **Effort:** M

## T7
**Param `category` vs `categoryId`** — `chatbot/ChatBot.tsx:380,603,676` (+ `api/chat.ts:914,968,1026`)
- **Langkah:** baca `toolArgs.category` (nama) → resolve ke id via `findBestCategoryMatch`; konsisten dengan schema tool.
- **Uji:** kategori dari AI terpasang. **Effort:** S

## T8
**Prompt injection data user** — `api/chat.ts:250,261,416-425,571-581`
- **Langkah:** jalankan `sanitize()` pada semua field user sebelum interpolasi ke system prompt.
- **Uji:** note/kategori berisi instruksi → dinetralkan. **Effort:** S

## T9
**Sync debt tak andal** — `MoneyContext.tsx:1426-1463`
- **Langkah:** tentukan `debtId` dari `transactions` sebelum `setTransactions`; jangan andalkan efek samping updater.
- **Uji:** edit tx terkait debt → debt ter-update. **Effort:** M

## T10
**`getAssetBalance`** — `MoneyContext.tsx:2295-2307`
- **Langkah:** filter `!tx.isDeleted`; konversi `convertToBaseIDR(amount, currency, exchangeRate)`; prakomputasi per-asset sekali.
- **Uji:** saldo cocok riwayat non-deleted. **Effort:** M

## T11
**Transfer dihitung ke goal** — `components/GoalManagement.tsx:123-126`
- **Langkah:** hanya hitung transfer dengan `toAssetId` = aset goal (atau kurangi yang keluar).
- **Uji:** transfer keluar tidak menambah progres. **Effort:** S

## T12
**Cutoff kartu kredit** — `components/CreditCardOptimizerCard.tsx:37-42`
- **Langkah:** clamp hari ke akhir bulan; helper selisih hari (bukan `+=30`).
- **Uji:** cutoff 31 di Feb. **Effort:** S

## T13
**Overpayment debt** — `modals/DebtPaymentModal.tsx:68-79`
- **Langkah:** validasi `numAmount <= remaining`; disable bila melebihi.
- **Uji:** input > sisa ditolak. **Effort:** S

## T14
**Realokasi melebihi sumber** — `modals/OverspendReallocationModal.tsx:95-105`
- **Langkah:** clamp `min(remaining, deficitAmount)`; disable sumber kurang; `useMemo` deps stabil.
- **Uji:** sumber < defisit → tidak negatif. **Effort:** M

## T15
**Debt tanpa principalAmount** — `modals/AddTripExpenseModal.tsx:332-349`
- **Langkah:** set `principalAmount: s.amount`.
- **Uji:** payoff benar. **Effort:** S

## T16
**Object URL bocor** — `pages/ReceiptScanner.tsx:155-172, 314, 583`
- **Langkah:** tambah `croppedImageUrl` ke deps `reset`; revoke sebelum menimpa; cleanup unmount.
- **Uji:** re-scan/navigate → tidak ada URL tersisa. **Effort:** M

## T17
**Distribusi pajak drift** — `pages/ReceiptScanner.tsx:544-564`
- **Langkah:** sisa rounding ke 1 item; clamp `factor >= 0`.
- **Uji:** jumlah item = total. **Effort:** M

## T18
**Self-transfer mutasi** — `pages/ReceiptScanner.tsx:811-862`
- **Langkah:** tolak transfer tanpa akun lawan; sertakan `time`.
- **Uji:** mutasi tanpa from/to tidak bikin self-transfer. **Effort:** S

## T19
**Streak poin dobel** — `hooks/useLoginStreak.ts:45-62, 121`
- **Langkah:** `parseLocalDate` untuk kedua ujung; set flag sesi sebelum `updateUser`; guard StrictMode.
- **Uji:** buka app 2× → poin sekali. **Effort:** M

## T20
**Button `disabled` ditimpa** — `components/ui/Button.tsx:53-57`
- **Langkah:** destructure `disabled`; spread `{...props}` sebelum `disabled={isLoading || disabled}`.
- **Uji:** loading tidak bisa diklik. **Effort:** S

## T21
**Kalender UTC** — `components/DailyFinancialCalendar.tsx:51`
- **Langkah:** `parseLocalDate(tx.date)`.
- **Uji:** tgl 1 masuk cell benar. **Effort:** S

## T22
**Net-worth salah** — `pages/Statistics.tsx:1620-1636`
- **Langkah:** filter `!isDeleted`; dukung tipe `piutang_*`/`hutang_*`; reuse logika balance.
- **Uji:** net-worth akurat. **Effort:** M

## T23
**useMemo dep kurang (Statistics)** — `pages/Statistics.tsx:423`
- **Langkah:** tambah `categoryMap` & `startOfMonthDay`.
- **Uji:** rename kategori ter-update. **Effort:** S

## T24
**useMemo dep kurang (Transactions)** — `pages/Transactions.tsx:378`
- **Langkah:** tambah `categoryMap`/`categories`.
- **Uji:** judul grup ter-update. **Effort:** S

## T25
**Listener delta bocor** — `MoneyContext.tsx:1222-1239`
- **Langkah:** simpan cleanup di ref & `return () => {...}` dari `useEffect`; jangan `return` di dalam `.then()`.
- **Uji:** remount → listener tidak menumpuk. **Effort:** M

## T26
**Listener auth bocor (Family)** — `contexts/FamilyContext.tsx:53-80`
- **Langkah:** `return` unsubscribe nyata (simpan di ref).
- **Uji:** remount provider → 1 listener. **Effort:** S

## T27
**Workspace tak divalidasi** — `contexts/FamilyContext.tsx:60-70, 232-250`
- **Langkah:** verifikasi `savedWorkspace` ada di daftar `families` sebelum `setSyncWorkspace`; fallback personal.
- **Uji:** workspaceId basi → kembali personal. **Effort:** M

## T28
**Race updateUser** — `MoneyContext.tsx:2331-2337`, `useLoginStreak.ts:108-115`
- **Langkah:** `updateUser` merge key fungsional dalam updater; jangan spread user stale.
- **Uji:** streak + redeem bersamaan → poin utuh. **Effort:** M

---

# SEDANG

## M1
**Bulan ZBB abaikan startOfMonthDay** — `modals/TransactionModal.tsx:347-348`
- **Langkah:** pakai `txMonth`/`txYear` tergeser dari `budgetAlerts`, bukan `new Date(date).getMonth()`.
- **Uji:** startOfMonthDay≠1 → reallocation di bulan benar. **Effort:** S

## M2
**JSON.parse drafts tanpa guard** — `modals/TransactionModal.tsx:114-117`
- **Langkah:** try/catch → fallback `{}`.
- **Uji:** localStorage korup → tidak crash. **Effort:** S

## M3
**Side effect di updater** — `modals/SplitBillModal.tsx:242-252`
- **Langkah:** hitung `newAssignments` di luar; panggil `setItemAssignments` & `setSplits` berurutan.
- **Uji:** StrictMode tidak menggandakan. **Effort:** S

## M4
**`isSubmitting` stuck** — `modals/BudgetModal.tsx:49-78`
- **Langkah:** `setIsSubmitting(false)` sebelum `return` jalur duplikat.
- **Uji:** submit duplikat → tombol tak terkunci. **Effort:** S

## M5
**Nama kategori di `categoryId`** — `modals/PresetManagerModal.tsx:41-42, 204`
- **Langkah:** `<option value={c.id}>`; simpan id.
- **Uji:** preset resolve kategori benar. **Effort:** S

## M6
**Semua user tampil Pro** — `modals/ProfileMenuModal.tsx:78`
- **Langkah:** derive dari `premium.isPremium`.
- **Uji:** free → "Free Plan". **Effort:** S

## M7
**bodyParser inert** — `api/chat.ts:15-21`
- **Langkah:** validasi `content-length`/byte count manual; tolak >1MB.
- **Uji:** payload besar ditolak. **Effort:** S

## M8
**Kuota sebelum validasi** — `api/chat.ts:31-54`
- **Langkah:** pindahkan konsumsi kuota setelah validasi input & API key.
- **Uji:** request invalid tidak membakar kuota. **Effort:** S

## M9
**Bulan 1–12 vs 0–11** — `api/chat.ts:210`, `ChatBot.tsx:476-478`
- **Langkah:** satu konvensi 0–11; hapus normalisasi heuristik.
- **Uji:** budget bulan cocok. **Effort:** M

## M10
**Transfer NaN** — `ChatBot.tsx:619-647`
- **Langkah:** `Number.isFinite(amt) && amt > 0`.
- **Uji:** amount invalid ditolak. **Effort:** S

## M11
**Fallback isDeleted** — `lib/excelImport.ts:237-238, 316-319`
- **Langkah:** hapus fallback tanpa `!isDeleted`.
- **Uji:** aset terhapus tidak ter-bind. **Effort:** S

## M12
**`.sort()` mutasi state** — `lib/excelExport.ts:91, 164`
- **Langkah:** `[...transactions].sort(...)`.
- **Uji:** state tidak berubah urutan. **Effort:** S

## M13
**MIME kosong lolos** — `lib/fileValidation.ts:52, 66-77`
- **Langkah:** wajib magic-byte bila type kosong; tambah signature WEBP/GIF.
- **Uji:** file disamarkan ditolak. **Effort:** M

## M14
**imageUtils tanpa onerror** — `lib/imageUtils.ts:1-29`
- **Langkah:** `img.onerror = reject`; guard `toBlob` null; revoke di `finally`.
- **Uji:** gambar korup → reject, tidak menggantung. **Effort:** S

## M15
**Recognition tanpa stop** — `hooks/useSpeechToText.ts:23-59`
- **Langkah:** `stop()` di cleanup `useEffect`.
- **Uji:** unmount saat listening aman. **Effort:** S

## M16
**DB/setState di dalam updater** — `MoneyContext.tsx:1294-1316, 1354-1364, 1472-1488, 1568-1586, 2735-2744`
- **Langkah:** hitung array berikutnya di luar updater; lakukan efek DB setelah `setState`.
- **Uji:** StrictMode tidak dobel tulis. **Effort:** L

## M17
**Effect notif self-trigger** — `MoneyContext.tsx:2775-2952`
- **Langkah:** pakai ref untuk dedupe; buang `notifications` dari deps.
- **Uji:** tidak churn. **Effort:** M

## M18
**Poll sync dibuat ulang** — `MoneyContext.tsx:1277-1291`
- **Langkah:** deps hanya `isReady`/`isFirebaseConfigured`; data via ref.
- **Uji:** interval stabil. **Effort:** M

## M19
**importData tanpa validasi** — `MoneyContext.tsx:2542-2558`
- **Langkah:** try/catch + validasi shape + reload semua koleksi.
- **Uji:** file rusak tidak merusak data. **Effort:** M

## M20
**updateDebt hanya 1 principal** — `MoneyContext.tsx:1748-1777`
- **Langkah:** rekonsiliasi semua principal tx ke `totalAmount` baru.
- **Uji:** simpan total = jumlah principal. **Effort:** M

## M21
**quota stale & redeem tak atomik** — `PremiumContext.tsx:210-235, 254-290`
- **Langkah:** `setQuota(prev => ...)`; persist dulu baru update state / rollback.
- **Uji:** concurrent update tidak hilang. **Effort:** M

## M22
**habitPresets dep kurang** — `hooks/useTransactionPresets.ts:80-141`
- **Langkah:** tambah `categories` ke deps.
- **Uji:** label ter-update setelah rename. **Effort:** S

## M23
**startOfMonthDay>28 rollover** — `hooks/useInsightData.ts:79-133`
- **Langkah:** clamp `endDay` ke hari terakhir bulan nyata.
- **Uji:** startDay=31 → periodEnd valid. **Effort:** M

## M24
**Pace tercemar filter** — `Transactions.tsx:387-396`
- **Langkah:** hitung total periode tanpa filter; hormati `startOfMonthDay`.
- **Uji:** filter "Masuk" tidak null pace. **Effort:** S

## M25
**Memo saldo 2× O(n²)** — `Transactions.tsx:508-541`
- **Langkah:** exclude `isDeleted`; hitung sekali jalan.
- **Uji:** saldo bulan lalu akurat. **Effort:** M

## M26
**Tooltip heatmap dead** — `Statistics.tsx:920-935`
- **Langkah:** ref/`data-` attr pada kartu sebenarnya.
- **Uji:** hover menampilkan tooltip. **Effort:** S

## M27
**FinancialHealth O(n²)** — `Statistics.tsx:1591-1744`
- **Langkah:** pre-index transaksi per kategori/bulan sekali.
- **Uji:** performa meningkat. **Effort:** M

## M28
**await tanpa try/catch** — `Settings.tsx:1212, 2206, 2214`
- **Langkah:** try/catch/finally reset spinner; perbaiki kondisi sukses (`r.success >= 0` salah).
- **Uji:** gagal sync tidak stuck. **Effort:** S

## M29
**Multi-currency tak dikonversi** — `pages/Assets.tsx:113-114, 375`
- **Langkah:** `convertToBaseIDR(tx.amount, tx.currency, tx.exchangeRate)`; simbol benar.
- **Uji:** total lintas mata uang benar. **Effort:** M

## M30
**Auto-offset tanpa aksi user** — `pages/Debts.tsx:411-422`
- **Langkah:** butuh konfirmasi eksplisit; rapikan deps (hapus `eslint-disable`).
- **Uji:** offset hanya setelah setuju. **Effort:** M

## M31
**Tandai belum lunas no-op** — `pages/Debts.tsx:731, 768`
- **Langkah:** sesuaikan/hapus tx offset atau `debtRole` agar `calculateDebtBalance` tidak bilang lunas.
- **Uji:** tombol mengembalikan ke tab aktif. **Effort:** M

## M32
**Effect BudgetModal reset input** — `components/BudgetManagement.tsx:560-579`
- **Langkah:** init hanya saat `isOpen`/`defaultToId`; data via ref.
- **Uji:** input tidak ter-reset. **Effort:** S

## M33
**Tailwind class dinamis** — `components/ui/MetricCard.tsx:59, 72`, `ProgressBar.tsx:42`
- **Langkah:** map class statis / inline `style`.
- **Uji:** grid span & warna render. **Effort:** S

## M34
**Toast timer bocor & tanpa aria-live** — `components/common/Toast.tsx:111-124`
- **Langkah:** clear semua timer saat unmount; tambah `role="status"`/`aria-live="polite"`.
- **Uji:** tidak ada timer nyangkut. **Effort:** S

## M35
**NODE_ENV hardcode** — `src/polyfills.ts:17-22`
- **Langkah:** set dari `import.meta.env.MODE`/`PROD`.
- **Uji:** build produksi pakai jalur prod. **Effort:** S

## M36
**Permission autotrigger** — `src/App.tsx:43-47`, `lib/notifications.ts:13`
- **Langkah:** minta dari gesture user (toggle Settings) + guard unmount.
- **Uji:** tidak ada prompt otomatis. **Effort:** M

---

# LOW

## L1
**`key={index}`** — `SplitBillModal.tsx:840`, `SharedExpenseDetailModal.tsx:50`, `SettlementExplanationModal.tsx:142`, `WhatsNewModal.tsx:64`, `ChatBot.tsx:806,1727,1982,2057`, `DropdownMenu.tsx:50`, `MetricCard.tsx:101` → key stabil (id). **Effort:** M

## L2
**`console.log` produksi** — `MoneyContext.tsx:1094,1003-1026` → ganti logger dev-only. **Effort:** S

## L3
**Dead code** — `Statistics.tsx:800-801,1325,1359,1416,1450`, `Assets.tsx:604-624`, `Layout.tsx:325-341`, `ContactSelectModal.tsx:30`, `BudgetManagement.tsx:42-53` → hapus. **Effort:** S

## L4
**Timer bocor** — `Settings.tsx:214-228`, `Transactions.tsx:202-212`, `ReceiptScanner.tsx:104-111` → clearTimeout di cleanup. **Effort:** S

## L5
**currency fallback** — `lib/currency.ts:63-68, 73-76` → throw/flag utk kode tak dikenal; `customRate ?? rate`. **Effort:** S

## L6
**Route `goals` → `<Budgets/>`** — `App.tsx:80` → verifikasi/luruskan. **Effort:** S

## L7
**err.message mentah** — `components/AuthScreen.tsx:30-31` → map `err.code`. **Effort:** S

## L8
**Listener touch re-register** — `components/ui/PullToRefresh.tsx:89-98` → state di ref; register sekali. **Effort:** S

## L9
**Ternary no-op** — `components/AssetSummaryCarousel.tsx:327` → sederhanakan. **Effort:** S

## L10
**Junk ter-commit** — hapus `case.md`, `test-admin2.js`, `TransactionModal_v1_8_1.tsx.tmp` dari repo. **Effort:** S

---

# RECURRING

## R1
**Hari diturunkan runtime dari `startDate`** — `MoneyContext.tsx:1842-1843`, `daily-cron.ts:119-120`
- **Langkah:** tambah `anchorDate` eksplisit + `time`/`timezone`/`catchUp`; generator baca dari `anchorDate`.
- **Uji:** edit anchor tidak merusak riwayat. **Effort:** M

## R2
**Cursor tunggal `lastProcessedDate`** — `MoneyContext.tsx:1845-1857`
- **Langkah:** buang ketergantungan pada cursor; existence via id deterministik + ledger.
- **Uji:** tidak resurrect. **Effort:** M

## R3
**Dua penulis client + cron** — `MoneyContext.tsx:1859-1889`, `daily-cron.ts:141-184`
- **Langkah:** modul bersama `recurring.ts` + id deterministik `auto_${rtId}_${date}` + `create-if-absent` (atomic).
- **Uji:** jalankan 2 sumber → 1 tx/occurrence. **Effort:** L

## R4
**Cek `exists` dari state in-memory** — `MoneyContext.tsx:1865, 1924`
- **Langkah:** cek existence dari DB (IDB/Firestore), bukan `transactions` state.
- **Uji:** device baru tidak dobel. **Effort:** M

## R5
**Tidak ada migrasi data lama** — (repo)
- **Langkah:** migrasi guard `migrated_recurring_v2`: `anchorDate=startDate`, bangun `skipped` dari tx auto `isDeleted`; UI "Perbaiki Jadwal".
- **Uji:** data bergeser bisa diperbaiki. **Effort:** L

## R6
**Jalur pembuat rutin salah hari** — `ChatBot.tsx:679`, `GoalModal.tsx:105`, `Settings.tsx:1312`, `TransactionModal.tsx:489-490`
- **Langkah:** semua set `anchorDate` yang benar (bukan `getLocalDate()` asal); buang `lastProcessedDate`.
- **Uji:** rutin muncul di hari yang diniatkan. **Effort:** M

> Alur lengkap 5 fase recurring ada di [`implementation_plan_recurring_v2.md`](./implementation_plan_recurring_v2.md).

---

# LAMPIRAN — Urutan Eksekusi Disarankan

1. **Keamanan cepat:** K1, K4, K2, K3, K9.
2. **Data-loss/crash:** K5, K7, K8, K13, K11.
3. **Correctness:** K6, C2 (timezone menyeluruh), T10, T21, T22, T6.
4. **Recurring Fase 1:** R2, R3, R4 (dobel + resurrect beres).
5. **Privasi/enforce:** K10, K12, T2 (Fase F + Firestore rules).
6. **Stabilitas:** T20, T25, T26, T16, T17, T28, M16, M17.
7. **Sisanya (SEDANG/LOW/G)** bertahap.

**QA global:** uji manual alur transaksi/transfer/debt/rutin/budget/statistik/import-export; uji timezone `TZ=Asia/Jakarta` & `TZ=America/Los_Angeles`; `tsc -b` bersih; lint tidak bertambah.

---

*Dokumen rencana implementasi per-point. Tidak ada kode sumber yang diubah.*
