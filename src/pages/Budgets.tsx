import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, MoreVertical, Edit2, Trash2, PlusCircle, Target, TrendingDown, Wallet } from 'lucide-react';
import { useMoney, type Budget } from '../contexts/MoneyContext';
import BudgetModal from '../components/modals/BudgetModal';

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
      {/* Header row */}
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
          <button onClick={onMenuToggle} className="btn-icon" style={{ padding: 4 }}>
            <MoreVertical size={16} />
          </button>
          {isMenuOpen && (
            <div className="budget-dropdown">
              <button className="budget-dropdown-item" onClick={onEdit}><Edit2 size={13} /> Edit</button>
              <button className="budget-dropdown-item danger" onClick={onDelete}><Trash2 size={13} /> Hapus</button>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 7, background: 'var(--bg-neutral)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{
          height: '100%', borderRadius: 4,
          width: `${Math.min(percent, 100)}%`,
          background: barColor,
          transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)'
        }} />
      </div>

      {/* Meta row */}
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

const Budgets: React.FC = () => {
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
    <div className="page" onClick={() => setActiveMenu(null)}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="title" style={{ margin: 0, fontSize: 24 }}>Anggaran</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>Kontrol pengeluaran bulananmu</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); openAdd(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--primary-gradient)', color: '#fff',
            border: 'none', borderRadius: 14, padding: '10px 16px',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            boxShadow: '0 4px 16px var(--primary-glow)'
          }}
        >
          <PlusCircle size={16} /> Tambah
        </button>
      </div>

      {/* Month Switcher */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--bg-card)', borderRadius: 16, padding: '6px 8px', marginBottom: 24,
        border: '1px solid var(--border-color)'
      }}>
        <button onClick={() => changeMonth(-1)} className="btn-icon"><ChevronLeft size={20} /></button>
        <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-main)' }}>
          {MONTH_NAMES[selectedMonth]} {selectedYear}
        </span>
        <button onClick={() => changeMonth(1)} className="btn-icon"><ChevronRight size={20} /></button>
      </div>

      {/* Global Budget Hero Card */}
      {globalBudget ? (
        <div className={`budget-hero-card ${globalPercent >= 100 ? 'danger' : globalPercent >= 80 ? 'warning' : ''}`} style={{ marginBottom: 24, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Total Anggaran Bulanan
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
                {fmt(globalBudget.limit)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
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
            <div style={{ flexShrink: 0, marginLeft: 12 }}>
              <CircleProgress percent={globalPercent} />
            </div>
          </div>

          {/* Overbudget category alerts */}
          {totalOverBudgets > 0 && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'hsla(350,80%,58%,0.08)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} color="var(--danger)" />
              <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 700 }}>
                {totalOverBudgets} kategori melebihi batas anggaran
              </span>
            </div>
          )}

          {/* 3-dot menu */}
          <div style={{ position: 'absolute', top: 12, right: 12 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveMenu(activeMenu === globalBudget.id ? null : globalBudget.id)} className="btn-icon" style={{ padding: 4 }}>
              <MoreVertical size={18} />
            </button>
            {activeMenu === globalBudget.id && (
              <div className="budget-dropdown" style={{ right: 0, top: 32 }}>
                <button className="budget-dropdown-item" onClick={() => handleEdit(globalBudget)}><Edit2 size={13} /> Edit</button>
                <button className="budget-dropdown-item danger" onClick={() => handleDelete(globalBudget.id)}><Trash2 size={13} /> Hapus</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="budget-empty-hero" style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <Target size={40} strokeWidth={1.5} color="var(--primary)" />
          </div>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Belum ada anggaran total</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 18 }}>Tetapkan batas belanja bulanan agar keuanganmu terkontrol.</p>
          <button
            onClick={openAdd}
            style={{
              background: 'var(--primary-gradient)', color: '#fff', border: 'none',
              borderRadius: 12, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: '0 4px 14px var(--primary-glow)'
            }}
          >
            Set Anggaran Global
          </button>
        </div>
      )}

      {/* Category budgets section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Anggaran Kategori</h2>
        {categoryBudgets.length > 0 && (
          <button onClick={e => { e.stopPropagation(); openAdd(); }} style={{
            display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
            color: 'var(--primary)', fontWeight: 700, fontSize: 13, cursor: 'pointer'
          }}>
            <PlusCircle size={14} /> Tambah
          </button>
        )}
      </div>

      <div className="budget-grid" style={{ marginBottom: 100 }}>
        {categoryBudgets.length === 0 ? (
          <div className="budget-empty-cat" onClick={e => e.stopPropagation()}>
            <TrendingDown size={32} strokeWidth={1.5} color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', marginBottom: 4 }}>
              Belum ada anggaran kategori
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: globalBudget ? 16 : 0 }}>
              Pantau pengeluaran per kategori lebih detail.
            </p>
            {globalBudget && (
              <button onClick={openAdd} style={{
                background: 'var(--bg-neutral)', border: '1.5px dashed var(--border-color)',
                borderRadius: 10, padding: '9px 18px', color: 'var(--primary)',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
              }}>
                <PlusCircle size={14} /> Tambah kategori
              </button>
            )}
          </div>
        ) : (
          categoryBudgets.map(b => {
            const cat = categories.find(c => c.id === b.categoryId);
            const spent = spendingMap[b.categoryId!] || 0;
            return (
              <div key={b.id} onClick={e => e.stopPropagation()}>
                <BudgetCard
                  label={cat?.name || 'Kategori Terhapus'}
                  icon={<Wallet size={16} />}
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
          })
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

export default Budgets;
