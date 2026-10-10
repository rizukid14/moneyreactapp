import admin from 'firebase-admin';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, initializeAdmin } from './_admin.js';

const dayMs = 24 * 60 * 60 * 1000;
const toUTC = (s: string) => Date.parse(`${s}T00:00:00Z`);

function todayInJakarta(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

function rollMultiplier(isWeekend: boolean): number {
  const r = Math.random();
  if (isWeekend) {
    if (r < 0.02) return 10;
    if (r < 0.12) return 5;
    if (r < 0.42) return 2;
    return 1;
  }
  if (r < 0.03) return 5;
  if (r < 0.18) return 2;
  return 1;
}

/**
 * Server-authoritative daily login streak claim.
 * The client renders the result; it never decides its own points.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const user = await verifyAuth(req, res);
  if (!user) return;

  try {
    initializeAdmin();
    const db = admin.firestore();
    const userRef = db.collection('users').doc(user.uid).collection('settings').doc('user');
    const today = todayInJakarta();
    const dayOfWeek = new Date(`${today}T00:00:00Z`).getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const profile = snap.exists ? (snap.data()?.value ?? snap.data()) : {};

      const lastLogin = profile?.lastLoginDate as string | undefined;
      if (lastLogin === today) {
        return { alreadyClaimed: true as const, streak: Number(profile?.loginStreak) || 0, points: Number(profile?.rewardPoints) || 0 };
      }

      let streak = Number(profile?.loginStreak) || 0;
      if (!lastLogin) {
        streak = 1;
      } else {
        const diffDays = Math.round((toUTC(today) - toUTC(lastLogin)) / dayMs);
        streak = diffDays === 1 ? streak + 1 : 1;
      }

      const base = streak <= 3 ? 5 : streak <= 6 ? 10 : 15;
      const multiplier = rollMultiplier(isWeekend);
      let milestone = 0;
      if (streak === 7) milestone = 25;
      else if (streak === 14) milestone = 50;
      else if (streak === 30) milestone = 100;
      else if (streak === 60) milestone = 200;
      else if (streak === 90) milestone = 500;

      const pointsAdded = base * multiplier + milestone;
      const newPoints = (Number(profile?.rewardPoints) || 0) + pointsAdded;

      tx.set(userRef, {
        value: { ...profile, lastLoginDate: today, loginStreak: streak, rewardPoints: newPoints },
        updatedAt: Date.now(),
      }, { merge: true });

      return { alreadyClaimed: false as const, streak, basePoints: base, multiplier, milestone, pointsAdded, points: newPoints, isWeekend };
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('[daily-claim] error:', error);
    return res.status(500).json({ success: false, error: 'Gagal memproses klaim harian' });
  }
}
