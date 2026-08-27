import React, { useState, useMemo } from 'react';
import { useMoney, type Budget, type SavingsChallenge } from '../contexts/MoneyContext';
import MaterialIcon from '../components/common/MaterialIcon';
import { formatCurrency } from '../lib/utils';
import TransactionItem from '../components/transactions/TransactionItem';
import { useToast } from '../components/common/Toast';
import { PageWrapper } from '../components/ui/PageWrapper';
import { PageHeader } from '../components/ui/PageHeader';
import BudgetModal from '../components/modals/BudgetModal';
import DatePickerModal from '../components/modals/DatePickerModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { MoveMoneyModal } from '../components/BudgetManagement';
import { GoalManagement } from '../components/GoalManagement';
import { EmergencyFundShield } from '../components/EmergencyFundShield';
import { SavingsChallengeCard } from '../components/SavingsChallengeCard';

import { MONTH_NAMES } from '../lib/constants';

const Budgets: React.FC = () => {
  const { 
    budgets, 
    transactions, 
    categories,
    assets,
    currencySymbol, 
    monthlyIncome, 
    startOfMonthDay,
    budgetMode,
    addBudget,
    updateBudget,
    deleteBudget,
    moveBudgetMoney,
    budgetReallocations,
    getAssetBalance,
    user,
    updateUser,
  } = useMoney();

  const { showToast } = useToast();

  // Active Tab State ('budgets' | 'goals' | 'emergency' | 'challenge')
  const [activeMainTab, setActiveMainTab] = useState<'budgets' | 'goals' | 'emergency' | 'challenge'>('budgets');

  // Basic View Date State
  const [viewDate, setViewDate] = useState(new Date());
  
  // Selected Budget for History
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [isMoveMoneyOpen, setIsMoveMoneyOpen] = useState(false);
  const [quickTopUpTarget, setQuickTopUpTarget] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const monthNames = MONTH_NAMES;

  // Helper for challenge updates
  const handleUpdateChallenge = (challenge: SavingsChallenge) => {
    const currentList: SavingsChallenge[] = user?.savingsChallenges || [];
    const idx = currentList.findIndex((c: SavingsChallenge) => c.id === challenge.id);
    let updatedList: SavingsChallenge[];
    if (idx >= 0) {
      updatedList = currentList.map((c: SavingsChallenge) => (c.id === challenge.id ? challenge : c));
    } else {
      updatedList = [...currentList, challenge];
    }
    updateUser({ ...user, savingsChallenges: updatedList });
  };

  // Process Budgets for the selected month
  const selectedMonth = viewDate.getMonth();
  const selectedYear = viewDate.getFullYear();

  const currentMonthBudgets = useMemo(() => {
    return budgets.filter(b => b.month === selectedMonth && b.year === selectedYear);
  }, [budgets, selectedMonth, selectedYear]);

  const categoryBudgets = useMemo(() => {
    return currentMonthBudgets.filter(b => b.categoryId !== null);
  }, [currentMonthBudgets]);

  const totalBudgeted = useMemo(() => {
    return categoryBudgets.reduce((sum, b) => sum + b.limit, 0);
  }, [categoryBudgets]);

  const unassignedMoney = monthlyIncome - totalBudgeted;

  // Maps for fast category lookups
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Process Spending per category
  const spendingMap = useMemo(() => {
    const map: Record<string, number> = {};
    const periodStart = new Date(selectedYear, selectedMonth - (startOfMonthDay > 1 ? 1 : 0), startOfMonthDay);
    const periodEnd = new Date(selectedYear, selectedMonth + (startOfMonthDay > 1 ? 0 : 1), startOfMonthDay);

    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d >= periodStart && d < periodEnd && tx.type === 'pengeluaran') {
        const cat = tx.categoryId ? (categoryMap.get(tx.categoryId) || categories.find(c => c.name.toLowerCase() === tx.categoryId?.toLowerCase())) : undefined;
        if (cat) {
          map[cat.id] = (map[cat.id] || 0) + tx.amount;
        }
      }
    });
    return map;
  }, [transactions, selectedMonth, selectedYear, categoryMap, startOfMonthDay]);

  const selectedBudgetTransactions = useMemo(() => {
    if (!selectedBudgetId) return [];
    const budget = currentMonthBudgets.find(b => b.id === selectedBudgetId);
    if (!budget || !budget.categoryId) return [];
    
    const cat = budget.categoryId ? (categoryMap.get(budget.categoryId) || categories.find(c => c.name.toLowerCase() === budget.categoryId?.toLowerCase())) : undefined;
    if (!cat) return [];

    const periodStart = new Date(selectedYear, selectedMonth - (startOfMonthDay > 1 ? 1 : 0), startOfMonthDay);
    const periodEnd = new Date(selectedYear, selectedMonth + (startOfMonthDay > 1 ? 0 : 1), startOfMonthDay);

    return transactions.filter(tx => {
      const d = new Date(tx.date);
      return d >= periodStart && d < periodEnd && tx.type === 'pengeluaran' && (tx.categoryId === cat.id || tx.categoryId?.toLowerCase() === cat.name.toLowerCase());
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedBudgetId, categoryBudgets, categories, transactions, selectedMonth, selectedYear, startOfMonthDay]);

  const monthReallocations = useMemo(() => {
    if (!budgetReallocations) return [];
    return budgetReallocations
      .filter(r => r.month === selectedMonth && r.year === selectedYear)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [budgetReallocations, selectedMonth, selectedYear]);

  const openAdd = () => { setEditingBudget(null); setIsModalOpen(true); };
  const handleEdit = (b: Budget) => { setEditingBudget(b); setIsModalOpen(true); };
  const handleDelete = (id: string) => { setDeleteConfirm({ open: true, id }); };
  const handleTopUp = (categoryId: string) => {
    setQuickTopUpTarget(categoryId);
    setIsMoveMoneyOpen(true);
  };

  const fmt = (val: number) => formatCurrency(val, currencySymbol);

  return (
    <PageWrapper className="animate-fade-in pb-20">
      {/* Header Section */}
      <PageHeader
        title={
          activeMainTab === 'budgets' 
            ? (budgetMode === 'zero-based' ? 'Budgeting Envelopes' : 'Anggaran Bulanan')
            : activeMainTab === 'goals'
            ? 'Target Tabungan Impian'
            : activeMainTab === 'emergency'
            ? 'Emergency Fund Shield'
            : 'Savings Challenge 🏆'
        }
        subtitle={
          activeMainTab === 'budgets'
            ? (budgetMode === 'zero-based' ? 'Metode Zero-Based Budgeting untuk kendali penuh keuangan Anda.' : 'Pantau batas pengeluaran bulanan agar keuangan tetap sehat.')
            : activeMainTab === 'goals'
            ? 'Rencanakan dan wujudkan target tabungan finansial Anda.'
            : activeMainTab === 'emergency'
            ? 'Pantau ketersediaan dana darurat dan tingkat kecukupan pengeluaran Anda.'
            : 'Tantangan menabung interaktif 52 minggu dan rekor No-Spend Day.'
        }
        action={
          activeMainTab === 'budgets' ? (
            <div 
              className="flex items-center justify-center bg-surface-container-lowest border border-outline-variant rounded-xl px-3 sm:px-4 py-2 cursor-pointer hover:bg-surface-container transition-colors shadow-sm shrink-0" 
              onClick={() => setIsDatePickerOpen(true)}
            >
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <MaterialIcon name="calendar_month" className="text-primary text-sm sm:text-base shrink-0" />
                <span className="text-xs sm:text-sm text-on-surface font-semibold shrink-0" data-testid="month-label">
                  {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                </span>
                <MaterialIcon name="expand_more" className="text-sm sm:text-base text-on-surface-variant shrink-0" />
              </div>
            </div>
          ) : undefined
        }
      />

      {/* Main Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-surface-container-lowest border border-outline-variant rounded-2xl mb-6 text-xs sm:text-sm font-bold shadow-sm overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveMainTab('budgets')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 sm:shrink ${
            activeMainTab === 'budgets'
              ? 'bg-primary text-white shadow-md'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <MaterialIcon name="folder_zip" className="text-base" /> Anggaran
        </button>
        <button
          onClick={() => setActiveMainTab('goals')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 sm:shrink ${
            activeMainTab === 'goals'
              ? 'bg-primary text-white shadow-md'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <MaterialIcon name="flag" className="text-base" /> Target Tabungan
        </button>
        <button
          onClick={() => setActiveMainTab('emergency')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 sm:shrink ${
            activeMainTab === 'emergency'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <MaterialIcon name="shield" className="text-base" /> Dana Darurat
        </button>
        <button
          onClick={() => setActiveMainTab('challenge')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 sm:shrink ${
            activeMainTab === 'challenge'
              ? 'bg-amber-500 text-white shadow-md'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <MaterialIcon name="military_tech" className="text-base" /> Challenge 🏆
        </button>
      </div>

      {/* Tab 1: Anggaran & ZBB */}
      {activeMainTab === 'budgets' && (
        <div className="space-y-6">
          {/* ZBB Hero Banner (Only for Zero-Based Mode) */}
          {budgetMode === 'zero-based' && (
            <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8 relative overflow-hidden bg-bg-card dark:bg-surface-container-low p-6 rounded-xl border border-border-light flex flex-col md:flex-row items-center gap-8 shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                
                <div className="flex-1 space-y-4 relative z-10">
                  <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Pemasukan Bulan Ini</label>
                  <div className="flex items-baseline gap-2">
                    <span className="text-on-surface-variant font-headline-md">{currencySymbol}</span>
                    <input 
                      className="bg-transparent border-none p-0 font-headline-xl text-headline-xl text-on-background focus:ring-0 w-full cursor-default" 
                      readOnly 
                      type="text" 
                      value={monthlyIncome.toLocaleString('id-ID')}
                    />
                    <MaterialIcon name="lock" className="text-primary" />
                  </div>
                </div>
                
                <div className={`flex-1 w-full md:w-auto p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-2 relative z-10 border ${unassignedMoney === 0 ? 'bg-surface-container-low border-primary/10' : unassignedMoney > 0 ? 'bg-surface-container border-warning/30' : 'bg-error-container/30 border-error/30'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-headline-md text-headline-md ${unassignedMoney < 0 ? 'text-error' : 'text-on-background'}`}>{fmt(unassignedMoney)}</span>
                    {unassignedMoney === 0 && <MaterialIcon name="check_circle" className="text-success font-bold" />}
                    {unassignedMoney < 0 && <MaterialIcon name="warning" className="text-error font-bold" />}
                  </div>
                  <p className="font-label-md text-label-md text-on-surface-variant">Belum Dialokasikan</p>
                  {unassignedMoney === 0 && (
                    <div className="bg-success-container text-on-success-container px-3 py-1 rounded-full text-xs font-bold border border-success/20">
                      Misi Selesai: Semua uang telah dialokasikan!
                    </div>
                  )}
                  {unassignedMoney < 0 && (
                    <div className="bg-error-container text-error px-3 py-1 rounded-full text-xs font-bold border border-error-container">
                      Overbudget! Kurangi alokasi amplop Anda.
                    </div>
                  )}
                  {unassignedMoney > 0 && (
                    <div className="bg-warning-container text-on-warning-container px-3 py-1 rounded-full text-xs font-bold">
                      Ada dana nganggur! Segera alokasikan.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="md:col-span-4 bg-primary text-on-primary p-6 rounded-xl shadow-lg flex flex-col justify-between items-center text-center transition-transform hover:scale-[1.02] cursor-pointer" onClick={() => setIsMoveMoneyOpen(true)}>
                <MaterialIcon name="swap_horizontal_circle" className="text-4xl mb-2" />
                <h3 className="font-headline-md text-headline-md">Pindahkan Dana</h3>
                <p className="font-body-md text-body-md opacity-90 mb-4">Realokasi dana antar amplop dengan mudah.</p>
                <button className="w-full bg-bg-card text-primary font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-inner">
                  Mulai Pindahkan
                  <MaterialIcon name="sync_alt" />
                </button>
              </div>
            </section>
          )}

          {/* Amplop Kategori Grid */}
          <section className="space-y-6">
            <div className="flex flex-row items-center justify-between gap-2">
              <h2 className="text-lg md:text-headline-md font-extrabold flex items-center gap-1.5 md:gap-2 text-on-surface">
                <MaterialIcon name="folder_zip" className="text-primary text-xl md:text-2xl" />
                <span className="truncate">{budgetMode === 'zero-based' ? 'Amplop Kategori' : 'Kategori Anggaran'}</span>
              </h2>
              <button className="flex items-center gap-1 md:gap-2 text-primary font-bold text-xs md:text-sm hover:underline shrink-0" onClick={openAdd}>
                <MaterialIcon name="add_circle" className="text-sm md:text-base" />
                <span>{budgetMode === 'zero-based' ? 'Tambah Amplop' : 'Tambah Anggaran'}</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {categoryBudgets.length === 0 ? (
                <div className="col-span-full py-12 text-center text-on-surface-variant bg-surface-container-low rounded-xl border border-dashed border-outline-variant">
                  <MaterialIcon name="inbox" className="text-4xl mb-2 opacity-50" />
                  <p>Belum ada amplop anggaran bulan ini.</p>
                </div>
              ) : (
                categoryBudgets.map(budget => {
                  const cat = categories.find(c => c.id === budget.categoryId || (c.name && c.name.toLowerCase() === (budget.categoryId || '').toLowerCase()));
                  if (!cat) return null;
                  
                  const spent = spendingMap[cat.id] || 0;
                  const remaining = budget.limit - spent;
                  const isOverbudget = remaining < 0;
                  const percentUsed = Math.min((spent / budget.limit) * 100, 100);
                  
                  return (
                    <div 
                      key={budget.id} 
                      onClick={() => setSelectedBudgetId(prev => prev === budget.id ? null : budget.id)}
                      className={`bg-bg-card dark:bg-surface-container-low p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden cursor-pointer ${
                        selectedBudgetId === budget.id 
                          ? 'border-2 border-primary ring-4 ring-primary/10' 
                          : isOverbudget 
                            ? 'border-2 border-error' 
                            : 'border border-border-light'
                      }`}
                    >
                      {isOverbudget && (
                        <div className="absolute top-0 right-0 bg-error text-white text-[10px] px-3 py-1 font-bold rounded-bl-lg">OVERBUDGET</div>
                      )}
                      
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl ${isOverbudget ? 'bg-error-container text-error' : 'bg-primary-container/30 text-primary'}`}>
                          <MaterialIcon name="folder_zip" />
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(budget); }} className="p-2 hover:bg-surface-container rounded-lg transition-colors" title="Edit"><MaterialIcon name="edit" className="text-on-surface-variant text-lg" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(budget.id); }} className="p-2 hover:bg-error-container rounded-lg transition-colors" title="Hapus"><MaterialIcon name="delete" className="text-error text-lg" /></button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-headline-md text-on-background font-bold">{cat.name}</h3>
                        {isOverbudget && <MaterialIcon name="warning" className="text-error text-xl animate-pulse" />}
                      </div>
                      
                      <div className="flex justify-between text-sm text-on-surface-variant mb-4">
                        <span>Sisa: <span className={`font-bold ${isOverbudget ? 'text-error' : 'text-success'}`}>{fmt(remaining)}</span></span>
                        <span>Limit: {fmt(budget.limit)}</span>
                      </div>
                      
                      <div className={`w-full h-3 rounded-full overflow-hidden mb-6 ${isOverbudget ? 'bg-error-container' : 'bg-surface-container'}`}>
                        <div className={`h-full rounded-full transition-all duration-500 ${isOverbudget ? 'bg-error' : percentUsed > 80 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${percentUsed}%` }}></div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-on-surface-variant">Terpakai</p>
                          <p className="font-label-md font-bold text-on-surface">{fmt(spent)}</p>
                        </div>
                        {budgetMode === 'zero-based' && (
                          <div className="text-right">
                            <button onClick={(e) => { e.stopPropagation(); handleTopUp(cat.id); }} className="bg-primary-container text-on-primary-container p-2 rounded-lg hover:opacity-80 transition-opacity" title="Top Up">
                              <MaterialIcon name="add_circle" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Riwayat Realokasi Section */}
          {budgetMode === 'zero-based' && monthReallocations.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <MaterialIcon name="history" className="text-primary" />
                <h2 className="font-headline-md text-headline-md font-bold">Riwayat Realokasi Bulan Ini</h2>
              </div>
              <div className="bg-bg-card dark:bg-surface-container-low rounded-xl border border-border-light overflow-hidden shadow-sm divide-y divide-border-light">
                {monthReallocations.map(r => {
                  const fromName = r.fromCategoryId === 'unassigned' ? 'Belum Dialokasikan' : categories.find(c => c.id === r.fromCategoryId)?.name || 'Kategori';
                  const toName = r.toCategoryId === 'unassigned' ? 'Belum Dialokasikan' : categories.find(c => c.id === r.toCategoryId)?.name || 'Kategori';
                  const time = new Date(r.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                  const date = new Date(r.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                  return (
                    <div key={r.id} className="p-4 flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold text-on-surface flex items-center gap-2">
                          <span>{fromName}</span>
                          <MaterialIcon name="swap_horiz" className="text-[10px] text-on-surface-variant" />
                          <span>{toName}</span>
                        </div>
                        <div className="text-[10px] text-on-surface-variant mt-1">
                          {date} &bull; {time}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-primary">
                        {fmt(r.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Transaction History for Selected Budget */}
          {selectedBudgetId && (
            <section className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-md text-headline-md flex items-center gap-2 text-on-surface">
                  <MaterialIcon name="receipt_long" className="text-primary" />
                  Riwayat Penggunaan Amplop
                </h2>
                <button onClick={() => setSelectedBudgetId(null)} className="text-on-surface-variant hover:text-error transition-colors p-1">
                  <MaterialIcon name="close" />
                </button>
              </div>
              
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-2 flex flex-col gap-2">
                {selectedBudgetTransactions.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-variant text-sm font-medium">
                    Belum ada transaksi di amplop ini pada bulan ini.
                  </div>
                ) : (
                  selectedBudgetTransactions.map(tx => (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                      assetName={assets.find(a => a.id === tx.assetId)?.name}
                      fromAssetName={assets.find(a => a.id === tx.fromAssetId)?.name}
                      toAssetName={assets.find(a => a.id === tx.toAssetId)?.name}
                      onDelete={() => showToast('Buka menu Transaksi untuk menghapus', 'warning')}
                      onEdit={() => showToast('Buka menu Transaksi untuk mengedit', 'warning')}
                      showDate={true}
                    />
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Tab 2: Target Tabungan */}
      {activeMainTab === 'goals' && (
        <div className="animate-fade-in">
          <GoalManagement hideSubTabs={true} />
        </div>
      )}

      {/* Tab 3: Dana Darurat */}
      {activeMainTab === 'emergency' && (
        <div className="animate-fade-in">
          <EmergencyFundShield
            assets={assets}
            transactions={transactions}
            getAssetBalance={getAssetBalance}
            targetMonths={user?.emergencyFundMonthsTarget || 6}
            onUpdateTargetMonths={months => updateUser({ ...user, emergencyFundMonthsTarget: months })}
          />
        </div>
      )}

      {/* Tab 4: Savings Challenge */}
      {activeMainTab === 'challenge' && (
        <div className="animate-fade-in">
          <SavingsChallengeCard
            challenges={user?.savingsChallenges}
            onUpdateChallenge={handleUpdateChallenge}
            rewardPoints={user?.rewardPoints || 0}
            onRewardPointsChange={pts => updateUser({ ...user, rewardPoints: pts })}
          />
        </div>
      )}

      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        budgets={budgets}
        categories={categories}
        addBudget={addBudget}
        updateBudget={updateBudget}
        editingBudget={editingBudget}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        currencySymbol={currencySymbol}
      />

      <MoveMoneyModal
        isOpen={isMoveMoneyOpen}
        onClose={() => { setIsMoveMoneyOpen(false); setQuickTopUpTarget(null); }}
        budgets={currentMonthBudgets}
        categories={categories}
        unassignedMoney={unassignedMoney}
        spendingMap={spendingMap}
        onMove={(from, to, amt) => moveBudgetMoney(from, to, amt, selectedMonth, selectedYear)}
        currencySymbol={currencySymbol}
        defaultToId={quickTopUpTarget}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: '' })}
        onConfirm={() => deleteBudget(deleteConfirm.id)}
        title="Hapus Anggaran"
        message="Yakin ingin menghapus anggaran ini?"
        type="danger"
        confirmText="Ya, Hapus"
      />

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        viewDate={viewDate}
        onSelectDate={(date: Date) => {
          setViewDate(date);
          setIsDatePickerOpen(false);
        }}
      />
    </PageWrapper>
  );
};

export default Budgets;

