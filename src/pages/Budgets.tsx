import React, { useState, useMemo } from 'react';
import { useMoney } from '../contexts/MoneyContext';
import MaterialIcon from '../components/common/MaterialIcon';
import { formatCurrency } from '../lib/utils';
import TransactionItem from '../components/transactions/TransactionItem';

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
  } = useMoney();

  // Basic View Date State
  const [viewDate, setViewDate] = useState(new Date());
  
  // Selected Budget for History
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  
  const handlePrevMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const monthYearLabel = `${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

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

  // Process Spending per category
  const spendingMap = useMemo(() => {
    const map: Record<string, number> = {};
    const periodStart = new Date(selectedYear, selectedMonth - (startOfMonthDay > 1 ? 1 : 0), startOfMonthDay);
    const periodEnd = new Date(selectedYear, selectedMonth + (startOfMonthDay > 1 ? 0 : 1), startOfMonthDay);

    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d >= periodStart && d < periodEnd && tx.type === 'pengeluaran') {
        const cat = categories.find(c => c.name === tx.categoryId && c.type === 'pengeluaran' && !c.isDeleted) ||
                    categories.find(c => c.name === tx.categoryId && c.type === 'pengeluaran');
        if (cat) {
          map[cat.id] = (map[cat.id] || 0) + tx.amount;
        }
      }
    });
    return map;
  }, [transactions, selectedMonth, selectedYear, categories, startOfMonthDay]);

  const selectedBudgetTransactions = useMemo(() => {
    if (!selectedBudgetId) return [];
    const budget = categoryBudgets.find(b => b.id === selectedBudgetId);
    if (!budget || !budget.categoryId) return [];
    
    const cat = categories.find(c => c.id === budget.categoryId);
    if (!cat) return [];

    const periodStart = new Date(selectedYear, selectedMonth - (startOfMonthDay > 1 ? 1 : 0), startOfMonthDay);
    const periodEnd = new Date(selectedYear, selectedMonth + (startOfMonthDay > 1 ? 0 : 1), startOfMonthDay);

    return transactions.filter(tx => {
      const d = new Date(tx.date);
      return d >= periodStart && d < periodEnd && tx.type === 'pengeluaran' && tx.categoryId === cat.name;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedBudgetId, categoryBudgets, categories, transactions, selectedMonth, selectedYear, startOfMonthDay]);

  const fmt = (val: number) => formatCurrency(val, currencySymbol);

  return (
    <div className="max-w-container-max mx-auto space-y-8 animate-fade-in pb-20 pt-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background font-bold">
            {budgetMode === 'zero-based' ? 'Budgeting Envelopes' : 'Anggaran Bulanan'}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {budgetMode === 'zero-based' ? 'Metode Zero-Based Budgeting untuk kendali penuh keuangan Anda.' : 'Pantau batas pengeluaran bulanan agar keuangan tetap sehat.'}
          </p>
        </div>
        <div className="flex items-center bg-surface-container-high rounded-full px-4 py-2 gap-4">
          <button onClick={handlePrevMonth} className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">chevron_left</button>
          <span className="font-label-md text-label-md font-bold text-on-surface min-w-[100px] text-center">{monthYearLabel}</span>
          <button onClick={handleNextMonth} className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">chevron_right</button>
        </div>
      </div>

      {/* ZBB Hero Banner (Only for Zero-Based Mode) */}
      {budgetMode === 'zero-based' && (
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 relative overflow-hidden bg-white dark:bg-surface-container-low p-6 rounded-xl border border-border-light flex flex-col md:flex-row items-center gap-8 shadow-sm">
          {/* Background Pattern */}
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
              {unassignedMoney === 0 && <MaterialIcon name="check_circle" className="text-emerald-500 font-bold" />}
              {unassignedMoney < 0 && <MaterialIcon name="warning" className="text-error font-bold" />}
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant">Belum Dialokasikan</p>
            {unassignedMoney === 0 && (
              <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
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
        
        <div className="md:col-span-4 bg-primary text-on-primary p-6 rounded-xl shadow-lg flex flex-col justify-between items-center text-center transition-transform hover:scale-[1.02] cursor-pointer" onClick={() => alert('Fitur Realokasi Dana Segera Hadir!')}>
          <MaterialIcon name="swap_horizontal_circle" className="text-4xl mb-2" />
          <h3 className="font-headline-md text-headline-md">Pindahkan Dana</h3>
          <p className="font-body-md text-body-md opacity-90 mb-4">Realokasi dana antar amplop dengan mudah.</p>
          <button className="w-full bg-white text-primary font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-inner">
            Mulai Pindahkan
            <MaterialIcon name="sync_alt" />
          </button>
        </div>
      </section>
      )}

      {/* Amplop Kategori Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md flex items-center gap-2">
            <MaterialIcon name="folder_zip" className="text-primary" />
            {budgetMode === 'zero-based' ? 'Amplop Kategori' : 'Kategori Anggaran'}
          </h2>
          <button className="flex items-center gap-2 text-primary font-bold font-label-md hover:underline" onClick={() => alert('Fitur Tambah Anggaran Segera Hadir!')}>
            <MaterialIcon name="add_circle" />
            {budgetMode === 'zero-based' ? 'Tambah Amplop' : 'Tambah Anggaran'}
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
              const cat = categories.find(c => c.id === budget.categoryId);
              if (!cat) return null;
              
              const spent = spendingMap[cat.id] || 0;
              const remaining = budget.limit - spent;
              const isOverbudget = remaining < 0;
              const percentUsed = Math.min((spent / budget.limit) * 100, 100);
              
              return (
                <div 
                  key={budget.id} 
                  onClick={() => setSelectedBudgetId(prev => prev === budget.id ? null : budget.id)}
                  className={`bg-white dark:bg-surface-container-low p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden cursor-pointer ${
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
                      <button className="p-2 hover:bg-surface-container rounded-lg transition-colors" title="Edit"><MaterialIcon name="edit" className="text-on-surface-variant text-lg" /></button>
                      <button className="p-2 hover:bg-error-container rounded-lg transition-colors" title="Hapus"><MaterialIcon name="delete" className="text-error text-lg" /></button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-headline-md text-on-background font-bold">{cat.name}</h3>
                    {isOverbudget && <MaterialIcon name="warning" className="text-error text-xl animate-pulse" />}
                  </div>
                  
                  <div className="flex justify-between text-sm text-on-surface-variant mb-4">
                    <span>Sisa: <span className={`font-bold ${isOverbudget ? 'text-error' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmt(remaining)}</span></span>
                    <span>Limit: {fmt(budget.limit)}</span>
                  </div>
                  
                  <div className={`w-full h-3 rounded-full overflow-hidden mb-6 ${isOverbudget ? 'bg-error-container' : 'bg-surface-container'}`}>
                    <div className={`h-full rounded-full transition-all duration-500 ${isOverbudget ? 'bg-error' : percentUsed > 80 ? 'bg-warning' : 'bg-emerald-500'}`} style={{ width: `${percentUsed}%` }}></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-on-surface-variant">Terpakai</p>
                      <p className="font-label-md font-bold text-on-surface">{fmt(spent)}</p>
                    </div>
                    <div className="text-right">
                      <button className="bg-primary-container text-on-primary-container p-2 rounded-lg hover:opacity-80 transition-opacity">
                        <MaterialIcon name="folder_zip" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Riwayat Realokasi Section */}
      <section className="space-y-6 hidden">
        {/* Disembunyikan sementara karena belum ada data history nyata di backend */}
        <div className="flex items-center gap-2">
          <MaterialIcon name="history" className="text-primary" />
          <h2 className="font-headline-md text-headline-md font-bold">Riwayat Realokasi Bulan Ini</h2>
        </div>
        <div className="bg-white dark:bg-surface-container-low rounded-xl border border-border-light overflow-hidden shadow-sm">
          <div className="p-8 text-center text-on-surface-variant">
            Fitur riwayat realokasi akan segera hadir.
          </div>
        </div>
      </section>

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
                  onDelete={() => alert('Buka menu Transaksi untuk menghapus')}
                  onEdit={() => alert('Buka menu Transaksi untuk mengedit')}
                  showDate={true}
                />
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default Budgets;
