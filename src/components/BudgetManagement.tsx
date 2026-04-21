import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, MoreVertical, Edit2, Trash2, PlusCircle, Target, TrendingDown, Wallet } from 'lucide-react';
import { useMoney, type Budget } from '../contexts/MoneyContext';
import BudgetModal from './modals/BudgetModal';

const MONTH_NAMES = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];

const fmt = (val: number) => `Rp${val.toLocaleString('id-ID')}`;

const CircleProgress: React.FC<{ percent: number }> = ({ percent }) => {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(percent, 100);
  const offset = circ - (clamped / 100) * circ;
  const color = percent >= 100 ? 'var(--danger)' : percent >= 80 ? '#f59e0b' : 'var(--primary)';
  return (
    <svg width="108" height="108" viewBox="0 0 108 108">
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
}> = ({ label, icon, spent, limit, isOver, onEdit, onDelete, isMenuOpen, onMenuToggle }) => {
  const percent = limit > 0 ? (spent / limit) * 100 : 0;
  const remaining = limit - spent;
  const barColor = percent >= 100 ? 'var(--danger)' : percent >= 80 ? '#f59e0b' : 'var(--primary)';

  return (
    <div className={`budget-card-v2 ${isOver ? 'over' : ''}`} style={{ position: 'relative' }}>
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
          {isMenuOpen && (
            <div className="budget-dropdown" style={{ right: 0, top: 28 }}>
              <button className="budget-dropdown-item" onClick={onEdit}><Edit2 size={13} /> Edit</button>
              <button className="budget-dropdown-item danger" onClick={onDelete}><Trash2 size={13} /> Hapus</button>
            </div>
          )}
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
          {fmt(spent)} <span style={{ opacity: 0.5 }}>/ {fmt(limit)}</span>
        </span>
        <span style={{
          fontWeight: 700,
          color: isOver ? 'var(--danger)' : remaining < limit * 0.2 ? '#f59e0b' : 'var(--success)'
        }}>
          {isOver ? `-${fmt(spent - limit)}` : `Sisa ${fmt(remaining)}`}
        </span>
      </div>
    </div>
  );
};

export const BudgetManagement: React.FC = () => {
  const { budgets, transactions, categories, addBudget, updateBudget, deleteBudget } = useMoney();
  const [viewDate, setViewDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const selectedMonth = viewDate.getMonth();
  const selectedYear = viewDate.getFullYear();

  const changeMonth = (offset: number) =>
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));

  const currentMonthBudgets = useMemo(() =>
    budgets.filter(b => b.month === selectedMonth && b.year === selectedYear),
    [budgets, selectedMonth, selectedYear]);

  const spendingMap = useMemo(() => {
    const map: Record<string, number> = { total: 0 };
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && tx.type === 'pengeluaran') {
        map.total += tx.amount;
        const cat = categories.find(c => c.name === tx.category && c.type === 'pengeluaran');
        if (cat) map[cat.id] = (map[cat.id] || 0) + tx.amount;
      }
    });
    return map;
  }, [transactions, selectedMonth, selectedYear, categories]);

  const openAdd = () => { setEditingBudget(null); setIsModalOpen(true); };
  const handleEdit = (b: Budget) => { setEditingBudget(b); setIsModalOpen(true); setActiveMenu(null); };
  const handleDelete = (id: string) => {
    if (confirm('Hapus anggaran ini?')) { deleteBudget(id); setActiveMenu(null); }
  };

  const globalBudget = currentMonthBudgets.find(b => b.categoryId === null);
  const categoryBudgets = currentMonthBudgets.filter(b => b.categoryId !== null);
  const globalPercent = globalBudget ? (spendingMap.total / globalBudget.limit) * 100 : 0;
  const totalOverBudgets = categoryBudgets.filter(b => (spendingMap[b.categoryId!] || 0) > b.limit).length;

  return (
    <div className="budget-management-embedded" onClick={() => setActiveMenu(null)}>
      {/* Month Switcher */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--bg-main)', borderRadius: 14, padding: '4px 6px', marginBottom: 16,
      }}>
        <button onClick={() => changeMonth(-1)} className="btn-icon"><ChevronLeft size={18} /></button>
        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)' }}>
          {MONTH_NAMES[selectedMonth]} {selectedYear}
        </span>
        <button onClick={() => changeMonth(1)} className="btn-icon"><ChevronRight size={18} /></button>
      </div>

      {/* Hero Card */}
      {globalBudget ? (
        <div className={`budget-hero-card ${globalPercent >= 100 ? 'danger' : globalPercent >= 80 ? 'warning' : ''}`} style={{ marginBottom: 16, position: 'relative', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                Total Anggaran
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>
                {fmt(globalBudget.limit)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Terpakai <strong style={{ color: globalPercent >= 100 ? 'var(--danger)' : 'var(--text-main)' }}>{fmt(spendingMap.total)}</strong>
              </div>
              {globalPercent >= 100 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '6px 10px', background: 'hsla(350,80%,58%,0.12)', borderRadius: 8, width: 'fit-content' }}>
                  <AlertTriangle size={13} color="var(--danger)" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>
                    Melebihi {fmt(spendingMap.total - globalBudget.limit)}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                  Sisa <strong style={{ color: 'var(--success)' }}>{fmt(globalBudget.limit - spendingMap.total)}</strong>
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
            {activeMenu === globalBudget.id && (
              <div className="budget-dropdown" style={{ right: 0, top: 28 }}>
                <button className="budget-dropdown-item" onClick={() => handleEdit(globalBudget)}><Edit2 size={13} /> Edit</button>
                <button className="budget-dropdown-item danger" onClick={() => handleDelete(globalBudget.id)}><Trash2 size={13} /> Hapus</button>
              </div>
            )}
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
        <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Anggaran Kategori</h3>
        <button onClick={openAdd} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <PlusCircle size={14} /> Tambah
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, maxHeight: '300px', overflowY: 'auto', paddingRight: 4 }}>
        {categoryBudgets.map(b => {
          const cat = categories.find(c => c.id === b.categoryId);
          const spent = spendingMap[b.categoryId!] || 0;
          return (
            <div key={b.id} onClick={e => e.stopPropagation()}>
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
              />
            </div>
          );
        })}
        {categoryBudgets.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0' }}>Belum ada anggaran kategori.</div>
        )}
      </div>

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
      />
    </div>
  );
};
