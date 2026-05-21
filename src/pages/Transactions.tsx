import React, { useState, useMemo, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, ChevronDown, LayoutGrid, Calendar, Tag, CreditCard, Sparkles, ArrowUpCircle, ArrowDownCircle, RefreshCw, Camera, Search, X, MessageCircle, AlertCircle, Flame, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMoney } from '../contexts/MoneyContext';
import type { Transaction } from '../contexts/MoneyContext';
import { formatCurrency, getLocalDate } from '../lib/utils';
import TransactionItem from '../components/transactions/TransactionItem';
import TransactionModal from '../components/modals/TransactionModal';
import DatePickerModal from '../components/modals/DatePickerModal';
import WhatsNewModal from '../components/modals/WhatsNewModal';
import OnboardingTutorial from '../components/OnboardingTutorial';
import { useToast } from '../components/common/Toast';

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

type GroupBy = 'date' | 'category' | 'asset' | 'none';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.03
    }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 150,
      damping: 15
    }
  }
} as const;

interface TransactionGroup {
  id: string;
  title: string;
  transactions: Transaction[];
  income: number;
  expense: number;
  dateStr?: string;
  dayName?: string;
}

const TopoDownArrow = () => (
  <svg width="100" height="100" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'scale(1.15)', transformOrigin: 'bottom right' }}>
    <circle cx="60" cy="60" r="42" stroke="white" strokeWidth="3" opacity="0.18" />
    <circle cx="60" cy="60" r="48" stroke="white" strokeWidth="1" opacity="0.1" />
    <path d="M25 55 C 40 45, 50 65, 70 55 C 85 45, 95 65, 105 55" stroke="white" strokeWidth="1.2" opacity="0.12" strokeLinecap="round" />
    <path d="M22 68 C 38 58, 48 78, 68 68 C 83 58, 93 78, 103 68" stroke="white" strokeWidth="1.2" opacity="0.08" strokeLinecap="round" />
    <path d="M28 42 C 43 32, 53 52, 73 42 C 88 32, 98 52, 108 42" stroke="white" strokeWidth="1.2" opacity="0.08" strokeLinecap="round" />
    <path d="M60 40 V80 M48 68 L60 80 L72 68" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
  </svg>
);

const TopoUpArrow = () => (
  <svg width="100" height="100" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'scale(1.15)', transformOrigin: 'bottom right' }}>
    <circle cx="60" cy="60" r="42" stroke="white" strokeWidth="3" opacity="0.18" />
    <circle cx="60" cy="60" r="48" stroke="white" strokeWidth="1" opacity="0.1" />
    <path d="M25 55 C 40 45, 50 65, 70 55 C 85 45, 95 65, 105 55" stroke="white" strokeWidth="1.2" opacity="0.12" strokeLinecap="round" />
    <path d="M22 68 C 38 58, 48 78, 68 68 C 83 58, 93 78, 103 68" stroke="white" strokeWidth="1.2" opacity="0.08" strokeLinecap="round" />
    <path d="M28 42 C 43 32, 53 52, 73 42 C 88 32, 98 52, 108 42" stroke="white" strokeWidth="1.2" opacity="0.08" strokeLinecap="round" />
    <path d="M60 80 V40 M48 52 L60 40 L72 52" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
  </svg>
);

