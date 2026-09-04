import React, { useState } from 'react';
import type { Asset, Transaction } from '../contexts/MoneyContext';
import MaterialIcon from './common/MaterialIcon';
import { formatCurrencyAmount, convertToBaseIDR } from '../lib/currency';
import { getLocalDate } from '../lib/utils';

interface EmergencyFundShieldProps {
  assets: Asset[];
  transactions: Transaction[];
  getAssetBalance: (assetId: string) => number;
  targetMonths?: number;
  onUpdateTargetMonths?: (months: number) => void;
}

export const EmergencyFundShield: React.FC<EmergencyFundShieldProps> = ({
  assets,
  transactions,
  getAssetBalance,
  targetMonths = 6,
  onUpdateTargetMonths,
}) => {
  const [selectedMonths, setSelectedMonths] = useState<number>(targetMonths);

  // 1. Calculate Emergency Fund Assets Total Balance
  const emergencyAssets = assets.filter(a => a.isEmergencyFund && !a.isDeleted);
  const totalEmergencyBalance = emergencyAssets.reduce((sum, a) => {
    const bal = getAssetBalance(a.id);
    return sum + convertToBaseIDR(bal, a.currency);
  }, 0);

  // 2. Calculate Average Monthly Expense (last 90 days / 3 months)
  const today = new Date();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(today.getDate() - 90);
  const ninetyDaysStr = getLocalDate(ninetyDaysAgo);

  const recentExpenses = transactions
    .filter(t => t.type === 'pengeluaran' && t.date >= ninetyDaysStr && !t.isDeleted)
    .reduce((sum, t) => sum + convertToBaseIDR(t.amount, t.currency, t.exchangeRate), 0);

  const avgMonthlyExpense = Math.max(1000000, Math.round(recentExpenses / 3)); // Fallback min 1M if new
  const targetAmount = avgMonthlyExpense * selectedMonths;

  const coverageMonths = (totalEmergencyBalance / avgMonthlyExpense).toFixed(1);
  const progressPercent = Math.min(100, Math.round((totalEmergencyBalance / targetAmount) * 100));

  const handleMonthChange = (m: number) => {
    setSelectedMonths(m);
    onUpdateTargetMonths?.(m);
  };

  return (
    <div className="bg-bg-card dark:bg-surface-container-low p-6 rounded-xl border border-border-light shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MaterialIcon name="shield" className="text-xl" />
          </div>
          <div>
            <h3 className="font-extrabold text-on-surface text-base sm:text-lg">Emergency Fund Shield 🛡️</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Perlindungan Dana Darurat &amp; Alokasi Kebutuhan</p>
          </div>
        </div>

        {/* Target Month Selector */}
        <div className="flex items-center bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-1 text-xs shrink-0 self-start sm:self-center">
          {[3, 6, 9, 12].map(m => (
            <button
              key={m}
              onClick={() => handleMonthChange(m)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all border-none cursor-pointer ${
                selectedMonths === m
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface bg-transparent'
              }`}
            >
              {m} Bln
            </button>
          ))}
        </div>
      </div>

      {/* Progress & Status Banner */}
      <div className="p-6 rounded-xl bg-surface-container-lowest border border-border-light space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-on-surface-variant">Terkumpul saat ini:</span>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrencyAmount(totalEmergencyBalance, 'IDR')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-on-surface-variant">Target ({selectedMonths} Bulan):</span>
            <p className="text-base font-bold text-on-surface mt-0.5">
              {formatCurrencyAmount(targetAmount, 'IDR')}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-on-surface font-bold">Cakupan Pengeluaran: {coverageMonths} Bulan</span>
            <span className="text-primary font-extrabold">{progressPercent}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-surface-container overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="text-xs text-on-surface-variant flex items-center justify-between pt-2 border-t border-border-light">
          <span>Estimasi Pengeluaran Bulanan: <strong className="text-on-surface">{formatCurrencyAmount(avgMonthlyExpense, 'IDR')}</strong></span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {emergencyAssets.length} Aset Terpilih
          </span>
        </div>
      </div>

      {/* Allocated Emergency Assets */}
      {emergencyAssets.length > 0 && (
        <div className="space-y-3">
          <span className="text-xs font-extrabold text-on-surface-variant uppercase tracking-wider block">Aset Dana Darurat:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {emergencyAssets.map(asset => {
              const bal = getAssetBalance(asset.id);
              return (
                <div key={asset.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest border border-border-light text-xs">
                  <div className="flex items-center gap-2.5">
                    <MaterialIcon name="savings" className="text-emerald-500 text-lg" />
                    <span className="font-bold text-on-surface">{asset.name}</span>
                  </div>
                  <span className="font-extrabold text-on-surface">
                    {formatCurrencyAmount(bal, asset.currency || 'IDR')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
