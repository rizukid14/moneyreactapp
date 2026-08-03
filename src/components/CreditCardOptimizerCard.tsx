import React from 'react';
import type { Asset, Transaction } from '../contexts/MoneyContext';
import MaterialIcon from './common/MaterialIcon';
import { formatCurrencyAmount, convertToBaseIDR } from '../lib/currency';

interface CreditCardOptimizerCardProps {
  assets: Asset[];
  transactions: Transaction[];
  onSelectCard?: (asset: Asset) => void;
}

export const CreditCardOptimizerCard: React.FC<CreditCardOptimizerCardProps> = ({
  assets,
  transactions,
  onSelectCard,
}) => {
  const ccAssets = assets.filter(a => a.type === 'Credit Card' && !a.isDeleted);

  if (ccAssets.length === 0) return null;

  const today = new Date();
  const currentDay = today.getDate();

  // Find best card to use today (Card whose cut-off day was most recently passed)
  const ccAnalytics = ccAssets.map(card => {
    const cutoffDay = card.statementCutoffDay || 15;
    const dueDay = card.paymentDueDay || 5;

    let daysSinceCutoff = currentDay - cutoffDay;
    if (daysSinceCutoff < 0) {
      daysSinceCutoff += 30; // Approximated days in month
    }

    // Calculate unbilled transactions for this card
    const lastCutoffDate = new Date(today.getFullYear(), today.getMonth(), cutoffDay);
    if (currentDay < cutoffDay) {
      lastCutoffDate.setMonth(lastCutoffDate.getMonth() - 1);
    }
    const lastCutoffStr = lastCutoffDate.toISOString().split('T')[0];

    const unbilledAmount = transactions
      .filter(t => t.assetId === card.id && t.type === 'pengeluaran' && t.date >= lastCutoffStr && !t.isDeleted)
      .reduce((sum, t) => sum + convertToBaseIDR(t.amount, t.currency, t.exchangeRate), 0);

    return {
      card,
      cutoffDay,
      dueDay,
      daysSinceCutoff,
      unbilledAmount,
      isBestChoice: false,
    };
  });

  // Sort by daysSinceCutoff ascending (Smallest positive daysSinceCutoff = most recently passed cutoff)
  ccAnalytics.sort((a, b) => a.daysSinceCutoff - b.daysSinceCutoff);
  if (ccAnalytics.length > 0) {
    ccAnalytics[0].isBestChoice = true;
  }

  return (
    <div className="bg-surface-variant/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/30 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <MaterialIcon name="credit_card" className="text-lg" />
          </div>
          <div>
            <h3 className="font-bold text-on-surface text-sm sm:text-base">Credit Card Grace Period Optimizer</h3>
            <p className="text-xs text-outline">Rekomendasi pemakaian kartu kredit paling efisien</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          {ccAssets.length} Kartu Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ccAnalytics.map(({ card, cutoffDay, dueDay, unbilledAmount, isBestChoice }) => (
          <div
            key={card.id}
            onClick={() => onSelectCard?.(card)}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              isBestChoice
                ? 'bg-primary/5 border-primary/40 shadow-sm hover:border-primary'
                : 'bg-surface border-outline-variant/40 hover:border-outline'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MaterialIcon
                  name="credit_card"
                  className={isBestChoice ? 'text-primary' : 'text-on-surface-variant'}
                />
                <span className="font-semibold text-sm text-on-surface">{card.name}</span>
              </div>
              {isBestChoice && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ⭐ Paling Efisien Hari Ini
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-outline mb-2">
              <div>
                <span>Cetak Tagihan:</span>
                <p className="font-semibold text-on-surface">Tgl {cutoffDay} tiap bulan</p>
              </div>
              <div>
                <span>Jatuh Tempo:</span>
                <p className="font-semibold text-on-surface">Tgl {dueDay} bulan berikutnya</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 text-xs">
              <span className="text-outline">Estimasi Unbilled:</span>
              <span className="font-bold text-on-surface">
                {formatCurrencyAmount(unbilledAmount, card.currency || 'IDR')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
