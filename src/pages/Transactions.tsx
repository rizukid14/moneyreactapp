import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMoney } from '../contexts/MoneyContext';
import type { Transaction } from '../contexts/MoneyContext';
import { formatCurrency, getLocalDate } from '../lib/utils';
import TransactionItem from '../components/transactions/TransactionItem';
import TransactionModal from '../components/modals/TransactionModal';
import DatePickerModal from '../components/modals/DatePickerModal';
import WhatsNewModal from '../components/modals/WhatsNewModal';
import OnboardingTutorial from '../components/OnboardingTutorial';
import MaterialIcon from '../components/common/MaterialIcon';

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

type GroupBy = 'date' | 'category' | 'asset' | 'none';

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
  const { transactions, assets, budgets, addTransaction, addRecurringTransaction, deleteTransaction, updateTransaction, currencySymbol, startOfMonthDay, showDebtInTransactions, defaultTransactionGrouping, getAssetBalance } = useMoney();
  
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

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const isCurrentlyCollapsed = prev[groupId] ?? (groupBy === 'date' && groupId !== getLocalDate());
      return { ...prev, [groupId]: !isCurrentlyCollapsed };
    });
  }, [groupBy]);

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

  const getAssetName = useCallback((id?: string) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return 'Unknown';
    return asset.isDeleted ? `${asset.name} (Dihapus)` : asset.name;
  }, [assets]);

  const handleDelete = useCallback((id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    deleteTransaction(id);
    // Add logic here to optionally undo, or let showToast handle it if added back
  }, [transactions, deleteTransaction]);

  const handleCopy = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setIsCopyMode(true);
    setInitialType(tx.type);
    setIsModalOpen(true);
  }, []);

  const { groups, monthlyIncome, monthlyExpense } = useMemo(() => {
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
        const matches = (
          (tx.note && tx.note.toLowerCase().includes(q)) ||
          tx.category.toLowerCase().includes(q) ||
          (tx.subCategory && tx.subCategory.toLowerCase().includes(q)) ||
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
        
        // Match Stitch format: "Hari Ini - 20 Mei 2026"
        const todayStr = getLocalDate();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        
        let prefix = dayName;
        if (key === todayStr) prefix = 'Hari Ini';
        else if (key === yesterdayStr) prefix = 'Kemarin';

        title = `${prefix} - ${dateStr}`;
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
    return assets.reduce((sum, asset) => sum + getAssetBalance(asset.id), 0);
  }, [assets]);

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
    startOfWeek.setHours(0,0,0,0);
    
    return transactions
      .filter(tx => tx.type === 'pengeluaran')
      .filter(tx => new Date(tx.date) >= startOfWeek)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  const aiInsight = useMemo(() => {
    if (weeklyExpense > 0) {
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(new Date().setDate(diff));
      startOfWeek.setHours(0,0,0,0);
      
      const weeklyTxs = transactions.filter(tx => tx.type === 'pengeluaran' && new Date(tx.date) >= startOfWeek);
      const catSums: Record<string, number> = {};
      weeklyTxs.forEach(tx => {
        catSums[tx.category] = (catSums[tx.category] || 0) + tx.amount;
      });
      let topCat = '';
      let topAmt = 0;
      Object.entries(catSums).forEach(([cat, amt]) => {
        if (amt > topAmt) { topAmt = amt; topCat = cat; }
      });
      
      if (topCat) {
        return `Pengeluaran terbesar Anda minggu ini adalah di kategori ${topCat} sebesar ${formatCurrency(topAmt, currencySymbol)}. Tetap kontrol budget Anda!`;
      }
    }
    return "AI sedang menganalisis pola keuangan Anda. Terus catat transaksi untuk mendapatkan insight yang akurat.";
  }, [transactions, weeklyExpense, currencySymbol]);

  const handleEdit = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setIsCopyMode(false);
    setInitialType(tx.type);
    setIsModalOpen(true);
  }, []);

  const handleAdd = (type: Transaction['type'] = 'pengeluaran', partialData?: Partial<Transaction>) => {
    setEditingTransaction(partialData ? { ...partialData, id: '', type, amount: 0, date: getLocalDate(), note: partialData.note || '', category: partialData.category || '' } as any : null);
    setIsCopyMode(false);
    setInitialType(type);
    setIsModalOpen(true);
  };

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  }, []);

  return (
    <div className="px-4 lg:px-6 space-y-6 max-w-container-max mx-auto pb-safe pt-6">
      <div className="max-w-container-max mx-auto px-4 md:px-gutter space-y-8">
        
        {/* Header with Month Selector */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-light pb-4">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Ringkasan Finansial</h2>
            <p className="text-sm text-on-surface-variant mt-1">Pantau arus kas Anda bulan ini</p>
          </div>
          
          <div 
            className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-2 cursor-pointer hover:bg-surface-container transition-colors shadow-sm self-start sm:self-auto" 
            onClick={() => setIsDatePickerOpen(true)}
          >
            <div className="flex items-center gap-2">
              <MaterialIcon name="calendar_month" className="text-primary text-base" />
              <span className="font-label-md text-label-md text-on-surface font-semibold" data-testid="month-label">
                {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <MaterialIcon name="expand_more" className="text-base text-on-surface-variant" />
            </div>
          </div>
        </div>

        {/* Hero Summary Section - Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">
          
          {/* Main Balance Card (Spans 8 cols on desktop) */}
          <div className="col-span-1 md:col-span-8 bg-bg-card p-6 md:p-8 rounded-3xl shadow-bento flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
            
            <div className="flex justify-between items-start relative z-10">
              <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Total Saldo Likuid</span>
              <div className="w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <MaterialIcon name="account_balance_wallet" className="text-primary text-3xl" />
              </div>
            </div>
            <div className="mt-8 relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-on-surface tracking-tight truncate">{formatCurrency(totalLiquidBalance, currencySymbol)}</h2>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 bg-surface-container text-xs font-bold rounded-full text-on-surface-variant">Cash</span>
                <span className="px-3 py-1 bg-surface-container text-xs font-bold rounded-full text-on-surface-variant">Bank</span>
                <span className="px-3 py-1 bg-surface-container text-xs font-bold rounded-full text-on-surface-variant">eWallet</span>
              </div>
            </div>
          </div>

          {/* Savings & Investments (Spans 4 cols on desktop) */}
          <div className="col-span-1 md:col-span-4 bg-bg-card p-6 rounded-3xl shadow-bento flex flex-col justify-between relative overflow-hidden group">
             <div className="absolute bottom-0 right-0 w-32 h-32 bg-secondary opacity-10 rounded-full blur-2xl translate-y-1/4 translate-x-1/4"></div>
             <div className="flex justify-between items-start relative z-10">
              <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Tabungan & Invest</span>
              <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <MaterialIcon name="savings" className="text-secondary text-2xl" />
              </div>
            </div>
            <div className="mt-6 relative z-10">
              <h2 className="text-2xl font-bold text-on-surface truncate">{formatCurrency(savingsAndInvestments, currencySymbol)}</h2>
              <p className="text-xs text-secondary font-bold mt-1">Aset Masa Depan</p>
            </div>
          </div>

          {/* Income Card (4 cols) */}
          <div 
            className="col-span-1 md:col-span-4 bg-bg-card p-6 rounded-3xl shadow-bento flex flex-col justify-between cursor-pointer group hover:-translate-y-1 transition-all"
            onClick={() => handleAdd('pendapatan')}
          >
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Pemasukan Bulan Ini</span>
              <div className="w-12 h-12 rounded-2xl bg-income flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <MaterialIcon name="trending_up" className="text-primary-color text-2xl" />
              </div>
            </div>
            <div className="mt-6">
              <h2 className="text-2xl font-bold text-primary-color truncate">{formatCurrency(monthlyIncome, currencySymbol)}</h2>
            </div>
          </div>

          {/* Expense Card (4 cols) */}
          <div 
            className="col-span-1 md:col-span-4 bg-bg-card p-6 rounded-3xl shadow-bento flex flex-col justify-between cursor-pointer group hover:-translate-y-1 transition-all"
            onClick={() => handleAdd('pengeluaran')}
          >
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Pengeluaran Mingguan</span>
              <div className="w-12 h-12 rounded-2xl bg-expense flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <MaterialIcon name="trending_down" className="text-error text-2xl" />
              </div>
            </div>
            <div className="mt-6">
              <h2 className="text-2xl font-bold text-error truncate">{formatCurrency(weeklyExpense, currencySymbol)}</h2>
            </div>
          </div>

          {/* Top 3 Assets List (4 cols) */}
          <div className="col-span-1 md:col-span-4 bg-bg-card p-6 rounded-3xl shadow-bento flex flex-col space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Top 3 Aset</span>
                <MaterialIcon name="star" className="text-primary text-sm" />
             </div>
             <div className="flex-1 flex flex-col gap-2 justify-center">
                {topAssets.length === 0 ? (
                  <div className="text-xs text-on-surface-variant text-center">Belum ada aset</div>
                ) : (
                  topAssets.map((asset, i) => (
                    <div key={asset.id} className="flex justify-between items-center bg-surface-container-lowest p-2 rounded-xl border border-outline-variant hover:bg-surface-container transition-colors">
                       <div className="flex items-center gap-2 overflow-hidden">
                         <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-xs font-bold text-on-surface-variant shrink-0">{i+1}</div>
                         <span className="text-sm font-bold text-on-surface truncate">{asset.name}</span>
                       </div>
                       <span className="text-sm font-bold text-on-surface ml-2 shrink-0">{formatCurrency(asset.balance, currencySymbol)}</span>
                    </div>
                  ))
                )}
             </div>
          </div>

          {/* AI Insight Card (Spans 12 cols, distinct styling) */}
          <div className="col-span-1 md:col-span-12 bg-surface-container p-6 rounded-3xl border border-outline-variant flex flex-col md:flex-row items-start md:items-center gap-4 relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-32 h-32 bg-primary opacity-10 rounded-full blur-2xl -translate-y-1/2 -translate-x-1/2 group-hover:opacity-20 transition-opacity"></div>
             <div className="w-12 h-12 rounded-full bg-bg-card shadow-sm flex items-center justify-center shrink-0 relative z-10 group-hover:rotate-12 transition-transform">
               <MaterialIcon name="auto_awesome" filled className="text-primary text-xl" />
             </div>
             <div className="relative z-10 flex-1">
               <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">Insight AI <span className="px-2 py-0.5 bg-primary-container text-on-primary-container text-[10px] rounded-full uppercase tracking-wider">Beta</span></h3>
               <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">{aiInsight}</p>
             </div>
          </div>
        </section>

        {/* Presets Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-md text-headline-md text-on-surface">Input Cepat</h3>
            <button className="text-primary font-label-md text-label-md hover:underline bg-transparent border-none">Edit Presets</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
            <button onClick={() => handleAdd('pengeluaran', { category: 'Makanan', note: 'Makan Siang' })} className="flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-outline-variant rounded-full hover:bg-primary-container hover:text-on-primary-container transition-all whitespace-nowrap cursor-pointer">
              <MaterialIcon name="restaurant" className="text-sm" />
              <span className="font-label-md text-label-md">Makan Siang</span>
            </button>
            <button onClick={() => handleAdd('pengeluaran', { category: 'Transportasi', note: 'Isi Bensin' })} className="flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-outline-variant rounded-full hover:bg-primary-container hover:text-on-primary-container transition-all whitespace-nowrap cursor-pointer">
              <MaterialIcon name="local_gas_station" className="text-sm" />
              <span className="font-label-md text-label-md">Isi Bensin</span>
            </button>
            <button onClick={() => handleAdd('pendapatan', { category: 'Gaji', note: 'Gaji Bulanan' })} className="flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-outline-variant rounded-full hover:bg-primary-container hover:text-on-primary-container transition-all whitespace-nowrap cursor-pointer">
              <MaterialIcon name="payments" className="text-sm" />
              <span className="font-label-md text-label-md">Gaji Bulanan</span>
            </button>
            <button onClick={() => handleAdd('pengeluaran', { category: 'Belanja', note: 'Belanja Bulanan' })} className="flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-outline-variant rounded-full hover:bg-primary-container hover:text-on-primary-container transition-all whitespace-nowrap cursor-pointer">
              <MaterialIcon name="shopping_cart" className="text-sm" />
              <span className="font-label-md text-label-md">Belanja Bulanan</span>
            </button>
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
              <div className="p-4 border-b border-border-light flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Search box */}
                  <div className="flex items-center gap-2 bg-surface-container-low rounded-lg px-3 py-2 border border-outline-variant flex-grow max-w-xs">
                    <MaterialIcon name="search" className="text-on-surface-variant text-sm" />
                    <input 
                      className="bg-transparent border-none focus:ring-0 text-sm w-full font-body-md outline-none text-on-surface" 
                      placeholder="Cari transaksi..." 
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      data-testid="search-input"
                    />
                    {searchQuery && (
                      <MaterialIcon name="close" className="text-on-surface-variant text-sm cursor-pointer" onClick={() => setSearchQuery('')} />
                    )}
                  </div>
                  
                  {/* Group By Filter */}
                  <div className="flex bg-surface-container rounded-lg p-0.5 shrink-0">
                    <button
                      onClick={() => setGroupBy('date')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${groupBy === 'date' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      Tanggal
                    </button>
                    <button
                      onClick={() => setGroupBy('category')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${groupBy === 'category' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      Kategori
                    </button>
                  </div>
                </div>

                {/* Type Filters */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                  <button 
                    onClick={() => setTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border-none cursor-pointer ${typeFilter === 'all' ? 'bg-primary text-white font-bold' : 'bg-transparent text-on-surface-variant hover:bg-surface-container'}`}
                  >
                    Semua
                  </button>
                  <button 
                    onClick={() => setTypeFilter('pengeluaran')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border-none cursor-pointer ${typeFilter === 'pengeluaran' ? 'bg-primary text-white font-bold' : 'bg-transparent text-on-surface-variant hover:bg-surface-container'}`}
                  >
                    Pengeluaran
                  </button>
                  <button 
                    onClick={() => setTypeFilter('pendapatan')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border-none cursor-pointer ${typeFilter === 'pendapatan' ? 'bg-primary text-white font-bold' : 'bg-transparent text-on-surface-variant hover:bg-surface-container'}`}
                  >
                    Pendapatan
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-border-light min-h-[300px]">
                {groups.length === 0 ? (
                  <div className="p-12 text-center text-on-surface-variant">
                    <MaterialIcon name="receipt_long" className="text-4xl opacity-50 mb-2" />
                    <p>Tidak ada transaksi.</p>
                  </div>
                ) : (
                  groups.map(group => (
                    <div key={group.id}>
                        {group.title && (
                          <div 
                            className="bg-surface-container-lowest px-4 py-2 text-xs font-bold text-on-surface-variant uppercase tracking-wider sticky top-0 z-10 border-b border-border-light flex justify-between items-center cursor-pointer"
                            onClick={() => toggleGroup(group.id)}
                          >
                            <div className="flex items-center gap-2">
                              <MaterialIcon name={collapsedGroups[group.id] ? "chevron_right" : "expand_more"} className="text-sm" />
                              <span>{group.title}</span>
                            </div>
                            <span className="opacity-70 text-[10px]">{formatCurrency(group.income - group.expense, currencySymbol)}</span>
                          </div>
                        )}
                        {!collapsedGroups[group.id] && (
                          <div>
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
                  ))
                )}
              </div>
              <div className="p-4 text-center border-t border-border-light">
                <button className="text-primary font-label-md text-label-md hover:underline bg-transparent border-none cursor-pointer">Lihat Lebih Banyak</button>
              </div>
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

              {/* Bulk Parse Redirect Area */}
              <div className="space-y-3">
                <label className="font-label-md text-label-md text-on-surface">Input Sekaligus (Bulk Parse)</label>
                <textarea 
                  className="w-full h-24 p-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary text-sm font-body-md resize-none" 
                  placeholder="Ketik transaksi Anda, atau klik tombol di bawah untuk membuka AI Bulk Parser..." 
                  spellCheck="false"
                  readOnly
                  onClick={() => navigate('/bulk-input')}
                ></textarea>
                <button 
                  onClick={() => navigate('/bulk-input')}
                  className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer border-none"
                >
                  <MaterialIcon name="analytics" className="text-sm" />
                  Buka AI Parser Cerdas
                </button>
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
      </div>

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        viewDate={viewDate}
        onSelectDate={(date: Date) => {
          setViewDate(date);
          setIsDatePickerOpen(false);
        }}
      />

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
          { targetSelector: '[data-tour="ai-scanner"]', title: '🤖 Scanner AI Cerdas', description: 'Pindai struk belanja dengan kamera atau ketik banyak transaksi sekaligus dengan bantuan AI.', onBeforeShow: () => handleCloseModal() },
        ]} 
      />
    </div>
  );
};

export default Transactions;
