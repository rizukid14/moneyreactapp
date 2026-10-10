import admin from 'firebase-admin';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, initializeAdmin } from './_admin.js';

// Server-authoritative reward catalogue (must mirror RewardsStoreModal UI).
const REWARD_COSTS: Record<string, number> = {
  scan_3: 50,
  chat_5: 75,
  bulk_1: 100,
  premium_1d: 150,
  premium_3d: 400,
  premium_7d: 700,
  premium_30d: 2500,
};

const PREMIUM_DAYS: Record<string, number> = {
  premium_1d: 1,
  premium_3d: 3,
  premium_7d: 7,
  premium_30d: 30,
};

const QUOTA_GRANTS: Record<string, { feature: 'scan' | 'chat' | 'bulk'; amount: number }> = {
  scan_3: { feature: 'scan', amount: 3 },
  chat_5: { feature: 'chat', amount: 5 },
  bulk_1: { feature: 'bulk', amount: 1 },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const user = await verifyAuth(req, res);
  if (!user) return;

  const { type } = req.body || {};
  const cost = REWARD_COSTS[type];
  if (!cost) {
    return res.status(400).json({ success: false, error: 'Reward tidak dikenal' });
  }

  try {
    initializeAdmin();
    const db = admin.firestore();
    const settings = db.collection('users').doc(user.uid).collection('settings');
    const userRef = settings.doc('user');
    const premiumRef = settings.doc('premium');
    const now = new Date();
    const quotaKey = `quota_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const quotaRef = settings.doc(quotaKey);

    const result = await db.runTransaction(async (tx) => {
      // Firestore transactions require ALL reads before ANY writes.
      const userSnap = await tx.get(userRef);
      const premiumSnap = await tx.get(premiumRef);
      const quotaSnap = await tx.get(quotaRef);

      const profile = userSnap.exists ? (userSnap.data()?.value ?? userSnap.data()) : {};
      const points = Number(profile?.rewardPoints) || 0;
      if (points < cost) {
        return { ok: false as const, error: 'Poin tidak cukup' };
      }

      tx.set(userRef, { value: { ...profile, rewardPoints: points - cost }, updatedAt: Date.now() }, { merge: true });

      if (PREMIUM_DAYS[type]) {
        const cur = premiumSnap.exists ? (premiumSnap.data()?.value ?? premiumSnap.data()) : {};
        let base = new Date();
        if (cur?.isPremium && cur?.expiresAt && new Date(cur.expiresAt) > base) {
          base = new Date(cur.expiresAt);
        }
        base.setDate(base.getDate() + PREMIUM_DAYS[type]);
        const newPremium = {
          isPremium: true,
          plan: 'monthly',
          activatedAt: now.toISOString(),
          expiresAt: base.toISOString(),
        };
        tx.set(premiumRef, { value: newPremium, updatedAt: Date.now() });
        return { ok: true as const, premium: newPremium, pointsLeft: points - cost };
      }

      const grant = QUOTA_GRANTS[type];
      if (grant) {
        const qd = quotaSnap.exists ? (quotaSnap.data()?.value ?? quotaSnap.data()) : { chat: 0, scan: 0, bulk: 0 };
        const next = { ...qd, [grant.feature]: Math.max(0, (Number(qd[grant.feature]) || 0) - grant.amount) };
        tx.set(quotaRef, { value: next, updatedAt: Date.now() }, { merge: true });
        return { ok: true as const, quota: next, pointsLeft: points - cost };
      }

      return { ok: false as const, error: 'Reward tidak didukung' };
    });

    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(200).json({
      success: true,
      premium: 'premium' in result ? result.premium : undefined,
      quota: 'quota' in result ? result.quota : undefined,
      pointsLeft: result.pointsLeft,
    });
  } catch (error) {
    console.error('[redeem-reward] error:', error);
    return res.status(500).json({ success: false, error: 'Gagal memproses penukaran' });
  }
}
