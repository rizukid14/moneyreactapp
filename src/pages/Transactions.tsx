import React, { useState, useMemo, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, CalendarDays, ChevronDown, LayoutGrid, Calendar, Tag, CreditCard, Sparkles, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { transactions, assets, addTransaction, deleteTransaction, updateTransaction } = useMoney();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [initialType, setInitialType] = useState<'pengeluaran' | 'pendapatan' | 'transfer'>('pengeluaran');
  const [isFabOpen, setIsFabOpen] = useState(false);
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
    setInitialType(tx.type);
    setIsModalOpen(true);
  }, []);

  const handleAdd = (type: 'pengeluaran' | 'pendapatan' | 'transfer' = 'pengeluaran') => {
    setEditingTransaction(null);
    setInitialType(type);
    setIsModalOpen(true);
    setIsFabOpen(false);
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={resetToToday} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            borderRadius: '24px', border: 'none', background: 'var(--primary-glow)',
            fontSize: '13px', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer',
            boxShadow: '0 2px 10px var(--primary-glow)'
          }}>
            <CalendarDays size={16} /> Hari Ini
          </button>
        </div>
      </div>

      {/* Month Switcher */}
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
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
              <ChevronDown size={18} color="var(--primary)" />
            </div>
          </div>

          <button onClick={() => changeMonth(1)} className="btn-icon">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
        <div className="card" style={{ 
          flex: 1, minWidth: 0, marginBottom: 0, background: 'var(--primary-gradient)', 
          color: 'white', border: 'none', padding: '16px',
          boxShadow: '0 10px 25px var(--primary-glow)' 
        }}>
          <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>Pemasukan</span>
          <span style={{ display: 'block', fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCurrency(monthlyIncome)}</span>
        </div>
        <div className="card" style={{ 
          flex: 1, minWidth: 0, marginBottom: 0, background: 'var(--secondary-gradient)', 
          color: 'white', border: 'none', padding: '16px',
          boxShadow: '0 10px 25px var(--secondary-glow)'
        }}>
          <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>Pengeluaran</span>
          <span style={{ display: 'block', fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCurrency(monthlyExpense)}</span>
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

      {isFabOpen && (
         <div onClick={() => setIsFabOpen(false)} style={{position: 'fixed', inset: 0, background: 'hsla(var(--n-h), 20%, 10%, 0.4)', backdropFilter: 'blur(2px)', zIndex: 998}} />
      )}

      <div className={`fab-menu ${isFabOpen ? 'open' : ''}`}>
        <button 
          className="fab-mini" 
          onClick={() => navigate('/bulk-input')}
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
      </div>

      <button className="fab" onClick={() => setIsFabOpen(!isFabOpen)} style={{ transform: isFabOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', zIndex: 1000 }}>
        <Plus size={32} strokeWidth={3} />
      </button>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        assets={assets}
        addTransaction={addTransaction}
        updateTransaction={updateTransaction}
        editingTransaction={editingTransaction}
        initialType={initialType}
      />
    </div>
  );
};

export default Transactions;
