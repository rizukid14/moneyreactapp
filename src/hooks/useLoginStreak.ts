import { useEffect, useState } from 'react';
import { useMoney } from '../contexts/MoneyContext';
import { getLocalDate } from '../lib/utils';
import { auth, isFirebaseConfigured } from '../lib/firebase';

export function useLoginStreak() {
  const { user, updateUser, isReady } = useMoney();
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [basePoints, setBasePoints] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [milestoneBonus, setMilestoneBonus] = useState(0);
  const [isWeekend, setIsWeekend] = useState(false);

  useEffect(() => {
    if (!isReady || !user) return;

    const checkStreak = async () => {
      const todayStr = getLocalDate();

      // Only run once per day per session.
      if (sessionStorage.getItem('lastStreakCheckDate') === todayStr) return;
      sessionStorage.setItem('lastStreakCheckDate', todayStr);

      if (!isFirebaseConfigured || !auth.currentUser) return;

      // Points/streak are decided server-side (Vercel function) — the client
      // only renders the result and caches it.
      try {
        const token = await auth.currentUser.getIdToken();
        const resp = await fetch('/api/daily-claim', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data.success || data.alreadyClaimed) return;

        updateUser({
          lastLoginDate: todayStr,
          loginStreak: data.streak,
          rewardPoints: data.points,
        });
        setEarnedPoints(data.pointsAdded);
        setBasePoints(data.basePoints);
        setMultiplier(data.multiplier);
        setMilestoneBonus(data.milestone);
        setIsWeekend(!!data.isWeekend);
        setShowRewardModal(true);
      } catch (e) {
        console.error('Daily streak claim failed:', e);
      }
    };

    checkStreak();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkStreak();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isReady, user, updateUser]);

  return {
    showRewardModal,
    setShowRewardModal,
    earnedPoints,
    basePoints,
    multiplier,
    milestoneBonus,
    isWeekend,
    currentStreak: user?.loginStreak || 0
  };
}
