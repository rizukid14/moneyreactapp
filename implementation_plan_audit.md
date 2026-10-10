# Implementation Plan — Seluruh Temuan Audit (moneyreactapp v2.3.3)

> **Mengacu pada:** [`AUDIT_REPORT.md`](./AUDIT_REPORT.md) (temuan K/T/M/LOW + Status Verifikasi).
> **Plan khusus recurring:** [`implementation_plan_recurring_v2.md`](./implementation_plan_recurring_v2.md) & [`RECURRING_REDESIGN.md`](./RECURRING_REDESIGN.md).
> **Status:** Rencana (belum ada kode yang diubah).

---

## 1. Goal

Menuntaskan temuan audit menurut prioritas risiko, dengan perubahan kecil yang bisa di-review dan di-rollback, tanpa merusak data pengguna.

**Definisi Selesai (global):**
- Semua item KRITIS tertutup.
- `npm run lint` tidak menambah error (target: turun dari 566) & `tsc -b` bersih.
- Tidak ada regresi pada uji T1–T7 recurring + uji manual alur utama.
- Setiap PR ≤ 1 fase, punya catatan rollback.

---

## 2. Aturan Kerja

1. Satu PR = satu item/kelompok kecil; jangan campur refactor besar.
2. Setiap perbaikan timezone: ganti ke `parseLocalDate()`/`getLocalDate()` — **jangan** `new Date('YYYY-MM-DD')` untuk tanggal lokal.
3. Setiap perbaikan uang: tulis unit test kecil (node) sebelum merge.
4. Jangan hapus data. Migrasi harus idempotent + guard `localStorage`.
5. Perubahan enforcement keamanan (K12/T2) perlu keputusan produk dulu (lihat §9).

---

## 3. Ringkasan Fase

| Fase | Tema | Item utama | Estimasi |
|---|---|---|---|
| A | Keamanan kritis | K1, K2, K3, K4, K9, K10, T1 | 2 hari |
| B | Anti data-loss & crash | K5, K7, K8, K13, K11 | 4 hari |
| C | Kebenaran perhitungan | K6, T6, T10, T21, T22, T13–T18 | 4 hari |
| D | Stabilitas & resource | T20, T25, T26, T16, T17, T28 | 2 hari |
| E | Transaksi rutin v2 | R1–R6 | (plan terpisah) ±4 hari |
| F | Enforce keamanan server | K12, T2, K10 lanjutan | 2–3 hari |
| G | Kebersihan & aksesibilitas | SEDANG/LOW sisanya, lint, dead code | 3 hari |

---

## 4. Fase A — Keamanan Kritis

### A1. K1 — Hapus/gate backdoor auth
- **File:** `src/contexts/MoneyContext.tsx:520-535, 583-587, 642`
- **Aksi:** bungkus semua cabang `test_bypass_auth` dengan `import.meta.env.DEV && localStorage.getItem('test_bypass_auth')==='true'`; pastikan tidak aktif di build produksi. Jika e2e butuh, pakai `VITE_E2E=true` khusus.
- **Uji:** build produksi → `localStorage.test_bypass_auth='true'` **tidak** boleh bypass.
- **Acceptance:** grep `test_bypass_auth` hanya muncul dalam guard dev.

### A2. K4 — Sembunyikan `window.__dbHelper`
- **File:** `src/lib/db.ts:151-172`
- **Aksi:** guard dengan `import.meta.env.DEV` atau hapus.
- **Acceptance:** tidak ada `__dbHelper` di bundle produksi.

### A3. K2 — Amankan webhook Lynk.id
- **File:** `api/lynkid-webhook.ts:120-147`
- **Aksi:** hapus `debug_info` dari response; wajibkan signature; event `test`/`ping` hanya bila token valid.
- **Uji:** request tanpa signature → 401 tanpa bocor data.

