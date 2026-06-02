import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, MoreVertical, Edit2, Trash2, PlusCircle, Wallet, ArrowRightLeft, HandCoins, Info, Folder, Check } from 'lucide-react';
import { useMoney, type Budget } from '../contexts/MoneyContext';
import { motion, AnimatePresence } from 'framer-motion';
import BudgetModal from './modals/BudgetModal';
import ConfirmDialog from './common/ConfirmDialog';
import CurrencyInput from './common/CurrencyInput';

const MONTH_NAMES = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];

const fmt = (val: number, sym: string) => `${sym}${val.toLocaleString('id-ID')}`;

const CircleProgress: React.FC<{ percent: number }> = ({ percent }) => {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(percent, 100);
  const offset = circ - (clamped / 100) * circ;
  const color = percent >= 100 ? 'var(--danger)' : percent >= 75 ? '#f59e0b' : 'var(--primary)';
  return (
    <svg data-testid="budget-progress" width="108" height="108" viewBox="0 0 108 108">
      <circle cx="54" cy="54" r={r} fill="none" stroke="var(--border-color)" strokeWidth="10" />
      <circle
        cx="54" cy="54" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 54 54)"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1), stroke 0.4s' }}
      />
      <text x="54" y="50" textAnchor="middle" dominantBaseline="middle" fontSize="15" fontWeight="800" fill="var(--text-main)">
        {Math.round(clamped)}%
      </text>
      <text x="54" y="67" textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="var(--text-muted)" fontWeight="600">
        TERPAKAI
      </text>
    </svg>
  );
};

const EnvelopeCard: React.FC<{
  label: string;
  spent: number;
  limit: number;
  onTopUp: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  currencySymbol: string;
  id: string;
}> = ({ label, spent, limit, onTopUp, onEdit, onDelete, isMenuOpen, onMenuToggle, currencySymbol, id }) => {
  const available = limit - spent;
  const isOver = available < 0;
  
  return (
    <div data-testid={`budget-card-${id}`} className={`budget-card-v2 ${isOver ? 'over' : ''}`} style={{ position: 'relative', padding: '16px 20px', borderLeft: isOver ? '4px solid var(--danger)' : available === 0 ? '4px solid var(--border-color)' : '4px solid var(--primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-main)', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Dianggarkan: {fmt(limit, currencySymbol)} &bull; Terpakai: {fmt(spent, currencySymbol)}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={e => { e.stopPropagation(); onMenuToggle(); }} className="btn-icon" style={{ padding: 4 }}>
            <MoreVertical size={16} />
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                className="budget-dropdown" 
                style={{ right: 0, top: 28 }}
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.1 }}
              >
                <button className="budget-dropdown-item" onClick={onEdit}><Edit2 size={13} /> Edit Limit</button>
                <button className="budget-dropdown-item danger" onClick={onDelete}><Trash2 size={13} /> Hapus</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>
            Tersedia
          </div>
          <div style={{
            fontSize: 20, fontWeight: 800,
            color: isOver ? 'var(--danger)' : available === 0 ? 'var(--text-muted)' : 'var(--success)'
          }}>
            {isOver ? `-${fmt(Math.abs(available), currencySymbol)}` : fmt(available, currencySymbol)}
          </div>
        </div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onTopUp(); }}
          style={{ 
            background: 'var(--bg-main)', border: '1px solid var(--border-color)', 
            color: 'var(--primary)', width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}
        >
          <PlusCircle size={18} />
        </button>
      </div>
    </div>
  );
};

