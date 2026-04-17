import React, { useState, useMemo, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, CalendarDays, ChevronDown, LayoutGrid, Calendar, Tag, CreditCard } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import type { Transaction } from '../contexts/MoneyContext';
import TransactionItem from '../components/transactions/TransactionItem';
import TransactionModal from '../components/modals/TransactionModal';
import DatePickerModal from '../components/modals/DatePickerModal';

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
  const { transactions, assets, addTransaction, deleteTransaction, updateTransaction } = useMoney();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [groupBy, setGroupBy] = useState<GroupBy>('date');

  const getAssetName = useCallback((id?: string) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return 'Unknown';
    return asset.isDeleted ? `${asset.name} (Dihapus)` : asset.name;
  }, [assets]);

  // Grouped and filtered data
  const { groups, monthlyIncome, monthlyExpense } = useMemo(() => {
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
    }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

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
  }, [transactions, viewDate, groupBy, getAssetName]);

  const changeMonth = useCallback((offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }, []);

  const resetToToday = useCallback(() => setViewDate(new Date()), []);

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

  const formatCurrency = (val: number) => `Rp${val.toLocaleString('id-ID')}`;

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

      {/* Month Switcher */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <ChevronLeft size={20} />
          </button>
          <div
            onClick={() => setIsDatePickerOpen(true)}
            style={{ 
              textAlign: 'center', cursor: 'pointer', padding: '6px 20px', 
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
              background: 'var(--bg-card)'
            }}>
            <div style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: 'var(--text-main)' }}>
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
              <ChevronDown size={16} color="var(--text-muted)" />
            </div>
          </div>
          <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="card" style={{ flex: 1, marginBottom: 0 }}>
             <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Pemasukan</span>
             <span style={{ display: 'block', fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(monthlyIncome)}</span>
          </div>
          <div className="card" style={{ flex: 1, marginBottom: 0 }}>
             <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Pengeluaran</span>
             <span style={{ display: 'block', fontSize: '18px', fontWeight: 800, color: 'var(--danger)' }}>{formatCurrency(monthlyExpense)}</span>
          </div>
        </div>
      </div>

      {/* GroupBy Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'date', label: 'Tanggal', icon: Calendar },
          { id: 'category', label: 'Kategori', icon: Tag },
          { id: 'asset', label: 'Aset', icon: CreditCard },
          { id: 'none', label: 'List', icon: LayoutGrid },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setGroupBy(item.id as GroupBy)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
              borderRadius: '14px', border: 'none', 
              background: groupBy === item.id ? 'var(--primary-glow)' : 'transparent',
              color: groupBy === item.id ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '80px' }}>
        {groups.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>
            Tidak ada transaksi di bulan ini.
          </div>
        ) : (
          groups.map(group => (
            <div key={group.id} style={{ marginBottom: '8px' }}>
              {groupBy !== 'none' && (
                <div style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '8px 4px', marginBottom: '8px',
                  position: 'sticky', top: '0', zIndex: 10,
                  background: 'var(--bg-main)',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {group.transactions.map(tx => (
                  <TransactionItem 
                    key={tx.id}
                    transaction={tx}
                    assetName={getAssetName(tx.assetId)}
                    fromAssetName={getAssetName(tx.fromAssetId)}
                    toAssetName={getAssetName(tx.toAssetId)}
                    onDelete={deleteTransaction}
                    onEdit={handleEdit}
                    showDate={groupBy !== 'date'}
                  />
                ))}
              </div>
            </div>
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