### A4. K3 — Kuota atomic
- **File:** `api/_admin.ts:116-137`
- **Aksi:** `db.runTransaction` + `FieldValue.increment`, atau increment lalu cek limit.
- **Uji:** 2 request paralel → tidak melewati limit.

### A5. K9 — Sanitasi role prompt
- **File:** `api/chat.ts:1108-1120` (`apiMessages`)
- **Aksi:** whitelist `role ∈ {user, assistant}`, buang `system`/`tool` dari input; batasi jumlah & panjang.
- **Uji:** kirim `{role:'system'}` → diabaikan.

### A6. K10 — Authz `shared_splits`
- **File:** `src/lib/db.ts:812-823`, `src/pages/SharedSplitBill.tsx`
- **Aksi:** baca hanya bila `creatorId` cocok / token bertanda; sediakan mode publik terbatas (tanpa nomor rekening penuh) + expiry. (Enforcement penuh di Fase F.)
- **Uji:** akses anonim → tidak tampilkan nomor rekening.

### A7. T1 — Perkuat PIN
- **File:** `src/lib/utils.ts:128-135`, `MoneyContext.tsx:2350-2371`
- **Aksi:** PBKDF2 + salt per-device; jangan sync hash ke cloud; tambah lockout bertingkat setelah N gagal.
- **Uji:** hash lama dimigrasi; brute-force terhambat.

---

## 5. Fase B — Anti Data-loss & Crash

### B1. K5 — Perbaiki konfirmasi transaksi ChatBot  ⚠️ (bug pasti)
- **File:** `src/components/chatbot/ChatBot.tsx:346-403`
- **Aksi:** pindahkan `addTransaction` generik (`:377`) + blok debt (`:387`) ke `else` (non-transfer); transfer tetap di cabangnya.
- **Uji:** konfirmasi `pengeluaran` menulis 1 tx; `transfer` menulis 1 tx (+ fee).

### B2. K7 — Perbaiki parsing nominal aset
- **File:** `src/components/modals/AssetModal.tsx:85-91`
- **Aksi:** `parseNumber` ambil murni digit; jangan beri string `toLocaleString` ke parser.
- **Uji:** edit aset tanpa retype → saldo tidak jadi 0.

### B3. K8 — Perbaiki rules-of-hooks DebtOffsetModal
- **File:** `src/components/modals/DebtOffsetModal.tsx:26-28`
- **Aksi:** pindahkan `useState` ke atas `if (!isOpen) return null`.
- **Uji:** toggle modal berulang → tidak crash.

### B4. K13 — Perbaiki `logOut`
- **File:** `src/contexts/MoneyContext.tsx:994-996, 2560`
- **Aksi:** jangan `dbClearAllData()` global; scope ke `uid` yang sign-out atau tidak hapus.
- **Uji:** sign-out tidak menghapus data akun lain.

### B5. K11 — Tambah ErrorBoundary
- **File:** `src/App.tsx:19-86` (+ komponen `ErrorBoundary.tsx` baru)
- **Aksi:** ErrorBoundary top-level + per lazy route; UI retry (reload/clear cache).
- **Uji:** paksa dynamic import gagal → tampil UI pemulihan, bukan blank.

---

## 6. Fase C — Kebenaran Perhitungan

### C1. K6 — Bulan budget + UTC  ⚠️ (terverifikasi)
- **File:** `src/pages/Statistics.tsx:1675,1682`
- **Aksi:** `b.month === currentMonth.month` (0–11) + pakai `parseLocalDate(tx.date)`. Audit konsistensi konvensi bulan di `api/chat.ts:210`, `ChatBot.tsx:476`.
- **Uji:** budget aktif terdeteksi; adherenceRate benar.

### C2. Pola timezone menyeluruh (Pola Akar #1)
- **File:** `Statistics.tsx:225,268,273,941,1201`; `Transactions.tsx:273,337`; `DailyFinancialCalendar.tsx:51`; `Budgets.tsx:101,124`; `ChatBot.tsx`; beberapa di `MoneyContext.tsx`.
- **Aksi:** ganti `new Date(tx.date)`/`new Date('YYYY-MM-DD')` → `parseLocalDate`.
- **Uji:** jalankan dengan TZ UTC-8 → tanggal tidak bergeser.

