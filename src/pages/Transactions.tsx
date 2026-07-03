import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMoney } from '../contexts/MoneyContext';
import type { Transaction } from '../contexts/MoneyContext';
import { formatCurrency, getLocalDate } from '../lib/utils';
import TransactionItem from '../components/transactions/TransactionItem';
import { lazy, Suspense } from 'react';
const TransactionModal = lazy(() => import('../components/modals/TransactionModal'));
import DatePickerModal from '../components/modals/DatePickerModal';
import WhatsNewModal from '../components/modals/WhatsNewModal';
import OnboardingTutorial from '../components/OnboardingTutorial';
import MaterialIcon from '../components/common/MaterialIcon';
import { SearchInput } from '../components/ui/SearchInput';
import { FilterChip } from '../components/ui/FilterChip';
import { useToast } from '../components/common/Toast';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { PullToRefresh } from '../components/ui/PullToRefresh';
import { PageWrapper } from '../components/ui/PageWrapper';
import { PageHeader } from '../components/ui/PageHeader';

import { useTransactionPresets } from '../hooks/useTransactionPresets';
import { PresetManagerModal } from '../components/modals/PresetManagerModal';

import { MONTH_NAMES } from '../lib/constants';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

type GroupBy = 'date' | 'categoryId' | 'asset' | 'none';

interface TransactionGroup {
  id: string;
  title: string;
  transactions: Transaction[];
  income: number;
  expense: number;
  dateStr?: string;
  dayName?: string;
}

