import React, { useMemo, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown, ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Receipt, Calendar, Flame } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import DatePickerModal from '../components/modals/DatePickerModal';
import { formatCurrency } from '../lib/utils';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_NAMES_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];

const Statistics: React.FC = () => {
  const { transactions, currencySymbol, startOfMonthDay } = useMoney();
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    if (startOfMonthDay > 1 && d.getDate() >= startOfMonthDay) {
      return new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return d;
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [drillDownCategory, setDrillDownCategory] = useState<{name: string, type: 'pendapatan'|'pengeluaran', colorIndex: number} | null>(null);

  const fmt = useCallback((value: number) => formatCurrency(value, currencySymbol), [currencySymbol]);

  const { chartData, currentMonthIncome, currentMonthExpense, prevMonthIncome, prevMonthExpense, expenseCategoryData, incomeCategoryData, topCategories, insights } = useMemo((): {
    chartData: { name: string; month: number; year: number; pengeluaran: number; pendapatan: number; periodStart: Date; periodEnd: Date }[];
    currentMonthIncome: number; currentMonthExpense: number;
    prevMonthIncome: number; prevMonthExpense: number;
    expenseCategoryData: { name: string; value: number }[];
    incomeCategoryData: { name: string; value: number }[];
    topCategories: { id: string; category: string; amount: number; type: 'pengeluaran' | 'pendapatan'; color: string; colorIndex: number }[];
    insights: {
      netSavings: number; savingsRate: number; avgDailySpending: number;
      txCountIncome: number; txCountExpense: number; txCountTransfer: number; txCountTotal: number;
      biggestExpenseTx: { note: string; amount: number; category: string } | null;
      topSpendingDay: { date: string; amount: number } | null;
    };
  } => {
    const vM = viewDate.getMonth();
    const vY = viewDate.getFullYear();

    // ─── Phase 1: 5-Month Trend Data ───
    const last5Months: { name: string, month: number, year: number, pengeluaran: number, pendapatan: number, periodStart: Date, periodEnd: Date }[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(vY, vM - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const pS = new Date(y, m - (startOfMonthDay > 1 ? 1 : 0), startOfMonthDay);
      const pE = new Date(y, m + (startOfMonthDay > 1 ? 0 : 1), startOfMonthDay);

      last5Months.push({
        name: MONTH_NAMES[m],
        month: m,
        year: y,
        pengeluaran: 0,
        pendapatan: 0,
        periodStart: pS,
        periodEnd: pE
      });
    }

    const currentPeriod = last5Months[last5Months.length - 1];
    const { periodStart: vPeriodStart, periodEnd: vPeriodEnd } = currentPeriod;

    let thisMonthInc = 0;
    let thisMonthExp = 0;
    const expByCategory: Record<string, number> = {};
    const incByCategory: Record<string, number> = {};
    const expBySubCategory: Record<string, number> = {};
    const incBySubCategory: Record<string, number> = {};

    // Additional insight trackers
    let txCountIncome = 0;
    let txCountExpense = 0;
    let txCountTransfer = 0;
    let biggestExpenseTx: { note: string; amount: number; category: string } | null = null;
    const dailySpending: Record<string, number> = {}; // 'YYYY-MM-DD' -> total expense

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);

      // 1. Current Period Stats
      if (txDate >= vPeriodStart && txDate < vPeriodEnd) {
        const subKey = tx.subCategory || tx.category;

        if (tx.type === 'pendapatan') {
          thisMonthInc += tx.amount;
          if (drillDownCategory?.type === 'pendapatan' && drillDownCategory?.name === tx.category) {
            incBySubCategory[subKey] = (incBySubCategory[subKey] || 0) + tx.amount;
          }
          incByCategory[tx.category] = (incByCategory[tx.category] || 0) + tx.amount;
        }
        if (tx.type === 'pengeluaran') {
          thisMonthExp += tx.amount;
          if (drillDownCategory?.type === 'pengeluaran' && drillDownCategory?.name === tx.category) {
            expBySubCategory[subKey] = (expBySubCategory[subKey] || 0) + tx.amount;
          }
          expByCategory[tx.category] = (expByCategory[tx.category] || 0) + tx.amount;
        }

        // Insight tracking
        if (tx.type === 'pendapatan') txCountIncome++;
        if (tx.type === 'pengeluaran') {
          txCountExpense++;
          // Daily spending
          dailySpending[tx.date] = (dailySpending[tx.date] || 0) + tx.amount;
          // Biggest single expense
          if (!biggestExpenseTx || tx.amount > biggestExpenseTx.amount) {
            biggestExpenseTx = { note: tx.note || tx.category, amount: tx.amount, category: tx.category };
          }
        }
        if (tx.type === 'transfer') txCountTransfer++;
      }

      // 2. Trend Data (Last 5 Periods)
      last5Months.forEach(m => {
        if (txDate >= m.periodStart && txDate < m.periodEnd) {
          if (tx.type === 'pendapatan') m.pendapatan += tx.amount;
          if (tx.type === 'pengeluaran') m.pengeluaran += tx.amount;
        }
      });
    });

    const limitSlices = (data: {name: string, value: number}[]) => {
      if (data.length <= 5) return data;
      const top4 = data.slice(0, 4);
      const othersValue = data.slice(4).reduce((sum, item) => sum + item.value, 0);
      return [...top4, { name: 'Lainnya', value: othersValue, __isOthers: true }];
    };

    const expenseDataRaw = drillDownCategory?.type === 'pengeluaran' 
      ? Object.keys(expBySubCategory).map(key => ({ name: key, value: expBySubCategory[key] })).sort((a,b) => b.value - a.value)
      : Object.keys(expByCategory).map(key => ({ name: key, value: expByCategory[key] })).sort((a,b) => b.value - a.value);
      
    const incomeDataRaw = drillDownCategory?.type === 'pendapatan'
      ? Object.keys(incBySubCategory).map(key => ({ name: key, value: incBySubCategory[key] })).sort((a,b) => b.value - a.value)
      : Object.keys(incByCategory).map(key => ({ name: key, value: incByCategory[key] })).sort((a,b) => b.value - a.value);

    const expenseData = limitSlices(expenseDataRaw);
    const incomeData = limitSlices(incomeDataRaw);
    
    // Prepare the list for the bottom section
    let allCategories: { id: string, category: string, amount: number, type: 'pengeluaran' | 'pendapatan', color: string, colorIndex: number }[] = [];
    
    if (drillDownCategory) {
      const baseIdx = drillDownCategory.colorIndex;
      if (drillDownCategory.type === 'pengeluaran') {
        allCategories = expenseData.map((d, i) => ({
          id: `exp-sub-${d.name}`, category: d.name, amount: d.value, type: 'pengeluaran' as const,
          color: COLORS[(i + baseIdx) % COLORS.length],
          colorIndex: (i + baseIdx) % COLORS.length
        }));
      } else {
        allCategories = incomeData.map((d, i) => ({
          id: `inc-sub-${d.name}`, category: d.name, amount: d.value, type: 'pendapatan' as const,
          color: COLORS[(i + baseIdx) % COLORS.length],
          colorIndex: (i + baseIdx) % COLORS.length
        }));
      }
    } else {
      allCategories = [
        ...expenseData.map((d, i) => ({ 
          id: `exp-${d.name}`, category: d.name, amount: d.value, type: 'pengeluaran' as const,
          color: COLORS[i % COLORS.length],
          colorIndex: i % COLORS.length
        })),
        ...incomeData.map((d, i) => ({ 
          id: `inc-${d.name}`, category: d.name, amount: d.value, type: 'pendapatan' as const,
          color: COLORS[(i + 3) % COLORS.length],
          colorIndex: (i + 3) % COLORS.length
        }))
      ];
    }

    const topCats = allCategories.sort((a, b) => b.amount - a.amount).slice(0, 10);

    // Insights computation
    const netSavings = thisMonthInc - thisMonthExp;
    const savingsRate = thisMonthInc > 0 ? (netSavings / thisMonthInc) * 100 : 0;

    const daysInPeriod = Math.max(1, Math.ceil((vPeriodEnd.getTime() - vPeriodStart.getTime()) / (1000 * 60 * 60 * 24)));
    const daysSoFar = Math.max(1, Math.min(daysInPeriod, Math.ceil((new Date().getTime() - vPeriodStart.getTime()) / (1000 * 60 * 60 * 24))));
    const avgDailySpending = txCountExpense > 0 ? Math.round(thisMonthExp / daysSoFar) : 0;

    const dailyEntries = Object.entries(dailySpending).sort((a, b) => b[1] - a[1]);
    const topSpendingDay = dailyEntries.length > 0 ? dailyEntries[0] : null;

    const insightsData = {
      netSavings,
      savingsRate,
      avgDailySpending,
      txCountIncome,
      txCountExpense,
      txCountTransfer,
      txCountTotal: txCountIncome + txCountExpense + txCountTransfer,
      biggestExpenseTx,
      topSpendingDay: topSpendingDay ? { date: topSpendingDay[0], amount: topSpendingDay[1] } : null,
    };

    const prevPeriod = last5Months.length > 1 ? last5Months[last5Months.length - 2] : null;
    const prevMonthIncomeVal = prevPeriod ? prevPeriod.pendapatan : 0;
    const prevMonthExpenseVal = prevPeriod ? prevPeriod.pengeluaran : 0;

    return { 
      chartData: last5Months, 
      currentMonthIncome: thisMonthInc, 
      currentMonthExpense: thisMonthExp,
      prevMonthIncome: prevMonthIncomeVal,
      prevMonthExpense: prevMonthExpenseVal,
      expenseCategoryData: expenseData,
      incomeCategoryData: incomeData,
      topCategories: topCats,
      insights: insightsData
    };
  }, [transactions, viewDate, drillDownCategory]);

  const changeMonth = useCallback((offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setDrillDownCategory(null);
  }, []);

  const resetToToday = useCallback(() => {
    const d = new Date();
    if (startOfMonthDay > 1 && d.getDate() >= startOfMonthDay) {
      setViewDate(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else {
      setViewDate(d);
    }
    setDrillDownCategory(null);
  }, [startOfMonthDay]);

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="title" style={{ margin: 0 }}>Statistik</h1>
        <button onClick={resetToToday} style={{ 
          display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', 
          borderRadius: '24px', border: 'none', background: 'var(--primary-glow)',
          fontSize: '13px', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer',
          boxShadow: '0 2px 10px var(--primary-glow)'
        }}>
          <CalendarDays size={16} /> Hari Ini
        </button>
      </div>

      {/* Month Switcher Header */}
      <div className="card shadow-soft" style={{ padding: '4px', marginBottom: '24px', border: 'none', background: 'var(--bg-card-solid)', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => changeMonth(-1)} className="btn-icon">
            <ChevronLeft size={24} />
          </button>
          
          <div 
            onClick={() => setIsDatePickerOpen(true)}
            style={{ 
              textAlign: 'center', cursor: 'pointer', padding: '10px 20px', borderRadius: '14px',
              background: 'var(--bg-main)', flex: 1, margin: '0 8px'
            }}>
            <div style={{ fontWeight: 800, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: 'var(--text-main)' }}>
              {MONTH_NAMES_FULL[viewDate.getMonth()]} {viewDate.getFullYear()}
              <ChevronDown size={18} color="var(--primary)" />
            </div>
          </div>

          <button onClick={() => changeMonth(1)} className="btn-icon">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
      
      <div className="card glass">
        <h2 className="subtitle" style={{ fontSize: '14px', marginBottom: '16px' }}>Tren 5 Bulan Terakhir</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis hide domain={[0, 'dataMax + 10000']} />
              <Tooltip 
                cursor={{fill: 'var(--bg-main)'}} 
                contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}
                formatter={(val: any) => fmt(Number(val))}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
              <Bar dataKey="pendapatan" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Pendapatan" />
              <Bar dataKey="pengeluaran" fill="var(--secondary)" radius={[4, 4, 0, 0]} name="Pengeluaran" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
        {/* Pendapatan Card */}
        {(() => {
          const growthPct = prevMonthIncome > 0
            ? ((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100
            : (currentMonthIncome > 0 ? 100 : 0);
          const isUp = growthPct >= 0;
          return (
            <div className="card" style={{ 
              flex: 1, minWidth: 0, marginBottom: 0, background: 'var(--primary-gradient)', 
              color: 'white', border: 'none', padding: '16px',
              boxShadow: '0 10px 25px var(--primary-glow)' 
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>Pendapatan</div>
              <div style={{ fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmt(currentMonthIncome)}</div>
              {(currentMonthIncome > 0 || prevMonthIncome > 0) && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '6px',
                  padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                  background: isUp ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                }}>
                  {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(growthPct).toFixed(0)}% vs bulan lalu
                </div>
              )}
            </div>
          );
        })()}

        {/* Pengeluaran Card */}
        {(() => {
          const growthPct = prevMonthExpense > 0
            ? ((currentMonthExpense - prevMonthExpense) / prevMonthExpense) * 100
            : (currentMonthExpense > 0 ? 100 : 0);
          const isUp = growthPct >= 0;
          // For expense: going up is bad (red-ish), going down is good (green-ish)
          return (
            <div className="card" style={{ 
              flex: 1, minWidth: 0, marginBottom: 0, background: 'var(--secondary-gradient)', 
              color: 'white', border: 'none', padding: '16px',
              boxShadow: '0 10px 25px var(--secondary-glow)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>Pengeluaran</div>
              <div style={{ fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmt(currentMonthExpense)}</div>
              {(currentMonthExpense > 0 || prevMonthExpense > 0) && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '6px',
                  padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                  background: isUp ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)',
                }}>
                  {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(growthPct).toFixed(0)}% vs bulan lalu
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Insights Section ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
        {/* Net Savings */}
        <div className="card glass" style={{ marginBottom: 0, padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: insights.netSavings >= 0 ? 'var(--bg-income)' : 'var(--bg-expense)', color: insights.netSavings >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>
              <TrendingUp size={14} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Sisa Bersih</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: insights.netSavings >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
            {insights.netSavings >= 0 ? '+' : ''}{fmt(insights.netSavings)}
          </div>
          {currentMonthIncome > 0 && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Rasio tabungan: {insights.savingsRate.toFixed(0)}%
            </div>
          )}
        </div>

        {/* Daily Average Spending */}
        <div className="card glass" style={{ marginBottom: 0, padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsla(35,80%,55%,0.1)', color: 'hsl(35,80%,45%)' }}>
              <Calendar size={14} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Rata-rata/Hari</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--secondary)' }}>
            {fmt(insights.avgDailySpending)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            pengeluaran harian
          </div>
        </div>

        {/* Transaction Count */}
        <div className="card glass" style={{ marginBottom: 0, padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsla(260,70%,60%,0.1)', color: 'hsl(260,70%,55%)' }}>
              <Receipt size={14} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Transaksi</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800 }}>
            {insights.txCountTotal}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {insights.txCountExpense} keluar · {insights.txCountIncome} masuk{insights.txCountTransfer > 0 ? ` · ${insights.txCountTransfer} tf` : ''}
          </div>
        </div>

        {/* Top Spending Day */}
        <div className="card glass" style={{ marginBottom: 0, padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsla(350,80%,55%,0.1)', color: 'hsl(350,80%,50%)' }}>
              <Flame size={14} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Hari Terboros</span>
          </div>
          {insights.topSpendingDay ? (
            <>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--danger)' }}>
                {fmt(insights.topSpendingDay.amount)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {new Date(insights.topSpendingDay.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>-</div>
          )}
        </div>
      </div>

      {/* Biggest Transaction */}
      {insights.biggestExpenseTx && (
        <div className="card glass" style={{ marginBottom: '24px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-expense)', color: 'var(--secondary)', flexShrink: 0 }}>
            <Wallet size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Pengeluaran Terbesar</div>
            <div style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {insights.biggestExpenseTx.note || insights.biggestExpenseTx.category}
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--danger)', flexShrink: 0 }}>
            {fmt(insights.biggestExpenseTx.amount)}
          </div>
        </div>
      )}

      {drillDownCategory && (
        <div className="card glass" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setDrillDownCategory(null)} className="btn" style={{ padding: '4px 12px', background: 'var(--bg-main)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ChevronLeft size={16} /> Kembali
          </button>
          <span style={{ fontWeight: 600 }}>Rincian Sub-kategori: {drillDownCategory.name}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {expenseCategoryData.length > 0 && (!drillDownCategory || drillDownCategory.type === 'pengeluaran') && (
          <div className="card glass">
            <h2 className="subtitle" style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>Pengeluaran {drillDownCategory ? `(${drillDownCategory.name})` : 'per Kategori'}</h2>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={expenseCategoryData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    onClick={(data, index) => {
                      if (!drillDownCategory && !(data as any).__isOthers) {
                        setDrillDownCategory({ name: data.name ?? '', type: 'pengeluaran', colorIndex: index % COLORS.length });
                      }
                    }}
                    style={{ cursor: drillDownCategory ? 'default' : 'pointer' }}
                  >
                    {expenseCategoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + (drillDownCategory?.colorIndex ?? 0)) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => fmt(Number(val))}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                  />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px', maxHeight: '120px', overflowY: 'auto' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {incomeCategoryData.length > 0 && (!drillDownCategory || drillDownCategory.type === 'pendapatan') && (
          <div className="card glass">
            <h2 className="subtitle" style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>Pendapatan {drillDownCategory ? `(${drillDownCategory.name})` : 'per Kategori'}</h2>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={incomeCategoryData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    onClick={(data, index) => {
                      if (!drillDownCategory && !(data as any).__isOthers) {
                        setDrillDownCategory({ name: data.name ?? '', type: 'pendapatan', colorIndex: (index + 3) % COLORS.length });
                      }
                    }}
                    style={{ cursor: drillDownCategory ? 'default' : 'pointer' }}
                  >
                    {incomeCategoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + (drillDownCategory ? drillDownCategory.colorIndex : 3)) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => fmt(Number(val))}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {topCategories.length > 0 && (
        <div className="card glass" style={{ marginBottom: '80px' }}>
          <h2 className="subtitle" style={{ fontSize: '14px', marginBottom: '16px' }}>
            {drillDownCategory ? `Rincian Sub-kategori: ${drillDownCategory.name}` : 'Total Terbesar per Kategori'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topCategories.map(cat => (
              <div 
                key={cat.id} 
                onClick={() => {
                  if (!drillDownCategory && cat.category !== 'Lainnya') {
                    setDrillDownCategory({ name: cat.category, type: cat.type, colorIndex: cat.colorIndex });
                  }
                }}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '12px', background: 'var(--bg-main)', borderRadius: '12px',
                  cursor: drillDownCategory || cat.category === 'Lainnya' ? 'default' : 'pointer',
                  opacity: cat.category === 'Lainnya' ? 0.7 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${cat.color}15`,
                    color: cat.color
                  }}>
                    {cat.type === 'pendapatan' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{cat.category}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {drillDownCategory ? 'Sub-kategori' : (cat.type === 'pendapatan' ? 'Total Pendapatan' : 'Total Pengeluaran')}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: cat.type === 'pendapatan' ? 'var(--primary)' : 'var(--secondary)' }}>
                  {cat.type === 'pendapatan' ? '+' : '-'}{fmt(cat.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DatePickerModal 
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        viewDate={viewDate}
        onSelectDate={setViewDate}
      />
    </div>
  );
};

export default Statistics;