### C3. T10 — `getAssetBalance`
- **File:** `src/contexts/MoneyContext.tsx:2295-2307`
- **Aksi:** filter `!tx.isDeleted`; konversi `convertToBaseIDR(amount, currency, exchangeRate)`; prakomputasi sekali jalan.
- **Uji:** saldo cocok dengan riwayat non-deleted.

### C4. T22/T23/T24 — Net-worth & memo deps
- **File:** `Statistics.tsx:1620-1636, 423`; `Transactions.tsx:378`
- **Aksi:** filter `!isDeleted`, dukung tipe debt; tambah `categoryMap`/`startOfMonthDay` ke deps.
- **Uji:** rename kategori langsung ter-update.

### C5. T13–T18 — Uang & OCR
- **File:** `DebtPaymentModal.tsx:68` (cap bayar ≤ sisa); `OverspendReallocationModal.tsx:95` (clamp); `AddTripExpenseModal.tsx:332` (`principalAmount`); `ReceiptScanner.tsx:544` (distribusi pajak, clamp factor), `:811` (tolak self-transfer, sertakan `time`).
- **Uji:** unit test tiap kalkulasi.

### C6. T6 — Excel import
- **File:** `src/lib/excelImport.ts:278-289, 129-138, 237,316`
- **Aksi:** arah dari DB/CR per baris; deteksi locale angka; validasi tanggal `MM/DD/YYYY`; hapus fallback tanpa `!isDeleted`.
- **Uji:** sample file bank & format Indonesia.

### C7. T8/T7 ChatBot & ai — data user ke prompt, param `category`
- **File:** `api/chat.ts:250,261,416,571-581` (jalankan `sanitize`); `ChatBot.tsx:380,603,676` (baca `toolArgs.category` → resolve id).
- **Uji:** kategori dari AI terpasang benar.

---

## 7. Fase D — Stabilitas & Resource

### D1. T25/T26 — Kebocoran listener
- **File:** `MoneyContext.tsx:1222-1239`; `FamilyContext.tsx:53-80`
- **Aksi:** kembalikan cleanup nyata dari `useEffect` (simpan di ref), jangan di dalam `.then()`/async.
- **Uji:** unmount/remount → jumlah listener tidak bertambah.

### D2. T16/T17 — Object URL + distribusi pajak (reciprocally C5)
- **File:** `ReceiptScanner.tsx:155-172, 314, 583`
- **Aksi:** revoke di cleanup & sebelum menimpa; perbaiki deps `reset`; kirim file share lewat `validateFileSecure`.

### D3. T20 — Button `disabled`
- **File:** `src/components/ui/Button.tsx:53-57`
- **Aksi:** destructure `disabled` atau spread `{...props}` lebih dulu.
- **Uji:** tombol loading tidak bisa diklik.

### D4. T28 — Race reward/streak
- **File:** `MoneyContext.tsx:2331-2337`, `useLoginStreak.ts:108-115`
- **Aksi:** `updateUser` merge key secara fungsional di dalam updater.
- **Uji:** streak + redeem bersamaan → tidak ada poin hilang.

---

## 8. Fase E — Transaksi Rutin v2
- **Ikuti:** [`implementation_plan_recurring_v2.md`](./implementation_plan_recurring_v2.md) (R1–R6, 5 fase).
- **Penting:** kerjakan **Fase 1** plan itu lebih awal bila gejala dobel/resurrect masih mengganggu.

---

## 9. Fase F — Enforce Keamanan di Server (butuh keputusan produk)

> Butuh arahan produk & akses Firebase. **User review required.**