const MagicRobotSVG = ({ size = 120 }: { size?: number }) => (
  <svg width={size} height={size * 0.625} viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="trail1" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
      </linearGradient>
      <linearGradient id="trail2" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="robotFaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#eef2f6" />
      </linearGradient>
      <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="50%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </defs>

    <path d="M85 75 C 105 75, 115 50, 140 55 C 145 57, 150 65, 155 70" stroke="url(#trail1)" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M88 62 C 102 62, 110 40, 132 45 C 138 46, 142 52, 146 58" stroke="url(#trail2)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M80 82 C 95 82, 105 60, 125 65 C 130 66, 135 72, 140 76" stroke="url(#trail1)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />

    <path d="M125 35 C125 39, 121 42, 117 42 C121 42, 125 45, 125 49 C125 45, 129 42, 133 42 C129 42, 125 39, 125 35 Z" fill="#8b5cf6" />
    <path d="M145 50 C145 53, 142 55, 139 55 C142 55, 145 57, 145 60 C145 57, 148 55, 151 55 C148 55, 145 53, 145 50 Z" fill="#ec4899" />
    <path d="M110 58 C110 60, 108 61, 106 61 C108 61, 110 62, 110 64 C110 62, 112 61, 114 61 C112 61, 110 60, 110 58 Z" fill="#3b82f6" />

    <g transform="translate(10, 15)">
      <rect x="36" y="8" width="8" height="12" rx="4" fill="#a855f7" />
      <circle cx="40" cy="6" r="4" fill="#ec4899" />
      <rect x="12" y="32" width="6" height="16" rx="3" fill="#9ca3af" />
      <rect x="62" y="32" width="6" height="16" rx="3" fill="#9ca3af" />
      <rect x="16" y="16" width="48" height="48" rx="18" fill="url(#robotFaceGrad)" stroke="#6b7280" strokeWidth="2" />
      <rect x="22" y="26" width="36" height="18" rx="9" fill="url(#visorGrad)" />
      <ellipse cx="32" cy="35" rx="3.5" ry="4.5" fill="#ffffff" />
      <ellipse cx="48" cy="35" rx="3.5" ry="4.5" fill="#ffffff" />
      <circle cx="26" cy="42" r="2" fill="#f472b6" opacity="0.6" />
      <circle cx="54" cy="42" r="2" fill="#f472b6" opacity="0.6" />
      <path d="M37 46 Q40 49 43 46" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </g>
  </svg>
);

const SparklingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px', color: 'var(--primary)' }}>
    <path d="M12 2 C12 6.5, 6.5 12, 2 12 C6.5 12, 12 17.5, 12 22 C12 17.5, 17.5 12, 22 12 C17.5 12, 12 6.5, 12 2 Z" fill="currentColor" />
  </svg>
);

