import { useEffect, useState } from 'react';
import { useMoney } from '../contexts/MoneyContext';
import { getLocalDate } from '../lib/utils';

export function useLoginStreak() {
  const { user, updateUser, isReady } = useMoney();
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [basePoints, setBasePoints] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [milestoneBonus, setMilestoneBonus] = useState(0);
  const [isWeekend, setIsWeekend] = useState(false);

  useEffect(() => {
    // Only run when the database is ready and user profile is loaded
    if (!isReady || !user) return;
    
    // Ensure we only run this once per session
    const hasCheckedStreak = sessionStorage.getItem('hasCheckedStreak');
    if (hasCheckedStreak === 'true') return;

    const todayStr = getLocalDate();
    const lastLogin = user.lastLoginDate;
    
    let currentStreak = user.loginStreak || 0;
    let currentPoints = user.rewardPoints || 0;
    let pointsToAdd = 0;
    let updated = false;

    // Detect if today is weekend (Sabtu = 6, Minggu = 0)
    const todayDate = new Date();
    const dayOfWeek = todayDate.getDay();
    const weekend = dayOfWeek === 0 || dayOfWeek === 6;
    setIsWeekend(weekend);

    let calculatedBase = 5;
    let calculatedMultiplier = 1;
    let calculatedMilestone = 0;

    if (!lastLogin) {
      // First login ever
      currentStreak = 1;
      updated = true;
    } else if (lastLogin !== todayStr) {
      // Parse dates to compare them
      const today = new Date(todayStr);
      const lastLoginDate = new Date(lastLogin);
      
      // Calculate difference in days (ignoring time)
      const diffTime = Math.abs(today.getTime() - lastLoginDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Logged in yesterday -> increment streak
        currentStreak += 1;
      } else {
        // Missed a day -> reset streak to 1
        currentStreak = 1;
      }
      updated = true;
    }

    if (updated) {
      // 1. Calculate Base Points based on streak length
      if (currentStreak >= 1 && currentStreak <= 3) {
        calculatedBase = 5;
      } else if (currentStreak >= 4 && currentStreak <= 6) {
        calculatedBase = 10;
      } else {
        calculatedBase = 15; // Day 7+
      }

      // 2. Lucky Draw Multiplier
      const rng = Math.random();
      if (weekend) {
        // Weekend probabilities: 10x (2%), 5x (10%), 2x (30%), 1x (58%)
        if (rng < 0.02) {
          calculatedMultiplier = 10;
        } else if (rng < 0.12) {
          calculatedMultiplier = 5;
        } else if (rng < 0.42) {
          calculatedMultiplier = 2;
        } else {
          calculatedMultiplier = 1;
        }
      } else {
        // Weekday probabilities: 5x (3%), 2x (15%), 1x (82%)
        if (rng < 0.03) {
          calculatedMultiplier = 5;
        } else if (rng < 0.18) {
          calculatedMultiplier = 2;
        } else {
          calculatedMultiplier = 1;
        }
      }

      // 3. Milestone Bonuses
      if (currentStreak === 7) calculatedMilestone = 25;
      else if (currentStreak === 14) calculatedMilestone = 50;
      else if (currentStreak === 30) calculatedMilestone = 100;
      else if (currentStreak === 60) calculatedMilestone = 200;
      else if (currentStreak === 90) calculatedMilestone = 500;

      // Calculate total points earned today
      pointsToAdd = (calculatedBase * calculatedMultiplier) + calculatedMilestone;

      const newUser = {
        ...user,
        lastLoginDate: todayStr,
        loginStreak: currentStreak,
        rewardPoints: currentPoints + pointsToAdd
      };
      
      updateUser(newUser);
      setEarnedPoints(pointsToAdd);
      setBasePoints(calculatedBase);
      setMultiplier(calculatedMultiplier);
      setMilestoneBonus(calculatedMilestone);
      setShowRewardModal(true);
      sessionStorage.setItem('hasCheckedStreak', 'true');
    } else if (lastLogin === todayStr) {
      // Self-repair: If they already logged in today but their streak/points are 0 or undefined,
      // let's restore them to 1 day and give them the first login reward!
      if (!user.loginStreak || user.loginStreak === 0) {
        const newUser = {
          ...user,
          loginStreak: 1,
          rewardPoints: (user.rewardPoints || 0) + 5
        };
        updateUser(newUser);
      }
      sessionStorage.setItem('hasCheckedStreak', 'true');
    }

  }, [user, updateUser, isReady]);

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
