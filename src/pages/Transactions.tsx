import React, { useState, useMemo, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, CalendarDays, ChevronDown, LayoutGrid, Calendar, Tag, CreditCard, Sparkles, ArrowUpCircle, ArrowDownCircle, RefreshCw, Camera, Search, X, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMoney } from '../contexts/MoneyContext';
import type { Transaction } from '../contexts/MoneyContext';
import { formatCurrency, getLocalDate } from '../lib/utils';
import TransactionItem from '../components/transactions/TransactionItem';
import TransactionModal from '../components/modals/TransactionModal';
import DatePickerModal from '../components/modals/DatePickerModal';
import WhatsNewModal from '../components/modals/WhatsNewModal';

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
  const { transactions, assets, addTransaction, addRecurringTransaction, deleteTransaction, updateTransaction, currencySymbol, startOfMonthDay, defaultTransactionGrouping, setIsChatOpen } = useMoney();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isCopyMode, setIsCopyMode] = useState(false);
  const [initialType, setInitialType] = useState<'pengeluaran' | 'pendapatan' | 'transfer'>('pengeluaran');
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
    const hasSeen = localStorage.getItem('whats_new_seen_v14');
    if (!hasSeen) {
      const timer = setTimeout(() => setIsWhatsNewOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeWhatsNew = () => {
    setIsWhatsNewOpen(false);
    localStorage.setItem('whats_new_seen_v14', 'true');
  };

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const getAssetName = useCallback((id?: string) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return 'Unknown';
    return asset.isDeleted ? `${asset.name} (Dihapus)` : asset.name;
  }, [assets]);

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
  }, [transactions, viewDate, groupBy, searchQuery, getAssetName]);

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

  const handleAdd = (type: 'pengeluaran' | 'pendapatan' | 'transfer' = 'pengeluaran') => {
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

      {/* Search Bar */}
      <div className="card glass shadow-soft" style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 16px', marginBottom: '16px', border: 'none',
        background: 'var(--bg-card-solid)'
      }}>
        <Search size={20} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Cari catatan, kategori, atau jumlah..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            background: 'none', border: 'none', padding: '8px 0',
            fontSize: '14px', flex: 1, color: 'var(--text-main)',
            outline: 'none', marginBottom: 0
          }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Month Switcher */}
      {!searchQuery && (
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
      )}

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
        <div className="card" style={{
          flex: 1, minWidth: 0, marginBottom: 0, background: 'var(--primary-gradient)',
          color: 'white', border: 'none', padding: '16px',
          boxShadow: '0 10px 25px var(--primary-glow)'
        }}>
          <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>Pemasukan</span>
          <span style={{ display: 'block', fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCurrency(monthlyIncome, currencySymbol)}</span>
        </div>
        <div className="card" style={{
          flex: 1, minWidth: 0, marginBottom: 0, background: 'var(--secondary-gradient)',
          color: 'white', border: 'none', padding: '16px',
          boxShadow: '0 10px 25px var(--secondary-glow)'
        }}>
          <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>Pengeluaran</span>
          <span style={{ display: 'block', fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCurrency(monthlyExpense, currencySymbol)}</span>
        </div>
      </div>

      {/* GroupBy Selector - Segmented Control (Icon Only) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '4px',
        marginBottom: '24px',
        background: 'var(--bg-card-solid)',
        padding: '6px',
        borderRadius: '18px',
        border: '1.5px solid var(--border-color)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        {[
          { id: 'date', icon: Calendar },
          { id: 'category', icon: Tag },
          { id: 'asset', icon: CreditCard },
          { id: 'none', icon: LayoutGrid },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setGroupBy(item.id as GroupBy)}
            style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0',
              borderRadius: '14px', border: 'none',
              background: groupBy === item.id ? 'var(--primary-gradient)' : 'transparent',
              color: groupBy === item.id ? 'white' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: groupBy === item.id ? '0 5px 15px var(--primary-glow)' : 'none',
              transform: groupBy === item.id ? 'scale(1.05)' : 'scale(1)'
            }}
          >
            <item.icon size={22} />
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '80px' }}>
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
            <div key={group.id} style={{ marginBottom: '8px' }}>
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
                      onDelete={deleteTransaction}
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

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        viewDate={viewDate}
        onSelectDate={setViewDate}
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
              title="Scan Struk (OCR)"
              style={{ background: 'var(--bg-card)', color: 'hsl(270,70%,60%)', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <Camera size={20} />
            </button>
            <button
              className="fab-mini"
              onClick={() => navigate('/bulk-input')}
              title="Bulk Input (AI)"
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
    </div>
  );
};

export default Transactions;
