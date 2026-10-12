# Implementation Plan — Perbaikan Temuan Code Review

> Tujuan: menuntaskan masalah yang ditemukan pada review v2.4.0, diurut dari
> risiko fungsional tertinggi ke terendah. Setiap fase punya kriteria verifikasi
> sendiri dan bisa dirilis terpisah.

## Ringkasan Temuan → Aksi

| # | Masalah | Dampak | Fase |
|---|---------|--------|------|
| 1 | `FREE_QUOTA_LIMITS` + `quotaKey` terduplikasi client/server | Bug kuota (UI vs server beda) | Fase 1 |
| 2 | Logika keuangan tanpa unit test | Kalkulasi salah luput ke prod | Fase 2 |
| 3 | `any` 395× di src & api | Error tipe lolos compiler | Fase 3 |
| 4 | `MoneyContext.tsx` God Object (~3.200 baris) | Sulit diubah & di-test | Fase 4 |
| 5 | PIN tanpa proteksi brute-force | PIN 6 digit bisa di-brute-force | Fase 5 |
| 6 | `PBKDF2_ITERATIONS` 100k (< OWASP 600k) | Lemah terhadap cracking | Fase 5 |
| 7 | Lint 602 masalah (565 error) | Quality gate gagal | Fase 0 + 6 |
| 8 | `console.log` 47×, unused vars 58× | Noise & dead code | Fase 6 |

Urutan eksekusi: **Fase 0 → 1 → 2 → 5 → 3 → 4 → 6** (fungsional & keamanan dulu).

---

## Fase 0 — Guardrails (setengah hari)

**Tujuan:** punya jaring pengaman sebelum refactor besar.

1. Tambah script di `package.json`:
   ```json
   "typecheck": "tsc -b",
   "verify": "npm run typecheck && npm run lint"
   ```
2. Jalankan auto-fix yang aman:
   ```bash
   npx eslint . --fix
   ```
3. Pastikan baseline: `npx tsc -b` lulus, catat sisa error lint ke `eslint-baseline.txt`.

**Verifikasi:** `npm run typecheck` hijau; jumlah error lint turun (target: unused vars 58 → 0).

---

## Fase 1 — Single Source of Truth Kuota (HIGH, setengah hari)

**Masalah:** `FREE_QUOTA_LIMITS` di `api/_admin.ts:78` dan
`src/contexts/PremiumContext.tsx:27`; `quotaKey` diulang di `_admin.ts:115`,
`api/redeem-reward.ts:50`, `PremiumContext.tsx:76`.

