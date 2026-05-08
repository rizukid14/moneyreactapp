import React, { useMemo, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, Area, AreaChart, LineChart, Line } from 'recharts';
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown, ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Receipt, Calendar, Flame } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import DatePickerModal from '../components/modals/DatePickerModal';
import { formatCurrency } from '../lib/utils';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_NAMES_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];

const Statistics: React.FC = () => {
  const { transactions, currencySymbol, startOfMonthDay, theme, chartStyle } = useMoney();
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    if (startOfMonthDay > 1 && d.getDate() >= startOfMonthDay) {
      return new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return d;
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [drillDownCategory, setDrillDownCategory] = useState<{name: string, type: 'pendapatan'|'pengeluaran', colorIndex: number} | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    day: number;
    amount: number;
    x: number;
    y: number;
  } | null>(null);
  const [chartScale, setChartScale] = useState<'linear' | 'log' | 'dual'>(() => {
    try {
      const saved = localStorage.getItem('moneyapp-chart-scale');
      if (saved === 'linear' || saved === 'log' || saved === 'dual') {
        return saved;
      }
    } catch {}
    return 'dual'; // default to dual (independent scales) as requested to make small expenses significant
  });

  const changeChartScale = useCallback((scale: 'linear' | 'log' | 'dual') => {
    setChartScale(scale);
    try {
      localStorage.setItem('moneyapp-chart-scale', scale);
    } catch {}
  }, []);

  const fmt = useCallback((value: number) => formatCurrency(value, currencySymbol), [currencySymbol]);

  const { chartData, currentMonthIncome, currentMonthExpense, prevMonthIncome, prevMonthExpense, expenseCategoryData, incomeCategoryData, topCategories, insights, dailyExpenseChart, heatmapData } = useMemo((): {
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
    dailyExpenseChart: { day: number; label: string; amount: number; income: number }[];
    heatmapData: { name: string; year: number; firstDow: number; cells: { date: string; day: number; amount: number; level: number }[] }[];
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

    const dailyIncome: Record<string, number> = {};
    const heatmapSpending: Record<string, number> = {}; // Full calendar year (Jan-Dec) range
    const heatmapStart = new Date(vY, 0, 1);
    const heatmapEnd = new Date(vY, 11, 31, 23, 59, 59);

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
        if (tx.type === 'pendapatan') {
          dailyIncome[tx.date] = (dailyIncome[tx.date] || 0) + tx.amount;
        }
        if (tx.type === 'transfer') txCountTransfer++;
      }

      // Track spending for full calendar year heatmap
      if (tx.type === 'pengeluaran' && txDate >= heatmapStart && txDate <= heatmapEnd) {
        heatmapSpending[tx.date] = (heatmapSpending[tx.date] || 0) + tx.amount;
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
      insights: insightsData,
      dailyExpenseChart: buildDailyChart(),
      heatmapData: buildHeatmap(),
    };

    function buildDailyChart() {
      const result: { day: number; label: string; amount: number; income: number }[] = [];
      const current = new Date(vPeriodStart);
      
      while (current < vPeriodEnd) {
        const y = current.getFullYear();
        const m = current.getMonth();
        const d = current.getDate();
        const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        result.push({
          day: d,
          label: `${d}`,
          amount: dailySpending[key] || 0,
          income: dailyIncome[key] || 0
        });
        
        current.setDate(current.getDate() + 1);
      }
      
      return result;
    }

    function buildHeatmap() {
      const months = [];
      for (let m = 0; m < 12; m++) {
        const d = new Date(vY, m, 1);
        const y = d.getFullYear();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const firstDow = d.getDay();
        const cells = Array.from({ length: daysInMonth }, (_, i) => {
          const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
          return { date: key, day: i + 1, amount: heatmapSpending[key] || 0, level: 0 };
        });
        months.push({ name: MONTH_NAMES[m], year: y, firstDow, cells });
      }
      // Normalize levels across all 12 months
      const maxVal = Math.max(...months.flatMap(m => m.cells.map(c => c.amount)), 1);
      return months.map(mo => ({
        ...mo,
        cells: mo.cells.map(c => ({ ...c, level: c.amount === 0 ? 0 : Math.ceil((c.amount / maxVal) * 4) }))
      }));
    }
  }, [transactions, viewDate, drillDownCategory]);

  const scaledDailyChart = useMemo(() => {
    if (chartScale === 'log') {
      return dailyExpenseChart.map(d => ({
        ...d,
        incomeScaled: d.income > 0 ? Math.log10(d.income) : 0,
        amountScaled: d.amount > 0 ? Math.log10(d.amount) : 0,
      }));
    }
    return dailyExpenseChart;
  }, [dailyExpenseChart, chartScale]);

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

      {/* ── 3-Month Spending Heatmap ─────────────────────────── */}
      {(() => {
        const allCells = heatmapData.flatMap(m => m.cells);
        const activeDays = allCells.filter(c => c.amount >= 1000).length;
        const maxAmount = Math.max(...allCells.map(c => c.amount), 1);
        if (activeDays === 0) return null;

        const CELL = 13;
        const GAP = 4;

        // Build ONE continuous flat grid
        const firstDow = heatmapData[0].firstDow;
        const totalCells = firstDow + allCells.length;
        const numWeeks = Math.ceil(totalCells / 7);
        const grid: (typeof allCells[0] | null)[][] = Array.from({ length: numWeeks }, () => Array(7).fill(null));
        allCells.forEach((cell, i) => {
          const pos = firstDow + i;
          grid[Math.floor(pos / 7)][pos % 7] = cell;
        });

        // Which week column does each month's 1st day land on?
        const monthLabelCols: Record<number, string> = {};
        let offset = 0;
        heatmapData.forEach(mo => {
          const col = Math.floor((firstDow + offset) / 7);
          monthLabelCols[col] = mo.name;
          offset += mo.cells.length;
        });

        // Dynamically compute the exact heatmap cell color based on Rupiah amount
        const getHeatmapColorStyle = (amount: number, currentTheme?: 'light' | 'dark'): React.CSSProperties => {
          const isDark = currentTheme === 'dark';
          
          if (amount < 1000) {
            return isDark
              ? {
                  background: 'rgba(255, 255, 255, 0.06)', // gray with opacity in dark mode
                  border: '1px solid rgba(255, 255, 255, 0.03)',
                  boxShadow: 'none',
                }
              : {
                  background: 'rgba(255, 255, 255, 1)', // pure white in light mode
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  boxShadow: 'none',
                };
          }

          // Golden Tier (> 10 Million Rupiah)
          if (amount > 10000000) {
            return {
              background: 'linear-gradient(135deg, #ffe066 0%, #f5c200 50%, #b38600 100%)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(179, 134, 0, 0.4)',
              boxShadow: '0 0 12px 3px rgba(245, 194, 0, 0.7)',
            };
          }

          // Silver Tier (> 5 Million Rupiah)
          if (amount > 5000000) {
            return {
              background: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 50%, #64748b 100%)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(100, 116, 139, 0.4)',
              boxShadow: '0 0 10px 2.5px rgba(203, 213, 225, 0.6)',
            };
          }

          // Interpolate amount to normalized parameter t (0 to 1) based on user landmarks:
          // 1K -> t = 0
          // 5K -> t = 0.14
          // 10K -> t = 0.28
          // 50K -> t = 0.42
          // 100K -> t = 0.57
          // 250K -> t = 0.71
          // 500K -> t = 0.85
          // >1JT -> t = 1.00
          let t = 0;
          if (amount <= 5000) {
            t = 0.14 * ((amount - 1000) / 4000);
          } else if (amount <= 10000) {
            t = 0.14 + 0.14 * ((amount - 5000) / 5000);
          } else if (amount <= 50000) {
            t = 0.28 + 0.14 * ((amount - 10000) / 40000);
          } else if (amount <= 100000) {
            t = 0.42 + 0.15 * ((amount - 50000) / 50000);
          } else if (amount <= 250000) {
            t = 0.57 + 0.14 * ((amount - 100000) / 150000);
          } else if (amount <= 500000) {
            t = 0.71 + 0.14 * ((amount - 250000) / 250000);
          } else {
            t = 0.85 + 0.15 * (Math.min(amount - 500000, 500000) / 500000);
          }

          const interpolate = (start: number, end: number, ratio: number) => start + (end - start) * ratio;

          // Compute HSL properties:
          // Hue: 355 (warm crimson red from theme's --danger variable)
          const hue = 355;
          
          // Saturation: starts gray (0%) and interpolates up to burning red (100%)
          const saturation = Math.round(interpolate(0, 100, t));
          
          // Lightness: balanced for light/dark modes
          const baseLightness = isDark ? 45 : 55;
          const lightness = Math.round(interpolate(baseLightness, 48, t));
          
          // Opacity: starts from translucent (0.25) to solid (1.0)
          const opacity = interpolate(0.25, 1.0, t);

          const bgStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`;

          // Premium ambient outer glow for high values (above mid-way, e.g. t > 0.5)
          let boxShadow = 'none';
          if (t > 0.5) {
            const glowOpacity = (t - 0.5) * 0.4; // max 0.20 glow opacity
            boxShadow = `0 0 6px 1.5px hsla(${hue}, 95%, 50%, ${glowOpacity})`;
          }

          return {
            background: bgStyle,
            border: isDark ? '1px solid rgba(255, 255, 255, 0.03)' : '1px solid rgba(0, 0, 0, 0.04)',
            boxShadow,
          };
        };

        return (
          <div 
            className="card glass" 
            style={{ marginBottom: '24px', padding: '16px', position: 'relative' }}
            onClick={() => setHoveredCell(null)}
          >
            {/* Scoped animations */}
            <style>{`
              @keyframes fadeInScale {
                from {
                  opacity: 0;
                  transform: translate(-50%, -92%) scale(0.95);
                }
                to {
                  opacity: 1;
                  transform: translate(-50%, -100%) scale(1);
                }
              }
            `}</style>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 className="subtitle" style={{ fontSize: '14px', margin: 0 }}>Aktivitas Pengeluaran</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{activeDays} hari aktif</span>
            </div>

            {/* Scrollable container with modern scrollbar styling */}
            <div 
              className="custom-scrollbar"
              style={{ 
                overflowX: 'auto', 
                WebkitOverflowScrolling: 'touch',
                paddingBottom: '8px',
                width: '100%'
              }}
            >
              <div style={{ display: 'flex', gap: GAP, width: 'max-content', margin: '0 auto' }}>
                {grid.map((week, wi) => (
                  <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP, flexShrink: 0 }}>
                    {/* Month label row — shown only for the column where each month starts */}
                    <div style={{ height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {monthLabelCols[wi] && (
                        <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                          {monthLabelCols[wi]}
                        </span>
                      )}
                    </div>
                    {/* 7 day cells */}
                    {week.map((cell, di) => {
                      const isHovered = hoveredCell && cell && hoveredCell.date === cell.date;
                      return (
                        <div
                          key={di}
                          title="" // Disable browser default tooltip
                          style={{
                            width: CELL, height: CELL, borderRadius: 3,
                            transition: 'transform 0.12s, box-shadow 0.12s, border-color 0.12s',
                            flexShrink: 0,
                            cursor: cell ? 'pointer' : 'default',
                            ...(cell ? getHeatmapColorStyle(cell.amount, theme) : { background: 'transparent', border: 'none' }),
                            ...(isHovered && {
                              transform: 'scale(1.3)',
                              zIndex: 10,
                              filter: cell.amount === 0 ? 'none' : 'brightness(1.15)',
                              ...(cell.amount === 0 ? {
                                background: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)',
                              } : {}),
                              border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.6)' : '1px solid rgba(0, 0, 0, 0.4)',
                            }),
                          }}
                          onMouseEnter={e => {
                            if (cell) {
                              const cellRect = e.currentTarget.getBoundingClientRect();
                              const container = e.currentTarget.closest('.card.glass');
                              if (container) {
                                const containerRect = container.getBoundingClientRect();
                                setHoveredCell({
                                  date: cell.date,
                                  day: cell.day,
                                  amount: cell.amount,
                                  x: cellRect.left - containerRect.left + cellRect.width / 2,
                                  y: cellRect.top - containerRect.top,
                                });
                              }
                            }
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={e => {
                            if (cell) {
                              e.stopPropagation();
                              const cellRect = e.currentTarget.getBoundingClientRect();
                              const container = e.currentTarget.closest('.card.glass');
                              if (container) {
                                const containerRect = container.getBoundingClientRect();
                                setHoveredCell({
                                  date: cell.date,
                                  day: cell.day,
                                  amount: cell.amount,
                                  x: cellRect.left - containerRect.left + cellRect.width / 2,
                                  y: cellRect.top - containerRect.top,
                                });
                              }
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Range-based continuous Legend with accurate ticks */}
            {(() => {
              const stop0 = theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 1)';
              const stop1K = getHeatmapColorStyle(1000, theme).background;
              const stop5K = getHeatmapColorStyle(5000, theme).background;
              const stop10K = getHeatmapColorStyle(10000, theme).background;
              const stop50K = getHeatmapColorStyle(50000, theme).background;
              const stop100K = getHeatmapColorStyle(100000, theme).background;
              const stop250K = getHeatmapColorStyle(250000, theme).background;
              const stop500K = getHeatmapColorStyle(500000, theme).background;
              const stop1M = getHeatmapColorStyle(1000000, theme).background;

              const gradientStops = `${stop0} 0%, ${stop1K} 0%, ${stop5K} 14%, ${stop10K} 28%, ${stop50K} 42%, ${stop100K} 57%, ${stop250K} 71%, ${stop500K} 85%, ${stop1M} 100%`;

              const ticks = [
                { label: '1K', pos: 0 },
                { label: '5K', pos: 14 },
                { label: '10K', pos: 28 },
                { label: '50K', pos: 42 },
                { label: '100K', pos: 57 },
                { label: '250K', pos: 71 },
                { label: '500K', pos: 85 },
                { label: '>1Jt', pos: 100 },
              ];

              return (
                <div style={{ marginTop: '18px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Skala Akurasi Pengeluaran (Rupiah)</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Maks: {fmt(maxAmount)}</span>
                  </div>
                  
                  {/* The continuous gradient bar */}
                  <div style={{ position: 'relative', padding: '0 4px', marginBottom: '6px' }}>
                    <div style={{
                      height: '10px',
                      borderRadius: '5px',
                      background: `linear-gradient(to right, ${gradientStops})`,
                      border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                    }} />
                    
                    {/* Ticks and Labels */}
                    <div style={{ position: 'relative', height: '24px', marginTop: '4px' }}>
                      {ticks.map((tick, idx) => (
                        <div key={idx} style={{
                          position: 'absolute',
                          left: `${tick.pos}%`,
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          fontSize: '9px',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                        }}>
                          <div style={{ width: '1px', height: '4px', background: 'var(--text-muted)', opacity: 0.5, marginBottom: '2px' }} />
                          <span style={{ whiteSpace: 'nowrap' }}>{tick.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Premium Dynamic Floating Overlay Popup (Web Hover + Mobile Tap) */}
            {hoveredCell && (
              <div style={{
                position: 'absolute',
                left: `${hoveredCell.x}px`,
                top: `${hoveredCell.y - 10}px`, // 10px above cell
                transform: 'translate(-50%, -100%)',
                background: theme === 'dark' ? 'rgba(20, 20, 30, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '12px',
                padding: '10px 14px',
                boxShadow: theme === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.5)' : '0 8px 24px rgba(0, 0, 0, 0.12)',
                zIndex: 1000,
                pointerEvents: 'none',
                animation: 'fadeInScale 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                width: 'max-content',
                maxWidth: '220px',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {new Date(hoveredCell.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long' })}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                    {new Date(hoveredCell.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <div style={{ 
                    marginTop: '4px',
                    paddingTop: '4px',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: '13px', 
                    fontWeight: 800, 
                    color: hoveredCell.amount > 0 ? 'var(--secondary)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    {hoveredCell.amount > 0 ? (
                      <>
                        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--secondary)' }} />
                        {fmt(hoveredCell.amount)}
                      </>
                    ) : (
                      'Tidak ada pengeluaran'
                    )}
                  </div>
                </div>
                
                {/* Speech bubble arrow */}
                <div style={{
                  position: 'absolute',
                  bottom: '-6px',
                  left: '50%',
                  transform: 'translateX(-50%) rotate(45deg)',
                  width: '10px',
                  height: '10px',
                  background: theme === 'dark' ? 'rgba(20, 20, 30, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                  borderRight: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid rgba(0, 0, 0, 0.08)',
                  borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid rgba(0, 0, 0, 0.08)',
                  zIndex: -1,
                }} />
              </div>
            )}
          </div>
        );
      })()}


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

      {/* ── Daily Expense Area Chart ──────────────────────────── */}
      {currentMonthExpense > 0 && (
        <div className="card glass" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h2 className="subtitle" style={{ fontSize: '14px', margin: 0 }}>Pengeluaran &amp; Pendapatan Harian</h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                {MONTH_NAMES_FULL[viewDate.getMonth()]} {viewDate.getFullYear()}
              </div>
            </div>
            
            <div style={{ display: 'flex', background: 'var(--bg-main)', borderRadius: '12px', padding: '2px', border: '1px solid var(--border-color)', width: 'fit-content' }}>
              {(['linear', 'dual', 'log'] as const).map(scale => (
                <button
                  key={scale}
                  onClick={() => changeChartScale(scale)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: chartScale === scale ? 'var(--bg-card-solid)' : 'transparent',
                    color: chartScale === scale ? 'var(--text-main)' : 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: chartScale === scale ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {scale === 'linear' ? 'Gabungan' : scale === 'dual' ? 'Mandiri' : 'Log'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              {chartStyle === 'line' ? (
                <LineChart data={scaledDailyChart} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={4} />
                  {chartScale === 'dual' ? (
                    <>
                      <YAxis yAxisId="left" hide domain={[0, 'dataMax + 5000']} />
                      <YAxis yAxisId="right" hide domain={[0, 'dataMax + 5000']} />
                    </>
                  ) : (
                    <YAxis hide domain={chartScale === 'log' ? [0, 'dataMax + 0.5'] : [0, 'dataMax + 5000']} />
                  )}
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', fontSize: '12px' }}
                    formatter={(val: any, name: any, props: any) => {
                      const item = props?.payload || {};
                      const realVal = name === 'amount' || name === 'amountScaled' ? (item.amount ?? val) : (item.income ?? val);
                      const formattedVal = chartScale === 'log' ? fmt(Number(realVal)) : fmt(Number(val));
                      return [formattedVal, name === 'amount' || name === 'amountScaled' ? 'Pengeluaran' : 'Pendapatan'];
                    }}
                    labelFormatter={(label: any) => `Tgl ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey={chartScale === 'log' ? 'incomeScaled' : 'income'}
                    yAxisId={chartScale === 'dual' ? 'left' : undefined}
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={false}
                    name="income"
                    activeDot={{ r: 4 }}
                    style={{ filter: 'drop-shadow(0px 3px 6px rgba(16, 185, 129, 0.25))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey={chartScale === 'log' ? 'amountScaled' : 'amount'}
                    yAxisId={chartScale === 'dual' ? 'right' : undefined}
                    stroke="var(--secondary)"
                    strokeWidth={3}
                    dot={false}
                    name="amount"
                    activeDot={{ r: 6, fill: 'var(--secondary)', stroke: theme === 'dark' ? '#14141d' : 'white', strokeWidth: 1.5 }}
                    style={{ filter: 'drop-shadow(0px 4px 8px rgba(239, 68, 68, 0.35))' }}
                  />
                </LineChart>
              ) : (
                <AreaChart data={scaledDailyChart} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={4} />
                  {chartScale === 'dual' ? (
                    <>
                      <YAxis yAxisId="left" hide domain={[0, 'dataMax + 5000']} />
                      <YAxis yAxisId="right" hide domain={[0, 'dataMax + 5000']} />
                    </>
                  ) : (
                    <YAxis hide domain={chartScale === 'log' ? [0, 'dataMax + 0.5'] : [0, 'dataMax + 5000']} />
                  )}
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', fontSize: '12px' }}
                    formatter={(val: any, name: any, props: any) => {
                      const item = props?.payload || {};
                      const realVal = name === 'amount' || name === 'amountScaled' ? (item.amount ?? val) : (item.income ?? val);
                      const formattedVal = chartScale === 'log' ? fmt(Number(realVal)) : fmt(Number(val));
                      return [formattedVal, name === 'amount' || name === 'amountScaled' ? 'Pengeluaran' : 'Pendapatan'];
                    }}
                    labelFormatter={(label: any) => `Tgl ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey={chartScale === 'log' ? 'incomeScaled' : 'income'}
                    yAxisId={chartScale === 'dual' ? 'left' : undefined}
                    stroke="var(--primary)"
                    strokeWidth={1.5}
                    fill="url(#incGrad)"
                    dot={false}
                    name="income"
                  />
                  <Area
                    type="monotone"
                    dataKey={chartScale === 'log' ? 'amountScaled' : 'amount'}
                    yAxisId={chartScale === 'dual' ? 'right' : undefined}
                    stroke="var(--secondary)"
                    strokeWidth={2}
                    fill="url(#expGrad)"
                    dot={false}
                    name="amount"
                    activeDot={{ r: 5, fill: 'var(--secondary)' }}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <div style={{ width: 10, height: 3, borderRadius: 2, background: 'var(--secondary)' }} /> Pengeluaran
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <div style={{ width: 10, height: 3, borderRadius: 2, background: 'var(--primary)' }} /> Pendapatan
            </div>
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