const Transactions: React.FC = () => {
  const navigate = useNavigate();
  const { transactions, assets, budgets, addTransaction, addRecurringTransaction, deleteTransaction, updateTransaction, currencySymbol, startOfMonthDay, showDebtInTransactions, defaultTransactionGrouping, setIsChatOpen, subscriptions } = useMoney();
  const { showToast } = useToast();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isCopyMode, setIsCopyMode] = useState(false);
  const [initialType, setInitialType] = useState<Transaction['type']>('pengeluaran');
  const [isFabOpen, setIsFabOpen] = useState(false);
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
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);

  React.useEffect(() => {
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

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const isCurrentlyCollapsed = prev[groupId] ?? (groupBy === 'date' && groupId !== getLocalDate());
      return { ...prev, [groupId]: !isCurrentlyCollapsed };
    });
  }, [groupBy]);

  const getAssetName = useCallback((id?: string) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return 'Unknown';
    return asset.isDeleted ? `${asset.name} (Dihapus)` : asset.name;
  }, [assets]);

  const handleDelete = useCallback((id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    deleteTransaction(id);
    showToast('Transaksi dihapus', 'info', {
      label: 'Undo',
      onClick: () => {
        const { id: _removedId, ...rest } = tx;
        addTransaction(rest);
      }
    });
  }, [transactions, deleteTransaction, showToast, addTransaction]);

  // Grouped and filtered data
  const { groups, monthlyIncome, monthlyExpense } = useMemo(() => {
    const vM = viewDate.getMonth();
    const vY = viewDate.getFullYear();

    // Calculate period start and end based on startOfMonthDay
    const periodStart = new Date(vY, vM - (startOfMonthDay > 1 ? 1 : 0), startOfMonthDay);
    const periodEnd = new Date(vY, vM + (startOfMonthDay > 1 ? 0 : 1), startOfMonthDay);

    let inc = 0;
    let exp = 0;

    const filtered = transactions.filter(tx => {
      // 0. Filter out debt transactions if disabled
      const isDebtTx = ['piutang_keluar', 'piutang_masuk', 'hutang_masuk', 'hutang_keluar'].includes(tx.type);
      if (!showDebtInTransactions && isDebtTx) {
        return false;
      }

      // 1. Search Query logic (Global)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = (
          tx.note.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          (tx.subCategory && tx.subCategory.toLowerCase().includes(q)) ||
          tx.amount.toString().includes(q)
        );
        if (!matches) return false;

        // If matches search, sum up for the visible context (we don't filter by month if searching)
        if (tx.type === 'pendapatan') inc += tx.amount;
        if (tx.type === 'pengeluaran') exp += tx.amount;
        return true;
      }

      // 2. Default Period filter
      const txD = new Date(tx.date);
      // Normalized to strip time for pure date comparison if needed, 
      // but new Date(tx.date) is already 00:00:00
      if (txD >= periodStart && txD < periodEnd) {
        if (tx.type === 'pendapatan') inc += tx.amount;
        if (tx.type === 'pengeluaran') exp += tx.amount;
        return true;
      }
      return false;
    }).sort((a, b) => {
      // 1. Primary: Date (descending)
      const dateComp = b.date.localeCompare(a.date);
      if (dateComp !== 0) return dateComp;

      // 2. Secondary: Time (descending) - Treat missing time as 00:00 to keep it consistent
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      const timeComp = timeB.localeCompare(timeA);
      if (timeComp !== 0) return timeComp;

      // 3. Tertiary: ID (descending)
      return b.id.localeCompare(a.id);
    });

    if (groupBy === 'none') {
      return {
        groups: [{ id: 'all', title: '', transactions: filtered, income: inc, expense: exp }],
        monthlyIncome: inc,
        monthlyExpense: exp
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
        title = dateStr;
      } else if (groupBy === 'category') {
        key = tx.category;
        title = tx.category;
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

    return { groups: sortedGroups, monthlyIncome: inc, monthlyExpense: exp };
  }, [transactions, searchQuery, viewDate, startOfMonthDay, groupBy, showDebtInTransactions, getAssetName]);

  // ─── Spending Pace Logic ──────────────────────────────────────────────────
  const paceData = useMemo(() => {
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

    return { totalDays, daysPassed, expectedSpendPercent, globalLimit: globalBudget.limit };
  }, [viewDate, budgets, searchQuery]);

  const paceInfo = useMemo(() => {
    if (!paceData) return null;
    const { totalDays, daysPassed, expectedSpendPercent, globalLimit } = paceData;
    const actualSpendPercent = monthlyExpense / globalLimit;
    const diff = actualSpendPercent - expectedSpendPercent;

    let status: 'on_track' | 'warning' | 'danger' = 'on_track';
    if (diff > 0.2 || actualSpendPercent > 1.0) status = 'danger';
    else if (diff > 0.1) status = 'warning';

    const dailyRate = monthlyExpense / daysPassed;
    const remainingBudget = globalLimit - monthlyExpense;
    const daysRemaining = dailyRate > 0 ? Math.floor(remainingBudget / dailyRate) : (totalDays - daysPassed);

    return {
      expectedSpendPercent,
      actualSpendPercent,
      status,
      daysRemaining: Math.max(0, daysRemaining),
      globalLimit
    };
  }, [paceData, monthlyExpense]);

  // --- Pace Notification ---
  React.useEffect(() => {
    if (!paceInfo) return;

    const { status, actualSpendPercent, expectedSpendPercent } = paceInfo;
    if (status === 'on_track') return;

    const currentMonthKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
    const lastNotified = localStorage.getItem(`pace_notified_${currentMonthKey}`);

    if (lastNotified !== status) {
      const message = status === 'danger'
        ? `Pengeluaran terlalu cepat! Terpakai ${Math.round(actualSpendPercent * 100)}% anggaran, padahal baru ${Math.round(expectedSpendPercent * 100)}% bulan berlalu.`
        : `Peringatan: Pengeluaran sedikit lebih cepat dari seharusnya (${Math.round(actualSpendPercent * 100)}% anggaran vs ${Math.round(expectedSpendPercent * 100)}% waktu).`;

      showToast(message, status === 'danger' ? 'error' : 'warning');
      localStorage.setItem(`pace_notified_${currentMonthKey}`, status);
    }
  }, [paceInfo, showToast]);

  const eomInfo = useMemo(() => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1; // 1-indexed
    const year = today.getFullYear();

    const startDay = startOfMonthDay || 1;
    let endYear = year;
    let endMonth = month;
    let endDay = startDay - 1;

    if (startDay === 1) {
      const lastDayOfCalMonth = new Date(year, month, 0).getDate();
      endDay = lastDayOfCalMonth;
    } else {
      if (day >= startDay) {
        endMonth = month + 1;
        if (endMonth > 12) {
          endMonth = 1;
          endYear = year + 1;
        }
      }
    }

    const eomDate = new Date(endYear, endMonth - 1, endDay);
    const todayDate = new Date(year, month - 1, day);
    const diffTime = eomDate.getTime() - todayDate.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      isNearEOM: days >= 0 && days <= 5,
      days,
      dateStr: `${endDay}/${endMonth}/${endYear}`
    };
  }, [startOfMonthDay]);

  const changeMonth = useCallback((offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }, []);

  const resetToToday = useCallback(() => {
    const d = new Date();
    if (startOfMonthDay > 1 && d.getDate() >= startOfMonthDay) {
      setViewDate(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else {
      setViewDate(d);
    }
  }, [startOfMonthDay]);

  const handleEdit = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setIsCopyMode(false);
    setInitialType(tx.type);
    setIsModalOpen(true);
  }, []);

  const handleCopy = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setIsCopyMode(true);
    setInitialType(tx.type);
    setIsModalOpen(true);
  }, []);

  const handleAdd = (type: Transaction['type'] = 'pengeluaran') => {
    setEditingTransaction(null);
    setIsCopyMode(false);
    setInitialType(type);
    setIsModalOpen(true);
    setIsFabOpen(false);
  };

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  }, []);

  return (
    <div className="page">
      {/* Subscription Alert */}
      {(() => {
        const upcomingSubs = subscriptions.filter(s => {
          if (!s.isActive || !s.nextBillingDate) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const billingDate = new Date(s.nextBillingDate);
          billingDate.setHours(0, 0, 0, 0);
          const diffTime = billingDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 3;
        });

        if (upcomingSubs.length === 0) return null;

        return (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginBottom: '16px',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #fff3cd, #ffeeba)',
              border: '1px solid #ffeeba',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(133, 100, 4, 0.1)', color: '#856404',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <AlertCircle size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#856404' }}>Langganan Segera Berakhir</div>
              <div style={{ fontSize: '11px', color: '#856404', opacity: 0.8, fontWeight: 600 }}>
                {upcomingSubs.length === 1
                  ? `"${upcomingSubs[0].name}" akan jatuh tempo dalam ${Math.ceil((new Date(upcomingSubs[0].nextBillingDate).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))} hari.`
                  : `${upcomingSubs.length} langganan akan jatuh tempo dalam 3 hari ke depan.`
                }
              </div>
            </div>
            <button
              onClick={() => navigate('/settings')}
              style={{
                background: '#856404', color: 'white', border: 'none',
                padding: '6px 12px', borderRadius: '8px', fontSize: '11px',
                fontWeight: 700, cursor: 'pointer'
              }}
            >
              Lihat
            </button>
          </motion.div>
        );
      })()}


      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="title" style={{ margin: 0 }}>Transaksi</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isSearchOpen && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--bg-card)', border: '1.5px solid var(--border-color)',
              borderRadius: '20px', padding: '0 10px', height: '28px', boxSizing: 'border-box'
            }}>
              <input
                autoFocus
                type="text"
                placeholder="Cari..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  fontSize: '13px', color: 'var(--text-main)', width: '100px', marginBottom: 0,
                  height: '100%', padding: 0
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          <button
            onClick={() => { setIsSearchOpen(o => !o); if (isSearchOpen) setSearchQuery(''); }}
            className="btn-icon"
            aria-label={isSearchOpen ? 'Tutup pencarian' : 'Cari transaksi'}
            style={{ color: isSearchOpen ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            {isSearchOpen ? <X size={20} /> : <Search size={20} />}
          </button>
        </div>
      </div>

      {/* Month Switcher */}
      {!searchQuery && (
        <div data-tour="month-nav" className="card shadow-soft" style={{ padding: '4px', marginBottom: '24px', border: 'none', background: 'var(--bg-card-solid)', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
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
                {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
                <ChevronDown size={18} color="var(--primary)" />
              </div>
            </div>

            <button onClick={() => changeMonth(1)} className="btn-icon">
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Bento Grid Dashboard Summary */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '24px'
        }}
      >
        {/* Pace Indicator Card */}
        {paceInfo && (
          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
            style={{
              gridColumn: 'span 2',
              background: paceInfo.status === 'danger' ? 'var(--danger-gradient)' : paceInfo.status === 'warning' ? 'var(--warning-gradient)' : 'var(--success-gradient)',
              color: 'white',
              borderRadius: '24px',
              padding: '18px 20px',
              boxShadow: paceInfo.status === 'danger' ? '0 8px 24px var(--danger-glow)' : paceInfo.status === 'warning' ? '0 8px 24px var(--warning-glow)' : '0 8px 24px var(--success-glow)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Abstract Background Decoration */}
            <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.2, transform: 'rotate(-15deg)' }}>
              <Gauge size={100} strokeWidth={1} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Flame size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85, marginBottom: '2px' }}>
                  Laju Pengeluaran: {paceInfo.status === 'on_track' ? 'Aman' : paceInfo.status === 'warning' ? 'Peringatan' : 'Bahaya'}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, lineHeight: 1.2 }}>
                  {paceInfo.status === 'on_track'
                    ? "Pengeluaran Anda terkendali bulan ini."
                    : `Terpakai ${Math.round(paceInfo.actualSpendPercent * 100)}% anggaran dalam ${Math.round(paceInfo.expectedSpendPercent * 100)}% waktu.`}
                </div>
              </div>
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(paceInfo.actualSpendPercent * 100, 100)}%` }}
                  style={{ height: '100%', background: 'white', borderRadius: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px', fontWeight: 700 }}>
                <span style={{ opacity: 0.9 }}>{paceInfo.status === 'danger' ? 'Terlalu Cepat!' : paceInfo.status === 'warning' ? 'Sedikit Cepat' : 'Sesuai Target'}</span>
                <span style={{ opacity: 0.95, background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                  Estimasi: {paceInfo.daysRemaining} hari tersisa
                </span>
              </div>
            </div>
          </motion.div>
        )}
        {/* Bento Card 1: Pemasukan */}
        <motion.div
          data-tour="income-card"
          role="button"
          aria-label="Tambah Pemasukan"
          variants={itemVariants}
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          style={{
            background: 'var(--primary-gradient)',
            color: 'white',
            borderRadius: '20px',
            padding: '14px 16px',
            boxShadow: '0 8px 24px var(--primary-glow)',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '100px'
          }}
          onClick={() => handleAdd('pendapatan')}
        >
          <div className="bento-topo-container">
            <TopoDownArrow />
          </div>
          <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.72)' }}>Pemasukan</span>
          <div style={{ zIndex: 2 }}>
            <span style={{ display: 'block', fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.5px', marginBottom: '6px' }}>{formatCurrency(monthlyIncome, currencySymbol)}</span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              fontSize: '9px',
              fontWeight: 700,
              color: 'white'
            }}>
              + Tambah Pemasukan
            </div>
          </div>
        </motion.div>

        {/* Bento Card 2: Pengeluaran */}
        <motion.div
          data-tour="expense-card"
          role="button"
          aria-label="Catat Pengeluaran"
          variants={itemVariants}
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          style={{
            background: 'var(--secondary-gradient)',
            color: 'white',
            borderRadius: '20px',
            padding: '14px 16px',
            boxShadow: '0 8px 24px var(--secondary-glow)',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '100px'
          }}
          onClick={() => handleAdd('pengeluaran')}
        >
          <div className="bento-topo-container">
            <TopoUpArrow />
          </div>
          <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.72)' }}>Pengeluaran</span>
          <div style={{ zIndex: 2 }}>
            <span style={{ display: 'block', fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.5px', marginBottom: '6px' }}>{formatCurrency(monthlyExpense, currencySymbol)}</span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              fontSize: '9px',
              fontWeight: 700,
              color: 'white'
            }}>
              + Catat Pengeluaran
            </div>
          </div>
        </motion.div>

        {/* Bento Card 3: Quick AI Scanner */}
        <motion.div
          data-tour="ai-scanner"
          variants={itemVariants}
          whileHover={{ scale: 1.01, y: -2 }}
          style={{
            background: 'var(--bg-card)',
            border: '1.5px solid var(--border-color)',
            borderRadius: '20px',
            padding: '12px 14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '100px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
            <SparklingIcon />
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: '1' }}>AI Scanner</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
            <motion.button
              aria-label="Scan Struk OCR"
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/scan')}
              style={{
                flex: 1,
                minWidth: 0,
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 2px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '10px',
                lineHeight: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: '0 4px 12px rgba(168, 85, 247, 0.04)'
              }}
            >
              <Camera size={14} style={{ color: '#a855f7', flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%', textAlign: 'center' }}>Pindai AI</span>
            </motion.button>
            <motion.button
              aria-label="Scan Bulk AI"
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/bulk-input')}
              style={{
                flex: 1,
                minWidth: 0,
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 2px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '10px',
                lineHeight: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.04)'
              }}
            >
              <Sparkles size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%', textAlign: 'center' }}>Input AI</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Bento Card 4: Chatbot Assistant */}
        <motion.div
          role="button"
          aria-label={eomInfo.isNearEOM ? "Evaluasi Tutup Buku Akhir Bulan AI" : "Tanya Bot Asisten"}
          variants={itemVariants}
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsChatOpen(true)}
          style={{
            background: eomInfo.isNearEOM
              ? 'linear-gradient(135deg, hsl(270, 75%, 60%), hsl(250, 80%, 55%))'
              : 'var(--bg-card)',
            border: eomInfo.isNearEOM ? 'none' : '1.5px solid var(--border-color)',
            borderRadius: '20px',
            padding: '12px 14px',
            boxShadow: eomInfo.isNearEOM
              ? '0 8px 24px rgba(168, 85, 247, 0.4)'
              : '0 4px 16px rgba(59, 130, 246, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            overflow: 'hidden',
            minHeight: '100px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '100%' }}>
              <span style={{ position: 'relative', display: 'flex', height: '7px', width: '7px', marginRight: '5px' }}>
                <span style={{
                  animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                  position: 'absolute',
                  display: 'inline-flex',
                  height: '7px',
                  width: '7px',
                  borderRadius: '50%',
                  background: eomInfo.isNearEOM ? 'hsl(45, 100%, 65%)' : 'var(--success)',
                  opacity: 0.75
                }} />
                <span style={{
                  position: 'relative',
                  display: 'inline-flex',
                  borderRadius: '50%',
                  height: '7px',
                  width: '7px',
                  background: eomInfo.isNearEOM ? 'hsl(45, 100%, 50%)' : 'var(--success)'
                }} />
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                color: eomInfo.isNearEOM ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                lineHeight: '1'
              }}>
                {eomInfo.isNearEOM ? 'EOM Alert 💡' : 'MoneyBot'}
              </span>
            </div>
            <div style={{ height: '0px', display: 'flex', alignItems: 'center', overflow: 'visible' }}>
              <MagicRobotSVG size={46} />
            </div>
          </div>
          <div>
            <div style={{
              fontSize: '13px',
              fontWeight: 800,
              color: eomInfo.isNearEOM ? 'white' : 'var(--text-main)',
              marginBottom: '1px'
            }}>
              {eomInfo.isNearEOM ? 'Nasihat Akhir Bulan' : 'Tanya Bot Asisten'}
            </div>
            <div style={{
              fontSize: '10px',
              color: eomInfo.isNearEOM ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
              fontWeight: 600
            }}>
              {eomInfo.isNearEOM ? 'Mulai evaluasi AI ' : 'Catat via chat '}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* GroupBy Selector - Segmented Control (Icon Only) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '4px',
        marginBottom: '24px',
        background: 'var(--bg-card-solid)',
        padding: '4px',
        borderRadius: '18px',
        border: '1.5px solid var(--border-color)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        position: 'relative'
      }}>
        {[
          { id: 'date', icon: Calendar, label: 'Grup by Tanggal' },
          { id: 'category', icon: Tag, label: 'Grup by Kategori' },
          { id: 'asset', icon: CreditCard, label: 'Grup by Aset' },
          { id: 'none', icon: LayoutGrid, label: 'Tanpa Grup' },
        ].map(item => (
          <button
            key={item.id}
            aria-label={item.label}
            onClick={() => setGroupBy(item.id as GroupBy)}
            style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0',
              borderRadius: '14px', border: 'none',
              background: 'transparent',
              color: groupBy === item.id ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'color 0.2s ease',
            }}
          >
            {groupBy === item.id && (
              <motion.div
                layoutId="activeGroupFilter"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'var(--primary-glow)',
                  borderRadius: '14px',
                  zIndex: 1,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center' }}>
              <item.icon size={20} />
            </span>
          </button>
        ))}
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '80px' }}
      >
        {groups.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px', padding: '40px' }}>
            {searchQuery ? (
              <>
                <Search size={40} style={{ opacity: 0.1, marginBottom: '16px' }} />
                <div>Tidak menemukan aktivitas untuk "{searchQuery}"</div>
              </>
            ) : (
              'Tidak ada transaksi di bulan ini.'
            )}
          </div>
        ) : (
          groups.map(group => (
            <motion.div key={group.id} variants={itemVariants} style={{ marginBottom: '8px' }}>
              {groupBy !== 'none' && (
                <div
                  onClick={() => toggleGroup(group.id)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 4px', marginBottom: '8px',
                    position: 'sticky', top: '0', zIndex: 10,
                    background: 'var(--bg-main)',
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ChevronDown
                      size={18}
                      color="var(--text-muted)"
                      style={{
                        transform: (collapsedGroups[group.id] ?? (groupBy === 'date' && group.id !== getLocalDate())) ? 'rotate(-90deg)' : 'none',
                        transition: 'transform 0.2s'
                      }}
                    />
                    {groupBy === 'date' ? (
                      <>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>{group.id.split('-')[2]}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {group.dayName}, {MONTH_NAMES[new Date(group.id).getMonth()]}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                        {group.title}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', fontWeight: 700 }}>
                    {group.income > 0 && <span style={{ color: 'var(--primary)' }}>+{group.income.toLocaleString('id-ID')}</span>}
                    {group.expense > 0 && <span style={{ color: 'var(--danger)' }}>-{group.expense.toLocaleString('id-ID')}</span>}
                  </div>
                </div>
              )}

              {!(collapsedGroups[group.id] ?? (groupBy === 'date' && group.id !== getLocalDate())) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {group.transactions.map(tx => (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                      assetName={getAssetName(tx.assetId)}
                      fromAssetName={getAssetName(tx.fromAssetId)}
                      toAssetName={getAssetName(tx.toAssetId)}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onCopy={handleCopy}
                      showDate={groupBy !== 'date'}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ))
        )}
      </motion.div>

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        viewDate={viewDate}
        onSelectDate={setViewDate}
        onToday={resetToToday}
      />

      {isFabOpen && (
        <div onClick={() => setIsFabOpen(false)} style={{ position: 'fixed', inset: 0, background: 'hsla(var(--n-h), 20%, 10%, 0.4)', backdropFilter: 'blur(2px)', zIndex: 998 }} />
      )}

      {!isModalOpen && (
        <>
          <div className={`fab-menu ${isFabOpen ? 'open' : ''}`}>
            <button
              className="fab-mini"
              onClick={() => navigate('/scan')}
              title="Pindai AI (Struk/Mutasi)"
              style={{ background: 'var(--bg-card)', color: 'hsl(270,70%,60%)', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <Camera size={20} />
            </button>
            <button
              className="fab-mini"
              onClick={() => navigate('/bulk-input')}
              title="Input AI (Teks)"
              style={{ background: 'var(--bg-card)', color: 'var(--primary)', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <Sparkles size={20} />
            </button>
            <button
              className="fab-mini"
              onClick={() => handleAdd('transfer')}
              style={{ background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <RefreshCw size={20} />
            </button>
            <button
              className="fab-mini"
              onClick={() => handleAdd('pendapatan')}
              style={{ background: 'var(--success)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
            >
              <ArrowDownCircle size={20} />
            </button>
            <button
              className="fab-mini"
              onClick={() => handleAdd('pengeluaran')}
              style={{ background: 'var(--danger)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
            >
              <ArrowUpCircle size={20} />
            </button>
            <button
              className="fab-mini"
              onClick={() => {
                setIsFabOpen(false);
                setIsChatOpen(true);
              }}
              title="MoneyBot AI Chat"
              style={{ background: 'var(--primary-gradient)', color: 'white', border: 'none', boxShadow: '0 4px 12px var(--primary-glow)' }}
            >
              <MessageCircle size={20} />
            </button>
          </div>

          <button className="fab" onClick={() => setIsFabOpen(!isFabOpen)} style={{ transform: isFabOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', zIndex: 1000 }}>
            <Plus size={32} strokeWidth={3} />
          </button>
        </>
      )}

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

      <WhatsNewModal
        isOpen={isWhatsNewOpen}
        onClose={closeWhatsNew}
      />

      <OnboardingTutorial 
        pageKey="transactions" 
        steps={[
          { targetSelector: '[data-tour="income-card"]', title: '💰 Catat Pemasukan', description: 'Tap kartu ini untuk menambahkan pemasukan seperti gaji, bonus, atau pendapatan lain.' },
          { targetSelector: '[data-tour="expense-card"]', title: '💸 Catat Pengeluaran', description: 'Tap kartu ini untuk mencatat pengeluaran harian kamu dengan cepat.' },
          { targetSelector: '[data-tour="ai-scanner"]', title: '🤖 Scanner AI Cerdas', description: 'Pindai struk belanja dengan kamera atau ketik banyak transaksi sekaligus dengan bantuan AI.' },
          { targetSelector: '[data-tour="month-nav"]', title: '📅 Navigasi Bulan', description: 'Geser kiri-kanan untuk melihat transaksi bulan lalu atau bulan depan. Tap untuk pilih bulan spesifik.' },
        ]} 
      />
    </div>
  );
};

export default Transactions;
