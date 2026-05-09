import React, { useState, useMemo } from 'react';
import { Target, MoreVertical, Edit2, Trash2, PlusCircle, Calendar, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { useMoney, type Goal } from '../contexts/MoneyContext';
import { motion, AnimatePresence } from 'framer-motion';
import GoalModal from './modals/GoalModal';
import ConfirmDialog from './common/ConfirmDialog';

const fmt = (val: number, sym: string) => `${sym}${val.toLocaleString('id-ID')}`;

const GoalCard: React.FC<{
  goal: Goal;
  currentAmount: number;
  onEdit: () => void;
  onDelete: () => void;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  currencySymbol: string;
}> = ({ goal, currentAmount, onEdit, onDelete, isMenuOpen, onMenuToggle, currencySymbol }) => {
  const percent = goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0;
  const isCompleted = percent >= 100;
  
  // Calculate pace and ETA
  const createdAt = new Date(goal.createdAt);
  const now = new Date();
  const daysSinceStart = Math.max(1, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
  const pacePerDay = currentAmount / daysSinceStart;
  const remainingAmount = goal.targetAmount - currentAmount;
  
  let etaText = '--';
  let status: 'on_track' | 'behind' | 'completed' = 'on_track';
  
  if (isCompleted) {
    status = 'completed';
    etaText = 'Selesai!';
  } else if (pacePerDay > 0) {
    const daysToFinish = Math.ceil(remainingAmount / pacePerDay);
    const finishDate = new Date(now.getTime() + daysToFinish * (1000 * 60 * 60 * 24));
    const targetDate = new Date(goal.targetDate);
    
    etaText = finishDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    if (finishDate > targetDate) status = 'behind';
  }

  const barColor = isCompleted ? 'var(--success)' : status === 'behind' ? '#f59e0b' : 'var(--primary)';

  return (
    <div className={`budget-card-v2 ${isCompleted ? 'success' : ''}`} style={{ position: 'relative', border: isCompleted ? '1.5px solid var(--success)' : '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: isCompleted ? 'var(--bg-income)' : 'var(--bg-main)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isCompleted ? 'var(--success)' : 'var(--primary)', flexShrink: 0
          }}>
            {isCompleted ? <CheckCircle2 size={18} /> : <Target size={18} />}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)' }}>{goal.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Calendar size={10} /> Target: {new Date(goal.targetDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
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

      <div style={{ height: 8, background: 'var(--bg-neutral)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{
          height: '100%', borderRadius: 4,
          width: `${Math.min(percent, 100)}%`,
          background: barColor,
          transition: 'width 1s cubic-bezier(0.16,1,0.3,1)'
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
          {fmt(currentAmount, currencySymbol)} <span style={{ opacity: 0.5 }}>/ {fmt(goal.targetAmount, currencySymbol)}</span>
        </span>
        <span style={{ fontWeight: 800, color: barColor }}>
          {Math.floor(percent)}%
        </span>
      </div>

      <div style={{ 
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, 
        padding: '8px 10px', background: 'var(--bg-main)', borderRadius: 10,
        border: '1px solid var(--border-color)' 
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Estimasi Selesai</span>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} color={status === 'behind' ? '#f59e0b' : 'var(--primary)'} />
            {etaText}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Status</span>
          <div style={{ 
            fontSize: '11px', fontWeight: 800, 
            color: isCompleted ? 'var(--success)' : status === 'behind' ? '#f59e0b' : 'var(--primary)',
            display: 'flex', alignItems: 'center', gap: 4
          }}>
            {isCompleted ? 'Selesai' : status === 'behind' ? 'Terlambat' : 'On Track'}
          </div>
        </div>
      </div>
    </div>
  );
};

export const GoalManagement: React.FC = () => {
  const { goals, transactions, assets, addGoal, updateGoal, deleteGoal, currencySymbol } = useMoney();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string }>({ open: false, id: '' });

  const goalAllocations = useMemo(() => {
    const map: Record<string, number> = {};
    goals.forEach(g => {
      // Filter transactions linked to this goal
      const linkedTxs = transactions.filter(tx => tx.goalId === g.id);
      let total = linkedTxs.reduce((sum, tx) => {
        if (tx.type === 'pendapatan') return sum + tx.amount;
        if (tx.type === 'transfer') return sum + tx.amount; // Transfer TO goal
        if (tx.type === 'pengeluaran') return sum - tx.amount; // Spending FROM goal
        return sum;
      }, 0);
      
      map[g.id] = Math.max(0, total);
    });
    return map;
  }, [goals, transactions]);

  const openAdd = () => { setEditingGoal(null); setIsModalOpen(true); };
  const handleEdit = (g: Goal) => { setEditingGoal(g); setIsModalOpen(true); setActiveMenu(null); };
  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, id });
    setActiveMenu(null);
  };

  return (
    <div className="budget-management-embedded" onClick={() => setActiveMenu(null)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={18} color="var(--primary)" />
          <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Target Tabungan</h3>
        </div>
        <button onClick={openAdd} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <PlusCircle size={14} /> Buat Baru
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, maxHeight: '420px', overflowY: 'auto', paddingRight: 4, paddingBottom: 20 }}>
        {goals.map(g => (
          <div key={g.id} onClick={e => e.stopPropagation()}>
            <GoalCard
              goal={g}
              currentAmount={goalAllocations[g.id] || 0}
              onEdit={() => handleEdit(g)}
              onDelete={() => handleDelete(g.id)}
              isMenuOpen={activeMenu === g.id}
              onMenuToggle={() => setActiveMenu(activeMenu === g.id ? null : g.id)}
              currencySymbol={currencySymbol}
            />
          </div>
        ))}
        {goals.length === 0 && (
          <div style={{ 
            textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px',
            background: 'var(--bg-main)', borderRadius: 16, border: '1px dashed var(--border-color)' 
          }}>
            <Target size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 13, fontWeight: 700 }}>Belum ada target tabungan</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Mulai buat rencana untuk impian Anda!</div>
          </div>
        )}
      </div>

      <GoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        goals={goals}
        assets={assets}
        addGoal={addGoal}
        updateGoal={updateGoal}
        editingGoal={editingGoal}
        currencySymbol={currencySymbol}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: '' })}
        onConfirm={() => deleteGoal(deleteConfirm.id)}
        title="Hapus Target"
        message="Yakin ingin menghapus target tabungan ini? Riwayat transaksi yang terhubung akan tetap ada namun tidak lagi tertaut."
        type="danger"
        confirmText="Ya, Hapus"
      />
    </div>
  );
};
