import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, Area, AreaChart, LineChart, Line } from 'recharts';
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown, ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Receipt, Calendar, Flame, Heart, ShieldCheck, Activity, Target, Zap, CreditCard, CheckCircle2, AlertTriangle, LayoutDashboard, HandCoins } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import DatePickerModal from '../components/modals/DatePickerModal';
import { formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

import { ALL_STATS_VIEWS } from './Settings';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_NAMES_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];

const Statistics: React.FC = () => {
  const {
    transactions, assets,
    currencySymbol, startOfMonthDay, theme, chartStyle,
    statsCarouselCards, defaultStatsView
  } = useMoney();
  const heatmapScrollRef = useRef<HTMLDivElement>(null);
  const [viewDate, setViewDate] = useState(() => {
    // ... (existing init)
    const d = new Date();
    if (startOfMonthDay > 1 && d.getDate() >= startOfMonthDay) {
      return new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return d;
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeViewId, setActiveViewId] = useState(defaultStatsView);
  const [drillDownCategory, setDrillDownCategory] = useState<{ name: string, type: 'pendapatan' | 'pengeluaran', colorIndex: number } | null>(null);
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
    } catch { }
    return 'dual'; // default to dual (independent scales) as requested to make small expenses significant
  });

  const changeChartScale = useCallback((scale: 'linear' | 'log' | 'dual') => {
    setChartScale(scale);
    try {
      localStorage.setItem('moneyapp-chart-scale', scale);
    } catch { }
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

    // ─── Phase 0: Filter Transactions by Active View ───

    // Determine which asset types to include
    let includedAssetTypes: string[] = [];
    if (activeViewId === 'cash_bank') includedAssetTypes = ['Cash', 'Bank Account', 'eWallet'];
    else if (activeViewId === 'investment') includedAssetTypes = ['Investment', 'Savings'];

    const statsTransactions = transactions.filter(tx => {
      if (activeViewId === 'all' || activeViewId === 'health') return true;

      // Map assetId to its type
      const txAsset = assets.find(a => a.id === tx.assetId || a.id === tx.fromAssetId || a.id === tx.toAssetId);
      if (!txAsset) return false;

      return includedAssetTypes.includes(txAsset.type);
    });

    // ─── Phase 1: 6-Month Trend Data ───
    const last6Months: { name: string, month: number, year: number, pengeluaran: number, pendapatan: number, periodStart: Date, periodEnd: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(vY, vM - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();

      const pS = new Date(y, m - (startOfMonthDay > 1 ? 1 : 0), startOfMonthDay);
      const pE = new Date(y, m + (startOfMonthDay > 1 ? 0 : 1), startOfMonthDay);

      last6Months.push({
        name: MONTH_NAMES[m],
        month: m,
        year: y,
        pengeluaran: 0,
        pendapatan: 0,
        periodStart: pS,
        periodEnd: pE
      });
    }

    const currentPeriod = last6Months[last6Months.length - 1];
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

    statsTransactions.forEach(tx => {
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

      // 2. Trend Data (Last 6 Periods)
      last6Months.forEach(m => {
        if (txDate >= m.periodStart && txDate < m.periodEnd) {
          if (tx.type === 'pendapatan') m.pendapatan += tx.amount;
          if (tx.type === 'pengeluaran') m.pengeluaran += tx.amount;
        }
      });
    });

    const expenseData = drillDownCategory?.type === 'pengeluaran'
      ? Object.keys(expBySubCategory).map(key => ({ name: key, value: expBySubCategory[key] })).sort((a, b) => b.value - a.value)
      : Object.keys(expByCategory).map(key => ({ name: key, value: expByCategory[key] })).sort((a, b) => b.value - a.value);

    const incomeData = drillDownCategory?.type === 'pendapatan'
      ? Object.keys(incBySubCategory).map(key => ({ name: key, value: incBySubCategory[key] })).sort((a, b) => b.value - a.value)
      : Object.keys(incByCategory).map(key => ({ name: key, value: incByCategory[key] })).sort((a, b) => b.value - a.value);

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

    const prevPeriod = last6Months.length > 1 ? last6Months[last6Months.length - 2] : null;
    const prevMonthIncomeVal = prevPeriod ? prevPeriod.pendapatan : 0;
    const prevMonthExpenseVal = prevPeriod ? prevPeriod.pengeluaran : 0;

    return {
      chartData: last6Months,
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
  }, [transactions, assets, viewDate, drillDownCategory, activeViewId]);

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

  useEffect(() => {
    if (heatmapScrollRef.current && heatmapData && heatmapData.length > 0) {
      // Find current selected/view month index (0-11)
      const currentMonthIndex = viewDate.getMonth();

      // Calculate column index of this month
      // Heatmap starts on firstDow of January
      const firstDow = heatmapData[0]?.firstDow || 0;
      let offset = 0;
      let targetCol = 0;
      for (let m = 0; m < currentMonthIndex; m++) {
        offset += heatmapData[m]?.cells.length || 0;
      }
      targetCol = Math.floor((firstDow + offset) / 7);

      const CELL_WIDTH = 13;
      const GAP_WIDTH = 4;
      const colLeft = targetCol * (CELL_WIDTH + GAP_WIDTH);

      const container = heatmapScrollRef.current;
      const containerWidth = container.clientWidth;

      // Scroll to center the month column
      container.scrollTo({
        left: Math.max(0, colLeft - containerWidth / 2 + 50), // +50 to show a bit of the previous month for context
        behavior: 'smooth'
      });
    }
  }, [viewDate, heatmapData]);

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

      {/* View Carousel Selector */}
      <div style={{
        marginBottom: '25px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '4px',
        margin: '0 -4px' // negative margin to allow shadow/glow to show
      }} className="hide-scrollbar">
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '4px',
          width: 'max-content'
        }}>
          {statsCarouselCards.map(viewId => {
            const def = ALL_STATS_VIEWS.find(v => v.id === viewId);
            if (!def) return null;
            const isActive = activeViewId === viewId;
            return (
              <motion.button
                key={viewId}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setActiveViewId(viewId);
                  setDrillDownCategory(null);
                }}
                style={{
                  padding: '14px 24px',
                  borderRadius: '18px',
                  background: isActive ? 'var(--primary-gradient)' : 'var(--bg-card-solid)',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: isActive ? '0 10px 25px var(--primary-glow)' : '0 4px 12px rgba(0,0,0,0.03)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  flexShrink: 0,
                  border: isActive ? 'none' : '1px solid var(--border-color)'
                }}
              >
                {viewId === 'health' ? <Flame size={18} style={{ color: isActive ? 'white' : 'var(--secondary)' }} /> :
                  viewId === 'budget' ? <Target size={18} style={{ color: isActive ? 'white' : 'var(--primary)' }} /> :
                    viewId === 'goals' ? <TrendingUp size={18} style={{ color: isActive ? 'white' : 'var(--primary)' }} /> :
                      viewId === 'subs' ? <CreditCard size={18} style={{ color: isActive ? 'white' : 'var(--primary)' }} /> :
                        viewId === 'forecast' ? <Zap size={18} style={{ color: isActive ? 'white' : 'var(--primary)' }} /> :
                          <LayoutDashboard size={18} style={{ color: isActive ? 'white' : 'var(--primary)' }} />}
                {def.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeViewId === 'health' ? (
          <motion.div
            key="health"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <FinancialHealth />
          </motion.div>
        ) : activeViewId === 'budget' ? (
          <motion.div
            key="budget"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <BudgetStatistics viewDate={viewDate} />
          </motion.div>
        ) : activeViewId === 'goals' ? (
          <motion.div
            key="goals"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <GoalStatistics />
          </motion.div>
        ) : activeViewId === 'subs' ? (
          <motion.div
            key="subs"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <SubscriptionStatistics />
          </motion.div>
        ) : activeViewId === 'forecast' ? (
          <motion.div
            key="forecast"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <CashFlowForecast />
          </motion.div>
        ) : (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >

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
              <h2 className="subtitle" style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>Tren 6 Bulan Terakhir</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                    <YAxis hide domain={[0, 'dataMax + 10000']} />
                    <Tooltip
                      cursor={{ fill: 'var(--bg-main)' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}
                      formatter={(val: any) => fmt(Number(val))}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
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

                // Exact landmark values translated from user's CMYK colors
                // R = 255 * (1 - C), G = 255 * (1 - M), B = 255 * (1 - Y)  (since K is 0)
                const landmarks = [
                  { amt: 1000, r: 245, g: 245, b: 245, opLight: 0.35, opDark: 0.15 }, // CMYK(4,4,4,0)
                  { amt: 5000, r: 250, g: 240, b: 237, opLight: 0.48, opDark: 0.22 }, // CMYK(2,6,7,0)
                  { amt: 10000, r: 255, g: 232, b: 232, opLight: 0.60, opDark: 0.32 }, // CMYK(0,9,9,0)
                  { amt: 5000, r: 255, g: 186, b: 184, opLight: 0.75, opDark: 0.50 }, // CMYK(0,27,28,0) (treated as 50K milestone)
                  { amt: 100000, r: 255, g: 117, b: 117, opLight: 0.85, opDark: 0.68 }, // CMYK(0,54,54,0)
                  { amt: 250000, r: 255, g: 64, b: 64, opLight: 0.92, opDark: 0.80 }, // CMYK(0,75,75,0)
                  { amt: 500000, r: 255, g: 33, b: 33, opLight: 0.96, opDark: 0.92 }, // CMYK(0,87,87,0)
                  { amt: 1000000, r: 255, g: 3, b: 3, opLight: 1.00, opDark: 1.00 }  // CMYK(0,99,99,0)
                ];

                // Fix 50K landmark spelling error (changed 5000 to 50000)
                landmarks[3].amt = 50000;

                let r = 245, g = 245, b = 245, opacity = 1.0;

                if (amount <= 1000) {
                  r = 245; g = 245; b = 245;
                  opacity = isDark ? 0.15 : 0.35;
                } else if (amount >= 1000000) {
                  r = 255; g = 3; b = 3;
                  opacity = 1.0;
                } else {
                  let i = 0;
                  while (i < landmarks.length - 1 && amount > landmarks[i + 1].amt) {
                    i++;
                  }
                  const l1 = landmarks[i];
                  const l2 = landmarks[i + 1];
                  const ratio = (amount - l1.amt) / (l2.amt - l1.amt);

                  r = Math.round(l1.r + (l2.r - l1.r) * ratio);
                  g = Math.round(l1.g + (l2.g - l1.g) * ratio);
                  b = Math.round(l1.b + (l2.b - l1.b) * ratio);

                  const op1 = isDark ? l1.opDark : l1.opLight;
                  const op2 = isDark ? l2.opDark : l2.opLight;
                  opacity = op1 + (op2 - op1) * ratio;
                }

                const bgStyle = `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)})`;

                // Premium ambient outer glow for values above 150K (reaches full intensity at 1M)
                let boxShadow = 'none';
                if (amount > 150000) {
                  const glowRatio = Math.min((amount - 150000) / 850000, 1.0);
                  const glowOpacity = glowRatio * 0.28; // max 0.28 glow opacity
                  boxShadow = `0 0 6px 1.5px rgba(255, 3, 3, ${glowOpacity})`;
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
                    ref={heatmapScrollRef}
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginBottom: '16px', gap: '12px' }}>
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
                <div className="card glass" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h2 className="subtitle" style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>Pengeluaran {drillDownCategory ? `(${drillDownCategory.name})` : 'per Kategori'}</h2>
                  <div style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={expenseCategoryData}
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
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
                          contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Custom Interactive Scrollable Legend */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px 12px',
                    justifyContent: 'center',
                    marginTop: '16px',
                    maxHeight: '90px',
                    overflowY: 'auto',
                    padding: '12px 4px 4px 4px',
                    borderTop: '1px solid var(--border-color)',
                  }}
                    className="scrollbar-thin"
                  >
                    {expenseCategoryData.map((item, index) => {
                      const color = COLORS[(index + (drillDownCategory?.colorIndex ?? 0)) % COLORS.length];
                      const isOthers = (item as any).__isOthers;
                      return (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            cursor: (!drillDownCategory && !isOthers) ? 'pointer' : 'default',
                            transition: 'color 0.15s ease'
                          }}
                          onClick={() => {
                            if (!drillDownCategory && !isOthers) {
                              setDrillDownCategory({ name: item.name ?? '', type: 'pengeluaran', colorIndex: index % COLORS.length });
                            }
                          }}
                          onMouseEnter={e => { if (!drillDownCategory && !isOthers) e.currentTarget.style.color = 'var(--text-main)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: color,
                            display: 'inline-block',
                            flexShrink: 0
                          }} />
                          {item.name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {incomeCategoryData.length > 0 && (!drillDownCategory || drillDownCategory.type === 'pendapatan') && (
                <div className="card glass" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h2 className="subtitle" style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>Pendapatan {drillDownCategory ? `(${drillDownCategory.name})` : 'per Kategori'}</h2>
                  <div style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={incomeCategoryData}
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
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
                          contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Custom Interactive Scrollable Legend */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px 12px',
                    justifyContent: 'center',
                    marginTop: '16px',
                    maxHeight: '90px',
                    overflowY: 'auto',
                    padding: '12px 4px 4px 4px',
                    borderTop: '1px solid var(--border-color)',
                  }}
                    className="scrollbar-thin"
                  >
                    {incomeCategoryData.map((item, index) => {
                      const color = COLORS[(index + (drillDownCategory ? drillDownCategory.colorIndex : 3)) % COLORS.length];
                      const isOthers = (item as any).__isOthers;
                      return (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            cursor: (!drillDownCategory && !isOthers) ? 'pointer' : 'default',
                            transition: 'color 0.15s ease'
                          }}
                          onClick={() => {
                            if (!drillDownCategory && !isOthers) {
                              setDrillDownCategory({ name: item.name ?? '', type: 'pendapatan', colorIndex: (index + 3) % COLORS.length });
                            }
                          }}
                          onMouseEnter={e => { if (!drillDownCategory && !isOthers) e.currentTarget.style.color = 'var(--text-main)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: color,
                            display: 'inline-block',
                            flexShrink: 0
                          }} />
                          {item.name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {topCategories.length > 0 && (
              <div className="card glass" style={{ marginBottom: '80px' }}>
                <h2 className="subtitle" style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
                  {drillDownCategory ? `Rincian Sub-kategori: ${drillDownCategory.name}` : 'Total Terbesar per Kategori'}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {topCategories.map(cat => (
                    <div
                      key={cat.id}
                      onClick={() => {
                        if (!drillDownCategory) {
                          setDrillDownCategory({ name: cat.category, type: cat.type, colorIndex: cat.colorIndex });
                        }
                      }}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px', background: 'var(--bg-main)', borderRadius: '12px',
                        cursor: drillDownCategory ? 'default' : 'pointer'
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

          </motion.div>
        )}
      </AnimatePresence>

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        viewDate={viewDate}
        onSelectDate={setViewDate}
      />
    </div>
  );
};

// ─── FinancialHealth Component ────────────────────────────────────────────────
const SCORE_COLORS = {
  excellent: '#10b981',
  good: '#3b82f6',
  fair: '#f59e0b',
  poor: '#ef4444'
};

const FinancialHealth: React.FC = () => {
  const {
    transactions, assets, debts, budgets, categories,
    currencySymbol, theme
  } = useMoney();

  const isDark = theme === 'dark';

  const fmt = (val: number) => formatCurrency(val, currencySymbol);

  const stats = useMemo(() => {
    const now = new Date();
    const last6Months: { month: number; year: number; income: number; expense: number; netWorth: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({ month: d.getMonth(), year: d.getFullYear(), income: 0, expense: 0, netWorth: 0 });
    }

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const monthIdx = last6Months.findIndex(l => l.month === txDate.getMonth() && l.year === txDate.getFullYear());
      if (monthIdx !== -1) {
        if (tx.type === 'pendapatan') last6Months[monthIdx].income += tx.amount;
        if (tx.type === 'pengeluaran') last6Months[monthIdx].expense += tx.amount;
      }
    });

    const totalUnpaidDebt = debts.filter(d => !d.isPaid).reduce((sum, d) => {
      const history = transactions.filter(t => t.relatedId === d.id);
      const paidAmt = history.reduce((s, t) => t.type === 'pengeluaran' ? s + t.amount : s, 0);
      return sum + Math.max(0, d.totalAmount - paidAmt);
    }, 0);

    const currentAssetsValue = assets.reduce((sum, a) => {
      const txSum = transactions.filter(t => t.assetId === a.id || t.fromAssetId === a.id || t.toAssetId === a.id)
        .reduce((s, t) => {
          if (t.type === 'pendapatan') return s + t.amount;
          if (t.type === 'pengeluaran') return s - t.amount;
          if (t.type === 'transfer') {
            if (t.toAssetId === a.id) return s + t.amount;
            if (t.fromAssetId === a.id) return s - t.amount;
          }
          return s;
        }, 0);
      return sum + (a.initialBalance || 0) + txSum;
    }, 0);

    const currentNetWorth = currentAssetsValue - totalUnpaidDebt;

    let tempNetWorth = currentNetWorth;
    for (let i = last6Months.length - 1; i >= 0; i--) {
      last6Months[i].netWorth = tempNetWorth;
      tempNetWorth -= (last6Months[i].income - last6Months[i].expense);
    }

    const recentMonths = last6Months.slice(-3);
    const avgIncome = recentMonths.reduce((sum, m) => sum + m.income, 0) / 3 || 1;
    const avgExpense = recentMonths.reduce((sum, m) => sum + m.expense, 0) / 3;
    const savingsRate = ((avgIncome - avgExpense) / avgIncome) * 100;

    let savingsScore = 0;
    if (savingsRate >= 20) savingsScore = 25;
    else if (savingsRate >= 15) savingsScore = 20;
    else if (savingsRate >= 10) savingsScore = 15;
    else if (savingsRate >= 5) savingsScore = 10;
    else if (savingsRate >= 0) savingsScore = 5;

    const avgMonthlyExpense = last6Months.reduce((sum, m) => sum + m.expense, 0) / 6 || 1;
    const efMonths = currentAssetsValue / avgMonthlyExpense;

    let efScore = 0;
    if (efMonths >= 6) efScore = 20;
    else if (efMonths >= 4) efScore = 15;
    else if (efMonths >= 3) efScore = 10;
    else if (efMonths >= 1) efScore = 5;

    const debtRatio = (totalUnpaidDebt / (currentAssetsValue || 1)) * 100;
    let debtScore = 0;
    if (debtRatio === 0) debtScore = 20;
    else if (debtRatio < 10) debtScore = 15;
    else if (debtRatio < 30) debtScore = 10;
    else if (debtRatio < 50) debtScore = 5;

    const currentMonth = last6Months[last6Months.length - 1];
    const activeBudgets = budgets.filter(b => b.month === currentMonth.month + 1 && b.year === currentMonth.year);
    let adherenceRate = 100;
    if (activeBudgets.length > 0) {
      const withinBudgetCount = activeBudgets.filter(b => {
        const cat = categories.find(c => c.id === b.categoryId);
        if (!cat) return true;
        const spent = transactions
          .filter(tx => tx.type === 'pengeluaran' && tx.category === cat.name && new Date(tx.date).getMonth() === currentMonth.month)
          .reduce((sum, tx) => sum + tx.amount, 0);
        return spent <= b.limit;
      }).length;
      adherenceRate = (withinBudgetCount / activeBudgets.length) * 100;
    }

    let budgetScore = 0;
    if (adherenceRate >= 100) budgetScore = 20;
    else if (adherenceRate >= 90) budgetScore = 15;
    else if (adherenceRate >= 80) budgetScore = 10;
    else if (adherenceRate >= 70) budgetScore = 5;

    const spendingMean = last6Months.reduce((sum, m) => sum + m.expense, 0) / 6 || 1;
    const spendingVariance = last6Months.reduce((sum, m) => sum + Math.pow(m.expense - spendingMean, 2), 0) / 6;
    const spendingCV = Math.sqrt(spendingVariance) / spendingMean;

    let consistencyScore = 0;
    if (spendingCV < 0.1) consistencyScore = 10;
    else if (spendingCV < 0.2) consistencyScore = 7;
    else if (spendingCV < 0.3) consistencyScore = 4;

    const incomeMean = last6Months.reduce((sum, m) => sum + m.income, 0) / 6 || 1;
    const incomeVariance = last6Months.reduce((sum, m) => sum + Math.pow(m.income - incomeMean, 2), 0) / 6;
    const incomeCV = Math.sqrt(incomeVariance) / incomeMean;

    let stabilityScore = 0;
    if (incomeCV < 0.1) stabilityScore = 5;
    else if (incomeCV < 0.2) stabilityScore = 3;

    const totalScore = savingsScore + efScore + debtScore + budgetScore + consistencyScore + stabilityScore;

    const prevMonth = last6Months[last6Months.length - 2];
    const momSpending = prevMonth.expense > 0 ? ((currentMonth.expense - prevMonth.expense) / prevMonth.expense) * 100 : 0;
    const momSavings = (prevMonth.income - prevMonth.expense) > 0
      ? (((currentMonth.income - currentMonth.expense) - (prevMonth.income - prevMonth.expense)) / (prevMonth.income - prevMonth.expense)) * 100
      : 0;

    return {
      totalScore,
      savingsRate,
      efMonths,
      debtRatio,
      adherenceRate,
      spendingCV,
      incomeCV,
      last6Months,
      momSpending,
      momSavings,
      currentAssetsValue,
      totalUnpaidDebt,
      currentNetWorth,
      metrics: [
        { label: 'Rasio Tabungan', value: `${savingsRate.toFixed(1)}%`, score: savingsScore, max: 25, icon: TrendingUp },
        { label: 'Dana Darurat', value: `${efMonths.toFixed(1)} bln`, score: efScore, max: 20, icon: ShieldCheck },
        { label: 'Rasio Hutang', value: `${debtRatio.toFixed(1)}%`, score: debtScore, max: 20, icon: Zap },
        { label: 'Kepatuhan Anggaran', value: `${adherenceRate.toFixed(0)}%`, score: budgetScore, max: 20, icon: Target },
        { label: 'Konsistensi Belanja', value: spendingCV < 0.2 ? 'Stabil' : 'Fluktuatif', score: consistencyScore, max: 10, icon: Activity },
        { label: 'Stabilitas Income', value: incomeCV < 0.15 ? 'Sangat Stabil' : 'Cukup Stabil', score: stabilityScore, max: 5, icon: Heart },
      ]
    };
  }, [transactions, assets, debts, budgets, categories]);

  const scoreLabel = useMemo(() => {
    const score = stats.totalScore;
    if (score >= 85) return { text: 'Excellent', color: SCORE_COLORS.excellent };
    if (score >= 70) return { text: 'Good', color: SCORE_COLORS.good };
    if (score >= 50) return { text: 'Fair', color: SCORE_COLORS.fair };
    return { text: 'Poor', color: SCORE_COLORS.poor };
  }, [stats.totalScore]);

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* ─── Health Score Meter ────────────────────────────────────────────────── */}
      <motion.div
        className="card glass"
        style={{
          textAlign: 'center', padding: '32px 20px', overflow: 'hidden',
          background: `linear-gradient(180deg, ${isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.8)'}, transparent)`
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={{ position: 'relative', width: '220px', height: '140px', margin: '0 auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { value: stats.totalScore },
                  { value: 100 - stats.totalScore }
                ]}
                cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={75} outerRadius={100} paddingAngle={0} dataKey="value"
              >
                <Cell fill={scoreLabel.color} />
                <Cell fill={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <span style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1, color: 'var(--text-main)' }}>{stats.totalScore}</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: scoreLabel.color, marginTop: '4px' }}>{scoreLabel.text}</span>
          </div>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '20px', maxWidth: '300px', margin: '20px auto 0' }}>
          Skor Anda didasarkan pada 6 metrik kesehatan finansial utama.
        </p>
      </motion.div>

      {/* ─── Metric Breakdown ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {stats.metrics.map((m, i) => (
          <motion.div
            key={i} className="card" style={{ padding: '16px', margin: 0, border: '1.5px solid var(--border-color)' }}
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
          >
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '12px', background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                <m.icon size={18} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>{m.score}/{m.max}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>{m.label}</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>{m.value}</div>
            <div style={{ height: '4px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${(m.score / m.max) * 100}%`,
                background: m.score / m.max > 0.8 ? '#10b981' : m.score / m.max > 0.5 ? '#3b82f6' : '#f59e0b'
              }} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── MoM Indicators ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div className="card shadow-soft" style={{ flex: 1, margin: 0, border: 'none', background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>Trend Belanja</div>
          <div className="flex-gap" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 800 }}>{Math.abs(stats.momSpending).toFixed(0)}%</span>
            {stats.momSpending > 0 ? <ArrowUpRight size={18} color="#ef4444" /> : <ArrowDownRight size={18} color="#10b981" />}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>vs bulan lalu</div>
        </div>
        <div className="card shadow-soft" style={{ flex: 1, margin: 0, border: 'none', background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>Tabungan Bersih</div>
          <div className="flex-gap" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 800 }}>{Math.abs(stats.momSavings).toFixed(0)}%</span>
            {stats.momSavings > 0 ? <ArrowUpRight size={18} color="#10b981" /> : <ArrowDownRight size={18} color="#ef4444" />}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>vs bulan lalu</div>
        </div>
      </div>

      {/* ─── Net Worth Chart ─────────────────────────────────────────────────── */}
      <div className="card glass" style={{ marginBottom: '24px' }}>
        <div className="flex-between" style={{ marginBottom: '20px' }}>
          <div>
            <h2 className="subtitle" style={{ fontSize: '15px' }}>Kekayaan Bersih</h2>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>{fmt(stats.currentNetWorth)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>Aset: {fmt(stats.currentAssetsValue)}</div>
            <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>Hutang: {fmt(stats.totalUnpaidDebt)}</div>
          </div>
        </div>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <AreaChart data={stats.last6Months}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
              <XAxis
                dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={(val) => ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'][val]}
              />
              <YAxis hide domain={['dataMin - 1000000', 'dataMax + 1000000']} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', background: isDark ? '#1e293b' : '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(val: any) => fmt(Number(val))}
                labelFormatter={(label) => ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][label]}
              />
              <Area type="monotone" dataKey="netWorth" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorNetWorth)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const BudgetStatistics: React.FC<{ viewDate: Date }> = ({ viewDate }) => {
  const { budgets, transactions, categories, currencySymbol, startOfMonthDay, budgetMode, monthlyIncome } = useMoney();

  const selectedMonth = viewDate.getMonth();
  const selectedYear = viewDate.getFullYear();

  const spendingMap = useMemo(() => {
    const map: Record<string, number> = { total: 0 };
    const periodStart = new Date(selectedYear, selectedMonth - (startOfMonthDay > 1 ? 1 : 0), startOfMonthDay);
    const periodEnd = new Date(selectedYear, selectedMonth + (startOfMonthDay > 1 ? 0 : 1), startOfMonthDay);

    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d >= periodStart && d < periodEnd && tx.type === 'pengeluaran') {
        map.total += tx.amount;
        const cat = categories.find(c => c.name === tx.category && c.type === 'pengeluaran');
        if (cat) map[cat.id] = (map[cat.id] || 0) + tx.amount;
      }
    });
    return map;
  }, [transactions, selectedMonth, selectedYear, categories, startOfMonthDay]);

  const currentMonthBudgets = budgets.filter(b => b.month === selectedMonth && b.year === selectedYear);
  const globalBudget = currentMonthBudgets.find(b => b.categoryId === null);
  const categoryBudgets = currentMonthBudgets.filter(b => b.categoryId !== null);

  const totalBudgeted = useMemo(() =>
    categoryBudgets.reduce((sum, b) => sum + b.limit, 0),
    [categoryBudgets]);

  const unassignedMoney = monthlyIncome - totalBudgeted;

  const fmt = (v: number) => formatCurrency(v, currencySymbol);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Global Budget / Zero-Based Hero Card */}
      {budgetMode === 'zero-based' ? (
        <div className="card shadow-soft" style={{ padding: '24px 20px', border: 'none', background: 'var(--primary-gradient)', color: 'white', borderRadius: '24px', boxShadow: '0 12px 30px var(--primary-glow)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.1 }}>
            <HandCoins size={120} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Total Pendapatan</div>
            <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>{fmt(monthlyIncome)}</div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', marginBottom: '4px' }}>Dialokasikan</div>
                <div style={{ fontSize: '16px', fontWeight: 800 }}>{fmt(totalBudgeted)}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', marginBottom: '4px' }}>Sisa</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: unassignedMoney === 0 ? 'rgba(255,255,255,0.6)' : '#fff' }}>{fmt(unassignedMoney)}</div>
              </div>
            </div>
          </div>
        </div>
      ) : globalBudget ? (
        <div className="card glass shadow-soft" style={{ padding: '20px', border: 'none', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', color: 'white' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', marginBottom: '8px' }}>Total Anggaran</div>
          <div style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>{fmt(globalBudget.limit)}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              Terpakai: <strong>{fmt(spendingMap.total)}</strong>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800 }}>
              {Math.round((spendingMap.total / globalBudget.limit) * 100)}%
            </div>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden', marginTop: '10px' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((spendingMap.total / globalBudget.limit) * 100, 100)}%` }}
              style={{ height: '100%', background: 'white', borderRadius: '4px' }}
            />
          </div>
          {spendingMap.total > globalBudget.limit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', padding: '6px 10px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }}>
              <AlertTriangle size={14} /> Melebihi anggaran sebesar {fmt(spendingMap.total - globalBudget.limit)}
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card)', borderRadius: '20px', border: '1px dashed var(--border-color)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Belum ada anggaran global</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Atur anggaran di menu Pengaturan</div>
        </div>
      )}

      {/* Category Budgets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>Anggaran Kategori</h3>
        {categoryBudgets.length > 0 ? categoryBudgets.map(b => {
          const cat = categories.find(c => c.id === b.categoryId);
          const spent = spendingMap[b.categoryId!] || 0;
          const percent = b.limit > 0 ? (spent / b.limit) * 100 : 0;
          const statusColor = percent > 100 ? 'var(--danger)' : percent >= 75 ? '#f59e0b' : 'var(--primary)';
          return (
            <div key={b.id} className="card glass" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: statusColor }}>
                    <Wallet size={16} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{cat?.name || 'Kategori'}</div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: percent > 100 ? 'var(--danger)' : 'var(--text-main)' }}>
                  {fmt(spent)} <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px' }}>/ {fmt(b.limit)}</span>
                </div>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(percent, 100)}%` }}
                  style={{ height: '100%', background: statusColor, borderRadius: '3px' }}
                />
              </div>
            </div>
          );
        }) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>Tidak ada anggaran kategori</div>
        )}
      </div>
    </div>
  );
};

// ─── GoalStatistics Component ────────────────────────────────────────────────
const GoalStatistics: React.FC = () => {
  const { goals, transactions, currencySymbol } = useMoney();

  const goalAllocations = useMemo(() => {
    const map: Record<string, number> = {};
    goals.forEach(g => {
      const linkedTxs = transactions.filter(tx => tx.goalId === g.id);
      let total = linkedTxs.reduce((sum, tx) => {
        if (tx.type === 'pendapatan') return sum + tx.amount;
        if (tx.type === 'transfer') return sum + tx.amount;
        if (tx.type === 'pengeluaran') return sum - tx.amount;
        return sum;
      }, 0);
      map[g.id] = Math.max(0, total);
    });
    return map;
  }, [goals, transactions]);

  const fmt = (v: number) => formatCurrency(v, currencySymbol);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>Target Tabungan</h3>
      {goals.length > 0 ? goals.map(g => {
        const current = goalAllocations[g.id] || 0;
        const percent = (current / g.targetAmount) * 100;
        const isCompleted = percent >= 100;
        return (
          <div key={g.id} className="card glass" style={{ padding: '16px', borderLeft: isCompleted ? '4px solid var(--success)' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: isCompleted ? 'var(--bg-income)' : 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCompleted ? 'var(--success)' : 'var(--primary)' }}>
                  {isCompleted ? <CheckCircle2 size={20} /> : <Target size={20} />}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>{g.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Target: {new Date(g.targetDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: isCompleted ? 'var(--success)' : 'var(--primary)' }}>{Math.floor(percent)}%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Tercapai</div>
              </div>
            </div>

            <div style={{ height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(percent, 100)}%` }}
                style={{ height: '100%', background: isCompleted ? 'var(--success)' : 'var(--primary)', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{fmt(current)} / {fmt(g.targetAmount)}</span>
              {isCompleted ? (
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>Selesai! ✨</span>
              ) : (
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Sisa {fmt(g.targetAmount - current)}</span>
              )}
            </div>
          </div>
        );
      }) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: '20px', border: '1px dashed var(--border-color)' }}>
          <Target size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Belum ada target tabungan</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Mulai buat rencana untuk impian Anda!</div>
        </div>
      )}
    </div>
  );
};

// ─── SubscriptionStatistics Component ─────────────────────────────────────────
const SubscriptionStatistics: React.FC = () => {
  const { subscriptions, currencySymbol } = useMoney();

  const totalMonthly = subscriptions
    .filter(s => s.isActive)
    .reduce((sum, s) => sum + (s.billingCycle === 'monthly' ? s.amount : s.amount / 12), 0);

  const fmt = (v: number) => formatCurrency(v, currencySymbol);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card shadow-soft" style={{ padding: '20px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: 'white' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', marginBottom: '8px' }}>Estimasi Biaya Langganan</div>
        <div style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>{fmt(totalMonthly)}</div>
        <div style={{ fontSize: '12px', opacity: 0.9 }}>Per bulan dari {subscriptions.filter(s => s.isActive).length} layanan aktif</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>Daftar Layanan</h3>
        {subscriptions.length > 0 ? subscriptions.map(s => (
          <div key={s.id} className="card glass" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: s.isActive ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                <CreditCard size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{s.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {s.billingCycle === 'monthly' ? 'Bulanan' : 'Tahunan'} • {fmt(s.amount)}
                </div>
              </div>
            </div>
            {!s.isActive && (
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '2px 8px', background: 'var(--bg-main)', borderRadius: '12px' }}>NONAKTIF</div>
            )}
          </div>
        )) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>Belum ada data langganan</div>
        )}
      </div>
    </div>
  );
};

// ─── CashFlowForecast Component ──────────────────────────────────────────────
const CashFlowForecast: React.FC = () => {
  const {
    assets, recurringTransactions, subscriptions, currencySymbol, theme, getAssetBalance
  } = useMoney();

  const [forecastDays, setForecastDays] = useState<30 | 60 | 90>(30);
  const isDark = theme === 'dark';
  const fmt = (v: number) => formatCurrency(v, currencySymbol);

  const forecastData = useMemo(() => {
    const data: { date: string; displayDate: string; balance: number; income: number; expense: number; isDanger: boolean }[] = [];

    // 1. Initial Balance
    let currentBalance = assets
      .filter(a => !a.isDeleted)
      .reduce((sum, a) => sum + (getAssetBalance?.(a.id) || 0), 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 2. Project for 90 days
    for (let i = 0; i < 90; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);

      const dateKey = d.toISOString().split('T')[0];
      const dayOfMonth = d.getDate();
      const dayOfWeek = d.getDay();
      const month = d.getMonth();

      let dailyIncome = 0;
      let dailyExpense = 0;

      // Check Recurring Transactions
      recurringTransactions.filter(rt => rt.isActive).forEach(rt => {
        const startD = new Date(rt.startDate);
        let isToday = false;

        if (rt.frequency === 'daily') isToday = true;
        else if (rt.frequency === 'weekly' && dayOfWeek === startD.getDay()) isToday = true;
        else if (rt.frequency === 'monthly' && dayOfMonth === startD.getDate()) isToday = true;
        else if (rt.frequency === 'yearly' && dayOfMonth === startD.getDate() && month === startD.getMonth()) isToday = true;

        if (isToday) {
          if (rt.type === 'pendapatan') dailyIncome += rt.amount;
          else if (rt.type === 'pengeluaran') dailyExpense += rt.amount;
        }
      });

      // Check Subscriptions
      subscriptions.filter(s => s.isActive).forEach(sub => {
        const subDate = new Date(sub.nextBillingDate);
        let isToday = false;

        if (sub.billingCycle === 'monthly') {
          // Check if day matches
          if (dayOfMonth === subDate.getDate()) isToday = true;
        } else if (sub.billingCycle === 'yearly') {
          // Check if day and month matches
          if (dayOfMonth === subDate.getDate() && month === subDate.getMonth()) isToday = true;
        }

        if (isToday) {
          dailyExpense += sub.amount;
        }
      });

      currentBalance = currentBalance + dailyIncome - dailyExpense;

      data.push({
        date: dateKey,
        displayDate: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        balance: currentBalance,
        income: dailyIncome,
        expense: dailyExpense,
        isDanger: currentBalance < 0
      });
    }

    return data;
  }, [assets, recurringTransactions, subscriptions, getAssetBalance]);

  const activeData = forecastData.slice(0, forecastDays);

  const safeToSpend = useMemo(() => {
    const next30Days = forecastData.slice(0, 30);
    const totalBills = next30Days.reduce((sum, d) => sum + d.expense, 0);
    const currentBal = assets
      .filter(a => !a.isDeleted)
      .reduce((sum, a) => sum + (getAssetBalance?.(a.id) || 0), 0);
    return Math.max(0, currentBal - totalBills);
  }, [forecastData, assets, getAssetBalance]);

  const dangerDays = activeData.filter(d => d.isDanger);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="card shadow-soft" style={{
          background: 'var(--primary-gradient)', color: 'white', border: 'none', padding: '16px',
          boxShadow: '0 10px 25px var(--primary-glow)', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', marginBottom: '4px' }}>Aman Dibelanjakan</div>
          <div style={{ fontSize: '18px', fontWeight: 800 }}>{fmt(safeToSpend)}</div>
          <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Setelah tagihan 30 hari ke depan</div>
          <Zap size={40} style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.15 }} />
        </div>

        <div className="card shadow-soft" style={{
          background: dangerDays.length > 0 ? 'var(--secondary-gradient)' : 'var(--bg-card-solid)',
          color: dangerDays.length > 0 ? 'white' : 'var(--text-main)',
          border: 'none', padding: '16px',
          boxShadow: dangerDays.length > 0 ? '0 10px 25px var(--secondary-glow)' : '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', marginBottom: '4px' }}>Zona Bahaya</div>
          <div style={{ fontSize: '18px', fontWeight: 800 }}>{dangerDays.length} Hari</div>
          <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Saldo diprediksi negatif</div>
          <AlertTriangle size={40} style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.15 }} />
        </div>
      </div>

      {/* Chart Control */}
      <div className="flex-between">
        <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Prediksi Saldo</h3>
        <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          {[30, 60, 90].map(days => (
            <button
              key={days}
              onClick={() => setForecastDays(days as any)}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: 700,
                background: forecastDays === days ? 'var(--bg-card)' : 'transparent',
                color: forecastDays === days ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              {days} HARI
            </button>
          ))}
        </div>
      </div>

      {/* Line Chart */}
      <div className="card glass" style={{ height: '300px', padding: '20px 10px 10px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activeData}>
            <defs>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
            <XAxis
              dataKey="displayDate"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              interval={forecastDays === 90 ? 14 : forecastDays === 60 ? 9 : 4}
            />
            <YAxis
              hide
              domain={['dataMin - 1000000', 'dataMax + 1000000']}
            />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', background: isDark ? '#1e293b' : '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              formatter={(val: any) => fmt(Number(val))}
              labelStyle={{ fontWeight: 800, marginBottom: '4px', color: 'var(--text-main)' }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="var(--primary)"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#forecastGradient)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Upcoming Large Bills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Tagihan Mendatang</h3>
        {activeData.filter(d => d.expense > 0).slice(0, 5).map((d, i) => (
          <div key={i} className="card glass" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{d.displayDate}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Estimasi Tagihan</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '14px' }}>-{fmt(d.expense)}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Saldo: {fmt(d.balance)}</div>
            </div>
          </div>
        ))}
        {activeData.filter(d => d.expense > 0).length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>Tidak ada tagihan rutin yang terdeteksi.</div>
        )}
      </div>
    </div>
  );
};

export default Statistics;
