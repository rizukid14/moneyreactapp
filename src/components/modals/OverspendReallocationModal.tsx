import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { useMoney } from '../../contexts/MoneyContext';

interface OverspendReallocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deficitCategoryId: string | null;
  deficitAmount: number;
  month: number;
  year: number;
}

const OverspendReallocationModal: React.FC<OverspendReallocationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  deficitCategoryId,
  deficitAmount,
  month,
  year
}) => {
  const { budgets, categories, currencySymbol, moveBudgetMoney, monthlyIncomes } = useMoney();
  const [fromId, setFromId] = useState<string | null | 'unassigned'>('unassigned');

  // Calculate unassigned money
  const currentMonthBudgets = budgets.filter(b => b.month === month && b.year === year);
  const categoryBudgets = currentMonthBudgets.filter(b => b.categoryId !== null);
  const totalBudgeted = categoryBudgets.reduce((sum, b) => sum + b.limit, 0);
  const currentMonthIncomeObj = monthlyIncomes.find(m => m.month === month && m.year === year);
  const monthlyIncomeAmount = currentMonthIncomeObj ? currentMonthIncomeObj.amount : 0;
  const unassignedMoney = monthlyIncomeAmount - totalBudgeted;

  useEffect(() => {
    if (isOpen) {
      if (unassignedMoney >= deficitAmount) {
        setFromId('unassigned');
      } else {
        // Try to find a budget that has enough limit
        const availableBudgets = categoryBudgets.filter(b => b.categoryId !== deficitCategoryId && b.limit >= deficitAmount);
        if (availableBudgets.length > 0) {
          setFromId(availableBudgets[0].categoryId);
        } else {
          setFromId('unassigned');
        }
      }
    }
  }, [isOpen, unassignedMoney, deficitAmount, categoryBudgets, deficitCategoryId]);

  const handleReallocate = () => {
    if (!fromId) return;
    moveBudgetMoney(
      fromId === 'unassigned' ? null : fromId,
      deficitCategoryId,
      deficitAmount,
      month,
      year
    );
    onSuccess();
  };

  if (!isOpen || !deficitCategoryId) return null;

  const targetCategory = categories.find(c => c.id === deficitCategoryId);

  const fmt = (val: number) => `${currencySymbol}${val.toLocaleString('id-ID')}`;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <motion.div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      >
        <div className="modal-header">
          <h2 className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)' }}>
            <AlertTriangle size={18} /> Overbudget!
          </h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ padding: '0 0 16px 0', fontSize: 13, color: 'var(--text-main)', lineHeight: 1.5 }}>
          Transaksi ini akan membuat anggaran kategori <strong>{targetCategory?.name || 'Kategori'}</strong> defisit sebesar <strong style={{ color: 'var(--danger)' }}>{fmt(deficitAmount)}</strong>.
          <br /><br />
          ZBB Ketat mensyaratkan Anda memindahkan dana dari amplop lain sebelum melanjutkan transaksi.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>AMBIL DARI AMPLOP</label>
            <select 
              value={fromId || ''} 
              onChange={e => setFromId(e.target.value === 'unassigned' ? 'unassigned' : e.target.value)}
              style={{ width: '100%', padding: 12, borderRadius: 12 }}
            >
              <option value="unassigned" disabled={unassignedMoney < deficitAmount}>
                Sisa Belum Dialokasikan ({fmt(unassignedMoney)}) {unassignedMoney < deficitAmount ? ' - Tidak cukup' : ''}
              </option>
              {currentMonthBudgets.filter(b => b.categoryId !== null && b.categoryId !== deficitCategoryId).map(b => {
                const cat = categories.find(c => c.id === b.categoryId);
                // Note: ideally we should calculate actual remaining, but limit is acceptable for quick reallocation source checking since it's just budget limit movement.
                return (
                  <option key={b.id} value={b.categoryId!}>
                    {cat?.name || 'Kategori'} (Limit: {fmt(b.limit)})
                  </option>
                );
              })}
            </select>
          </div>

          <button 
            onClick={handleReallocate}
            disabled={!fromId}
            className="btn btn-primary"
            style={{ marginTop: 8 }}
          >
            Realokasi & Lanjutkan
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OverspendReallocationModal;