- **K12** premium/kuota/poin/spin: verifikasi entitlement di server (Cloud Function / Firestore rules) sebelum mengaktifkan fitur.
- **T2** slot family: limit & potong poin atomic di server.
- **K10 lanjutan** `shared_splits`: rules + token/expiry.
- **Firestore Security Rules:** audit rules ter-deploy (tidak ada di repo). Kriteria:
  - user hanya bisa baca/tulis `users/{uid}/**`.
  - `families/{id}/**` hanya anggota.
  - `shared_splits/{id}` read terbatas/bertoken; client tak boleh write langsung selain creator.
  - tolak write ke field sensitif (`premium`, `rewardPoints`, `pin`).
- **Deliverable:** file `firestore.rules` masuk repo + panduan deploy.

---

## 10. Fase G — Kebersihan & Aksesibilitas

- **Lint:** perbaiki `no-explicit-any` di `api/*` (tipe `VercelRequest`/`VercelResponse`/interfaces), `no-empty`, `prefer-const`; target 566 → mendekati 0.
- **God files:** pecah `MoneyContext` (split reducer/recurring/debt), `ChatBot`, `Settings`, `Statistics`.
- **Dead code & junk:** hapus `case.md`, `test-admin2.js`, `TransactionModal_v1_8_1.tsx.tmp`; bersihkan dead code (Statistics:800/1325, Assets:604, Layout:325, ContactSelectModal:30).
- **Aksesibilitas:** `role`/`aria`, focus-trap `Modal`, `aria-live` Toast, ikon/`div onClick` → `<button>`, `key` stabil (ganti index).
- **Minor:** `currency.ts:63,73`, `polyfills.ts:17` NODE_ENV, timer cleanup (`Settings:214`, `Transactions:202`, `ReceiptScanner:104`).

---

## 11. Matriks Prioritas & Dependensi

| Urut | Item | Depends on |
|---|---|---|
| 1 | A1 K1, A2 K4, A3 K2, A4 K3 | — |
| 2 | B1 K5, B2 K7, B3 K8 | — |
| 3 | B4 K13, B5 K11 | — |
| 4 | C1 K6, C2 timezone, C3 T10 | — |
| 5 | E Fase 1 recurring | — |
| 6 | A5 K9, A7 T1, C5, C6, D1–D4 | 1–5 |
| 7 | F K12/T2/K10 | keputusan produk |
| 8 | G kebersihan | sepanjang |

---

## 12. Verifikasi & QA

- Sebelum tiap merge: `npx tsc -b` bersih; `npm run lint` tidak menambah error.
- Uji manual alur: tambah/edit/hapus transaksi, transfer, debt, rutin, budget, statistik, import/export.
- Uji timezone: jalankan dev dengan `TZ=America/Los_Angeles` dan `TZ=Asia/Jakarta` untuk alur tanggal.
- Perlukas e2e Playwright untuk: konfirmasi ChatBot (B1), add asset (B2), ErrorBoundary (B5).

---

## 13. Rollback

- Fase A–D bersifat koreksi lokal → rollback = revert commit.
- Fase E aditif & idempotent → aman.
- Fase F (rules) → simpan rules lama sebelum deploy; rollback = deploy rules lama.
- Tidak ada migrasi destruktif di seluruh fase ini.

---

## 14. User Review Required

1. **Fase F (server enforcement):** boleh mulai sekarang (butuh akses Firebase/rules) atau tunda?
2. **PIN (T1):** boleh naikkan versi hash (perlu migrasi PIN lama) atau tetap kompatibel?
3. **ErrorBoundary (B5):** cukup top-level, atau per-route juga?
4. **Urutan:** setuju mulai dari **Fase A + B** (keamanan & data-loss), atau Anda mau **recurring (E Fase 1)** dulu?
5. **Lint besar-besaran (G):** kerjakan sekalian atau terpisah agar PR review kecil?

---

*Dokumen rencana implementasi. Tidak ada kode sumber yang diubah.*
