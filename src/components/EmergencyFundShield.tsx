import React, { useState } from 'react';
import type { Asset, Transaction } from '../contexts/MoneyContext';
import MaterialIcon from './common/MaterialIcon';
import { formatCurrencyAmount, convertToBaseIDR } from '../lib/currency';

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
  const ninetyDaysStr = ninetyDaysAgo.toISOString().split('T')[0];

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
    <div className="bg-surface-variant/40 rounded-2xl p-5 border border-outline-variant/30 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <MaterialIcon name="shield" className="text-xl" />
          </div>
          <div>
            <h3 className="font-bold text-on-surface text-base">Emergency Fund Shield 🛡️</h3>
            <p className="text-xs text-outline">Perlindungan Dana Darurat & Alokasi Kebutuhan</p>
          </div>
        </div>

        {/* Target Month Selector */}
        <div className="flex items-center bg-surface border border-outline-variant/40 rounded-xl p-1 text-xs">
          {[3, 6, 9, 12].map(m => (
            <button
              key={m}
              onClick={() => handleMonthChange(m)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                selectedMonths === m
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              {m} Bln
            </button>
          ))}
        </div>
      </div>

      {/* Progress & Status Banner */}
      <div className="p-4 rounded-xl bg-surface border border-outline-variant/40 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-outline">Terkumpul saat ini:</span>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatCurrencyAmount(totalEmergencyBalance, 'IDR')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-outline">Target ({selectedMonths} Bulan):</span>
            <p className="text-sm font-bold text-on-surface">
              {formatCurrencyAmount(targetAmount, 'IDR')}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="text-on-surface">Cakupan Pengeluaran: {coverageMonths} Bulan</span>
            <span className="text-primary font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-outline-variant/20 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="text-xs text-outline flex items-center justify-between pt-1">
          <span>Estimasi Pengeluaran Bulanan: {formatCurrencyAmount(avgMonthlyExpense, 'IDR')}</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {emergencyAssets.length} Aset Terpilih
          </span>
        </div>
      </div>

      {/* Allocated Emergency Assets */}
      {emergencyAssets.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-outline uppercase tracking-wider">Aset Dana Darurat:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {emergencyAssets.map(asset => {
              const bal = getAssetBalance(asset.id);
              return (
                <div key={asset.id} className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-outline-variant/30 text-xs">
                  <div className="flex items-center gap-2">
                    <MaterialIcon name="savings" className="text-emerald-500" />
                    <span className="font-semibold text-on-surface">{asset.name}</span>
                  </div>
                  <span className="font-bold text-on-surface">
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
