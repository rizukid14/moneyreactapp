import admin from 'firebase-admin';
import { verifyAuth, initializeAdmin } from './_admin.js';

const SLOT_COST = 300;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const user = await verifyAuth(req, res);
  if (!user) return;

  try {
    initializeAdmin();
    const db = admin.firestore();
    const userRef = db.collection('users').doc(user.uid).collection('settings').doc('user');

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const profile = snap.exists ? (snap.data()?.value ?? snap.data()) : {};
      const points = Number(profile?.rewardPoints) || 0;
      if (points < SLOT_COST) {
        return { ok: false as const, error: 'Poin tidak cukup' };
      }
      const updated = {
        ...profile,
        rewardPoints: points - SLOT_COST,
        unlockedWorkspaceSlots: (Number(profile?.unlockedWorkspaceSlots) || 0) + 1,
      };
      tx.set(userRef, { value: updated, updatedAt: Date.now() }, { merge: true });
      return {
        ok: true as const,
        pointsLeft: updated.rewardPoints,
        slots: updated.unlockedWorkspaceSlots,
      };
    });

    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(200).json({
      success: true,
      pointsLeft: result.pointsLeft,
      slots: result.slots,
    });
  } catch (error: any) {
    console.error('[purchase-slot] error:', error);
    return res.status(500).json({ success: false, error: 'Gagal membeli slot' });
  }
}