const BudgetCard: React.FC<{
  label: string;
  icon?: React.ReactNode;
  spent: number;
  limit: number;
  isOver: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  currencySymbol: string;
  id: string;
}> = ({ label, icon, spent, limit, isOver, onEdit, onDelete, isMenuOpen, onMenuToggle, currencySymbol, id }) => {
  const percent = limit > 0 ? (spent / limit) * 100 : 0;
  const remaining = limit - spent;
  const barColor = percent >= 100 ? 'var(--danger)' : percent >= 75 ? '#f59e0b' : 'var(--primary)';

  return (
    <div data-testid={`budget-card-${id}`} className={`budget-card-v2 ${isOver ? 'over' : ''}`} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon && (
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: isOver ? 'var(--bg-expense)' : 'var(--bg-income)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isOver ? 'var(--danger)' : 'var(--primary)', flexShrink: 0
            }}>
              {icon}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)' }}>{label}</div>
            {isOver && (
              <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                <AlertTriangle size={10} /> Over budget
              </div>
            )}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={e => { e.stopPropagation(); onMenuToggle(); }} className="btn-icon" style={{ padding: 4 }}>
            <MoreVertical size={16} />
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                className="budget-dropdown" 
                style={{ right: 0, top: 28 }}
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.1 }}
              >
                <button className="budget-dropdown-item" onClick={onEdit}><Edit2 size={13} /> Edit</button>
                <button className="budget-dropdown-item danger" onClick={onDelete}><Trash2 size={13} /> Hapus</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div style={{ height: 7, background: 'var(--bg-neutral)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{
          height: '100%', borderRadius: 4,
          width: `${Math.min(percent, 100)}%`,
          background: barColor,
          transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)'
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
          {fmt(spent, currencySymbol)} <span style={{ opacity: 0.5 }}>/ {fmt(limit, currencySymbol)}</span>
        </span>
        <span style={{
          fontWeight: 700,
          color: isOver ? 'var(--danger)' : remaining < limit * 0.25 ? '#f59e0b' : 'var(--success)'
        }}>
          {isOver ? `-${fmt(spent - limit, currencySymbol)}` : `Sisa ${fmt(remaining, currencySymbol)}`}
        </span>
      </div>
    </div>
  );
};

