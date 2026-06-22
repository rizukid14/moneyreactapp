import MaterialIcon from '../components/common/MaterialIcon';
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, Area, AreaChart, LineChart, Line } from 'recharts';

import { useMoney } from '../contexts/MoneyContext';
import DatePickerModal from '../components/modals/DatePickerModal';
import StatDetailModal from '../components/modals/StatDetailModal';
import type { StatDetailItem } from '../components/modals/StatDetailModal';
import { formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import OnboardingTutorial from '../components/OnboardingTutorial';
import { MONTH_NAMES } from '../lib/constants';

import { ALL_STATS_VIEWS } from './Settings';
import { PageWrapper } from '../components/ui/PageWrapper';
import { PageHeader } from '../components/ui/PageHeader';
import { BentoCard } from '../components/ui/Card';
import { IconBlock } from '../components/ui/IconBlock';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ListItem } from '../components/ui/ListItem';
import { EmptyState } from '../components/ui/EmptyState';

const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

const COLORS = ['var(--primary)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--secondary)', 'hsl(330, 70%, 55%)', 'hsl(170, 60%, 40%)', 'hsl(350, 75%, 55%)', 'hsl(250, 60%, 55%)'];

const Statistics: React.FC = () => {
  const {
    transactions, assets, categories,
    currencySymbol, startOfMonthDay, theme, chartStyle,
    statsCarouselCards, defaultStatsView
  } = useMoney();
  const [detailModalProps, setDetailModalProps] = useState<{
    isOpen: boolean;
    title: string;
    explanation?: string;
    formula?: React.ReactNode;
    details: StatDetailItem[];
  }>({ isOpen: false, title: '', details: [] });
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

  // Create Map for O(1) category lookup
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const { chartData, currentMonthIncome, currentMonthExpense, prevMonthIncome, prevMonthExpense, expenseCategoryData, incomeCategoryData, topCategories, insights, dailyExpenseChart, heatmapData } = useMemo((): {
    chartData: { name: string; month: number; year: number; pengeluaran: number; pendapatan: number; periodStart: Date; periodEnd: Date }[];
    currentMonthIncome: number; currentMonthExpense: number;
    prevMonthIncome: number; prevMonthExpense: number;
    expenseCategoryData: { name: string; id: string; value: number }[];
    incomeCategoryData: { name: string; id: string; value: number }[];
    topCategories: { id: string; categoryId: string; categoryName: string; amount: number; type: 'pengeluaran' | 'pendapatan'; color: string; colorIndex: number }[];
    insights: {
      netSavings: number; savingsRate: number; avgDailySpending: number;
      txCountIncome: number; txCountExpense: number; txCountTransfer: number; txCountTotal: number;
      biggestExpenseTx: { note: string; amount: number; categoryId: string } | null;
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

    const includedAssetIds = new Set(
      assets
        .filter(a => includedAssetTypes.includes(a.type))
        .map(a => a.id)
    );

    const getTransferFlowForActiveView = (tx: typeof transactions[number]) => {
      if (tx.type !== 'transfer') return null;
      if (activeViewId === 'all' || activeViewId === 'health') return null;

      const fromIncluded = !!tx.fromAssetId && includedAssetIds.has(tx.fromAssetId);
      const toIncluded = !!tx.toAssetId && includedAssetIds.has(tx.toAssetId);

      if (toIncluded && !fromIncluded) return 'income' as const;
      if (fromIncluded && !toIncluded) return 'expense' as const;
      return null;
    };

    const statsTransactions = transactions.filter(tx => {
      if (activeViewId === 'all' || activeViewId === 'health') return true;

      if (tx.type === 'transfer') {
        const fromIncluded = !!tx.fromAssetId && includedAssetIds.has(tx.fromAssetId);
        const toIncluded = !!tx.toAssetId && includedAssetIds.has(tx.toAssetId);
        return fromIncluded || toIncluded;
      }

      return !!tx.assetId && includedAssetIds.has(tx.assetId);
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
        name: SHORT_MONTH_NAMES[m],
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
    let biggestExpenseTx: { note: string; amount: number; categoryId: string } | null = null;
    const dailySpending: Record<string, number> = {}; // 'YYYY-MM-DD' -> total expense

    const dailyIncome: Record<string, number> = {};
    const heatmapSpending: Record<string, number> = {}; // Full calendar year (Jan-Dec) range
    const heatmapStart = new Date(vY, 0, 1);
    const heatmapEnd = new Date(vY, 11, 31, 23, 59, 59);

    statsTransactions.forEach(tx => {
      const txDate = new Date(tx.date);

      // 1. Current Period Stats
      if (txDate >= vPeriodStart && txDate < vPeriodEnd) {
        const subKey = tx.subCategoryId || tx.categoryId || '';

        const transferFlow = getTransferFlowForActiveView(tx);
        const isIncomeTx = tx.type === 'pendapatan' || transferFlow === 'income';
        const isExpenseTx = tx.type === 'pengeluaran' || transferFlow === 'expense';

        if (isIncomeTx) {
          thisMonthInc += tx.amount;
          if (drillDownCategory?.type === 'pendapatan' && drillDownCategory?.name === tx.categoryId) {
            incBySubCategory[subKey] = (incBySubCategory[subKey] || 0) + tx.amount;
          }
          incByCategory[tx.categoryId || ''] = (incByCategory[tx.categoryId || ''] || 0) + tx.amount;
        }
        if (isExpenseTx) {
          thisMonthExp += tx.amount;
          if (drillDownCategory?.type === 'pengeluaran' && drillDownCategory?.name === tx.categoryId) {
            expBySubCategory[subKey] = (expBySubCategory[subKey] || 0) + tx.amount;
          }
          expByCategory[tx.categoryId || ''] = (expByCategory[tx.categoryId || ''] || 0) + tx.amount;
        }

        // Insight tracking
        if (isIncomeTx) txCountIncome++;
        if (isExpenseTx) {
          txCountExpense++;
          // Daily spending
          dailySpending[tx.date] = (dailySpending[tx.date] || 0) + tx.amount;
          // Biggest single expense
          if (!biggestExpenseTx || tx.amount > biggestExpenseTx.amount) {
            biggestExpenseTx = { note: tx.note || tx.categoryId || '', amount: tx.amount, categoryId: tx.categoryId || '' };
          }
        }
        if (isIncomeTx) {
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
          const transferFlow = getTransferFlowForActiveView(tx);
          if (tx.type === 'pendapatan' || transferFlow === 'income') m.pendapatan += tx.amount;
          if (tx.type === 'pengeluaran' || transferFlow === 'expense') m.pengeluaran += tx.amount;
        }
      });
    });

    const expenseData = drillDownCategory?.type === 'pengeluaran'
      ? Object.keys(expBySubCategory).map(key => {
          const parentCat = drillDownCategory.name ? categoryMap.get(drillDownCategory.name) : undefined;
          const subCatName = parentCat?.subcategories?.find(s => s.id === key)?.name || parentCat?.name || key;
          return { name: subCatName, id: key, value: expBySubCategory[key] };
        }).sort((a, b) => b.value - a.value)
      : Object.keys(expByCategory).map(key => {
          const catName = categoryMap.get(key)?.name || key;
          return { name: catName, id: key, value: expByCategory[key] };
        }).sort((a, b) => b.value - a.value);

    const incomeData = drillDownCategory?.type === 'pendapatan'
      ? Object.keys(incBySubCategory).map(key => {
          const parentCat = drillDownCategory.name ? categoryMap.get(drillDownCategory.name) : undefined;
          const subCatName = parentCat?.subcategories?.find(s => s.id === key)?.name || parentCat?.name || key;
          return { name: subCatName, id: key, value: incBySubCategory[key] };
        }).sort((a, b) => b.value - a.value)
      : Object.keys(incByCategory).map(key => {
          const catName = categoryMap.get(key)?.name || key;
          return { name: catName, id: key, value: incByCategory[key] };
        }).sort((a, b) => b.value - a.value);

    // Prepare the list for the bottom section
    let allCategories: { id: string, categoryId: string, categoryName: string, amount: number, type: 'pengeluaran' | 'pendapatan', color: string, colorIndex: number }[] = [];

    if (drillDownCategory) {
      const baseIdx = drillDownCategory.colorIndex;
      if (drillDownCategory.type === 'pengeluaran') {
        allCategories = expenseData.map((d, i) => ({
          id: `exp-sub-${d.id}`, categoryId: d.id, categoryName: d.name, amount: d.value, type: 'pengeluaran' as const,
          color: COLORS[(i + baseIdx) % COLORS.length],
          colorIndex: (i + baseIdx) % COLORS.length
        }));
      } else {
        allCategories = incomeData.map((d, i) => ({
          id: `inc-sub-${d.id}`, categoryId: d.id, categoryName: d.name, amount: d.value, type: 'pendapatan' as const,
          color: COLORS[(i + baseIdx) % COLORS.length],
          colorIndex: (i + baseIdx) % COLORS.length
        }));
      }
    } else {
      allCategories = [
        ...expenseData.map((d, i) => ({
          id: `exp-${d.id}`, categoryId: d.id, categoryName: d.name, amount: d.value, type: 'pengeluaran' as const,
          color: COLORS[i % COLORS.length],
          colorIndex: i % COLORS.length
        })),
        ...incomeData.map((d, i) => ({
          id: `inc-${d.id}`, categoryId: d.id, categoryName: d.name, amount: d.value, type: 'pendapatan' as const,
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

  const scrollHeatmapToCurrentMonth = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!heatmapScrollRef.current || !heatmapData || heatmapData.length === 0) return;

    const currentMonthIndex = viewDate.getMonth();
    const firstDow = heatmapData[0]?.firstDow || 0;
    let offset = 0;
    for (let m = 0; m < currentMonthIndex; m++) {
      offset += heatmapData[m]?.cells.length || 0;
    }

    const targetCol = Math.floor((firstDow + offset) / 7);
    const CELL_WIDTH = 13;
    const GAP_WIDTH = 4;
    const colLeft = targetCol * (CELL_WIDTH + GAP_WIDTH);

    const container = heatmapScrollRef.current;
    const containerWidth = container.clientWidth;

    container.scrollTo({
      left: Math.max(0, colLeft - containerWidth / 2 + 50),
      behavior
    });
  }, [viewDate, heatmapData]);

  useEffect(() => {
    scrollHeatmapToCurrentMonth('smooth');
  }, [scrollHeatmapToCurrentMonth]);

  useEffect(() => {
    const isAnalysisView = !['health', 'budget', 'goals', 'subs', 'forecast'].includes(activeViewId);
    if (!isAnalysisView) return;

    // Run after the analysis pane remounts/animates so ref + layout are ready.
    const timer = window.setTimeout(() => {
      scrollHeatmapToCurrentMonth('auto');
    }, 180);

    return () => window.clearTimeout(timer);
  }, [activeViewId, scrollHeatmapToCurrentMonth]);

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
    <PageWrapper>
      <PageHeader
        title="Statistik"
        action={
          <button
            onClick={resetToToday}
            className="flex lg:hidden items-center justify-center gap-0.5 sm:gap-1.5 px-2 py-2 rounded-xl border-none bg-primary-container/20 text-primary-color font-bold text-[11px] sm:text-xs cursor-pointer shadow-sm hover:opacity-90 transition-opacity w-full"
          >
            <MaterialIcon name="calendar_month" className="text-[14px] sm:text-base shrink-0" /> <span className="truncate">Hari Ini</span>
          </button>
        }
      />

      {/* View Carousel Selector */}
      <div style={{
        marginBottom: '25px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '4px',
        margin: '0 -4px', // negative margin to allow shadow/glow to show
        scrollSnapType: 'x mandatory'
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
                data-testid={`stats-view-${viewId}`}
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
                  border: isActive ? 'none' : '1px solid var(--border-color)',
                  scrollSnapAlign: 'start'
                }}
              >
                {viewId === 'health' ? <MaterialIcon name="local_fire_department" className={isActive ? 'text-white' : 'text-[var(--secondary)]'} /> :
                  viewId === 'budget' ? <MaterialIcon name="track_changes" className={isActive ? 'text-white' : 'text-[var(--primary)]'} /> :
                    viewId === 'goals' ? <MaterialIcon name="trending_up" className={isActive ? 'text-white' : 'text-[var(--primary)]'} /> :
                      viewId === 'subs' ? <MaterialIcon name="credit_card" className={isActive ? 'text-white' : 'text-[var(--primary)]'} /> :
                        viewId === 'forecast' ? <MaterialIcon name="bolt" className={isActive ? 'text-white' : 'text-[var(--primary)]'} /> :
                          <MaterialIcon name="dashboard" className={isActive ? 'text-white' : 'text-[var(--primary)]'} />}
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
            <FinancialHealth onShowDetail={setDetailModalProps} />
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
            <CashFlowForecast onShowDetail={setDetailModalProps} />
          </motion.div>
        ) : (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
                {/* Header with Month Selector matching Transactions.tsx */}
                <PageHeader
                  className="mt-2"
                  title="Analisis Statistik"
                  subtitle="Pantau tren dan riwayat finansial Anda"
                  action={
                    <div className="flex items-center gap-1 sm:gap-3 justify-end w-full">
                      <button
                        onClick={resetToToday}
                        className="hidden lg:flex items-center gap-1.5 px-4 py-2 rounded-full border-none bg-primary-container/20 text-primary-color font-bold text-xs cursor-pointer shadow-sm hover:opacity-90 transition-opacity"
                      >
                        <MaterialIcon name="calendar_month" className="text-base" /> Hari Ini
                      </button>
                      <div 
                        className="flex items-center justify-center bg-surface-container-lowest border border-outline-variant rounded-xl px-1 sm:px-2 py-2 cursor-pointer hover:bg-surface-container transition-colors shadow-sm w-full" 
                        onClick={() => setIsDatePickerOpen(true)}
                      >
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1 overflow-hidden">
                          <button onClick={(e) => { e.stopPropagation(); changeMonth(-1); }} className="hover:bg-surface-container-highest rounded p-0 transition-colors shrink-0" data-testid="prev-month-btn">
                            <MaterialIcon name="chevron_left" className="text-on-surface-variant text-[14px] sm:text-base" />
                          </button>
                          <div className="flex items-center justify-center gap-0.5 sm:gap-1 overflow-hidden" data-testid="month-picker-toggle">
                            <MaterialIcon name="calendar_month" className="text-primary text-[14px] sm:text-base shrink-0 hidden sm:block" />
                            <span className="font-label-sm sm:font-label-md text-[10px] sm:text-sm text-on-surface font-semibold truncate" data-testid="month-label">
                              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear().toString().slice(2)}
                            </span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); changeMonth(1); }} className="hover:bg-surface-container-highest rounded p-0 transition-colors shrink-0" data-testid="next-month-btn">
                            <MaterialIcon name="chevron_right" className="text-on-surface-variant text-[14px] sm:text-base" />
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                />

                {/* Hero Summary Section - Bento Grid */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">

            <div data-tour="stats-chart" className="col-span-1 md:col-span-12 bg-bg-card p-5 rounded-3xl shadow-bento group relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Tren 6 Bulan Terakhir</span>
                <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                  <MaterialIcon name="bar_chart" className="text-primary text-base" />
                </div>
              </div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                    <YAxis
                      width={40}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                      tickFormatter={(val) => {
                        if (val >= 1000000) return `${(val / 1000000).toFixed(1).replace(/\.0$/, '')}jt`;
                        if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                        return val;
                      }}
                      domain={[0, 'dataMax + 10000']}
                    />
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

            <div className="col-span-1 md:col-span-12 flex flex-col md:flex-row gap-4 lg:gap-6 mb-2">
              {/* Pendapatan Card */}
              {(() => {
                const growthPct = prevMonthIncome > 0
                  ? ((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100
                  : (currentMonthIncome > 0 ? 100 : 0);
                const isUp = growthPct >= 0;
                return (
                  <div className="flex-1 bg-bg-card p-5 rounded-3xl shadow-bento flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
                    
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Pendapatan</span>
                      <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                        <MaterialIcon name="arrow_downward" className="text-primary text-base" />
                      </div>
                    </div>
                    
                    <div className="mt-2.5 relative z-10">
                      <h2 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight truncate">{fmt(currentMonthIncome)}</h2>
                      {(currentMonthIncome > 0 || prevMonthIncome > 0) && (
                        <div className="mt-0.5">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${isUp ? 'bg-primary-container/20 text-primary-color' : 'bg-error-container/20 text-error'}`} title="Dari bulan lalu">
                            <MaterialIcon name={isUp ? 'arrow_upward' : 'arrow_downward'} className="text-[10px] font-bold" />
                            {Math.abs(growthPct).toFixed(1)}% vs bulan lalu
                          </span>
                        </div>
                      )}
                    </div>
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
                  <div className="flex-1 bg-bg-card p-5 rounded-3xl shadow-bento flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-secondary opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
                    
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Pengeluaran</span>
                      <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                        <MaterialIcon name="arrow_upward" className="text-secondary text-base" />
                      </div>
                    </div>
                    
                    <div className="mt-2.5 relative z-10">
                      <h2 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight truncate">{fmt(currentMonthExpense)}</h2>
                      {(currentMonthExpense > 0 || prevMonthExpense > 0) && (
                        <div className="mt-0.5">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${isUp ? 'bg-error-container/20 text-error' : 'bg-primary-container/20 text-primary-color'}`} title="Dari bulan lalu">
                            <MaterialIcon name={isUp ? 'arrow_upward' : 'arrow_downward'} className="text-[10px] font-bold" />
                            {Math.abs(growthPct).toFixed(1)}% vs bulan lalu
                          </span>
                        </div>
                      )}
                    </div>
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
                  className="col-span-1 md:col-span-12 bg-bg-card p-5 rounded-3xl shadow-bento relative group"
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
                  <div className="flex justify-between items-center mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Aktivitas Pengeluaran</span>
                      <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                        <MaterialIcon name="grid_view" className="text-primary text-base" />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-on-surface-variant">{activeDays} hari aktif</span>
                  </div>

                  {/* Scrollable container with modern scrollbar styling */}
                  <div
                    ref={heatmapScrollRef}
                    className="custom-scrollbar hidden sm:block"
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
                      <>
                        <div className="hidden sm:block" style={{ marginTop: '18px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
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

                        {/* Weekly Summary List for Mobile (hidden on sm: and up) */}
                        <div className="block sm:hidden space-y-3 mt-4 border-t border-border-light pt-4">
                          <p className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider mb-2">Ringkasan Mingguan</p>
                          {heatmapData.map((monthData, idx) => {
                            // Group monthData.cells into weeks (7 days each)
                            const weeks: { weekNum: number; total: number }[] = [];
                            let currentWeekTotal = 0;
                            monthData.cells.forEach((cell, cellIdx) => {
                              currentWeekTotal += cell.amount;
                              if ((cellIdx + 1) % 7 === 0 || cellIdx === monthData.cells.length - 1) {
                                weeks.push({ weekNum: Math.floor(cellIdx / 7) + 1, total: currentWeekTotal });
                                currentWeekTotal = 0;
                              }
                            });

                            const monthTotal = monthData.cells.reduce((s, c) => s + c.amount, 0);
                            if (monthTotal === 0) return null;

                            return (
                              <div key={idx} className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant flex flex-col gap-2.5">
                                <div className="flex justify-between items-center pb-2 border-b border-outline-variant/60">
                                  <span className="font-extrabold text-xs text-on-surface">{monthData.name} {viewDate.getFullYear()}</span>
                                  <span className="font-extrabold text-xs text-secondary">{fmt(monthTotal)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {weeks.map((w, wIdx) => (
                                    <div key={wIdx} className="bg-bg-card p-2.5 rounded-xl border border-outline-variant/80 flex justify-between items-center text-[10px] gap-1">
                                      <span className="text-on-surface-variant font-bold">Minggu {w.weekNum}</span>
                                      <span className="font-extrabold text-on-surface text-right truncate">{fmt(w.total)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
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
            <div className="col-span-1 md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 mb-2">
              {/* Net Savings */}
              <div 
                className="bg-bg-card p-4 rounded-3xl shadow-bento group cursor-pointer hover:-translate-y-1 transition-all flex flex-col justify-between relative overflow-hidden" 
                onClick={() => setDetailModalProps({
                  isOpen: true,
                  title: 'Sisa Bersih (Net Savings)',
                  explanation: 'Sisa bersih menunjukkan sisa uang tunai riil Anda di bulan ini setelah dikurangi semua pengeluaran.',
                  formula: 'Pemasukan - Pengeluaran',
                  details: [
                    { label: 'Pemasukan Bulan Ini', value: fmt(currentMonthIncome), type: 'addition' },
                    { label: 'Pengeluaran Bulan Ini', value: fmt(currentMonthExpense), type: 'subtraction' },
                    { label: 'Sisa Bersih', value: fmt(insights.netSavings), type: 'result' }
                  ]
                })}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-on-surface-variant font-label-md text-xs uppercase tracking-wider">Sisa Bersih</span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm ${insights.netSavings >= 0 ? 'bg-primary-container text-primary-color' : 'bg-error-container text-error'}`}>
                    <MaterialIcon name="trending_up" className="text-base" />
                  </div>
                </div>
                <div className="mt-1 relative z-10">
                  <h2 className={`text-xl font-bold truncate ${insights.netSavings >= 0 ? 'text-primary-color' : 'text-error'}`}>
                    {insights.netSavings >= 0 ? '+' : ''}{fmt(insights.netSavings)}
                  </h2>
                  {currentMonthIncome > 0 && (
                    <div className="text-xs text-on-surface-variant mt-1 font-medium">
                      Rasio tabungan: {insights.savingsRate.toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>

              {/* Daily Average Spending */}
              <div 
                className="bg-bg-card p-4 rounded-3xl shadow-bento group cursor-pointer hover:-translate-y-1 transition-all flex flex-col justify-between relative overflow-hidden" 
                onClick={() => {
                   const now = new Date();
                   const vM = viewDate.getMonth();
                   const vY = viewDate.getFullYear();
                   const isCurrentMonth = now.getMonth() === vM && now.getFullYear() === vY;
                   const daysPassed = isCurrentMonth ? Math.max(1, now.getDate()) : new Date(vY, vM + 1, 0).getDate();
                   setDetailModalProps({
                     isOpen: true,
                     title: 'Rata-rata Pengeluaran Harian',
                     explanation: 'Menunjukkan seberapa cepat Anda menghabiskan uang rata-rata setiap harinya di bulan ini.',
                     formula: 'Total Pengeluaran / Jumlah Hari Berlalu',
                     details: [
                       { label: 'Total Pengeluaran', value: fmt(currentMonthExpense), type: 'neutral' },
                       { label: 'Hari Berlalu', value: `${daysPassed} Hari`, type: 'neutral' },
                       { label: 'Rata-rata / Hari', value: fmt(insights.avgDailySpending), type: 'result' }
                     ]
                   });
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-on-surface-variant font-label-md text-xs uppercase tracking-wider">Rata-rata/Hari</span>
                  <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                    <MaterialIcon name="calendar_today" className="text-secondary text-base" />
                  </div>
                </div>
                <div className="mt-1 relative z-10">
                  <h2 className="text-xl font-bold text-on-surface truncate">{fmt(insights.avgDailySpending)}</h2>
                  <div className="text-xs text-on-surface-variant mt-1 font-medium">
                    pengeluaran harian
                  </div>
                </div>
              </div>

              {/* Transaction Count */}
              <div className="bg-bg-card p-4 rounded-3xl shadow-bento group flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-on-surface-variant font-label-md text-xs uppercase tracking-wider">Transaksi</span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                    <MaterialIcon name="receipt" className="text-on-surface-variant text-base" />
                  </div>
                </div>
                <div className="mt-1 relative z-10">
                  <h2 className="text-xl font-bold text-on-surface truncate">{insights.txCountTotal}</h2>
                  <div className="text-[10px] text-on-surface-variant mt-1 font-medium truncate">
                    {insights.txCountExpense} keluar · {insights.txCountIncome} masuk{insights.txCountTransfer > 0 ? ` · ${insights.txCountTransfer} tf` : ''}
                  </div>
                </div>
              </div>

              {/* Top Spending Day */}
              <div className="bg-bg-card p-4 rounded-3xl shadow-bento group flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-on-surface-variant font-label-md text-xs uppercase tracking-wider">Hari Terboros</span>
                  <div className="w-8 h-8 rounded-lg bg-error-container flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                    <MaterialIcon name="local_fire_department" className="text-error text-base" />
                  </div>
                </div>
                <div className="mt-1 relative z-10">
                  {insights.topSpendingDay ? (
                    <>
                      <h2 className="text-xl font-bold text-error truncate">{fmt(insights.topSpendingDay.amount)}</h2>
                      <div className="text-xs text-on-surface-variant mt-1 font-medium">
                        {new Date(insights.topSpendingDay.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-on-surface-variant">-</div>
                  )}
                </div>
              </div>
            </div>

            {/* Biggest Transaction */}
            {insights.biggestExpenseTx && (
              <div className="col-span-1 md:col-span-12 bg-bg-card p-4 rounded-3xl shadow-bento group flex items-center gap-4 mb-2">
                <div className="w-10 h-10 rounded-xl bg-error-container flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <MaterialIcon name="account_balance_wallet" className="text-error text-xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-on-surface-variant font-label-md text-xs uppercase tracking-wider mb-0.5">Pengeluaran Terbesar</div>
                  <div className="text-sm font-bold text-on-surface truncate">
                    {insights.biggestExpenseTx.note || insights.biggestExpenseTx.categoryId}
                  </div>
                </div>
                <div className="text-lg font-bold text-error shrink-0">
                  {fmt(insights.biggestExpenseTx.amount)}
                </div>
              </div>
            )}

            {/* ── Daily Expense Area Chart ──────────────────────────── */}
            {currentMonthExpense > 0 && (
              <div className="col-span-1 md:col-span-12 bg-bg-card p-5 rounded-3xl shadow-bento group relative overflow-hidden mb-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 relative z-10 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Pengeluaran &amp; Pendapatan Harian</span>
                    <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                      <MaterialIcon name="show_chart" className="text-primary text-base" />
                    </div>
                  </div>

                  <div className="flex bg-surface-container-lowest border border-outline-variant rounded-xl p-1 w-fit shadow-sm">
                    {(['linear', 'dual', 'log'] as const).map(scale => (
                      <button
                        key={scale}
                        data-testid={`chart-scale-${scale}`}
                        onClick={() => changeChartScale(scale)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${chartScale === scale ? 'bg-surface-container-highest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
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
              <div className="col-span-1 md:col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl p-3 mb-4 flex items-center gap-3">
                <button onClick={() => setDrillDownCategory(null)} className="flex items-center gap-1 bg-surface-container hover:bg-surface-container-high px-3 py-1.5 rounded-lg text-sm font-bold text-on-surface transition-colors">
                  <MaterialIcon name="chevron_left" className="text-base" /> Kembali
                </button>
                <span className="font-semibold text-sm text-on-surface">Rincian Sub-kategori: {drillDownCategory.name}</span>
              </div>
            )}

            <div className="col-span-1 md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-2">
              {expenseCategoryData.length > 0 && (!drillDownCategory || drillDownCategory.type === 'pengeluaran') && (
                <div data-tour="stats-breakdown" className="bg-bg-card p-5 rounded-3xl shadow-bento group flex flex-col relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Pengeluaran {drillDownCategory ? `(${categories?.find(c => c.id === drillDownCategory.name)?.name || drillDownCategory.name})` : 'per Kategori'}</span>
                    <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                      <MaterialIcon name="pie_chart" className="text-secondary text-base" />
                    </div>
                  </div>
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
                              setDrillDownCategory({ name: (data as any).id ?? '', type: 'pengeluaran', colorIndex: index % COLORS.length });
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
                              setDrillDownCategory({ name: item.id ?? '', type: 'pengeluaran', colorIndex: index % COLORS.length });
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
                <div data-tour="stats-breakdown" className="bg-bg-card p-5 rounded-3xl shadow-bento group flex flex-col relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Pendapatan {drillDownCategory ? `(${categories?.find(c => c.id === drillDownCategory.name)?.name || drillDownCategory.name})` : 'per Kategori'}</span>
                    <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                      <MaterialIcon name="pie_chart" className="text-primary text-base" />
                    </div>
                  </div>
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
                              setDrillDownCategory({ name: (data as any).id ?? '', type: 'pendapatan', colorIndex: (index + 3) % COLORS.length });
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
                              setDrillDownCategory({ name: item.id ?? '', type: 'pendapatan', colorIndex: (index + 3) % COLORS.length });
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
              <div className="col-span-1 md:col-span-12 bg-bg-card p-5 rounded-3xl shadow-bento group relative mb-20">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                    {drillDownCategory ? `Rincian Sub-kategori: ${categories?.find(c => c.id === drillDownCategory.name)?.name || drillDownCategory.name}` : 'Total Terbesar per Kategori'}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                    <MaterialIcon name="star" className="text-primary text-base" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {topCategories.map((cat, i) => (
                    <div
                      key={cat.id}
                      onClick={() => {
                        if (!drillDownCategory) {
                          setDrillDownCategory({ name: cat.categoryId, type: cat.type, colorIndex: cat.colorIndex });
                        }
                      }}
                      className={`flex justify-between items-center bg-surface-container-lowest p-2 rounded-xl border border-outline-variant transition-colors ${drillDownCategory ? '' : 'hover:bg-surface-container cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 font-bold text-xs" style={{
                          background: `${cat.color}20`,
                          color: cat.color
                        }}>
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-on-surface">{cat.categoryName}</div>
                          <div className="text-xs text-on-surface-variant">
                            {drillDownCategory ? 'Sub-kategori' : (cat.type === 'pendapatan' ? 'Total Pendapatan' : 'Total Pengeluaran')}
                          </div>
                        </div>
                      </div>
                      <div className={`font-bold text-base shrink-0 ${cat.type === 'pendapatan' ? 'text-primary-color' : 'text-error'}`}>
                        {cat.type === 'pendapatan' ? '+' : '-'}{fmt(cat.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

              </section>


          </motion.div>
        )}
      </AnimatePresence>

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        viewDate={viewDate}
        onSelectDate={setViewDate}
      />
      <StatDetailModal
        {...detailModalProps}
        onClose={() => setDetailModalProps(prev => ({ ...prev, isOpen: false }))}
      />
      
      <OnboardingTutorial 
        pageKey="statistics" 
        steps={[
          { targetSelector: '[data-tour="stats-chart"]', title: '📊 Grafik Tren', description: 'Lihat ringkasan tren pendapatan dan pengeluaran kamu selama 6 bulan terakhir.' },
          { targetSelector: '[data-tour="stats-breakdown"]', title: '🥧 Rincian Kategori', description: 'Lihat detail pengeluaran berdasarkan kategori. Tap kategori untuk melihat sub-kategori.' },
          { targetSelector: '[data-tour="month-nav"]', title: '📅 Navigasi Bulan', description: 'Ubah bulan untuk melihat statistik di bulan spesifik.' }
        ]} 
      />
    </PageWrapper>
  );
};

// ─── FinancialHealth Component ────────────────────────────────────────────────
const SCORE_COLORS = {
  excellent: 'var(--success)',
  good: 'var(--primary)',
  fair: 'var(--warning)',
  poor: 'var(--danger)'
};

const FinancialHealth: React.FC<{ onShowDetail?: (props: any) => void }> = ({ onShowDetail }) => {
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

    let totalAssetsValue = 0;
    let liquidAssetsValue = 0;

    assets.filter(a => !a.isDeleted).forEach(a => {
      const txSum = transactions.filter(t => t.assetId === a.id || t.fromAssetId === a.id || t.toAssetId === a.id)
        .reduce((s, t) => {
          const amt = Number(t.amount) || 0;
          if (t.type === 'pendapatan') return s + amt;
          if (t.type === 'pengeluaran') return s - amt;
          if (t.type === 'transfer') {
            if (t.toAssetId === a.id) return s + amt;
            if (t.fromAssetId === a.id) return s - amt;
          }
          return s;
        }, 0);
      const val = (Number(a.initialBalance) || 0) + txSum;
      totalAssetsValue += val;
      if (['Cash', 'Bank Account', 'eWallet', 'Savings'].includes(a.type)) {
        liquidAssetsValue += val;
      }
    });

    const currentNetWorth = totalAssetsValue - totalUnpaidDebt;

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
    const efMonths = liquidAssetsValue / avgMonthlyExpense;

    let efScore = 0;
    if (efMonths >= 6) efScore = 20;
    else if (efMonths >= 4) efScore = 15;
    else if (efMonths >= 3) efScore = 10;
    else if (efMonths >= 1) efScore = 5;

    const debtRatio = (totalUnpaidDebt / (liquidAssetsValue || 1)) * 100;
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
        const cat = categories?.find(c => c.id === b.categoryId);
        if (!cat) return true;
        const spent = transactions
          .filter(tx => tx.type === 'pengeluaran' && tx.categoryId === cat.id && new Date(tx.date).getMonth() === currentMonth.month)
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
      totalAssetsValue,
      liquidAssetsValue,
      totalUnpaidDebt,
      currentNetWorth,
      metrics: [
        { label: 'Rasio Tabungan', value: `${savingsRate.toFixed(1)}%`, score: savingsScore, max: 25, icon: 'trending_up' },
        { label: 'Dana Darurat', value: `${efMonths.toFixed(1)} bln`, score: efScore, max: 20, icon: 'security' },
        { label: 'Rasio Hutang', value: `${debtRatio.toFixed(1)}%`, score: debtScore, max: 20, icon: 'bolt' },
        { label: 'Kepatuhan Anggaran', value: `${adherenceRate.toFixed(0)}%`, score: budgetScore, max: 20, icon: 'track_changes' },
        { label: 'Konsistensi Belanja', value: spendingCV < 0.2 ? 'Stabil' : 'Fluktuatif', score: consistencyScore, max: 10, icon: 'local_activity' },
        { label: 'Stabilitas Income', value: incomeCV < 0.15 ? 'Sangat Stabil' : 'Cukup Stabil', score: stabilityScore, max: 5, icon: 'favorite' },
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
    <div className="space-y-6 pb-10">
      {/* ─── Health Score Meter ────────────────────────────────────────────────── */}
      <BentoCard
        variant="glass"
        className="text-center py-8 px-5 flex flex-col items-center"
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
            <span className="text-5xl font-black leading-none text-on-surface">{stats.totalScore}</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: scoreLabel.color, marginTop: '4px' }}>{scoreLabel.text}</span>
          </div>
        </div>
        <p className="text-xs text-on-surface-variant mt-5 max-w-[300px] mx-auto">
          Skor Anda didasarkan pada 6 metrik kesehatan finansial utama.
        </p>
      </BentoCard>

      {/* ─── Metric Breakdown ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stats.metrics.map((m, i) => (
          <BentoCard
            key={i}
            interactive
            padding="sm"
            className="border border-outline-variant/60 hover:shadow-md transition-all flex flex-col justify-between h-full"
            onClick={() => {
              if (!onShowDetail) return;
              
              let formula = '';
              let explanation = '';
              let details: any[] = [];
              
              if (m.label === 'Rasio Tabungan') {
                formula = '(Rata-rata Pemasukan - Rata-rata Pengeluaran) / Rata-rata Pemasukan × 100%';
                explanation = 'Persentase pendapatan yang berhasil Anda tabung. Idealnya minimal 20%. Dihitung berdasarkan rata-rata 3 bulan terakhir.';
                details = [
                  { label: 'Rata-rata Pemasukan (3bln)', value: fmt(stats.last6Months.slice(-3).reduce((sum, mo) => sum + mo.income, 0) / 3), type: 'addition' },
                  { label: 'Rata-rata Pengeluaran (3bln)', value: fmt(stats.last6Months.slice(-3).reduce((sum, mo) => sum + mo.expense, 0) / 3), type: 'subtraction' },
                  { label: 'Rasio Tabungan', value: `${stats.savingsRate.toFixed(1)}%`, type: 'result' }
                ];
              } else if (m.label === 'Dana Darurat') {
                formula = 'Total Aset Likuid / Rata-rata Pengeluaran Bulanan';
                explanation = 'Berapa bulan Anda bisa bertahan hidup tanpa pendapatan sama sekali dengan mengandalkan uang tabungan saat ini. Idealnya 6 bulan.';
                details = [
                  { label: 'Total Aset Likuid (Kas/Bank/E-Wallet)', value: fmt(stats.liquidAssetsValue), type: 'addition' },
                  { label: 'Rata-rata Pengeluaran (6bln)', value: fmt(stats.last6Months.reduce((sum, mo) => sum + mo.expense, 0) / 6), type: 'neutral' },
                  { label: 'Ketahanan Dana', value: `${stats.efMonths.toFixed(1)} Bulan`, type: 'result' }
                ];
              } else if (m.label === 'Rasio Hutang') {
                formula = 'Total Hutang Belum Lunas / Total Aset Likuid × 100%';
                explanation = 'Perbandingan antara hutang yang belum dibayar dengan uang tunai yang Anda miliki. Idealnya 0% (tidak punya hutang tunai).';
                details = [
                  { label: 'Sisa Hutang Belum Lunas', value: fmt(stats.totalUnpaidDebt), type: 'subtraction' },
                  { label: 'Total Aset Likuid (Kas/Bank/E-Wallet)', value: fmt(stats.liquidAssetsValue), type: 'neutral' },
                  { label: 'Rasio Hutang', value: `${stats.debtRatio.toFixed(1)}%`, type: 'result' }
                ];
              } else if (m.label === 'Kepatuhan Anggaran') {
                formula = 'Jumlah Kategori Sesuai Target / Total Anggaran Aktif × 100%';
                explanation = 'Persentase anggaran bulanan yang berhasil Anda patuhi tanpa melebihi batas yang ditentukan.';
                details = [
                  { label: 'Rasio Kepatuhan', value: `${stats.adherenceRate.toFixed(1)}%`, type: 'result' }
                ];
              } else if (m.label === 'Konsistensi Belanja') {
                formula = 'Standard Deviation / Mean (Pengeluaran)';
                explanation = 'Mengukur seberapa stabil pengeluaran Anda dari bulan ke bulan selama 6 bulan terakhir. Semakin rendah angkanya, semakin stabil kebiasaan belanja Anda.';
                details = [
                  { label: 'Variasi Belanja', value: stats.spendingCV.toFixed(2), type: 'result' }
                ];
              } else if (m.label === 'Stabilitas Income') {
                formula = 'Standard Deviation / Mean (Pendapatan)';
                explanation = 'Mengukur seberapa stabil pemasukan Anda dari bulan ke bulan selama 6 bulan terakhir.';
                details = [
                  { label: 'Variasi Pemasukan', value: stats.incomeCV.toFixed(2), type: 'result' }
                ];
              }

              onShowDetail({ isOpen: true, title: m.label, formula, explanation, details });
            }}
          >
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <IconBlock icon={m.icon as string} color="primary" size="sm" />
                <span className="text-xs font-bold text-on-surface-variant">{m.score}/{m.max}</span>
              </div>
              <div className="text-[11px] text-on-surface-variant font-bold mb-0.5 flex items-center gap-1.5">
                {m.label}
                <div className="w-3.5 h-3.5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-extrabold shrink-0" title="Detail metrik">!</div>
              </div>
              <div className="text-base font-extrabold text-on-surface mb-2">{m.value}</div>
            </div>
            <ProgressBar
              segments={[{
                percent: (m.score / m.max) * 100,
                color: (m.score / m.max) > 0.8 ? 'primary-color' : (m.score / m.max) > 0.5 ? 'primary' : 'error'
              }]}
              height="xs"
            />
          </BentoCard>
        ))}
      </div>

      {/* ─── MoM Indicators ──────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <BentoCard variant="surface" className="flex-1 bg-surface-container-high/50 border border-outline-variant/50">
          <div className="text-[11px] text-on-surface-variant font-bold mb-1">Trend Belanja</div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-extrabold text-on-surface">{Math.abs(stats.momSpending).toFixed(0)}%</span>
            <MaterialIcon name={stats.momSpending > 0 ? 'call_made' : 'call_received'} className={`text-lg ${stats.momSpending > 0 ? 'text-error' : 'text-primary-color'}`} />
          </div>
          <div className="text-[10px] text-on-surface-variant mt-0.5">vs bulan lalu</div>
        </BentoCard>

        <BentoCard variant="surface" className="flex-1 bg-surface-container-high/50 border border-outline-variant/50">
          <div className="text-[11px] text-on-surface-variant font-bold mb-1">Tabungan Bersih</div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-extrabold text-on-surface">{Math.abs(stats.momSavings).toFixed(0)}%</span>
            <MaterialIcon name={stats.momSavings > 0 ? 'call_made' : 'call_received'} className={`text-lg ${stats.momSavings > 0 ? 'text-primary-color' : 'text-error'}`} />
          </div>
          <div className="text-[10px] text-on-surface-variant mt-0.5">vs bulan lalu</div>
        </BentoCard>
      </div>

      {/* ─── Net Worth Chart ─────────────────────────────────────────────────── */}
      <BentoCard variant="glass" className="border border-outline-variant">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-sm font-bold text-on-surface-variant">Kekayaan Bersih</h2>
            <div className="text-xl font-extrabold text-primary mt-0.5">{fmt(stats.currentNetWorth)}</div>
          </div>
          <div className="text-right text-[10px] text-on-surface-variant font-semibold space-y-0.5">
            <div>Aset Total: {fmt(stats.totalAssetsValue)}</div>
            <div className="text-error">Hutang: {fmt(stats.totalUnpaidDebt)}</div>
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
              <YAxis
                width={40}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={(val) => {
                  if (val >= 1000000) return `${(val / 1000000).toFixed(1).replace(/\.0$/, '')}jt`;
                  if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                  return val;
                }}
                domain={['dataMin - 1000000', 'dataMax + 1000000']}
              />
              <Tooltip
                contentStyle={{ borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}
                formatter={(val: any) => fmt(Number(val))}
                labelFormatter={(label) => MONTH_NAMES[label]}
              />
              <Area type="monotone" dataKey="netWorth" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorNetWorth)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </BentoCard>
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
        const cat = categories?.find(c => c.id === tx.categoryId && c.type === 'pengeluaran' && !c.isDeleted) ||
                    categories?.find(c => c.id === tx.categoryId && c.type === 'pengeluaran');
        if (cat) map[cat.id] = (map[cat.id] || 0) + tx.amount;
      }
    });
    return map;
  }, [transactions, selectedMonth, selectedYear, categories, startOfMonthDay]);

  const currentMonthBudgets = budgets.filter(b => b.month === selectedMonth && b.year === selectedYear);
  const globalBudget = currentMonthBudgets.find(b => b.categoryId === null);
  const categoryIdBudgets = currentMonthBudgets.filter(b => b.categoryId !== null);

  const totalBudgeted = useMemo(() =>
    categoryIdBudgets.reduce((sum, b) => sum + b.limit, 0),
    [categoryIdBudgets]);

  const unassignedMoney = monthlyIncome - totalBudgeted;

  const fmt = (v: number) => formatCurrency(v, currencySymbol);

  return (
    <div className="space-y-6 pb-10">
      {/* Global Budget / Zero-Based Hero Card */}
      {budgetMode === 'zero-based' ? (
        <BentoCard
          variant="solid"
          className="text-white shadow-bento-lg p-6 relative overflow-hidden"
          style={{ background: 'var(--primary-gradient)' }}
        >
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
            <MaterialIcon name="payments" className="text-[120px]" />
          </div>
          <div className="relative z-10 space-y-4">
            <div>
              <div className="text-[11px] font-black opacity-80 uppercase tracking-wider mb-1">Total Pendapatan</div>
              <div className="text-3xl font-black">{fmt(monthlyIncome)}</div>
            </div>

            <div className="flex gap-5 pt-3 border-t border-white/10">
              <div className="flex-1">
                <div className="text-[10px] font-bold opacity-80 uppercase mb-0.5">Dialokasikan</div>
                <div className="text-base font-extrabold">{fmt(totalBudgeted)}</div>
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold opacity-80 uppercase mb-0.5">Sisa</div>
                <div className="text-base font-extrabold">{fmt(unassignedMoney)}</div>
              </div>
            </div>
          </div>
        </BentoCard>
      ) : globalBudget ? (
        <BentoCard
          variant="solid"
          className="text-white shadow-bento-lg p-6 relative overflow-hidden"
          style={{ background: 'var(--primary-gradient)' }}
        >
          <div className="text-[11px] font-black opacity-80 uppercase tracking-wider mb-1">Total Anggaran</div>
          <div className="text-3xl font-black mb-1">{fmt(globalBudget.limit)}</div>
          <div className="flex justify-between items-center mt-4 text-xs font-bold">
            <span className="opacity-90">Terpakai: {fmt(spendingMap.total)}</span>
            <span>{Math.round((spendingMap.total / globalBudget.limit) * 100)}%</span>
          </div>
          <div className="mt-2">
            <ProgressBar
              segments={[{
                percent: Math.min((spendingMap.total / globalBudget.limit) * 100, 100),
                color: 'white'
              }]}
              height="sm"
            />
          </div>
          {spendingMap.total > globalBudget.limit && (
            <div className="flex items-center gap-1.5 mt-3.5 px-3 py-2 bg-white/20 rounded-xl text-[11px] font-extrabold">
              <MaterialIcon name="warning" className="text-sm" /> Melebihi anggaran sebesar {fmt(spendingMap.total - globalBudget.limit)}
            </div>
          )}
        </BentoCard>
      ) : (
        <BentoCard variant="glass" className="text-center py-10 px-5 border border-dashed border-outline-variant">
          <div className="text-4xl mb-3">📊</div>
          <div className="font-bold text-on-surface text-sm">Belum ada anggaran global</div>
          <div className="text-xs text-on-surface-variant mt-1">Atur anggaran di menu Pengaturan</div>
        </BentoCard>
      )}

      {/* Category Budgets */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-on-surface pl-1">Anggaran Kategori</h3>
        {categoryIdBudgets.length > 0 ? categoryIdBudgets.map(b => {
          const cat = categories?.find(c => c.id === b.categoryId);
          const spent = spendingMap[b.categoryId!] || 0;
          const percent = b.limit > 0 ? (spent / b.limit) * 100 : 0;
          const statusColor = percent > 100 ? 'error' : percent >= 75 ? 'secondary' : 'primary';
          const textDanger = percent > 100 ? 'text-error' : 'text-on-surface';
          return (
            <BentoCard key={b.id} variant="glass" className="border border-outline-variant/60">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <IconBlock icon="account_balance_wallet" color={statusColor as any} size="sm" />
                  <span className="font-bold text-sm text-on-surface">{cat?.name || 'Kategori'}</span>
                </div>
                <div className="text-right text-xs font-bold">
                  <span className={textDanger}>{fmt(spent)}</span>
                  <span className="text-[10px] text-on-surface-variant font-medium"> / {fmt(b.limit)}</span>
                </div>
              </div>
              <ProgressBar
                segments={[{ percent: Math.min(percent, 100), color: statusColor }]}
                height="xs"
              />
            </BentoCard>
          );
        }) : (
          <div className="text-center py-6 text-xs text-on-surface-variant bg-surface-container/30 rounded-2xl border border-outline-variant/40">
            Tidak ada anggaran kategori
          </div>
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
    <div className="space-y-4 pb-10">
      <h3 className="text-sm font-bold text-on-surface pl-1">Target Tabungan</h3>
      {goals.length > 0 ? goals.map(g => {
        const current = goalAllocations[g.id] || 0;
        const percent = (current / g.targetAmount) * 100;
        const isCompleted = percent >= 100;
        return (
          <BentoCard
            key={g.id}
            variant="glass"
            className={`border border-outline-variant/60 ${isCompleted ? 'border-l-4 border-l-primary-color' : ''}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <IconBlock
                  icon={isCompleted ? 'check_circle' : 'track_changes'}
                  color={isCompleted ? 'income' : 'primary'}
                  size="md"
                />
                <div>
                  <div className="font-extrabold text-sm text-on-surface">{g.name}</div>
                  <div className="text-[10px] text-on-surface-variant mt-0.5">
                    Target: {new Date(g.targetDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-base font-extrabold ${isCompleted ? 'text-primary-color' : 'text-primary'}`}>{Math.floor(percent)}%</div>
                <div className="text-[10px] text-on-surface-variant font-bold">Tercapai</div>
              </div>
            </div>

            <ProgressBar
              segments={[{ percent: Math.min(percent, 100), color: isCompleted ? 'primary-color' : 'primary' }]}
              height="xs"
              className="my-3"
            />

            <div className="flex justify-between text-xs font-semibold pt-1">
              <span className="text-on-surface-variant">{fmt(current)} / {fmt(g.targetAmount)}</span>
              {isCompleted ? (
                <span className="text-primary-color font-bold">Selesai! ✨</span>
              ) : (
                <span className="text-primary font-bold">Sisa {fmt(g.targetAmount - current)}</span>
              )}
            </div>
          </BentoCard>
        );
      }) : (
        <EmptyState
          icon="track_changes"
          title="Belum ada target tabungan"
          description="Mulai buat rencana untuk impian Anda!"
        />
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
    <div className="space-y-5 pb-10">
      <BentoCard
        variant="solid"
        className="bg-primary text-white shadow-bento-lg p-6 relative overflow-hidden"
      >
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
          <MaterialIcon name="credit_card" className="text-[120px]" />
        </div>
        <div className="relative z-10">
          <div className="text-[11px] font-black opacity-80 uppercase tracking-wider mb-1">Estimasi Biaya Langganan</div>
          <div className="text-3xl font-black mb-1">{fmt(totalMonthly)}</div>
          <div className="text-xs opacity-90 mt-2">Per bulan dari {subscriptions.filter(s => s.isActive).length} layanan aktif</div>
        </div>
      </BentoCard>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-on-surface pl-1">Daftar Layanan</h3>
        <div className="space-y-2">
          {subscriptions.length > 0 ? subscriptions.map(s => (
            <ListItem
              key={s.id}
              left={<IconBlock icon="credit_card" color="primary" size="md" />}
              title={s.name}
              subtitle={`${s.billingCycle === 'monthly' ? 'Bulanan' : 'Tahunan'} • ${fmt(s.amount)}`}
              right={!s.isActive ? <StatusBadge type="neutral" label="NONAKTIF" /> : null}
              className={s.isActive ? '' : 'opacity-60'}
            />
          )) : (
            <EmptyState
              icon="credit_card"
              title="Belum ada data langganan"
              description="Tambahkan data langganan Anda untuk melacak biaya rutin."
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── CashFlowForecast Component ──────────────────────────────────────────────
const CashFlowForecast: React.FC<{ onShowDetail?: (props: any) => void }> = ({ onShowDetail }) => {
  const {
    assets, recurringTransactions, subscriptions, currencySymbol, theme, getAssetBalance
  } = useMoney();

  const [forecastDays, setForecastDays] = useState<30 | 60 | 90>(30);
  const isDark = theme === 'dark';
  const fmt = (v: number) => formatCurrency(v, currencySymbol);

  const forecastData = useMemo(() => {
    const data: { date: string; displayDate: string; balance: number; investBalance: number; income: number; expense: number; investInflow: number; isDanger: boolean }[] = [];

    // 1. Initial Balance (Hanya aset likuid)
    let currentBalance = assets
      .filter(a => !a.isDeleted && ['Cash', 'Bank Account', 'eWallet', 'Savings'].includes(a.type))
      .reduce((sum, a) => sum + (getAssetBalance?.(a.id) || 0), 0);

    let currentInvestBalance = assets
      .filter(a => !a.isDeleted && ['Investment'].includes(a.type))
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
      let dailyInvestInflow = 0;
      let dailyInvestOutflow = 0;

      // Check Recurring Transactions
      recurringTransactions.filter(rt => rt.isActive).forEach(rt => {
        let startD: Date;
        if (rt.startDate && rt.startDate.includes('-')) {
          const parts = rt.startDate.split('T')[0].split('-');
          const yr = Number(parts[0]) || now.getFullYear();
          const mn = Number(parts[1]) || (now.getMonth() + 1);
          const dy = Number(parts[2]) || now.getDate();
          startD = new Date(yr, mn - 1, dy);
        } else {
          startD = new Date(rt.startDate || now);
        }

        let isToday = false;
        if (rt.frequency === 'daily') isToday = true;
        else if (rt.frequency === 'weekly' && dayOfWeek === startD.getDay()) isToday = true;
        else if (rt.frequency === 'monthly' && dayOfMonth === startD.getDate()) isToday = true;
        else if (rt.frequency === 'yearly' && dayOfMonth === startD.getDate() && month === startD.getMonth()) isToday = true;

        if (isToday) {
          const rtAmount = Number(rt.amount) || 0;
          if (rt.type === 'pendapatan') dailyIncome += rtAmount;
          else if (rt.type === 'pengeluaran') dailyExpense += rtAmount;
          else if (rt.type === 'transfer') {
             const fromAsset = assets.find(a => a.id === rt.fromAssetId);
             const toAsset = assets.find(a => a.id === rt.toAssetId);

             const isFromLiquid = fromAsset && ['Cash', 'Bank Account', 'eWallet', 'Savings'].includes(fromAsset.type);
             const isToLiquid = toAsset && ['Cash', 'Bank Account', 'eWallet', 'Savings'].includes(toAsset.type);
             const isFromInvest = fromAsset && ['Investment'].includes(fromAsset.type);
             const isToInvest = toAsset && ['Investment'].includes(toAsset.type);

             if (isFromLiquid && isToInvest) {
                dailyExpense += rtAmount;
                dailyInvestInflow += rtAmount;
             } else if (isFromInvest && isToLiquid) {
                dailyIncome += rtAmount;
                dailyInvestOutflow += rtAmount;
             } else if (isFromLiquid && !isToLiquid) {
                dailyExpense += rtAmount;
             } else if (!isFromLiquid && isToLiquid) {
                dailyIncome += rtAmount;
             } else if (isFromInvest && !isToInvest) {
                dailyInvestOutflow += rtAmount;
             } else if (!isFromInvest && isToInvest) {
                dailyInvestInflow += rtAmount;
             }
          }
        }
      });

      // Check Subscriptions
      subscriptions.filter(s => s.isActive).forEach(sub => {
        let subDate: Date;
        if (sub.nextBillingDate && sub.nextBillingDate.includes('-')) {
          const parts = sub.nextBillingDate.split('T')[0].split('-');
          const yr = Number(parts[0]) || now.getFullYear();
          const mn = Number(parts[1]) || (now.getMonth() + 1);
          const dy = Number(parts[2]) || now.getDate();
          subDate = new Date(yr, mn - 1, dy);
        } else {
          subDate = new Date(sub.nextBillingDate || now);
        }

        let isToday = false;
        if (sub.billingCycle === 'monthly') {
          // Check if day matches
          if (dayOfMonth === subDate.getDate()) isToday = true;
        } else if (sub.billingCycle === 'yearly') {
          // Check if day and month matches
          if (dayOfMonth === subDate.getDate() && month === subDate.getMonth()) isToday = true;
        }

        if (isToday) {
          dailyExpense += Number(sub.amount) || 0;
        }
      });

      currentBalance = Number(currentBalance) + Number(dailyIncome) - Number(dailyExpense);
      currentInvestBalance = Number(currentInvestBalance) + Number(dailyInvestInflow) - Number(dailyInvestOutflow);

      data.push({
        date: dateKey,
        displayDate: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        balance: currentBalance,
        investBalance: currentInvestBalance,
        income: dailyIncome,
        expense: dailyExpense,
        investInflow: dailyInvestInflow,
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
      .filter(a => !a.isDeleted && ['Cash', 'Bank Account', 'eWallet', 'Savings'].includes(a.type))
      .reduce((sum, a) => sum + (getAssetBalance?.(a.id) || 0), 0);
    return Math.max(0, currentBal - totalBills);
  }, [forecastData, assets, getAssetBalance]);

  const projectedInvest = useMemo(() => {
    if (forecastData.length === 0) return 0;
    return forecastData[Math.min(29, forecastData.length - 1)]?.investBalance || 0;
  }, [forecastData]);

  const currentInvestBal = useMemo(() => {
    return assets.filter(a => !a.isDeleted && ['Investment'].includes(a.type)).reduce((sum, a) => sum + (getAssetBalance?.(a.id) || 0), 0);
  }, [assets, getAssetBalance]);

  const dangerDays = activeData.filter(d => d.isDanger);

  return (
    <div className="space-y-6 pb-10">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <BentoCard
          variant="solid"
          interactive
          className="text-white shadow-bento-lg p-4 relative overflow-hidden flex flex-col justify-between h-full"
          style={{ background: 'var(--primary-gradient)' }}
          onClick={() => {
            if (!onShowDetail) return;
            const next30Days = forecastData.slice(0, 30);
            const totalBills = next30Days.reduce((sum, d) => sum + d.expense, 0);
            const totalIncome = next30Days.reduce((sum, d) => sum + d.income, 0);
            const currentBal = assets.filter(a => !a.isDeleted && ['Cash', 'Bank Account', 'eWallet', 'Savings'].includes(a.type)).reduce((sum, a) => sum + (getAssetBalance?.(a.id) || 0), 0);
            
            onShowDetail({
              isOpen: true,
              title: 'Aman Dibelanjakan',
              explanation: 'Uang yang bebas Anda gunakan hari ini tanpa takut gagal membayar tagihan rutin dan langganan dalam 30 hari ke depan.',
              formula: 'Max(0, Total Aset - Estimasi Tagihan 30 Hari)',
              details: [
                { label: 'Total Saldo Saat Ini', value: fmt(currentBal), type: 'addition' },
                { label: 'Estimasi Tagihan (30 Hari)', value: fmt(totalBills), type: 'subtraction' },
                { label: 'Estimasi Pemasukan Rutin (Info)', value: fmt(totalIncome), type: 'neutral' },
                { label: 'Aman Dibelanjakan', value: fmt(safeToSpend), type: 'result' }
              ]
            });
          }}
        >
          <div>
            <div className="text-[10px] font-black opacity-80 uppercase tracking-wider mb-1 flex items-center gap-1">
              Aman Belanja
              <div className="w-3.5 h-3.5 rounded-full bg-white text-primary flex items-center justify-center text-[9px] font-extrabold shrink-0">!</div>
            </div>
            <div className="text-base font-black truncate">{fmt(safeToSpend)}</div>
          </div>
          <div className="text-[9px] opacity-80 mt-1 truncate">Setelah tagihan 30 hari</div>
          <div className="absolute right-[-10px] bottom-[-10px] opacity-15"><MaterialIcon name="bolt" className="text-[40px]" /></div>
        </BentoCard>

        <BentoCard
          variant="solid"
          interactive
          className="bg-primary-color text-white shadow-bento-lg p-4 relative overflow-hidden flex flex-col justify-between h-full"
          onClick={() => {
            if (!onShowDetail) return;
            const next30Days = forecastData.slice(0, 30);
            const totalInflow = next30Days.reduce((sum, d) => sum + d.investInflow, 0);
            
            onShowDetail({
              isOpen: true,
              title: 'Tabungan & Investasi',
              explanation: 'Perkiraan total nilai tabungan dan investasi Anda dalam 30 hari ke depan berdasarkan transaksi rutin otomatis (seperti auto-debet/transfer bulanan).',
              formula: 'Saldo Tabungan/Investasi Saat Ini + Penambahan Rutin 30 Hari',
              details: [
                { label: 'Saldo Saat Ini', value: fmt(currentInvestBal), type: 'addition' },
                { label: 'Penambahan Rutin (30 Hari)', value: fmt(totalInflow), type: 'addition' },
                { label: 'Estimasi Masa Depan', value: fmt(projectedInvest), type: 'result' }
              ]
            });
          }}
        >
          <div>
            <div className="text-[10px] font-black opacity-80 uppercase tracking-wider mb-1 flex items-center gap-1">
              Tabungan & Inv
              <div className="w-3.5 h-3.5 rounded-full bg-white text-emerald-600 flex items-center justify-center text-[9px] font-extrabold shrink-0">!</div>
            </div>
            <div className="text-base font-black truncate">{fmt(projectedInvest)}</div>
          </div>
          <div className="text-[9px] opacity-80 mt-1 truncate">Estimasi 30 hari</div>
          <div className="absolute right-[-10px] bottom-[-10px] opacity-15"><MaterialIcon name="track_changes" className="text-[40px]" /></div>
        </BentoCard>

        <BentoCard
          variant="surface"
          className={`p-4 relative overflow-hidden flex flex-col justify-between h-full border ${
            dangerDays.length > 0 ? 'bg-error-container/25 border-error/30 text-error' : 'bg-surface-container border-outline-variant/60 text-on-surface'
          }`}
        >
          <div>
            <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider mb-1">Zona Bahaya</div>
            <div className={`text-base font-black ${dangerDays.length > 0 ? 'text-error' : 'text-on-surface'}`}>{dangerDays.length} Hari</div>
          </div>
          <div className="text-[9px] opacity-80 mt-1 truncate">Saldo prediksi negatif</div>
          <div className="absolute right-[-10px] bottom-[-10px] opacity-15"><MaterialIcon name="warning" className={`text-[40px] ${dangerDays.length > 0 ? 'text-error' : 'text-on-surface-variant'}`} /></div>
        </BentoCard>
      </div>

      {/* Chart Control */}
      <div className="flex justify-between items-center pl-1">
        <h3 className="text-sm font-bold text-on-surface">Prediksi Saldo</h3>
        <div className="flex bg-surface-container-low p-0.5 rounded-xl border border-outline-variant/60">
          {[30, 60, 90].map(days => (
            <button
              key={days}
              onClick={() => setForecastDays(days as any)}
              className={`px-3 py-1 rounded-lg border-none text-[10px] font-extrabold cursor-pointer transition-all ${
                forecastDays === days ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {days} HARI
            </button>
          ))}
        </div>
      </div>

      <BentoCard variant="glass" className="border border-outline-variant py-4 px-2">
        <div style={{ width: '100%', height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activeData}>
              <defs>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="investGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                width={40}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={(val) => {
                  if (val >= 1000000) return `${(val / 1000000).toFixed(1).replace(/\.0$/, '')}jt`;
                  if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                  return val;
                }}
                domain={['dataMin - 1000000', 'dataMax + 1000000']}
              />
              <Tooltip
                contentStyle={{ borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}
                formatter={(val: any) => fmt(Number(val))}
                labelStyle={{ fontWeight: 800, marginBottom: '4px', color: 'var(--text-main)' }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                name="Kas & Bank"
                stroke="var(--primary)"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#forecastGradient)"
                animationDuration={1000}
              />
              <Area
                type="monotone"
                dataKey="investBalance"
                name="Tabungan & Investasi"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#investGradient)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </BentoCard>

      {/* Upcoming Large Bills */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-on-surface pl-1">Tagihan Mendatang</h3>
        <div className="space-y-2">
          {activeData.filter(d => d.expense > 0).slice(0, 5).map((d, i) => (
            <ListItem
              key={i}
              left={<IconBlock icon="calendar_today" color="error" size="md" />}
              title={d.displayDate}
              subtitle="Estimasi Tagihan"
              right={
                <div className="text-right">
                  <div className="font-extrabold text-sm text-error">-{fmt(d.expense)}</div>
                  <div className="text-[10px] text-on-surface-variant font-semibold mt-0.5">Saldo: {fmt(d.balance)}</div>
                </div>
              }
            />
          ))}
          {activeData.filter(d => d.expense > 0).length === 0 && (
            <EmptyState
              icon="calendar_today"
              title="Tidak ada tagihan rutin"
              description="Tidak ada tagihan rutin yang terdeteksi untuk periode ini."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Statistics;