const Transactions: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { transactions, assets, categories, budgets, addTransaction, addRecurringTransaction, deleteTransaction, updateTransaction, currencySymbol, startOfMonthDay, showDebtInTransactions, defaultTransactionGrouping, getAssetBalance, isPrivateMode, togglePrivateMode, syncData, pullFromCloud, setIsChatOpen } = useMoney();
  const { showToast } = useToast();

  const handlePullToRefresh = useCallback(async () => {
    try {
      await syncData();
      await pullFromCloud();
      showToast('Data berhasil diperbarui dari cloud', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Gagal menyelaraskan data', 'error');
    }
  }, [syncData, pullFromCloud, showToast]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isCopyMode, setIsCopyMode] = useState(false);
  const [initialType, setInitialType] = useState<Transaction['type']>('pengeluaran');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    if (startOfMonthDay > 1 && d.getDate() >= startOfMonthDay) {
      return new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return d;
  });

  const [groupBy, setGroupBy] = useState<GroupBy>(defaultTransactionGrouping || 'date');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pengeluaran' | 'pendapatan'>('all');
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [visibleLimit, setVisibleLimit] = useState(15);
  const { pinnedPresets, habitPresets } = useTransactionPresets();
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);

  // Smart AI Input state
  const [bulkInputText, setBulkInputText] = useState('');
  const { isListening, toggleListening } = useSpeechToText('\n');

  const [showQuickScrollFab, setShowQuickScrollFab] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const section = document.getElementById('input-cepat-section');
      if (section) {
        if (window.scrollY > section.offsetTop - 300) {
          setShowQuickScrollFab(false);
        } else {
          setShowQuickScrollFab(true);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fabsize = 56;
  const fabmargin = 20;
  const fabmarginBottom = 88;
  const [fabPos, setFabPos] = useState(() => ({
    top: window.innerHeight - fabsize - fabmarginBottom,
    left: window.innerWidth - fabsize - fabmargin,
  }));

  useEffect(() => {
    const handleResize = () => {
      setFabPos({
        top: window.innerHeight - fabsize - fabmarginBottom,
        left: window.innerWidth - fabsize - fabmargin,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isFabDragging, setIsFabDragging] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, top: 0, left: 0 });
  const hasMoved = useRef(false);
  const preventClick = useRef(false);

  const snapCorner = (top: number, left: number) => {
    const w = fabsize, m = fabmargin, mb = fabmarginBottom;
    const vw = window.innerWidth, vh = window.innerHeight;
    const corners = [
      { top: m, left: m },
      { top: m, left: vw - w - m },
      { top: vh - w - mb, left: m },
      { top: vh - w - mb, left: vw - w - m },
    ];
    return corners.reduce((a, b) =>
      Math.hypot(top - a.top, left - a.left) < Math.hypot(top - b.top, left - b.left) ? a : b
    );
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const el = fabRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, top: fabPos.top, left: fabPos.left };
    hasMoved.current = false;
    preventClick.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (!hasMoved.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      hasMoved.current = true;
      setIsFabDragging(true);
    }
    if (hasMoved.current) {
      preventClick.current = true;
      setFabPos({
        top: dragStart.current.top + dy,
        left: dragStart.current.left + dx,
      });
    }
  };

  const onPointerUp = () => {
    if (hasMoved.current) {
      setFabPos(snapCorner(fabPos.top, fabPos.left));
    }
    setIsFabDragging(false);
    hasMoved.current = false;
  };

  const onClickFab = () => {
    if (!preventClick.current) {
      setIsChatOpen(true);
    }
    preventClick.current = false;
  };

  const displayPresets = useMemo(() => {
    if (pinnedPresets.length > 0) return pinnedPresets;
    return habitPresets.slice(0, 4);
  }, [pinnedPresets, habitPresets]);

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const isCurrentlyCollapsed = prev[groupId] ?? (groupBy === 'date' && groupId !== getLocalDate());
      return { ...prev, [groupId]: !isCurrentlyCollapsed };
    });
  }, [groupBy]);

  const handleAdd = useCallback((type: Transaction['type'] = 'pengeluaran', partialData?: Partial<Transaction>) => {
    setEditingTransaction(partialData ? { ...partialData, id: '', type, amount: 0, date: getLocalDate(), note: partialData.note || '', categoryId: partialData.categoryId || '' } as any : null);
    setIsCopyMode(false);
    setInitialType(type);
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    const action = searchParams.get('action');
    const type = searchParams.get('type') as Transaction['type'] | null;
    if (action === 'add-tx') {
      // Small delay to ensure state sets properly
      setTimeout(() => {
        handleAdd(type || 'pengeluaran');
      }, 10);
      setSearchParams(new URLSearchParams());
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const hasSeen = localStorage.getItem('whats_new_seen_v1_0_17');
    if (!hasSeen) {
      const timer = setTimeout(() => setIsWhatsNewOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeWhatsNew = () => {
    setIsWhatsNewOpen(false);
    localStorage.setItem('whats_new_seen_v1_0_17', 'true');
  };

  // Create Map for O(1) lookups of assets and categories
  const assetMap = useMemo(() => new Map(assets.map(a => [a.id, a])), [assets]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const getAssetName = useCallback((id?: string) => {
    const asset = id ? assetMap.get(id) : undefined;
    if (!asset) return 'Unknown';
    return asset.isDeleted ? `${asset.name} (Dihapus)` : asset.name;
  }, [assetMap]);

  const handleDelete = useCallback((id: string, tx?: Transaction) => {
    const target = tx || transactions.find(t => t.id === id);
    if (!target) return;
    deleteTransaction(id);
    showToast(
      'Transaksi berhasil dihapus',
      'success',
      {
        label: 'BATAL',
        onClick: () => {
          const { id: _, ...rest } = target;
          addTransaction(rest);
          showToast('Transaksi dikembalikan', 'info');
        },
      },
    );
  }, [transactions, deleteTransaction, addTransaction, showToast]);

  const handleCopy = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setIsCopyMode(true);
    setInitialType(tx.type);
    setIsModalOpen(true);
  }, []);

  const { groups, monthlyIncome, monthlyExpense, hasMore } = useMemo(() => {
    const vM = viewDate.getMonth();
    const vY = viewDate.getFullYear();

    let inc = 0;
    let exp = 0;

    const filtered = transactions.filter(tx => {
      const isDebtTx = ['piutang_keluar', 'piutang_masuk', 'hutang_masuk', 'hutang_keluar'].includes(tx.type);
      if (!showDebtInTransactions && isDebtTx) return false;

      const txD = new Date(tx.date);
      const isCurrentPeriod = (() => {
        if (startOfMonthDay > 1) {
          const start = new Date(vY, vM - 1, startOfMonthDay);
          const end = new Date(vY, vM, startOfMonthDay - 1);
          return txD >= start && txD <= end;
        }
        return txD.getMonth() === vM && txD.getFullYear() === vY;
      })();
      if (!isCurrentPeriod) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
        const categoryName = cat?.name || tx.categoryId || '';
        const subCategoryName = cat?.subcategories?.find(s => s.id === tx.subCategoryId)?.name || tx.subCategoryId || '';

        const matches = (
          (tx.note && tx.note.toLowerCase().includes(q)) ||
          (categoryName.toLowerCase().includes(q)) ||
          (subCategoryName.toLowerCase().includes(q)) ||
          tx.amount.toString().includes(q)
        );
        if (!matches) return false;
      }

      if (typeFilter === 'pengeluaran' && tx.type !== 'pengeluaran') return false;
      if (typeFilter === 'pendapatan' && tx.type !== 'pendapatan') return false;

      if (tx.type === 'pendapatan') inc += tx.amount;
      if (tx.type === 'pengeluaran') exp += tx.amount;

      return true;
    }).sort((a, b) => {
      const dateComp = b.date.localeCompare(a.date);
      if (dateComp !== 0) return dateComp;
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      const timeComp = timeB.localeCompare(timeA);
      if (timeComp !== 0) return timeComp;
      return b.id.localeCompare(a.id);
    });

    if (groupBy === 'none') {
      const paginatedTransactions = filtered.slice(0, visibleLimit * 2); // Double limit for individual tx
      const hasMore = filtered.length > visibleLimit * 2;
      return {
        groups: [{ id: 'all', title: '', transactions: paginatedTransactions, income: inc, expense: exp }],
        monthlyIncome: inc,
        monthlyExpense: exp,
        hasMore
      };
    }

    const groupsMap: Record<string, TransactionGroup> = {};

    filtered.forEach(tx => {
      let key = '';
      let title = '';
      let dateStr = '';
      let dayName = '';

      if (groupBy === 'date') {
        key = tx.date;
        const d = new Date(tx.date);
        dateStr = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
        dayName = DAY_NAMES[d.getDay()];

        // Match Stitch format: "Hari Ini - 20 Mei 2026"
        const todayStr = getLocalDate();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        let prefix = dayName;
        if (key === todayStr) prefix = 'Hari Ini';
        else if (key === yesterdayStr) prefix = 'Kemarin';

        title = `${prefix} - ${dateStr}`;
      } else if (groupBy === 'categoryId') {
        key = tx.categoryId || 'transfer';
        title = (tx.categoryId ? categoryMap.get(tx.categoryId)?.name : undefined) || tx.categoryId || 'Transfer';
      } else if (groupBy === 'asset') {
        key = tx.assetId || tx.fromAssetId || 'unknown';
        title = getAssetName(key);
      }

      if (!groupsMap[key]) {
        groupsMap[key] = { id: key, title, transactions: [], income: 0, expense: 0, dateStr, dayName };
      }

      groupsMap[key].transactions.push(tx);
      if (tx.type === 'pendapatan') groupsMap[key].income += tx.amount;
      if (tx.type === 'pengeluaran') groupsMap[key].expense += tx.amount;
    });

    const sortedGroups = Object.values(groupsMap).sort((a, b) => {
      if (groupBy === 'date') return b.id.localeCompare(a.id);
      return a.title.localeCompare(b.title);
    });

    const paginatedGroups = sortedGroups.slice(0, visibleLimit);
    const hasMore = sortedGroups.length > visibleLimit;

    return { groups: paginatedGroups, monthlyIncome: inc, monthlyExpense: exp, hasMore };
  }, [transactions, searchQuery, viewDate, startOfMonthDay, groupBy, showDebtInTransactions, getAssetName, typeFilter, visibleLimit]);

  // Pace Info Calculation
  const paceInfo = useMemo(() => {
    const now = new Date();
    const vM = viewDate.getMonth();
    const vY = viewDate.getFullYear();
    const isCurrentPeriod = vM === now.getMonth() && vY === now.getFullYear();

    if (!isCurrentPeriod || searchQuery) return null;

    const totalDays = new Date(vY, vM + 1, 0).getDate();
    const daysPassed = now.getDate();
    const expectedSpendPercent = daysPassed / totalDays;

    const globalBudget = budgets.find(b => b.categoryId === null && b.month === vM && b.year === vY);
    if (!globalBudget || globalBudget.limit <= 0) return null;

    const actualSpendPercent = monthlyExpense / globalBudget.limit;
    const diff = actualSpendPercent - expectedSpendPercent;

    let status: 'on_track' | 'warning' | 'danger' = 'on_track';
    if (diff > 0.2 || actualSpendPercent > 1.0) status = 'danger';
    else if (diff > 0.1) status = 'warning';

    return {
      expectedSpendPercent,
      actualSpendPercent,
      status,
      globalLimit: globalBudget.limit
    };
  }, [viewDate, budgets, searchQuery, monthlyExpense]);

  // Calculate Liquid Balance
  const totalLiquidBalance = useMemo(() => {
    return assets.reduce((sum, asset) => {
      if (!asset.isDeleted && !asset.isHidden && (asset.type === 'Cash' || asset.type === 'Bank Account' || asset.type === 'eWallet')) {
        return sum + getAssetBalance(asset.id);
      }
      return sum;
    }, 0);
  }, [assets, getAssetBalance]);

  // Analytical Calculations for Dashboard Widgets
  const topAssets = useMemo(() => {
    return [...assets]
      .filter(a => !a.isDeleted && !a.isHidden)
      .map(a => ({ ...a, balance: getAssetBalance(a.id) }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 3);
  }, [assets, getAssetBalance]);

  const savingsAndInvestments = useMemo(() => {
    return assets
      .filter(a => !a.isDeleted && !a.isHidden && (a.type === 'Savings' || a.type === 'Investment'))
      .reduce((sum, a) => sum + getAssetBalance(a.id), 0);
  }, [assets, getAssetBalance]);

  const weeklyExpense = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(new Date().setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    return transactions
      .filter(tx => tx.type === 'pengeluaran')
      .filter(tx => new Date(tx.date) >= startOfWeek)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  // Dynamic breakdown for Liquid Balance
  const liquidBreakdown = useMemo(() => {
    let cash = 0;
    let bank = 0;
    let wallet = 0;

    assets.forEach(asset => {
      if (!asset.isDeleted && !asset.isHidden) {
        const balance = getAssetBalance(asset.id);
        if (asset.type === 'Cash') {
          cash += balance;
        } else if (asset.type === 'Bank Account') {
          bank += balance;
        } else if (asset.type === 'eWallet') {
          wallet += balance;
        }
      }
    });

    const total = cash + bank + wallet;
    return {
      cash,
      bank,
      wallet,
      cashPct: total > 0 ? Math.round((cash / total) * 100) : 0,
      bankPct: total > 0 ? Math.round((bank / total) * 100) : 0,
      walletPct: total > 0 ? Math.round((wallet / total) * 100) : 0,
      total
    };
  }, [assets, getAssetBalance]);

  // Dynamic breakdown for Savings & Investments
  const savingsBreakdown = useMemo(() => {
    let savings = 0;
    let investment = 0;

    assets.forEach(asset => {
      if (!asset.isDeleted && !asset.isHidden) {
        const balance = getAssetBalance(asset.id);
        if (asset.type === 'Savings') {
          savings += balance;
        } else if (asset.type === 'Investment') {
          investment += balance;
        }
      }
    });

    const total = savings + investment;
    return {
      savings,
      investment,
      savingsPct: total > 0 ? Math.round((savings / total) * 100) : 0,
      investmentPct: total > 0 ? Math.round((investment / total) * 100) : 0,
      total
    };
  }, [assets, getAssetBalance]);

  // Dynamic details for Income Card
  const incomeDetails = useMemo(() => {
    const vM = viewDate.getMonth();
    const vY = viewDate.getFullYear();

    const incomeTxs = transactions.filter(tx => {
      if (tx.type !== 'pendapatan') return false;
      const txD = new Date(tx.date);
      if (startOfMonthDay > 1) {
        const start = new Date(vY, vM - 1, startOfMonthDay);
        const end = new Date(vY, vM, startOfMonthDay - 1);
        return txD >= start && txD <= end;
      }
      return txD.getMonth() === vM && txD.getFullYear() === vY;
    });

    const count = incomeTxs.length;

    const catSums: Record<string, number> = {};
    incomeTxs.forEach(tx => {
      catSums[tx.categoryId || ''] = (catSums[tx.categoryId || ''] || 0) + tx.amount;
    });

    let topCategory = '';
    let topAmount = 0;
    Object.entries(catSums).forEach(([cat, amt]) => {
      if (amt > topAmount) {
        topAmount = amt;
        topCategory = cat;
      }
    });

    return {
      count,
      topCategory: categoryMap.get(topCategory)?.name || topCategory,
      topAmount
    };
  }, [transactions, viewDate, startOfMonthDay]);

  // Dynamic details for Weekly Expense Card
  const weeklyExpenseDetails = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(new Date().setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyTxs = transactions
      .filter(tx => tx.type === 'pengeluaran')
      .filter(tx => new Date(tx.date) >= startOfWeek);

    const count = weeklyTxs.length;
    const currentDayOfWeek = day === 0 ? 7 : day;
    const dailyAverage = weeklyExpense / currentDayOfWeek;

    const catSums: Record<string, number> = {};
    weeklyTxs.forEach(tx => {
      catSums[tx.categoryId || ''] = (catSums[tx.categoryId || ''] || 0) + tx.amount;
    });

    let topCategory = '';
    let topAmount = 0;
    Object.entries(catSums).forEach(([cat, amt]) => {
      if (amt > topAmount) {
        topAmount = amt;
        topCategory = cat;
      }
    });

    return {
      count,
      dailyAverage,
      topCategory: categoryMap.get(topCategory)?.name || topCategory
    };
  }, [transactions, weeklyExpense]);

  // Previous Period Calculations for Percentage Comparisons (using startOfMonthDay preference)
  const prevPeriodRange = useMemo(() => {
    const vM = viewDate.getMonth();
    const vY = viewDate.getFullYear();
    let start: Date;
    let end: Date;
    if (startOfMonthDay > 1) {
      start = new Date(vY, vM - 2, startOfMonthDay);
      end = new Date(vY, vM - 1, startOfMonthDay - 1);
    } else {
      start = new Date(vY, vM - 1, 1);
      end = new Date(vY, vM, 0);
    }
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    return { startStr, endStr };
  }, [viewDate, startOfMonthDay]);

  const prevPeriodEndStr = useMemo(() => {
    const vM = viewDate.getMonth();
    const vY = viewDate.getFullYear();
    let d: Date;
    if (startOfMonthDay > 1) {
      d = new Date(vY, vM - 1, startOfMonthDay - 1);
    } else {
      d = new Date(vY, vM, 0);
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [viewDate, startOfMonthDay]);

  const lastMonthTotalLiquidBalance = useMemo(() => {
    return assets.reduce((sum, asset) => {
      if (asset.isDeleted || asset.isHidden || !(asset.type === 'Cash' || asset.type === 'Bank Account' || asset.type === 'eWallet')) {
        return sum;
      }
      let balance = asset.initialBalance;
      transactions.forEach(tx => {
        if (tx.date <= prevPeriodEndStr) {
          if ((tx.type === 'pendapatan' || tx.type === 'piutang_masuk' || tx.type === 'hutang_masuk') && tx.assetId === asset.id) balance += tx.amount;
          else if ((tx.type === 'pengeluaran' || tx.type === 'piutang_keluar' || tx.type === 'hutang_keluar') && tx.assetId === asset.id) balance -= tx.amount;
          else if (tx.type === 'transfer' && tx.fromAssetId === asset.id) balance -= tx.amount;
          else if (tx.type === 'transfer' && tx.toAssetId === asset.id) balance += tx.amount;
        }
      });
      return sum + balance;
    }, 0);
  }, [assets, transactions, prevPeriodEndStr]);

  const lastMonthSavingsAndInvestments = useMemo(() => {
    return assets
      .filter(a => !a.isDeleted && !a.isHidden && (a.type === 'Savings' || a.type === 'Investment'))
      .reduce((sum, asset) => {
        let balance = asset.initialBalance;
        transactions.forEach(tx => {
          if (tx.date <= prevPeriodEndStr) {
            if ((tx.type === 'pendapatan' || tx.type === 'piutang_masuk' || tx.type === 'hutang_masuk') && tx.assetId === asset.id) balance += tx.amount;
            else if ((tx.type === 'pengeluaran' || tx.type === 'piutang_keluar' || tx.type === 'hutang_keluar') && tx.assetId === asset.id) balance -= tx.amount;
            else if (tx.type === 'transfer' && tx.fromAssetId === asset.id) balance -= tx.amount;
            else if (tx.type === 'transfer' && tx.toAssetId === asset.id) balance += tx.amount;
          }
        });
        return sum + balance;
      }, 0);
  }, [assets, transactions, prevPeriodEndStr]);

  const lastMonthMonthlyIncome = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.type !== 'pendapatan') return false;
      return tx.date >= prevPeriodRange.startStr && tx.date <= prevPeriodRange.endStr;
    }).reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions, prevPeriodRange]);

  const lastMonthMonthlyExpense = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.type !== 'pengeluaran') return false;
      return tx.date >= prevPeriodRange.startStr && tx.date <= prevPeriodRange.endStr;
    }).reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions, prevPeriodRange]);

  const liquidChangePct = useMemo(() => {
    if (lastMonthTotalLiquidBalance === 0) return 0;
    return ((totalLiquidBalance - lastMonthTotalLiquidBalance) / lastMonthTotalLiquidBalance) * 100;
  }, [totalLiquidBalance, lastMonthTotalLiquidBalance]);

  const savingsChangePct = useMemo(() => {
    if (lastMonthSavingsAndInvestments === 0) return 0;
    return ((savingsAndInvestments - lastMonthSavingsAndInvestments) / lastMonthSavingsAndInvestments) * 100;
  }, [savingsAndInvestments, lastMonthSavingsAndInvestments]);

  const incomeChangePct = useMemo(() => {
    if (lastMonthMonthlyIncome === 0) return 0;
    return ((monthlyIncome - lastMonthMonthlyIncome) / lastMonthMonthlyIncome) * 100;
  }, [monthlyIncome, lastMonthMonthlyIncome]);

  const expenseChangePct = useMemo(() => {
    if (lastMonthMonthlyExpense === 0) return 0;
    return ((monthlyExpense - lastMonthMonthlyExpense) / lastMonthMonthlyExpense) * 100;
  }, [monthlyExpense, lastMonthMonthlyExpense]);

  const aiInsightData = useMemo(() => {
    const vM = viewDate.getMonth();
    const vY = viewDate.getFullYear();

    // Calculate Monthly Income & Expense
    const mIncome = transactions.filter(tx => {
      if (tx.type !== 'pendapatan') return false;
      const txD = new Date(tx.date);
      if (startOfMonthDay > 1) {
        const start = new Date(vY, vM - 1, startOfMonthDay);
        const end = new Date(vY, vM, startOfMonthDay - 1);
        return txD >= start && txD <= end;
      }
      return txD.getMonth() === vM && txD.getFullYear() === vY;
    }).reduce((sum, tx) => sum + tx.amount, 0);

    const mExpense = transactions.filter(tx => {
      if (tx.type !== 'pengeluaran') return false;
      const txD = new Date(tx.date);
      if (startOfMonthDay > 1) {
        const start = new Date(vY, vM - 1, startOfMonthDay);
        const end = new Date(vY, vM, startOfMonthDay - 1);
        return txD >= start && txD <= end;
      }
      return txD.getMonth() === vM && txD.getFullYear() === vY;
    }).reduce((sum, tx) => sum + tx.amount, 0);

    const findings: string[] = [];
    let score = 100;

    // 1. Budget Checks
    const activeBudgets = budgets.filter(b => b.month === vM && b.year === vY && b.categoryId !== null);
    let overBudgetCount = 0;
    let warningBudgetCount = 0;

    activeBudgets.forEach(b => {
      const categoryIdObj = b.categoryId ? categoryMap.get(b.categoryId) : undefined;
      if (categoryIdObj) {
        const categoryIdName = categoryIdObj.name;
        const catSpent = transactions
          .filter(tx => {
            if (tx.type !== 'pengeluaran' || tx.categoryId !== b.categoryId) return false;
            const txD = new Date(tx.date);
            if (startOfMonthDay > 1) {
              const start = new Date(vY, vM - 1, startOfMonthDay);
              const end = new Date(vY, vM, startOfMonthDay - 1);
              return txD >= start && txD <= end;
            }
            return txD.getMonth() === vM && txD.getFullYear() === vY;
          })
          .reduce((sum, tx) => sum + tx.amount, 0);

        if (b.limit > 0) {
          const ratio = catSpent / b.limit;
          if (ratio >= 1.0) {
            findings.push(`Budget ${categoryIdName} over ${Math.round((ratio - 1) * 100)}%.`);
            overBudgetCount++;
          } else if (ratio >= 0.8) {
            findings.push(`Budget ${categoryIdName} terpakai ${Math.round(ratio * 100)}%.`);
            warningBudgetCount++;
          }
        }
      }
    });

    score -= (overBudgetCount * 15) + (warningBudgetCount * 5);

    // 2. Cash Flow Checks
    if (mIncome > 0 && mExpense > mIncome) {
      const deficit = mExpense - mIncome;
      findings.push(`Defisit arus kas ${formatCurrency(deficit, currencySymbol)}.`);
      score -= 20;
    } else if (mIncome > 0 && mIncome > mExpense) {
      const savings = mIncome - mExpense;
      const savingsRate = Math.round((savings / mIncome) * 100);
      if (savingsRate >= 20) {
        findings.push(`Menabung ${savingsRate}% dari pemasukan.`);
        score += 10;
      }
    }

    // 3. Weekly Expense Check
    if (weeklyExpense > 0) {
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(new Date().setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);

      const weeklyTxs = transactions.filter(tx => tx.type === 'pengeluaran' && new Date(tx.date) >= startOfWeek);
      const catSums: Record<string, number> = {};
      weeklyTxs.forEach(tx => {
        catSums[tx.categoryId || ''] = (catSums[tx.categoryId || ''] || 0) + tx.amount;
      });
      let topCat = '';
      let topAmt = 0;
      Object.entries(catSums).forEach(([cat, amt]) => {
        if (amt > topAmt) { topAmt = amt; topCat = cat; }
      });

      if (topCat && topAmt > 0) {
        const pct = Math.round((topAmt / weeklyExpense) * 100);
        const topCatName = categoryMap.get(topCat)?.name || topCat;
        findings.push(`Fokus minggu ini: ${topCatName} (${pct}%).`);
      }
    }

    // 4. Runway Check
    if (mExpense > 0 && totalLiquidBalance > 0) {
      const runway = totalLiquidBalance / mExpense;
      if (runway >= 3) {
        findings.push(`Dana darurat aman (${runway.toFixed(1)} bln).`);
      } else {
        findings.push(`Dana darurat tipis (${runway.toFixed(1)} bln).`);
        score -= 15;
      }
    }

    // Fallbacks if findings list is empty
    if (findings.length === 0) {
      if (transactions.length === 0) {
        findings.push("Catat transaksi pertama Anda.");
        score = 100;
      } else {
        findings.push("Pola arus kas stabil.");
        if (activeBudgets.length === 0) {
          findings.push("Buat budget untuk audit otomatis.");
        }
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));
    let statusText = "Sehat";
    let statusColor = "text-primary-color";
    let statusBg = "bg-primary-container/20";
    if (score < 50) {
      statusText = "Kritis";
      statusColor = "text-error";
      statusBg = "bg-error-container/20";
    } else if (score < 80) {
      statusText = "Waspada";
      statusColor = "text-warning";
      statusBg = "bg-warning/20";
    }

    // Generate sentence
    let sentence = '';
    const savings = mIncome - mExpense;
    const savingsRate = mIncome > 0 ? (savings / mIncome) * 100 : 0;
    const runway = mExpense > 0 ? totalLiquidBalance / mExpense : 0;

    if (transactions.length === 0) {
      sentence = "Selamat datang! Silakan catat transaksi pertama Anda untuk mengaktifkan analisis keuangan berbasis AI yang mendalam.";
    } else if (mIncome > 0 && mExpense > mIncome) {
      sentence = `Pengeluaran Anda bulan ini melebihi pemasukan. Kurangi pos non-essential untuk menghindari defisit yang lebih besar (${formatCurrency(mExpense - mIncome, currencySymbol)}).`;
    } else if (overBudgetCount > 0) {
      sentence = `Anda telah melebihi batas anggaran di ${overBudgetCount} kategori. Segera batasi pengeluaran di pos tersebut untuk menjaga kestabilan finansial.`;
    } else if (warningBudgetCount > 0) {
      sentence = `Anggaran untuk ${warningBudgetCount} kategori sudah mendekati batas limit. Mulai kendalikan konsumsi Anda di sisa bulan ini.`;
    } else if (savingsRate >= 20) {
      sentence = `Luar biasa! Anda berhasil menghemat ${Math.round(savingsRate)}% dari pemasukan. Pertahankan tren positif ini untuk mempercepat tujuan keuangan Anda.`;
    } else if (runway >= 3) {
      sentence = `Kondisi dana darurat Anda sangat sehat, mampu menutupi kebutuhan hingga ${runway.toFixed(1)} bulan. Fokuslah mengalokasikan sisa dana ke investasi.`;
    } else if (runway > 0 && runway < 3) {
      sentence = `Dana darurat Anda hanya cukup untuk ${runway.toFixed(1)} bulan. Prioritaskan menabung untuk memperkuat bantalan keuangan Anda.`;
    } else {
      sentence = "Keuangan Anda dalam kondisi stabil bulan ini. Terus pantau pengeluaran harian dan pertahankan kebiasaan mencatat transaksi Anda.";
    }

    return {
      score,
      statusText,
      statusColor,
      statusBg,
      findings: findings.slice(0, 3), // Show top 3 findings
      sentence
    };
  }, [transactions, weeklyExpense, totalLiquidBalance, budgets, categories, viewDate, startOfMonthDay, currencySymbol]);

  const handleEdit = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setIsCopyMode(false);
    setInitialType(tx.type);
    setIsModalOpen(true);
  }, []);

  // Speech-to-Text for Smart AI Input on main page
  const handleSpeechToText = useCallback(() => {
    toggleListening(bulkInputText, setBulkInputText);
  }, [toggleListening, bulkInputText]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  }, []);

  return (
    <PullToRefresh onRefresh={handlePullToRefresh}>
      <PageWrapper className="space-y-8">

          {/* Header with Month Selector */}
          <PageHeader
            title="Ringkasan Finansial"
            subtitle="Pantau arus kas Anda bulan ini"
            action={
              <div
                className="flex items-center justify-center bg-surface-container-lowest border border-outline-variant rounded-xl px-2 sm:px-4 py-2 cursor-pointer hover:bg-surface-container transition-colors shadow-sm w-full"
                onClick={() => setIsDatePickerOpen(true)}
              >
                <div className="flex items-center justify-center gap-0.5 sm:gap-2 overflow-hidden">
                  <MaterialIcon name="calendar_month" className="text-primary text-[14px] sm:text-base shrink-0" />
                  <span className="font-label-sm sm:font-label-md text-[11px] sm:text-sm text-on-surface font-semibold truncate" data-testid="month-label">
                    {MONTH_NAMES[viewDate.getMonth()].slice(0, 3)} {viewDate.getFullYear().toString().slice(2)}
                  </span>
                  <MaterialIcon name="expand_more" className="text-[14px] sm:text-base text-on-surface-variant shrink-0" />
                </div>
              </div>
            }
          />

          {/* Hero Summary Section - Bento Grid */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">

            {/* Main Balance Card (Spans 6 cols on desktop, vertical compact stack) */}
            <div className="col-span-1 md:col-span-6 bg-bg-card p-5 rounded-3xl shadow-bento flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>

              <div className="flex justify-between items-center relative z-10">
                <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Total Saldo Likuid</span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                  <MaterialIcon name="account_balance_wallet" className="text-primary text-base" />
                </div>
              </div>

              <div className="mt-2.5 relative z-10 space-y-3">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight truncate">{isPrivateMode ? `${currencySymbol} ••••••••` : formatCurrency(totalLiquidBalance, currencySymbol)}</h2>
                  <div className="mt-0.5">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${liquidChangePct >= 0 ? 'bg-primary-container/20 text-primary-color' : 'bg-error-container/20 text-error'}`} title="Dari bulan lalu">
                      <MaterialIcon name={liquidChangePct >= 0 ? 'arrow_upward' : 'arrow_downward'} className="text-[10px] font-bold" />
                      {Math.abs(liquidChangePct).toFixed(1)}% vs bulan lalu
                    </span>
                  </div>
                </div>

                {/* Visual breakdown progress bar */}
                <div className="w-full">
                  <div className="flex justify-between text-xs text-on-surface-variant mb-1 font-semibold">
                    <span>Distribusi Saldo</span>
                    <span>{liquidBreakdown.cashPct}% / {liquidBreakdown.bankPct}% / {liquidBreakdown.walletPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden flex gap-0.5 shadow-inner">
                    {liquidBreakdown.cash > 0 && (
                      <div style={{ width: `${liquidBreakdown.cashPct}%` }} className="bg-primary h-full transition-all duration-500 rounded-l" title={`Tunai: ${liquidBreakdown.cashPct}%`}></div>
                    )}
                    {liquidBreakdown.bank > 0 && (
                      <div style={{ width: `${liquidBreakdown.bankPct}%` }} className="bg-secondary h-full transition-all duration-500" title={`Rekening: ${liquidBreakdown.bankPct}%`}></div>
                    )}
                    {liquidBreakdown.wallet > 0 && (
                      <div style={{ width: `${liquidBreakdown.walletPct}%` }} className="bg-outline h-full transition-all duration-500 rounded-r" title={`eWallet: ${liquidBreakdown.walletPct}%`}></div>
                    )}
                    {liquidBreakdown.total === 0 && (
                      <div className="w-full bg-surface-container h-full"></div>
                    )}
                  </div>
                </div>

                {/* Tight details below */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>
                    <span className="text-on-surface-variant">Tunai: <strong className="text-on-surface font-semibold">{isPrivateMode ? '••••' : formatCurrency(liquidBreakdown.cash, currencySymbol)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-secondary shrink-0"></span>
                    <span className="text-on-surface-variant">Rekening: <strong className="text-on-surface font-semibold">{isPrivateMode ? '••••' : formatCurrency(liquidBreakdown.bank, currencySymbol)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-outline shrink-0"></span>
                    <span className="text-on-surface-variant">eWallet: <strong className="text-on-surface font-semibold">{isPrivateMode ? '••••' : formatCurrency(liquidBreakdown.wallet, currencySymbol)}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings & Investments (Spans 3 cols on desktop) */}
            <div className="col-span-1 md:col-span-3 bg-bg-card p-5 rounded-3xl shadow-bento flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-secondary opacity-10 rounded-full blur-2xl translate-y-1/4 translate-x-1/4"></div>
              <div className="flex justify-between items-center relative z-10">
                <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Tabungan & Invest</span>
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                  <MaterialIcon name="savings" className="text-secondary text-base" />
                </div>
              </div>
              <div className="mt-2.5 relative z-10">
                <div>
                  <h2 className="text-2xl font-bold text-on-surface truncate">{isPrivateMode ? `${currencySymbol} ••••••••` : formatCurrency(savingsAndInvestments, currencySymbol)}</h2>
                  <div className="mt-0.5">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${savingsChangePct >= 0 ? 'bg-primary-container/20 text-primary-color' : 'bg-error-container/20 text-error'}`} title="Dari bulan lalu">
                      <MaterialIcon name={savingsChangePct >= 0 ? 'arrow_upward' : 'arrow_downward'} className="text-[10px] font-bold" />
                      {Math.abs(savingsChangePct).toFixed(1)}% vs bulan lalu
                    </span>
                  </div>
                </div>

                {/* Savings vs Investment ratio */}
                <div className="mt-3">
                  <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden flex shadow-inner">
                    {savingsBreakdown.savings > 0 && (
                      <div style={{ width: `${savingsBreakdown.savingsPct}%` }} className="bg-secondary h-full" title={`Tabungan: ${savingsBreakdown.savingsPct}%`}></div>
                    )}
                    {savingsBreakdown.investment > 0 && (
                      <div style={{ width: `${savingsBreakdown.investmentPct}%` }} className="bg-primary h-full" title={`Investasi: ${savingsBreakdown.investmentPct}%`}></div>
                    )}
                    {savingsBreakdown.total === 0 && (
                      <div className="w-full bg-surface-container h-full"></div>
                    )}
                  </div>
                </div>

                {/* Detailed Breakdown Items */}
                <div className="mt-3 pt-2.5 border-t border-border-light flex flex-col gap-1 text-[11px] text-on-surface-variant">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0"></span>
                      <span>Tabungan ({savingsBreakdown.savingsPct}%)</span>
                    </span>
                    <span className="font-semibold text-on-surface">{isPrivateMode ? '••••' : formatCurrency(savingsBreakdown.savings, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                      <span>Investasi ({savingsBreakdown.investmentPct}%)</span>
                    </span>
                    <span className="font-semibold text-on-surface">{isPrivateMode ? '••••' : formatCurrency(savingsBreakdown.investment, currencySymbol)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top 3 Assets List (Spans 3 cols on desktop) */}
            <div className="col-span-1 md:col-span-3 bg-bg-card p-5 rounded-3xl shadow-bento flex flex-col justify-between group">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Top 3 Aset</span>
                <button
                  onClick={togglePrivateMode}
                  className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors border-none cursor-pointer"
                  title={isPrivateMode ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
                >
                  <MaterialIcon name={isPrivateMode ? 'visibility_off' : 'visibility'} className="text-on-surface-variant text-sm" />
                </button>
              </div>
              <div className="mt-3 flex-1 flex flex-col gap-1.5 justify-center">
                {topAssets.length === 0 ? (
                  <div className="text-[11px] text-on-surface-variant text-center py-2">Belum ada aset</div>
                ) : (
                  topAssets.map((asset, i) => (
                    <div key={asset.id} className="flex justify-between items-center bg-surface-container-lowest p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className="w-5 h-5 rounded bg-surface-container flex items-center justify-center text-[9px] font-bold text-on-surface-variant shrink-0">{i + 1}</div>
                        <span className="text-xs font-bold text-on-surface truncate">{asset.name}</span>
                      </div>
                      <span className="text-xs font-bold text-on-surface ml-1.5 shrink-0">{isPrivateMode ? `${currencySymbol} ••••••••` : formatCurrency(asset.balance, currencySymbol)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Income Card (4 cols) */}
            <div
              className="col-span-1 md:col-span-4 bg-bg-card p-5 rounded-3xl shadow-bento flex flex-col justify-between cursor-pointer group hover:-translate-y-1 transition-all"
              onClick={() => handleAdd('pendapatan')}
            >
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Pemasukan Bulan Ini</span>
                <div className="w-8 h-8 rounded-lg bg-income flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                  <MaterialIcon name="trending_up" className="text-primary-color text-base" />
                </div>
              </div>
              <div className="mt-2.5">
                <div>
                  <h2 className="text-2xl font-bold text-primary-color truncate">{isPrivateMode ? `${currencySymbol} ••••••••` : formatCurrency(monthlyIncome, currencySymbol)}</h2>
                  <div className="mt-0.5">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${incomeChangePct >= 0 ? 'bg-primary-container/20 text-primary-color' : 'bg-error-container/20 text-error'}`} title="Dari bulan lalu">
                      <MaterialIcon name={incomeChangePct >= 0 ? 'arrow_upward' : 'arrow_downward'} className="text-[10px] font-bold" />
                      {Math.abs(incomeChangePct).toFixed(1)}% vs bulan lalu
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border-light flex flex-col gap-1 text-[11px] text-on-surface-variant">
                  <div className="flex justify-between">
                    <span>Frekuensi:</span>
                    <span className="font-semibold text-on-surface">{incomeDetails.count} Kali</span>
                  </div>
                  <div className="flex justify-between truncate">
                    <span>Sumber Utama:</span>
                    <span className="font-semibold text-on-surface truncate" title={incomeDetails.topCategory || 'N/A'}>
                      {incomeDetails.topCategory ? `${incomeDetails.topCategory}` : 'Belum ada'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expense Card (4 cols) */}
            <div
              className="col-span-1 md:col-span-4 bg-bg-card p-5 rounded-3xl shadow-bento flex flex-col justify-between cursor-pointer group hover:-translate-y-1 transition-all"
              onClick={() => handleAdd('pengeluaran')}
            >
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Pengeluaran Mingguan</span>
                <div className="w-8 h-8 rounded-lg bg-expense flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                  <MaterialIcon name="trending_down" className="text-error text-base" />
                </div>
              </div>
              <div className="mt-2.5">
                <div>
                  <h2 className="text-2xl font-bold text-error truncate">{isPrivateMode ? `${currencySymbol} ••••••••` : formatCurrency(weeklyExpense, currencySymbol)}</h2>
                  <div className="mt-0.5">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${expenseChangePct <= 0 ? 'bg-primary-container/20 text-primary-color' : 'bg-error-container/20 text-error'}`} title="Total bulanan vs bulan lalu">
                      <MaterialIcon name={expenseChangePct >= 0 ? 'arrow_upward' : 'arrow_downward'} className="text-[10px] font-bold" />
                      {Math.abs(expenseChangePct).toFixed(1)}% vs bulan lalu
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border-light flex flex-col gap-1 text-[11px] text-on-surface-variant">
                  <div className="flex justify-between">
                    <span>Rerata Harian:</span>
                    <span className="font-semibold text-on-surface">{formatCurrency(weeklyExpenseDetails.dailyAverage, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between truncate">
                    <span>Pos Terbesar:</span>
                    <span className="font-semibold text-on-surface truncate" title={weeklyExpenseDetails.topCategory || 'N/A'}>
                      {weeklyExpenseDetails.topCategory ? `${weeklyExpenseDetails.topCategory}` : 'Belum ada'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insight Card (Spans 4 cols, compact design matching the row) */}
            <div className="col-span-1 md:col-span-4 bg-surface-container p-5 rounded-3xl border border-outline-variant flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-24 h-24 bg-primary opacity-10 rounded-full blur-xl -translate-y-1/2 -translate-x-1/2 group-hover:opacity-20 transition-opacity"></div>

              <div className="flex justify-between items-start relative z-10">
                <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider flex items-center gap-1.5">
                  <MaterialIcon name="auto_awesome" filled className="text-primary text-sm" />
                  Insight AI
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${aiInsightData.statusBg} ${aiInsightData.statusColor}`}>
                  {aiInsightData.statusText}
                </span>
              </div>

              <div className="mt-3 relative z-10 space-y-3 flex-1 flex flex-col justify-between">
                {/* Score bar */}
                <div>
                  <div className="flex justify-between items-center text-[10px] text-on-surface-variant mb-1 font-semibold">
                    <span>Skor Kesehatan</span>
                    <span className="font-bold text-on-surface">{aiInsightData.score}/100</span>
                  </div>
                  <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden flex shadow-inner">
                    <div style={{ width: `${aiInsightData.score}%` }} className="bg-primary h-full transition-all duration-500"></div>
                  </div>
                </div>

                <p className="text-[11px] text-on-surface leading-relaxed font-semibold">
                  {aiInsightData.sentence}
                </p>

                {/* Findings List */}
                <div className="pt-2 border-t border-border-light flex flex-col gap-1.5">
                  {aiInsightData.findings.map((finding, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px] leading-tight text-on-surface-variant font-medium">
                      <MaterialIcon name="chevron_right" className="text-[10px] text-primary mt-0.5 shrink-0" />
                      <span className="truncate">{finding}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Presets Section */}
          <section id="input-cepat-section" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">Input Cepat</h3>
              <button onClick={() => setIsPresetManagerOpen(true)} className="text-primary font-label-md text-label-md hover:underline bg-transparent border-none cursor-pointer">Edit Presets</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
              {displayPresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleAdd(preset.type, { amount: preset.amount, categoryId: preset.categoryId, note: preset.note })}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-outline-variant rounded-full hover:bg-primary-container hover:text-on-primary-container transition-all whitespace-nowrap cursor-pointer"
                >
                  <MaterialIcon name={preset.type === 'pengeluaran' ? 'arrow_upward' : preset.type === 'pendapatan' ? 'arrow_downward' : 'swap_horiz'} className="text-sm" />
                  <span className="font-label-md text-label-md">{preset.label}</span>
                </button>
              ))}
              <button
                onClick={() => handleAdd('pengeluaran')}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-outline-variant rounded-full hover:bg-primary-container hover:text-on-primary-container transition-all whitespace-nowrap cursor-pointer"
                data-testid="transaction-add-fab"
              >
                <MaterialIcon name="add" className="text-sm" />
                <span className="font-label-md text-label-md">Tambah Baru</span>
              </button>
            </div>
          </section>

          {/* Main Content Area */}
          <section className="flex flex-col lg:flex-row gap-8">

            {/* Left: Transaction List (60%) */}
            <div className="lg:w-[60%] space-y-6">
              <div className="bg-bg-card rounded-3xl shadow-bento overflow-hidden">
                <div className="px-4 pt-4 pb-4 border-b border-border-light flex flex-col gap-4">
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Cari nama, kategori, atau catatan transaksi..."
                    maxWidth="100%"
                  />

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 min-w-0">
                    {/* Type Filters */}
                    <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider shrink-0">Filter:</span>
                      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar flex-1 sm:flex-none min-w-0">
                        <FilterChip label="Semua" isActive={typeFilter === 'all'} onClick={() => setTypeFilter('all')} />
                        <FilterChip label="Keluar" icon={<MaterialIcon name="arrow_upward" className="text-[12px]" />} isActive={typeFilter === 'pengeluaran'} onClick={() => setTypeFilter('pengeluaran')} className={typeFilter === 'pengeluaran' ? '!bg-error !text-white' : 'hover:!text-error'} />
                        <FilterChip label="Masuk" icon={<MaterialIcon name="arrow_downward" className="text-[12px]" />} isActive={typeFilter === 'pendapatan'} onClick={() => setTypeFilter('pendapatan')} className={typeFilter === 'pendapatan' ? '!bg-primary-color !text-white' : 'hover:!text-primary-color'} />
                        <div className="w-4 shrink-0 sm:hidden"></div>
                      </div>
                    </div>

                    {/* Group By Filter */}
                    <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider shrink-0">Grup:</span>
                      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar flex-1 sm:flex-none min-w-0">
                        <FilterChip label="Tanggal" isActive={groupBy === 'date'} onClick={() => setGroupBy('date')} />
                        <FilterChip label="Kategori" isActive={groupBy === 'categoryId'} onClick={() => setGroupBy('categoryId')} />
                        <FilterChip label="Aset" isActive={groupBy === 'asset'} onClick={() => setGroupBy('asset')} />
                        <div className="w-4 shrink-0 sm:hidden"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 p-4 min-h-[300px] bg-transparent">
                  {groups.length === 0 ? (
                    <div className="p-12 text-center text-on-surface-variant bg-bg-card rounded-2xl border border-outline-variant">
                      <MaterialIcon name="receipt_long" className="text-4xl opacity-50 mb-2" />
                      <p>Tidak ada transaksi.</p>
                    </div>
                  ) : (
                    groups.map(group => {
                      const isCollapsed = collapsedGroups[group.id] ?? (groupBy === 'date' && group.id !== getLocalDate());
                      return (
                        <div key={group.id} className="flex flex-col gap-3">
                          {group.title && (
                            <div
                              className="flex justify-between items-center cursor-pointer pt-2 pb-1"
                              onClick={() => toggleGroup(group.id)}
                            >
                              <div className="flex items-center gap-2 text-on-surface-variant font-bold text-sm uppercase tracking-wider">
                                <MaterialIcon name={isCollapsed ? "chevron_right" : "expand_more"} className="text-sm" />
                                <span>{group.title}</span>
                              </div>
                              <span className="font-bold text-on-surface text-xs bg-surface-container px-2 py-1 rounded-lg shadow-sm">
                                {formatCurrency(group.income - group.expense, currencySymbol)}
                              </span>
                            </div>
                          )}
                          {!isCollapsed && (
                            <div className="flex flex-col gap-2">
                              {group.transactions.map(tx => (
                                <TransactionItem
                                  key={tx.id}
                                  transaction={tx}
                                  assetName={getAssetName(tx.assetId)}
                                  fromAssetName={tx.fromAssetId ? getAssetName(tx.fromAssetId) : undefined}
                                  toAssetName={tx.toAssetId ? getAssetName(tx.toAssetId) : undefined}
                                  onDelete={handleDelete}
                                  onEdit={handleEdit}
                                  onCopy={handleCopy}
                                  showDate={groupBy !== 'date'}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {hasMore && (
                  <div className="p-4 text-center border-t border-border-light">
                    <button
                      onClick={() => setVisibleLimit(prev => prev + 15)}
                      className="text-primary font-label-md text-label-md hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Lihat Lebih Banyak
                    </button>
                  </div>
                )}

              </div>
            </div>

            {/* Right: AI Input Panel (40%) */}
            <div className="lg:w-[40%] space-y-6">
              <div className="bg-bg-card p-6 rounded-3xl shadow-bento space-y-6">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="auto_awesome" filled className="text-primary" />
                  <h3 className="font-headline-md text-headline-md text-on-surface">AI Input Pintar</h3>
                </div>

                {/* OCR Upload Box */}
                <div
                  onClick={() => navigate('/scan')}
                  className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3 hover:bg-surface-container transition-colors cursor-pointer group"
                  data-testid="ai-scanner"
                >
                  <div className="w-14 h-14 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MaterialIcon name="document_scanner" className="text-3xl" />
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">Pindai Struk</p>
                    <p className="text-xs text-on-surface-variant">Upload foto struk belanja untuk diproses otomatis</p>
                  </div>
                </div>

                {/* Smart AI Input Area */}
                <div className="space-y-3">
                  <label className="font-label-md text-label-md text-on-surface">Input Sekaligus (Bulk Parse)</label>
                  <textarea
                    className="w-full h-32 p-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary text-sm font-body-md resize-none transition-colors"
                    placeholder={"Tulis transaksi di sini...\nContoh: Makan 50rb gopay, Bensin 30k cash"}
                    spellCheck="false"
                    value={bulkInputText}
                    onChange={e => setBulkInputText(e.target.value)}
                    data-testid="smart-ai-input"
                  ></textarea>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSpeechToText}
                      className={`flex items-center gap-1.5 px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer border ${isListening
                          ? 'bg-error/10 text-error border-error animate-pulse'
                          : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container'
                        }`}
                      data-testid="smart-mic-btn"
                    >
                      <MaterialIcon name={isListening ? 'stop' : 'mic'} className="text-base" />
                      {isListening ? 'Stop' : 'Mic'}
                    </button>
                    <button
                      onClick={() => navigate('/bulk-input', { state: { prefillText: bulkInputText } })}
                      className="flex-1 py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer border-none"
                      data-testid="open-ai-parser-btn"
                    >
                      <MaterialIcon name="analytics" className="text-sm" />
                      Input Bulk
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Insights Mini Card */}
              {paceInfo && paceInfo.status !== 'on_track' && (
                <div className={`bg-surface-container p-5 rounded-xl border space-y-3 ${paceInfo.status === 'danger' ? 'border-error' : 'border-warning'}`}>
                  <p className={`text-xs font-bold flex items-center gap-1 uppercase tracking-wide ${paceInfo.status === 'danger' ? 'text-error' : 'text-warning'}`}>
                    <MaterialIcon name="insights" className="text-xs" /> Wawasan AI
                  </p>
                  <p className="text-sm font-body-md text-on-surface">
                    Kamu telah menghabiskan <strong>{Math.round(paceInfo.actualSpendPercent * 100)}%</strong> budget bulan ini dalam waktu {Math.round(paceInfo.expectedSpendPercent * 100)}%.
                    Pertimbangkan untuk membatasi pengeluaran.
                  </p>
                </div>
              )}
            </div>
          </section>

        <DatePickerModal
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          viewDate={viewDate}
          onSelectDate={(date: Date) => {
            setViewDate(date);
            setIsDatePickerOpen(false);
          }}
        />

        {isModalOpen && (
          <Suspense fallback={null}>
            <TransactionModal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              assets={assets}
              addTransaction={addTransaction}
              addRecurringTransaction={addRecurringTransaction}
              updateTransaction={updateTransaction}
              deleteTransaction={deleteTransaction}
              editingTransaction={editingTransaction}
              isCopyMode={isCopyMode}
              initialType={initialType}
            />
          </Suspense>
        )}

        <PresetManagerModal
          isOpen={isPresetManagerOpen}
          onClose={() => setIsPresetManagerOpen(false)}
        />

        <WhatsNewModal
          isOpen={isWhatsNewOpen}
          onClose={closeWhatsNew}
        />

        <OnboardingTutorial
          pageKey="transactions"
          steps={[
            { targetSelector: '[data-tour="income-card"]', title: '💰 Catat Pemasukan', description: 'Tap kartu ini untuk menambahkan pemasukan seperti gaji, bonus, atau pendapatan lain.' },
            { targetSelector: '[data-tour="expense-card"]', title: '💸 Catat Pengeluaran', description: 'Tap kartu ini untuk mencatat pengeluaran harian kamu dengan cepat.' },
            { targetSelector: '[data-tour="ai-scanner"]', title: '🤖 Scanner AI Cerdas', description: 'Pindai struk belanja dengan kamera atau ketik banyak transaksi sekaligus dengan bantuan AI.', onBeforeShow: () => handleCloseModal() },
          ]}
        />
      </PageWrapper>

      {/* Quick Scroll to Input Cepat FAB */}
      {showQuickScrollFab && (
        <div className="lg:hidden fixed bottom-[85px] left-0 w-full flex justify-center z-[90] pointer-events-none">
          <button
            onClick={() => {
              const section = document.getElementById('input-cepat-section');
              if (section) {
                const y = section.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top: y, behavior: 'smooth' });
              }
            }}
            className="pointer-events-auto flex items-center justify-center gap-1 px-3 py-1.5 bg-primary text-on-primary rounded-full shadow-lg border-none cursor-pointer hover:bg-primary/90 transition-all text-[10px] font-bold tracking-wide animate-in slide-in-from-bottom-5 fade-in duration-300"
          >
            <MaterialIcon name="arrow_downward" className="text-[14px]" />
            Input Cepat
          </button>
        </div>
      )}

      {/* Draggable MoneyBot FAB */}
      <div
        ref={fabRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClickFab}
        className="fixed z-[100] w-14 h-14 rounded-full bg-primary text-on-primary shadow-xl flex items-center justify-center cursor-pointer border-none select-none touch-none"
        style={{
          top: fabPos.top,
          left: fabPos.left,
          transition: isFabDragging ? 'none' : 'top 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <span className="material-symbols-outlined text-2xl text-on-primary">smart_toy</span>
      </div>

    </PullToRefresh>
  );
};

export default Transactions;
