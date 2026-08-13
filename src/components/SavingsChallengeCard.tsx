import React, { useState } from 'react';
import type { SavingsChallenge } from '../contexts/MoneyContext';
import MaterialIcon from './common/MaterialIcon';
import { formatCurrencyAmount } from '../lib/currency';
import { getLocalDate } from '../lib/utils';
import { useToast } from './common/Toast';

interface SavingsChallengeCardProps {
  challenges?: SavingsChallenge[];
  onUpdateChallenge?: (challenge: SavingsChallenge) => void;
  onAddChallenge?: (challenge: Omit<SavingsChallenge, 'id'>) => void;
  rewardPoints?: number;
  onRewardPointsChange?: (newPoints: number) => void;
}

export const SavingsChallengeCard: React.FC<SavingsChallengeCardProps> = ({
  challenges = [],
  onUpdateChallenge,
  onRewardPointsChange,
  rewardPoints = 0,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'52_week' | 'no_spend'>('52_week');

  const todayStr = getLocalDate();

  // Find or create default 52-Week challenge data
  const week52Challenge: SavingsChallenge = challenges.find(c => c.type === '52_week') || {
    id: 'ch-52-week',
    type: '52_week',
    title: 'Tantangan Menabung 52 Minggu',
    currentWeek: 1,
    currentAmount: 0,
    targetAmount: 13780000, // Total of 52 weeks formula (52 * 53 / 2 * 10,000)
    isCompleted: false,
  };

  // Find or create default No-Spend challenge data
  const noSpendChallenge: SavingsChallenge = challenges.find(c => c.type === 'no_spend') || {
    id: 'ch-no-spend',
    type: 'no_spend',
    title: 'No-Spend Day Streak',
    noSpendStreak: 0,
    lastNoSpendCheck: undefined,
    isCompleted: false,
  };

  const handleDepositNextWeek = () => {
    const nextWeek = (week52Challenge.currentWeek || 1);
    const depositAmount = nextWeek * 10000;
    const newCurrentAmount = (week52Challenge.currentAmount || 0) + depositAmount;

    const updated: SavingsChallenge = {
      ...week52Challenge,
      currentWeek: nextWeek + 1,
      currentAmount: newCurrentAmount,
      isCompleted: nextWeek >= 52,
      updatedAt: Date.now(),
    };

    onUpdateChallenge?.(updated);
    onRewardPointsChange?.(rewardPoints + 50);
    showToast(`Berhasil setor Minggu ke-${nextWeek} (${formatCurrencyAmount(depositAmount)})! +50 Points 🏆`, 'success');
  };

  const handleNoSpendCheck = () => {
    if (noSpendChallenge.lastNoSpendCheck === todayStr) {
      showToast('Anda sudah melakukan check-in No-Spend hari ini!', 'info');
      return;
    }

    const newStreak = (noSpendChallenge.noSpendStreak || 0) + 1;
    const updated: SavingsChallenge = {
      ...noSpendChallenge,
      noSpendStreak: newStreak,
      lastNoSpendCheck: todayStr,
      updatedAt: Date.now(),
    };

    onUpdateChallenge?.(updated);
    onRewardPointsChange?.(rewardPoints + 100);
    showToast(`Luar biasa! ${newStreak} Hari Tanpa Hemat Non-Esensial 🎖️ +100 Points!`, 'success');
  };

  const nextDepositAmount = (week52Challenge.currentWeek || 1) * 10000;
  const progress52Percent = Math.min(100, Math.round(((week52Challenge.currentAmount || 0) / (week52Challenge.targetAmount || 1)) * 100));

  return (
    <div className="bg-bg-card dark:bg-surface-container-low p-6 rounded-xl border border-border-light shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <MaterialIcon name="military_tech" className="text-xl" />
          </div>
          <div>
            <h3 className="font-extrabold text-on-surface text-base sm:text-lg">Gamified Savings Challenge 🏆</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Tantangan Interaktif &amp; Rekor Hemat</p>
          </div>
        </div>

        {/* Challenge Tabs */}
        <div className="flex items-center bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-1 text-xs shrink-0 self-start sm:self-center">
          <button
            onClick={() => setActiveTab('52_week')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all border-none cursor-pointer ${
              activeTab === '52_week'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface bg-transparent'
            }`}
          >
            52 Minggu
          </button>
          <button
            onClick={() => setActiveTab('no_spend')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all border-none cursor-pointer ${
              activeTab === 'no_spend'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface bg-transparent'
            }`}
          >
            No-Spend Streak
          </button>
        </div>
      </div>

      {activeTab === '52_week' ? (
        /* 52-Week Challenge Tab */
        <div className="p-6 rounded-xl bg-surface-container-lowest border border-border-light space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-on-surface-variant">Minggu Berjalan:</span>
              <p className="text-lg font-extrabold text-on-surface mt-0.5">
                Minggu Ke-{week52Challenge.currentWeek || 1} / 52
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-on-surface-variant">Terkumpul:</span>
              <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                {formatCurrencyAmount(week52Challenge.currentAmount || 0, 'IDR')}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-on-surface font-bold">Progress Tantangan</span>
              <span className="text-amber-500 font-extrabold">{progress52Percent}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-surface-container overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-500 rounded-full"
                style={{ width: `${progress52Percent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border-light">
            <div className="text-xs text-on-surface-variant">
              Setoran Minggu Ini: <strong className="text-on-surface">{formatCurrencyAmount(nextDepositAmount, 'IDR')}</strong>
            </div>
            <button
              onClick={handleDepositNextWeek}
              disabled={week52Challenge.currentWeek! > 52}
              className="px-4 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 border-none cursor-pointer"
            >
              Setor Minggu Ke-{week52Challenge.currentWeek || 1} ✨
            </button>
          </div>
        </div>
      ) : (
        /* No-Spend Streak Tab */
        <div className="p-6 rounded-xl bg-surface-container-lowest border border-border-light space-y-4 text-center">
          <div className="py-2">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2 text-3xl">
              🔥
            </div>
            <h4 className="text-3xl font-extrabold text-on-surface">
              {noSpendChallenge.noSpendStreak || 0} <span className="text-base font-bold text-on-surface-variant">Hari Streak</span>
            </h4>
            <p className="text-xs text-on-surface-variant mt-1">Hari Bebas Pengeluaran Non-Esensial (No-Spend Day)</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs py-2 border-t border-b border-border-light">
            <span className={`px-3 py-1 rounded-full border ${noSpendChallenge.noSpendStreak! >= 3 ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 font-bold' : 'opacity-40 border-outline-variant'}`}>
              🥉 3 Hari
            </span>
            <span className={`px-3 py-1 rounded-full border ${noSpendChallenge.noSpendStreak! >= 7 ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 font-bold' : 'opacity-40 border-outline-variant'}`}>
              🥈 7 Hari
            </span>
            <span className={`px-3 py-1 rounded-full border ${noSpendChallenge.noSpendStreak! >= 30 ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 font-bold' : 'opacity-40 border-outline-variant'}`}>
              🥇 30 Hari Legend
            </span>
          </div>

          <button
            onClick={handleNoSpendCheck}
            disabled={noSpendChallenge.lastNoSpendCheck === todayStr}
            className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 border-none cursor-pointer"
          >
            {noSpendChallenge.lastNoSpendCheck === todayStr
              ? '✓ Sudah Check-In Hari Ini'
              : '🔥 Check-in No-Spend Day Hari Ini (+100 Poin)'}
          </button>
        </div>
      )}
    </div>
  );
};
