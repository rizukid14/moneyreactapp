import React, { useState, useMemo, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, CalendarDays, ChevronDown } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import type { Transaction } from '../contexts/MoneyContext';
import TransactionItem from '../components/transactions/TransactionItem';
import TransactionModal from '../components/modals/TransactionModal';
import DatePickerModal from '../components/modals/DatePickerModal';

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const Transactions: React.FC = () => {
  const { transactions, assets, addTransaction, deleteTransaction, updateTransaction } = useMoney();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  // Optimized derived state (rerender-memo)
  const { filteredTransactions, monthlyIncome, monthlyExpense } = useMemo(() => {
    const vM = viewDate.getMonth();
    const vY = viewDate.getFullYear();

    let inc = 0;
    let exp = 0;

    const filtered = transactions.filter(tx => {
      const txD = new Date(tx.date);
      if (txD.getMonth() === vM && txD.getFullYear() === vY) {
        if (tx.type === 'pendapatan') inc += tx.amount;
        if (tx.type === 'pengeluaran') exp += tx.amount;
        return true;
      }
      return false;
    });

    return { filteredTransactions: filtered, monthlyIncome: inc, monthlyExpense: exp };
  }, [transactions, viewDate]);

  // Stable callbacks for extracted components
  const changeMonth = useCallback((offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }, []);

  const resetToToday = useCallback(() => setViewDate(new Date()), []);

  const getAssetName = useCallback((id?: string) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return 'Unknown';
    return asset.isDeleted ? `${asset.name} (Dihapus)` : asset.name;
  }, [assets]);

  const handleEdit = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  }, []);

  const handleAdd = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  }, []);

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="title" style={{ margin: 0 }}>Transaksi</h1>
        <button onClick={resetToToday} style={{
          display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px',
          borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-card)',
          fontSize: '12px', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer'
        }}>
          <CalendarDays size={14} /> Hari Ini
        </button>
      </div>

      {/* Month Switcher Header */}
      <div className="card glass" style={{ padding: '4px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', padding: '12px', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <ChevronLeft size={24} />
          </button>

          <div
            onClick={() => setIsDatePickerOpen(true)}
            style={{ textAlign: 'center', cursor: 'pointer', padding: '8px 16px', borderRadius: '12px' }}>
            <div style={{ fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
              <ChevronDown size={16} color="var(--text-muted)" />
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '12px', fontWeight: 700 }}>
              <span style={{ color: 'var(--primary)' }}>Masuk: Rp{monthlyIncome.toLocaleString('id-ID')}</span>
              <span style={{ color: 'var(--secondary)' }}>Keluar: Rp{monthlyExpense.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', padding: '12px', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {filteredTransactions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>
            Tidak ada transaksi di bulan ini.
          </div>
        ) : (
          filteredTransactions.map(tx => (
            <TransactionItem 
              key={tx.id}
              transaction={tx}
              assetName={getAssetName(tx.assetId)}
              fromAssetName={getAssetName(tx.fromAssetId)}
              toAssetName={getAssetName(tx.toAssetId)}
              onDelete={deleteTransaction}
              onEdit={handleEdit}
            />
          ))
        )}
      </div>

      <DatePickerModal 
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        viewDate={viewDate}
        onSelectDate={setViewDate}
      />

      <button className="fab" onClick={handleAdd}>
        <Plus size={32} strokeWidth={3} />
      </button>

      <TransactionModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        assets={assets}
        addTransaction={addTransaction}
        updateTransaction={updateTransaction}
        editingTransaction={editingTransaction}
      />
    </div>
  );
};

export default Transactions;
