import React, { useState } from 'react';
import type { Asset, Transaction } from '../contexts/MoneyContext';
import MaterialIcon from './common/MaterialIcon';
import { formatCurrencyAmount, convertToBaseIDR } from '../lib/currency';
import { getLocalDate } from '../lib/utils';

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
  const [isExpanded, setIsExpanded] = useState(true);
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
    const lastCutoffStr = getLocalDate(lastCutoffDate);

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

  const bestCard = ccAnalytics.find(c => c.isBestChoice) || ccAnalytics[0];

  return (
    <div className="bg-bg-card dark:bg-surface-container-low p-6 rounded-xl border border-border-light shadow-sm space-y-4 mb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container/30 text-primary flex items-center justify-center shrink-0">
            <MaterialIcon name="credit_card" className="text-xl" />
          </div>
          <div>
            <h3 className="font-extrabold text-on-surface text-base sm:text-lg">Optimasi Kartu Kredit</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Rekomendasi kartu terbaik untuk tenor pembayaran terpanjang (free float)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          {bestCard && (
            <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <MaterialIcon name="star" className="text-sm text-emerald-500" />
              <span>Gunakan: <strong>{bestCard.card.name}</strong></span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="w-8 h-8 rounded-xl bg-surface-container-lowest border border-border-light text-on-surface-variant flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer"
            aria-label={isExpanded ? 'Sembunyikan detail' : 'Tampilkan detail'}
          >
            <MaterialIcon
              name="expand_more"
              className={`text-lg transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Expanded Grid Cards */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {ccAnalytics.map(({ card, cutoffDay, dueDay, unbilledAmount, isBestChoice }) => (
            <div
              key={card.id}
              onClick={() => onSelectCard?.(card)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isBestChoice
                  ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-2 border-emerald-500 shadow-sm'
                  : 'bg-surface-container-lowest border-border-light hover:border-outline-variant'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MaterialIcon
                    name="credit_card"
                    className={`text-lg ${isBestChoice ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}`}
                  />
                  <span className="font-extrabold text-sm sm:text-base text-on-surface truncate">{card.name}</span>
                </div>
                {isBestChoice && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                    ⭐ REKOMENDASI HARI INI
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-on-surface-variant mb-3">
                <div className="p-2.5 rounded-lg bg-surface-container-low/60 border border-outline-variant/30">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-0.5">Cetak Tagihan</span>
                  <p className="font-bold text-on-surface">Tanggal {cutoffDay}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-container-low/60 border border-outline-variant/30">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-0.5">Jatuh Tempo</span>
                  <p className="font-bold text-on-surface">Tanggal {dueDay}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border-light text-xs">
                <span className="text-on-surface-variant">Tagihan Belum Dicetak:</span>
                <span className="font-extrabold text-on-surface">
                  {formatCurrencyAmount(unbilledAmount, card.currency || 'IDR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
