import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMoney } from '../contexts/MoneyContext';
import type { Transaction } from '../contexts/MoneyContext';
import { formatCurrency } from '../lib/utils';
import MaterialIcon from './common/MaterialIcon';
import StatDetailModal from './modals/StatDetailModal';

interface DailyFinancialCalendarProps {
  viewDate: Date;
  onSelectDate?: (date: Date) => void;
}

export const DailyFinancialCalendar: React.FC<DailyFinancialCalendarProps> = ({ viewDate }) => {
  const { transactions, currencySymbol, categories } = useMoney();
  const [selectedDayTxs, setSelectedDayTxs] = useState<{ dateStr: string; dateObj: Date; txs: Transaction[]; income: number; expense: number } | null>(null);

  const fmt = (val: number) => formatCurrency(val, currencySymbol);

  // Ultra-compact currency formatter for small 100% screen-fit calendar cells (e.g., +150k, -45k, +1.2M)
  const fmtCompact = (val: number): string => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (val >= 1000) {
      return `${Math.round(val / 1000)}k`;
    }
    return `${val}`;
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Days of week starting from Monday (Senin)
  const DAYS_OF_WEEK = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  // Calculate calendar days
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Convert JS Sunday-first day (0=Sun, 1=Mon...6=Sat) to Monday-first (0=Mon...6=Sun)
    let firstDayIndex = firstDayOfMonth.getDay() - 1;
    if (firstDayIndex === -1) firstDayIndex = 6; // Sunday

    // Aggregate transactions by date string YYYY-MM-DD
    const txMap: Record<string, { income: number; expense: number; txs: Transaction[] }> = {};

    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        // YYYY-MM-DD
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!txMap[dateStr]) {
          txMap[dateStr] = { income: 0, expense: 0, txs: [] };
        }
        txMap[dateStr].txs.push(tx);
        if (tx.type === 'pendapatan') {
          txMap[dateStr].income += tx.amount;
        } else if (tx.type === 'pengeluaran') {
          txMap[dateStr].expense += tx.amount;
        }
      }
    });

    const cells: Array<{
      dayNum: number | null;
      dateStr: string | null;
      dateObj: Date | null;
      income: number;
      expense: number;
      txs: Transaction[];
      isToday: boolean;
    }> = [];

    // Blank cells before first day
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({
        dayNum: null,
        dateStr: null,
        dateObj: null,
        income: 0,
        expense: 0,
        txs: [],
        isToday: false,
      });
    }

    const today = new Date();
    const isCurrentMonthYear = today.getFullYear() === year && today.getMonth() === month;

    // Actual day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const data = txMap[dateStr] || { income: 0, expense: 0, txs: [] };
      const isToday = isCurrentMonthYear && today.getDate() === day;

      cells.push({
        dayNum: day,
        dateStr,
        dateObj: new Date(year, month, day),
        income: data.income,
        expense: data.expense,
        txs: data.txs,
        isToday,
      });
    }

    return cells;
  }, [transactions, year, month]);

  // Total summary for displayed month
  const monthSummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let activeDaysCount = 0;

    calendarGrid.forEach(cell => {
      if (cell.dayNum) {
        totalIncome += cell.income;
        totalExpense += cell.expense;
        if (cell.income > 0 || cell.expense > 0) {
          activeDaysCount++;
        }
      }
    });

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      activeDaysCount,
    };
  }, [calendarGrid]);

  return (
    <div className="col-span-1 md:col-span-12 bg-bg-card p-3 sm:p-6 rounded-3xl shadow-bento group relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary-color shadow-sm">
            <MaterialIcon name="calendar_month" className="text-xl" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-on-surface">Kalender Keuangan Harian</h3>
            <p className="text-xs text-on-surface-variant">Rincian transaksi & arus kas harian</p>
          </div>
        </div>

        {/* Quick Month Stat Badges */}
        <div className="flex items-center gap-2">
          <div className="bg-surface-container-low px-2.5 py-1 rounded-xl border border-outline-variant/80 flex items-center gap-1 text-[11px] sm:text-xs">
            <span className="w-2 h-2 rounded-full bg-primary-color shrink-0" />
            <span className="text-on-surface-variant font-medium">Masuk:</span>
            <span className="font-extrabold text-primary-color">{fmt(monthSummary.totalIncome)}</span>
          </div>
          <div className="bg-surface-container-low px-2.5 py-1 rounded-xl border border-outline-variant/80 flex items-center gap-1 text-[11px] sm:text-xs">
            <span className="w-2 h-2 rounded-full bg-error shrink-0" />
            <span className="text-on-surface-variant font-medium">Keluar:</span>
            <span className="font-extrabold text-error">{fmt(monthSummary.totalExpense)}</span>
          </div>
        </div>
      </div>

      {/* Responsive Fit Screen Container */}
      <div className="w-full max-w-3xl mx-auto">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 text-center">
          {DAYS_OF_WEEK.map((d, i) => (
            <div
              key={d}
              className={`py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                i >= 5 ? 'text-error/80' : 'text-on-surface-variant'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 7-Column Calendar Grid - Responsive Square/Compact Cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarGrid.map((cell, idx) => {
            if (!cell.dayNum) {
              return <div key={`blank-${idx}`} className="aspect-square md:aspect-[4/3] rounded-lg bg-transparent" />;
            }

            const hasData = cell.income > 0 || cell.expense > 0;
            const isSelected = selectedDayTxs && selectedDayTxs.dateStr === cell.dateStr;

            return (
              <motion.div
                key={cell.dateStr!}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (cell.dateObj) {
                    setSelectedDayTxs({
                      dateStr: cell.dateStr!,
                      dateObj: cell.dateObj,
                      txs: cell.txs,
                      income: cell.income,
                      expense: cell.expense,
                    });
                  }
                }}
                className={`aspect-square md:aspect-[4/3] md:max-h-20 p-1 sm:p-2 rounded-lg border flex flex-col justify-between transition-all relative overflow-hidden ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary bg-primary-container/20 shadow-md z-10'
                    : cell.isToday
                    ? 'border-primary/80 ring-1 ring-primary/40 bg-primary-container/10'
                    : hasData
                    ? 'border-outline-variant/70 bg-surface-container-lowest hover:border-primary/50 cursor-pointer shadow-2xs'
                    : 'border-outline-variant/30 bg-surface-container-low/30 opacity-70'
                }`}
              >
                {/* Date Number */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[8.5px] sm:text-[9.5px] font-extrabold px-0.5 sm:px-1 py-0.1 rounded-md leading-none ${
                      cell.isToday
                        ? 'bg-primary text-white shadow-2xs font-black'
                        : 'text-on-surface-variant/90'
                    }`}
                  >
                    {cell.dayNum}
                  </span>
                </div>

                {/* Income & Expense Rows (Both Right-Aligned) */}
                <div className="flex flex-col gap-0.5 mt-auto w-full min-w-0 items-end">
                  {cell.income > 0 && (
                    <div className="text-primary-color dark:text-emerald-400 text-[8px] sm:text-[10px] font-black truncate text-right leading-tight w-full">
                      {fmtCompact(cell.income)}
                    </div>
                  )}

                  {cell.expense > 0 && (
                    <div className="text-error dark:text-rose-400 text-[8px] sm:text-[10px] font-black truncate text-right leading-tight w-full">
                      {fmtCompact(cell.expense)}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* StatDetailModal Overlay on Day Click */}
      <StatDetailModal
        isOpen={!!selectedDayTxs}
        onClose={() => setSelectedDayTxs(null)}
        title={selectedDayTxs ? `Rincian Transaksi — ${selectedDayTxs.dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
        explanation={selectedDayTxs ? `${selectedDayTxs.txs.length} transaksi · Masuk: ${fmt(selectedDayTxs.income)} · Keluar: ${fmt(selectedDayTxs.expense)}` : undefined}
        details={selectedDayTxs?.txs.length ? selectedDayTxs.txs.map(t => ({
          label: `${t.note || categories.find(c => c.id === t.categoryId)?.name || 'Transaksi'}${t.time ? ` (${t.time})` : ''}`,
          value: fmt(t.amount),
          type: t.type === 'pengeluaran' ? 'subtraction' : 'addition'
        })) : [
          { label: 'Tidak ada transaksi tercatat pada tanggal ini', value: fmt(0), type: 'result' }
        ]}
      />
    </div>
  );
};
