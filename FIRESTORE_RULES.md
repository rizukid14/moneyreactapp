# Panduan Deploy Firestore Rules (Fase F)

File `firestore.rules` membatasi akses data per pengguna & per keluarga, dan
menjadikan dokumen **premium** sebagai *server-authoritative*.

> ⚠️ **Baca bagian "Dampak" sebelum deploy** — ada fitur client-side yang perlu
> dipindah ke server agar tidak ikut diblokir.

---

## 1. Yang diatur oleh rules

| Path | Aturan |
|---|---|
| `users/{uid}/**` | Hanya pemilik (`request.auth.uid == uid`) |
| `users/{uid}/settings/premium` | **Read** pemilik, **Write** hanya server (Admin SDK) |
| `users/{uid}/settings/*` (lainnya, termasuk `premiumActivationCode`) | Read/write pemilik |
| `families/{id}/**` | Hanya anggota (uid ada di `members`) |
| `shared_splits/{id}` | Read publik (link), write hanya `creatorId` |
| Semua lainnya | Ditolak |

---

## 2. Dampak yang perlu diketahui

1. **Aktivasi premium** tetap aman karena `api/lynkid-webhook.ts` memakai
   **Firebase Admin SDK** (melewati rules). ✅
2. **`redeemReward` (tukar poin jadi premium/kuota)** kini ditangani
   **Vercel Serverless Function** `api/redeem-reward.ts` (Admin SDK), jadi
   sudah aman dengan rules ini. Client hanya memanggil endpoint & menerima hasil.
3. **Beli slot workspace** ditangani `api/purchase-slot.ts` (Admin SDK).
4. **`rewardPoints`** ada di dokumen `settings/user` dan masih **bisa ditulis
   pemilik**. Untuk anti-curang poin penuh, pindahkan penambahan poin harian
   (`useLoginStreak`) ke server juga.
5. **Kuota** tidak tersinkron ke Firestore (hanya lokal), jadi tidak terpengaruh.
6. **Shared split** tetap bisa dibaca lewat link (read publik). Token K10 tidak
   bisa ditegakkan di rules; kalau mau privat, ubah pembacaan lewat endpoint
   Vercel yang memverifikasi token.

---

## 3. Cara deploy

### Opsi A — Firebase CLI (disarankan)
```bash
# 1. Install CLI (sekali saja)
npm i -g firebase-tools

# 2. Login
firebase login

# 3. Arahkan ke project Firebase Anda
firebase use <PROJECT_ID>       # contoh: moneyapp-xxxx

# 4. (Opsional) buat .firebaserc agar project tersimpan
#    { "projects": { "default": "<PROJECT_ID>" } }

# 5. Deploy HANYA rules (tidak menyentuh hosting/functions)
firebase deploy --only firestore:rules
```

### Opsi B — Firebase Console (tanpa CLI)
1. Buka **Firebase Console → Firestore Database → Rules**.
2. Copy-paste isi `firestore.rules`.
3. Klik **Publish**.

---

## 4. Uji cepat setelah deploy

- Login sebagai user A, buat 1 transaksi → harus sukses.
- Coba dari console browser (DevTools) menulis premium:
  ```js
  // di Console halaman (setelah login)
  import('https://www.gstatic.com/firebasejs/10.x/firebase-firestore.js')
  // tulis ke users/<uid>/settings/premium → harus DITOLAK (permission-denied)
  ```
- Cron Lynk.id (webhook) tetap bisa menulis premium (Admin SDK) → cek aktivasi.

---

## 5. Varian "soft" (jika belum siap pindah reward ke server)

Kalau ingin menutup akses lintas-user dulu **tanpa** memblokir fitur reward,
ganti blok `settings` menjadi:
```
match /users/{uid}/settings/{key} {
  allow read, write: if isOwner(uid);
}
```
Ini menutup kebocoran data antar-user, tetapi premium/poin **masih** bisa diubah
pemilik dari DevTools (K12 belum tuntas). Deploy varian keras (§1) setelah
endpoint Vercel reward tersedia.

---

## 6. Endpoint server (sudah dibuat)

Sudah tersedia di folder `api/` (Vercel Serverless Function, memakai
`firebase-admin` + `verifyAuth`), dan client sudah diarahkan ke sana:
- `api/redeem-reward.ts` — validasi poin (harga di sisi server) & tulis premium/kuota.
- `api/purchase-slot.ts` — potong poin & naikkan `unlockedWorkspaceSlots`.
- `api/daily-claim.ts` — klaim poin harian (streak, multiplier, milestone) di server.

Dengan ini `rewardPoints` dan `premium` naik lewat server. (Client masih menulis
`settings/user` untuk bio/profil, jadi penguncian penuh poin butuh memindahkan
profil ke dokumen terpisah — opsional ke depan.)


---

*Dokumen panduan. Rules belum di-deploy otomatis; Anda yang publish.*