export const BudgetManagement: React.FC = () => {
  const { budgets, transactions, categories, addBudget, updateBudget, deleteBudget, currencySymbol, startOfMonthDay, budgetMode, monthlyIncomes, setMonthIncome, moveBudgetMoney, budgetReallocations } = useMoney();
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    if (startOfMonthDay > 1 && d.getDate() >= startOfMonthDay) {
      return new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return d;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [quickTopUpTarget, setQuickTopUpTarget] = useState<string | null>(null);

  const selectedMonth = viewDate.getMonth();
  const selectedYear = viewDate.getFullYear();

  const changeMonth = (offset: number) =>
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));

  const currentMonthBudgets = useMemo(() =>
    budgets.filter(b => b.month === selectedMonth && b.year === selectedYear),
    [budgets, selectedMonth, selectedYear]);

  const spendingMap = useMemo(() => {
    const map: Record<string, number> = { total: 0 };
    const periodStart = new Date(selectedYear, selectedMonth - (startOfMonthDay > 1 ? 1 : 0), startOfMonthDay);
    const periodEnd = new Date(selectedYear, selectedMonth + (startOfMonthDay > 1 ? 0 : 1), startOfMonthDay);

    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d >= periodStart && d < periodEnd && tx.type === 'pengeluaran') {
        map.total += tx.amount;
        const cat = categories.find(c => c.name === tx.category && c.type === 'pengeluaran' && !c.isDeleted) ||
                    categories.find(c => c.name === tx.category && c.type === 'pengeluaran');
        if (cat) map[cat.id] = (map[cat.id] || 0) + tx.amount;
      }
    });
    return map;
  }, [transactions, selectedMonth, selectedYear, categories, startOfMonthDay]);

  const openAdd = () => { setEditingBudget(null); setIsModalOpen(true); };
  const handleEdit = (b: Budget) => { setEditingBudget(b); setIsModalOpen(true); setActiveMenu(null); };
  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, id });
    setActiveMenu(null);
  };

  const globalBudget = currentMonthBudgets.find(b => b.categoryId === null);
  const categoryBudgets = currentMonthBudgets.filter(b => {
    if (b.categoryId === null) return false;
    const cat = categories.find(c => c.id === b.categoryId);
    return cat && !cat.isDeleted;
  });
  const globalPercent = globalBudget ? (spendingMap.total / globalBudget.limit) * 100 : 0;

  const copyFromPreviousMonth = () => {
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    
    const prevBudgets = budgets.filter(b => {
      if (b.month !== prevMonth || b.year !== prevYear || b.categoryId === null) return false;
      const cat = categories.find(c => c.id === b.categoryId);
      return cat && !cat.isDeleted;
    });
    
    prevBudgets.forEach(pb => {
      const existing = currentMonthBudgets.find(b => b.categoryId === pb.categoryId);
      if (!existing) {
        addBudget({
          categoryId: pb.categoryId,
          limit: pb.limit,
          period: 'monthly',
          month: selectedMonth,
          year: selectedYear
        });
      }
    });
  };

  const totalBudgeted = useMemo(() => 
    categoryBudgets.reduce((sum, b) => sum + b.limit, 0),
    [categoryBudgets]);
  
  const currentMonthIncomeObj = useMemo(() => 
    monthlyIncomes.find(m => m.month === selectedMonth && m.year === selectedYear),
  [monthlyIncomes, selectedMonth, selectedYear]);
  
  const monthlyIncomeAmount = currentMonthIncomeObj ? currentMonthIncomeObj.amount : 0;
  const isIncomeLocked = currentMonthIncomeObj ? currentMonthIncomeObj.isLocked : false;

  const unassignedMoney = monthlyIncomeAmount - totalBudgeted;
  
  const [isMoveMoneyOpen, setIsMoveMoneyOpen] = useState(false);

  return (
    <div className="budget-management-embedded" onClick={() => setActiveMenu(null)}>
      {/* Month Switcher */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--bg-main)', borderRadius: 14, padding: '4px 6px', marginBottom: 16,
      }}>
        <button data-testid="budget-month-prev" onClick={() => changeMonth(-1)} className="btn-icon"><ChevronLeft size={18} /></button>
        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)' }}>
          {MONTH_NAMES[selectedMonth]} {selectedYear}
        </span>
        <button data-testid="budget-month-next" onClick={() => changeMonth(1)} className="btn-icon"><ChevronRight size={18} /></button>
      </div>

      {/* Hero Card */}
      {budgetMode === 'zero-based' ? (
        <div style={{ marginBottom: 20 }}>
          <div className="card shadow-soft" style={{ 
            background: 'var(--primary-gradient)', color: 'white', 
            borderRadius: 22, padding: '20px', border: 'none',
            boxShadow: '0 12px 30px var(--primary-glow)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.1 }}>
              <HandCoins size={120} strokeWidth={1} />
            </div>
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Target Pendapatan
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input 
                  type="text" 
                  value={monthlyIncomeAmount === 0 ? '' : monthlyIncomeAmount} 
                  onChange={e => setMonthIncome(selectedMonth, selectedYear, Number(e.target.value.replace(/\D/g, '')), isIncomeLocked)}
                  disabled={isIncomeLocked}
                  placeholder="Set pendapatan..."
                  style={{ 
                    fontSize: 24, fontWeight: 800, background: 'rgba(255,255,255,0.15)', 
                    border: '1px solid rgba(255,255,255,0.2)', color: 'white',
                    width: '100%', padding: '8px 12px', borderRadius: 12, marginBottom: 0,
                    opacity: isIncomeLocked ? 0.7 : 1
                  }}
                />
                <button 
                  onClick={() => setMonthIncome(selectedMonth, selectedYear, monthlyIncomeAmount, !isIncomeLocked)}
                  className="btn-icon"
                  style={{ background: isIncomeLocked ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)', color: 'white', padding: 10, borderRadius: 12 }}
                >
                  {isIncomeLocked ? <span style={{fontSize: 12, fontWeight: 700}}>🔒</span> : <span style={{fontSize: 12, fontWeight: 700}}>🔓</span>}
                </button>
              </div>
              
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                    Belum Dialokasikan
                  </div>
                  <div style={{ 
                    fontSize: 18, fontWeight: 800, 
                    color: unassignedMoney === 0 ? '#86efac' : unassignedMoney < 0 ? '#ffcfcf' : '#fcd34d' 
                  }}>
                    {fmt(unassignedMoney, currencySymbol)}
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsMoveMoneyOpen(true)}
                  style={{ 
                    background: 'white', color: 'var(--primary)', border: 'none', 
                    borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 800,
                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                >
                  <ArrowRightLeft size={14} /> Pindahkan
                </button>
              </div>
            </div>
          </div>
          
          {unassignedMoney > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ 
                marginTop: 12, padding: '10px 14px', borderRadius: 12, 
                background: 'var(--primary-glow)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600
              }}
            >
              <Info size={14} />
              <span>Alokasikan sisa <strong>{fmt(unassignedMoney, currencySymbol)}</strong> ke kategori agar menjadi nol.</span>
            </motion.div>
          )}
        </div>
      ) : globalBudget ? (
        <div data-testid="budget-global" className={`budget-hero-card ${globalPercent >= 100 ? 'danger' : globalPercent >= 75 ? 'warning' : ''}`} style={{ marginBottom: 16, position: 'relative', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                Total Anggaran
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>
                {fmt(globalBudget.limit, currencySymbol)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Terpakai <strong style={{ color: globalPercent >= 100 ? 'var(--danger)' : 'var(--text-main)' }}>{fmt(spendingMap.total, currencySymbol)}</strong>
              </div>
              {globalPercent >= 100 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '6px 10px', background: 'hsla(350,80%,58%,0.12)', borderRadius: 8, width: 'fit-content' }}>
                  <AlertTriangle size={13} color="var(--danger)" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>
                    Melebihi {fmt(spendingMap.total - globalBudget.limit, currencySymbol)}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                  Sisa <strong style={{ color: 'var(--success)' }}>{fmt(globalBudget.limit - spendingMap.total, currencySymbol)}</strong>
                </div>
              )}
            </div>
            <div style={{ transform: 'scale(0.8)', marginLeft: -10 }}>
              <CircleProgress percent={globalPercent} />
            </div>
          </div>
          <div style={{ position: 'absolute', top: 10, right: 10 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveMenu(activeMenu === globalBudget.id ? null : globalBudget.id)} className="btn-icon" style={{ padding: 4 }}>
              <MoreVertical size={16} />
            </button>
            <AnimatePresence>
              {activeMenu === globalBudget.id && (
                <motion.div 
                  className="budget-dropdown" 
                  style={{ right: 0, top: 28 }}
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <button className="budget-dropdown-item" onClick={() => handleEdit(globalBudget)}><Edit2 size={13} /> Edit</button>
                  <button className="budget-dropdown-item danger" onClick={() => handleDelete(globalBudget.id)}><Trash2 size={13} /> Hapus</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="budget-empty-hero" style={{ padding: 16, borderRadius: 16, border: '2px dashed var(--border-color)', textAlign: 'center', marginBottom: 16 }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Belum ada anggaran total</p>
          <button onClick={openAdd} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>Set Anggaran Global</button>
        </div>
      )}

      {/* Categories */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
          {budgetMode === 'zero-based' ? 'Amplop Kategori' : 'Anggaran Kategori'}
        </h3>
        <div style={{ display: 'flex', gap: 12 }}>
          {categoryBudgets.length === 0 && (
            <button onClick={copyFromPreviousMonth} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              Salin Bulan Lalu
            </button>
          )}
          <button data-testid="add-budget-btn" onClick={openAdd} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <PlusCircle size={14} /> Tambah
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, maxHeight: '300px', overflowY: 'auto', paddingRight: 4 }}>
        {categoryBudgets.map(b => {
          const cat = categories.find(c => c.id === b.categoryId);
          const spent = spendingMap[b.categoryId!] || 0;
          return (
            <div key={b.id} onClick={e => e.stopPropagation()}>
              {budgetMode === 'zero-based' ? (
                <EnvelopeCard
                  label={cat?.name || 'Kategori Terhapus'}
                  spent={spent}
                  limit={b.limit}
                  onTopUp={() => {
                    setQuickTopUpTarget(b.categoryId!);
                    setIsMoveMoneyOpen(true);
                  }}
                  onEdit={() => handleEdit(b)}
                  onDelete={() => handleDelete(b.id)}
                  isMenuOpen={activeMenu === b.id}
                  onMenuToggle={() => setActiveMenu(activeMenu === b.id ? null : b.id)}
                  currencySymbol={currencySymbol}
                  id={b.id}
                />
              ) : (
                <BudgetCard
                  label={cat?.name || 'Kategori Terhapus'}
                  icon={<Wallet size={14} />}
                  spent={spent}
                  limit={b.limit}
                  isOver={spent > b.limit}
                  onEdit={() => handleEdit(b)}
                  onDelete={() => handleDelete(b.id)}
                  isMenuOpen={activeMenu === b.id}
                  onMenuToggle={() => setActiveMenu(activeMenu === b.id ? null : b.id)}
                  currencySymbol={currencySymbol}
                  id={b.id}
                />
              )}
            </div>
          );
        })}
        {categoryBudgets.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0' }}>Belum ada anggaran kategori.</div>
        )}
      </div>

      {budgetMode === 'zero-based' && budgetReallocations && budgetReallocations.some(r => r.month === selectedMonth && r.year === selectedYear) && (
        <div style={{ marginTop: 24, paddingBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 10px 0', color: 'var(--text-main)' }}>Riwayat Realokasi Bulan Ini</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {budgetReallocations
              .filter(r => r.month === selectedMonth && r.year === selectedYear)
              .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(r => {
                const fromName = r.fromCategoryId === 'unassigned' ? 'Belum Dialokasikan' : categories.find(c => c.id === r.fromCategoryId)?.name || 'Kategori';
                const toName = r.toCategoryId === 'unassigned' ? 'Belum Dialokasikan' : categories.find(c => c.id === r.toCategoryId)?.name || 'Kategori';
                const time = new Date(r.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                const date = new Date(r.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                return (
                  <div key={r.id} style={{ background: 'var(--bg-main)', padding: 12, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{fromName}</span>
                        <ArrowRightLeft size={10} style={{ color: 'var(--text-muted)' }} />
                        <span>{toName}</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        {date} &bull; {time}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>
                      {fmt(r.amount, currencySymbol)}
                    </div>
                  </div>
                );
            })}
          </div>
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
    </div>
  );
};

interface MoveMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgets: Budget[];
  categories: any[];
  unassignedMoney: number;
  spendingMap: Record<string, number>;
  onMove: (from: string | null, to: string | null, amount: number) => void;
  currencySymbol: string;
  defaultToId?: string | null;
}

const MoveMoneyModal: React.FC<MoveMoneyModalProps> = ({ isOpen, onClose, budgets, categories, unassignedMoney, spendingMap, onMove, currencySymbol, defaultToId }) => {
  const [fromId, setFromId] = useState<string | null | 'unassigned'>('unassigned');
  const [toId, setToId] = useState<string | null | 'unassigned'>('');
  const [amount, setAmount] = useState<string>('');
  const [isFromModalOpen, setIsFromModalOpen] = useState(false);
  const [isToModalOpen, setIsToModalOpen] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (defaultToId) {
        setToId(defaultToId);
        // Find if unassigned money is not enough but we have other source
        if (unassignedMoney <= 0) {
          const firstAvailable = budgets.find(b => b.categoryId !== null && (b.limit - (spendingMap[b.categoryId!] || 0)) > 0);
          setFromId(firstAvailable ? firstAvailable.categoryId : 'unassigned');
        } else {
          setFromId('unassigned');
        }
      } else {
        setToId('');
        setFromId(unassignedMoney > 0 ? 'unassigned' : (budgets.find(b => b.categoryId !== null && (b.limit - (spendingMap[b.categoryId!] || 0)) > 0)?.categoryId || 'unassigned'));
      }
      setAmount('');
      setIsFromModalOpen(false);
      setIsToModalOpen(false);
    }
  }, [isOpen, defaultToId, unassignedMoney, budgets, spendingMap]);

  const available = React.useMemo(() => {
    if (fromId === 'unassigned') {
      return Math.max(0, unassignedMoney);
    }
    const b = budgets.find(x => x.categoryId === fromId);
    if (!b) return 0;
    const spent = spendingMap[fromId!] || 0;
    return Math.max(0, b.limit - spent);
  }, [fromId, budgets, spendingMap, unassignedMoney]);

  const amountNum = parseInt(amount.replace(/\D/g, '')) || 0;

  const handleMove = () => {
    if (!amountNum || amountNum <= 0 || amountNum > available || !toId || fromId === toId) return;
    onMove(fromId === 'unassigned' ? 'unassigned' : fromId, toId === 'unassigned' ? 'unassigned' : toId, amountNum);
    setAmount('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      >
        <div className="modal-header">
          <h2 className="subtitle">Pindahkan Dana</h2>
          <button className="close-btn" onClick={onClose}><X /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>DARI</label>
            <button
              type="button"
              onClick={() => setIsFromModalOpen(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)',
                borderRadius: '12px', cursor: 'pointer', textAlign: 'left', color: 'var(--text-main)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Folder size={18} color="var(--primary)" />
                <span style={{ fontWeight: 600 }}>
                  {fromId === 'unassigned' ? `Sisa Belum Dialokasikan (Tersedia: ${fmt(unassignedMoney, currencySymbol)})` : (
                    categories.find(c => c.id === fromId)?.name ? `${categories.find(c => c.id === fromId)?.name} (Tersedia: ${fmt(available, currencySymbol)})` : 'Pilih sumber...'
                  )}
                </span>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <ArrowRightLeft size={20} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>KE</label>
            <button
              type="button"
              onClick={() => setIsToModalOpen(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)',
                borderRadius: '12px', cursor: 'pointer', textAlign: 'left', color: 'var(--text-main)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Folder size={18} color="var(--primary)" />
                <span style={{ fontWeight: 600 }}>
                  {toId === 'unassigned' ? 'Sisa Belum Dialokasikan' : (
                    categories.find(c => c.id === toId)?.name ? categories.find(c => c.id === toId)?.name : 'Pilih target...'
                  )}
                </span>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </button>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>JUMLAH</label>
            <CurrencyInput 
              value={amount} 
              onChange={setAmount}
              placeholder="0"
              style={{ width: '100%', padding: 12, borderRadius: 12 }}
            />
            {amountNum > available && (
              <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 600, marginTop: '6px', display: 'block' }}>
                ⚠️ Dana tidak cukup. Maksimal: {fmt(available, currencySymbol)}
              </span>
            )}
            {available <= 0 && (
              <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 600, marginTop: '6px', display: 'block' }}>
                ⚠️ Sumber dana yang Anda pilih tidak memiliki sisa saldo.
              </span>
            )}
          </div>

          <button 
            onClick={handleMove}
            disabled={!amountNum || amountNum <= 0 || amountNum > available || !toId || fromId === toId}
            className="btn btn-primary"
            style={{ marginTop: 8 }}
          >
            Pindahkan Sekarang
          </button>
        </div>
      </motion.div>

      {/* From Option Selection Modal */}
      <AnimatePresence>
        {isFromModalOpen && (
          <motion.div
            className="modal-overlay"
            onClick={() => setIsFromModalOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ zIndex: 3100 }}
          >
            <motion.div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              style={{ maxHeight: '60vh', overflowY: 'auto', padding: '20px' }}
            >
              <div className="modal-header">
                <h3 className="subtitle" style={{ margin: 0 }}>Pilih Sumber Dana</h3>
                <button className="close-btn" onClick={() => setIsFromModalOpen(false)}><X /></button>
              </div>

              <div style={{ display: 'grid', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  disabled={unassignedMoney <= 0}
                  onClick={() => {
                    setFromId('unassigned');
                    setIsFromModalOpen(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                    borderRadius: '16px', width: '100%', textAlign: 'left', cursor: unassignedMoney > 0 ? 'pointer' : 'not-allowed',
                    background: fromId === 'unassigned' ? 'var(--primary-glow)' : 'var(--bg-main)',
                    border: `1.5px solid ${fromId === 'unassigned' ? 'var(--primary)' : 'var(--border-color)'}`,
                    opacity: unassignedMoney > 0 ? 1 : 0.4,
                    transition: 'all 0.2s',
                    color: 'var(--text-main)'
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'var(--bg-card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Wallet size={18} color={fromId === 'unassigned' ? 'var(--primary)' : 'var(--text-muted)'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>Sisa Belum Dialokasikan</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tersedia: {fmt(unassignedMoney, currencySymbol)}</div>
                  </div>
                  {fromId === 'unassigned' && <Check size={18} color="var(--primary)" />}
                </button>

                {budgets.filter(b => {
                  if (b.categoryId === null) return false;
                  const cat = categories.find(c => c.id === b.categoryId);
                  return cat && !cat.isDeleted;
                }).map(b => {
                  const cat = categories.find(c => c.id === b.categoryId);
                  const spent = spendingMap[b.categoryId!] || 0;
                  const rem = b.limit - spent;
                  const isSelected = fromId === b.categoryId;
                  const hasMoney = rem > 0;

                  return (
                    <button
                      key={b.id}
                      type="button"
                      disabled={!hasMoney}
                      onClick={() => {
                        if (hasMoney) {
                          setFromId(b.categoryId);
                          setIsFromModalOpen(false);
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                        borderRadius: '16px', width: '100%', textAlign: 'left', cursor: hasMoney ? 'pointer' : 'not-allowed',
                        background: isSelected ? 'var(--primary-glow)' : 'var(--bg-main)',
                        border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                        opacity: hasMoney ? 1 : 0.4,
                        transition: 'all 0.2s',
                        color: 'var(--text-main)'
                      }}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'var(--bg-card)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Folder size={18} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{cat?.name || 'Kategori'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Tersedia: {fmt(rem, currencySymbol)} {!hasMoney && '• Anggaran Habis'}
                        </div>
                      </div>
                      {isSelected && <Check size={18} color="var(--primary)" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* To Option Selection Modal */}
      <AnimatePresence>
        {isToModalOpen && (
          <motion.div
            className="modal-overlay"
            onClick={() => setIsToModalOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ zIndex: 3100 }}
          >
            <motion.div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              style={{ maxHeight: '60vh', overflowY: 'auto', padding: '20px' }}
            >
              <div className="modal-header">
                <h3 className="subtitle" style={{ margin: 0 }}>Pilih Target Dana</h3>
                <button className="close-btn" onClick={() => setIsToModalOpen(false)}><X /></button>
              </div>

              <div style={{ display: 'grid', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setToId('unassigned');
                    setIsToModalOpen(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                    borderRadius: '16px', width: '100%', textAlign: 'left', cursor: 'pointer',
                    background: toId === 'unassigned' ? 'var(--primary-glow)' : 'var(--bg-main)',
                    border: `1.5px solid ${toId === 'unassigned' ? 'var(--primary)' : 'var(--border-color)'}`,
                    transition: 'all 0.2s',
                    color: 'var(--text-main)'
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'var(--bg-card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Wallet size={18} color={toId === 'unassigned' ? 'var(--primary)' : 'var(--text-muted)'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>Sisa Belum Dialokasikan</div>
                  </div>
                  {toId === 'unassigned' && <Check size={18} color="var(--primary)" />}
                </button>

                {budgets.filter(b => {
                  if (b.categoryId === null) return false;
                  const cat = categories.find(c => c.id === b.categoryId);
                  return cat && !cat.isDeleted;
                }).map(b => {
                  const cat = categories.find(c => c.id === b.categoryId);
                  const isSelected = toId === b.categoryId;

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setToId(b.categoryId);
                        setIsToModalOpen(false);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                        borderRadius: '16px', width: '100%', textAlign: 'left', cursor: 'pointer',
                        background: isSelected ? 'var(--primary-glow)' : 'var(--bg-main)',
                        border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                        transition: 'all 0.2s',
                        color: 'var(--text-main)'
                      }}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'var(--bg-card)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Folder size={18} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{cat?.name || 'Kategori'}</div>
                      </div>
                      {isSelected && <Check size={18} color="var(--primary)" />}
                    </button>
                  );
                })}

                {categories.filter(c => !c.isDeleted && c.type === 'pengeluaran' && !budgets.some(b => b.categoryId === c.id)).map(c => {
                  const isSelected = toId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setToId(c.id);
                        setIsToModalOpen(false);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                        borderRadius: '16px', width: '100%', textAlign: 'left', cursor: 'pointer',
                        background: isSelected ? 'var(--primary-glow)' : 'var(--bg-main)',
                        border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                        transition: 'all 0.2s',
                        color: 'var(--text-main)'
                      }}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'var(--bg-card)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Folder size={18} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{c.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Buat Amplop Baru</div>
                      </div>
                      {isSelected && <Check size={18} color="var(--primary)" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const X = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
