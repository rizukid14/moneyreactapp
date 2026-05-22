import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle, CheckCircle2, Wallet, ArrowRight } from 'lucide-react';
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
  const { budgets, categories, transactions, currencySymbol, moveBudgetMoney, monthlyIncomes, startOfMonthDay } = useMoney();
  const [fromId, setFromId] = useState<string | null | 'unassigned'>('unassigned');

  // Calculate unassigned money
  const currentMonthBudgets = budgets.filter(b => b.month === month && b.year === year);
  const categoryBudgets = currentMonthBudgets.filter(b => {
    if (b.categoryId === null) return false;
    const cat = categories.find(c => c.id === b.categoryId);
    return cat && !cat.isDeleted;
  });
  const totalBudgeted = categoryBudgets.reduce((sum, b) => sum + b.limit, 0);
  const currentMonthIncomeObj = monthlyIncomes.find(m => m.month === month && m.year === year);
  const monthlyIncomeAmount = currentMonthIncomeObj ? currentMonthIncomeObj.amount : 0;
  const unassignedMoney = monthlyIncomeAmount - totalBudgeted;

  // Calculate actual spending per category for the month
  const spendingMap = useMemo(() => {
    const map: Record<string, number> = {};
    
    // Calculate month boundaries using startOfMonthDay
    const sDay = startOfMonthDay || 1;
    let startDate: Date, endDate: Date;
    
    if (sDay === 1) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0); // last day of month
    } else {
      startDate = new Date(year, month - 2, sDay);
      endDate = new Date(year, month - 1, sDay - 1);
    }
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    transactions.forEach(tx => {
      if (tx.type === 'pengeluaran' && tx.date >= startStr && tx.date <= endStr) {
        const catId = categories.find(c => c.name === tx.category)?.id;
        if (catId) {
          map[catId] = (map[catId] || 0) + Number(tx.amount || 0);
        }
      }
    });
    
    return map;
  }, [transactions, categories, month, year, startOfMonthDay]);

  // Filter budgets to only show those with remaining > 0
  const availableBudgets = useMemo(() => {
    return categoryBudgets.filter(b => {
      if (b.categoryId === deficitCategoryId) return false; // exclude target
      const spent = spendingMap[b.categoryId!] || 0;
      const remaining = b.limit - spent;
      return remaining > 0; // Only show budgets with positive remaining
    });
  }, [categoryBudgets, deficitCategoryId, spendingMap]);

  useEffect(() => {
    if (isOpen) {
      if (unassignedMoney >= deficitAmount) {
        setFromId('unassigned');
      } else {
        // Try to find a budget that has enough remaining
        const enoughBudget = availableBudgets.find(b => {
          const spent = spendingMap[b.categoryId!] || 0;
          return (b.limit - spent) >= deficitAmount;
        });
        if (enoughBudget) {
          setFromId(enoughBudget.categoryId);
        } else if (availableBudgets.length > 0) {
          setFromId(availableBudgets[0].categoryId);
        } else {
          setFromId('unassigned');
        }
      }
    }
  }, [isOpen, unassignedMoney, deficitAmount, availableBudgets, spendingMap]);

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

  const isUnassignedSelected = fromId === 'unassigned';
  const unassignedEnough = unassignedMoney >= deficitAmount;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <motion.div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px', background: 'var(--danger-glow, rgba(239,68,68,0.1))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle size={20} color="var(--danger)" />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--danger)', margin: 0 }}>Overbudget!</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>ZBB Ketat aktif</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} style={{ background: 'var(--bg-neutral)', borderRadius: '10px', border: 'none', padding: '8px', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Info */}
        <div style={{
          padding: '14px 16px', borderRadius: '16px', background: 'var(--bg-neutral)',
          marginBottom: '20px', fontSize: '13px', lineHeight: 1.6
        }}>
          Kategori <strong>{targetCategory?.name || 'Kategori'}</strong> akan defisit{' '}
          <strong style={{ color: 'var(--danger)' }}>{fmt(deficitAmount)}</strong>.
          <br />
          Pindahkan dana dari amplop lain untuk melanjutkan.
        </div>

        {/* Source Selection */}
        <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'block' }}>
          Ambil Dari Amplop
        </label>

        <div style={{ display: 'grid', gap: '8px', marginBottom: '20px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
          {/* Unassigned Money Option */}
          <button
            onClick={() => setFromId('unassigned')}
            disabled={!unassignedEnough}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
              borderRadius: '16px', width: '100%', textAlign: 'left', cursor: unassignedEnough ? 'pointer' : 'default',
              background: isUnassignedSelected ? 'var(--primary-glow)' : 'var(--bg-neutral)',
              border: `1.5px solid ${isUnassignedSelected ? 'var(--primary)' : 'var(--border-color)'}`,
              opacity: unassignedEnough ? 1 : 0.4,
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: isUnassignedSelected ? 'var(--bg-card)' : 'var(--bg-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isUnassignedSelected ? '0 4px 12px rgba(0,0,0,0.08)' : 'none'
            }}>
              <Wallet size={18} color={isUnassignedSelected ? 'var(--primary)' : 'var(--text-muted)'} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Sisa Belum Dialokasikan
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Tersedia: {fmt(unassignedMoney)} {!unassignedEnough && '• Tidak cukup'}
              </div>
            </div>
            {isUnassignedSelected && <CheckCircle2 size={18} color="var(--primary)" />}
          </button>

          {/* Category Budget Options — only those with remaining > 0 */}
          {availableBudgets.map(b => {
            const cat = categories.find(c => c.id === b.categoryId);
            const spent = spendingMap[b.categoryId!] || 0;
            const remaining = b.limit - spent;
            const isSelected = fromId === b.categoryId;
            const hasEnough = remaining >= deficitAmount;

            return (
              <button
                key={b.id}
                onClick={() => setFromId(b.categoryId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  borderRadius: '16px', width: '100%', textAlign: 'left', cursor: 'pointer',
                  background: isSelected ? 'var(--primary-glow)' : 'var(--bg-neutral)',
                  border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: isSelected ? 'var(--bg-card)' : 'var(--bg-card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px'
                }}>
                  📂
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cat?.name || 'Kategori'}
                  </div>
                  <div style={{ fontSize: '11px', color: hasEnough ? 'var(--success)' : 'var(--text-muted)' }}>
                    Sisa: {fmt(remaining)} {!hasEnough && '• Sebagian'}
                  </div>
                </div>
                {isSelected && <CheckCircle2 size={18} color="var(--primary)" />}
              </button>
            );
          })}

          {availableBudgets.length === 0 && !unassignedEnough && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Tidak ada amplop dengan sisa dana yang tersedia.
            </div>
          )}
        </div>

        {/* Transfer Summary */}
        {fromId && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px',
            background: 'var(--bg-neutral)', borderRadius: '14px', marginBottom: '16px',
            fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)'
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {fromId === 'unassigned' ? 'Belum Dialokasikan' : categories.find(c => c.id === fromId)?.name || 'Sumber'}
            </span>
            <ArrowRight size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {targetCategory?.name || 'Target'}
            </span>
            <span style={{ fontWeight: 900, color: 'var(--primary)', flexShrink: 0 }}>{fmt(deficitAmount)}</span>
          </div>
        )}

        <button 
          onClick={handleReallocate}
          disabled={!fromId}
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '4px', padding: '14px', borderRadius: '14px', fontWeight: 800 }}
        >
          Realokasi & Lanjutkan
        </button>
      </motion.div>
    </div>
  );
};

export default OverspendReallocationModal;
