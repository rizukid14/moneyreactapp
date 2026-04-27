import React, { useState, useEffect } from 'react';
import { X, Target, Calculator } from 'lucide-react';
import { type Category, type Budget } from '../../contexts/MoneyContext';
import { motion, AnimatePresence } from 'framer-motion';
import CalculatorModal from './CalculatorModal';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgets: Budget[];
  categories: Category[];
  addBudget: (budget: Omit<Budget, 'id'>) => void;
  updateBudget: (id: string, budget: Partial<Budget>) => void;
  editingBudget: Budget | null;
  selectedMonth: number;
  selectedYear: number;
  currencySymbol: string;
}

const BudgetModal: React.FC<BudgetModalProps> = ({ 
  isOpen, onClose, budgets, categories, addBudget, updateBudget, editingBudget, selectedMonth, selectedYear, currencySymbol 
}) => {
  const [categoryId, setCategoryId] = useState<string | 'total'>('total');
  const [limit, setLimit] = useState('');
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  useEffect(() => {
    if (editingBudget) {
      setCategoryId(editingBudget.categoryId || 'total');
      setLimit(editingBudget.limit.toLocaleString('id-ID'));
    } else {
      setCategoryId('total');
      setLimit('');
    }
  }, [editingBudget, isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (!numericValue) { setLimit(''); return; }
    setLimit(Number(numericValue).toLocaleString('id-ID'));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numericLimit = Number(limit.replace(/\./g, ''));
    
    if (numericLimit <= 0) {
      alert('Limit anggaran harus lebih dari 0.');
      return;
    }

    const budgetData = {
      categoryId: categoryId === 'total' ? null : categoryId,
      limit: numericLimit,
      period: 'monthly' as const,
      month: selectedMonth,
      year: selectedYear
    };

    const isDuplicate = budgets.some(b => 
      b.categoryId === budgetData.categoryId && 
      b.month === selectedMonth && 
      b.year === selectedYear &&
      (!editingBudget || b.id !== editingBudget.id)
    );

    if (isDuplicate) {
      alert('Anggaran untuk kategori ini sudah ada di bulan terpilih.');
      return;
    }

    if (editingBudget) {
      updateBudget(editingBudget.id, budgetData);
    } else {
      addBudget(budgetData);
    }
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="modal-overlay" 
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <motion.div 
              className="modal-content" 
              onClick={e => e.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 600, mass: 0.5 }}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <Target size={24} color="var(--primary)" />
                   <h2 className="subtitle" style={{ margin: 0 }}>{editingBudget ? 'Edit Anggaran' : 'Set Anggaran'}</h2>
                </div>
                <button className="close-btn" onClick={onClose}><X size={24} /></button>
              </div>

              <form onSubmit={handleSave}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>
                  Pilih Target Anggaran
                </label>
                <select 
                  required 
                  value={categoryId} 
                  onChange={e => setCategoryId(e.target.value)}
                  disabled={!!editingBudget}
                >
                  <option value="total">-- Total Anggaran (Global) --</option>
                  {categories.filter(c => c.type === 'pengeluaran').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>
                  Batas Maksimal ({currencySymbol})
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input 
                    type="text" 
                    inputMode="numeric" 
                    required 
                    placeholder="Contoh: 1.000.000" 
                    value={limit} 
                    onChange={handleAmountChange}
                    style={{ flex: 1, marginBottom: 0 }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setIsCalcOpen(true)} 
                    style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-income)', border: '1px solid var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <Calculator size={20} />
                  </button>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                  Anggaran ini berlaku untuk bulan <strong>{selectedMonth + 1}/{selectedYear}</strong>. 
                  Anda akan diperingatkan jika pengeluaran mendekati atau melebihi batas ini.
                </p>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  {editingBudget ? 'Simpan Perubahan' : 'Mulai Anggaran'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        initialValue={limit}
        onConfirm={(val) => setLimit(val.toLocaleString('id-ID'))}
      />
    </>
  );
};

export default BudgetModal;