**Langkah:**
1. Buat `shared/quota.ts` (murni TS, tanpa dependency React/Firebase):
   ```ts
   export const FREE_QUOTA_LIMITS = { chat: 5, scan: 3, bulk: 2 } as const;
   export type QuotaFeature = keyof typeof FREE_QUOTA_LIMITS;
   export const getQuotaKey = (d = new Date()) =>
     `quota_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
   ```
2. Import di `api/_admin.ts`, `api/redeem-reward.ts`, dan
   `src/contexts/PremiumContext.tsx`; hapus definisi duplikat.
3. Tambahkan `shared` ke `include` di `tsconfig.app.json` dan
   `tsconfig.node.json` (untuk api) — atau alias `@shared/*`.

**Verifikasi:**
- `npx tsc -b` lulus.
- Grep memastikan hanya 1 definisi: `chat: 5` muncul 1×.
- Manual: kuota habis → server balas 403 dan UI menampilkan state yang sama.

---

## Fase 2 — Unit Test Logika Keuangan (HIGH, 1–2 hari)

**Masalah:** hanya ada e2e; `debtCalculations`, `currency`, `deltaSync` tak teruji.

**Catatan environment:** Node 24 sudah punya `crypto.subtle` bawaan (Web Crypto), jadi tidak butuh mock crypto. Hanya IndexedDB yang perlu mock (`fake-indexeddb`).

**Langkah:**
1. Tambah Vitest & mock IDB: `npm i -D vitest @vitest/coverage-v8 fake-indexeddb`.
2. Script: `"test": "vitest run"`, `"test:watch": "vitest"`.
3. Tulis test untuk modul murni:
   - `src/lib/debtCalculations.ts` — alokasi multi-tagihan, overpayment, offset.
   - `src/lib/currency.ts` — konversi kurs, pembulatan.
   - `src/lib/deltaSync.ts` — merge & timestamp (pakai `fake-indexeddb`).
   - `shared/quota.ts` — `getQuotaKey` lintas bulan/tahun.
   - `src/lib/utils.ts` — `hashPinSecure`/`verifyPin` (round-trip, legacy, langsung jalan via Web Crypto native).
4. Target coverage awal ≥ 60% untuk folder `src/lib`.

**Verifikasi:** `npm test` hijau; test gagal saat logika sengaja dirusak (sanity check).

---

## Fase 5 — Keamanan & Kuota Server (HIGH, 1 hari)

> Dikerjakan bareng Fase 2 karena keduanya menyentuh logika inti.

1. **PBKDF2 iterations** `utils.ts:189` (proteksi utama brute-force): naikkan ke `600_000` (standar OWASP). Karena format hash menyimpan param, lakukan rehash otomatis saat unlock sukses dengan skema lama.
2. **Lockout PIN di Client** (`MoneyContext.tsx:2444` `unlockApp`):
   - Catatan: sifatnya **UX deterrent** (pencegah salah pencet/coba iseng), bukan perlindungan mutlak karena storage client bisa direset lewat DevTools.
   - Simpan `failedAttempts` + `lockedUntil` di IndexedDB.
   - Backoff bertahap (5× salah → cooldown 30s). Tampilkan countdown di `LockScreen.tsx`.
3. **Rate limit API Serverless** (`api/*`):
   - Jangan pakai in-memory variable (tidak konsisten di Vercel stateless).
   - Manfaatkan Firestore transaction / counter terpusat (sudah dipakai di `checkAndConsumeQuota`) atau sliding window per-UID di Firestore.

**Verifikasi:** unit test PBKDF2 600k & rehash; simulasi cooldown di UI; hit endpoint berlebih dapat limit terpusat.

---

## Fase 3 — Kurangi `any` (MEDIUM, 2–3 hari, bertahap)

**Langkah berurutan** (dari yang paling berisiko):
1. `src/lib/db.ts` (82 error) — beri tipe `StoreName`, generic `get/put`.
2. `api/*` (135) — ganti `req: any, res: any` dengan tipe `@vercel/node`
   (`VercelRequest`, `VercelResponse`).
3. `src/contexts/MoneyContext.tsx`, `api/chat.ts` — definisikan interface
   payload alih-alih `any`.

**Verifikasi tiap batch:** `npx tsc -b` lulus, `npm test` hijau, error `no-explicit-any` turun.

---

## Fase 4 — Pecah `MoneyContext` (MEDIUM, 3–5 hari)

**Langkah:**
1. Ekstrak ke hook berbasis domain tanpa mengubah API context publik:
   - `useAuthSession` (user, login, logout)
   - `useAppLock` (pin, lock/unlock) — sekaligus wadah Fase 5
   - `useTransactions`, `useAssets`, `useDebts`
   - `useSettings`, `useCloudSync`
2. `MoneyContext` tinggal komposisi provider + `useMemo` value.
3. Migrasi pemanggil secara bertahap (biarkan `useMoney()` tetap ada agar tak breaking).

**Verifikasi:** `npm run test:e2e` (11 spec) tetap hijau; tidak ada perubahan UI.

---

## Fase 6 — Cleanup & Lint Zero (LOW, 1 hari)

1. Hapus `console.log` produksi (47×) atau bungkus `import.meta.env.DEV`.
2. Tuntaskan `react-hooks/exhaustive-deps` (35), `set-state-in-effect` (44),
   `react-refresh/only-export-components` (12).
3. Target akhir: `npm run lint` **0 error**.

**Verifikasi:** `npm run verify` hijau; `npm run build` sukses.

---

## Definition of Done

- [ ] `npm run verify` (typecheck + lint) hijau, 0 error.
- [ ] `npm test` hijau, coverage `src/lib` ≥ 60%.
- [ ] `npm run test:e2e` hijau.
- [ ] Kuota 1 sumber kebenaran; `chat: 5` hanya 1 definisi.
- [ ] PIN ada lockout + rehash 600k.
- [ ] `npm run build` sukses.

## Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Refactor MoneyContext merusak fitur | Context API publik tidak berubah; e2e sebagai jaring |
| Naikkan PBKDF2 bikin lambat di HP lama | Rehash sekali saat unlock; ukur waktu |
| Import `shared/` gagal di Vercel | Uji `vercel build`/deploy preview sebelum merge |
