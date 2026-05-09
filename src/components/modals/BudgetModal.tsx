import React, { useState, useEffect } from 'react';
import { X, Target, Calculator, Folder, ChevronRight } from 'lucide-react';
import { type Category, type Budget } from '../../contexts/MoneyContext';
import { motion, AnimatePresence } from 'framer-motion';
import CalculatorModal from './CalculatorModal';
import CategorySelectModal from './CategorySelectModal';
import { useToast } from '../common/Toast';

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
  const { showToast } = useToast();
  const [categoryId, setCategoryId] = useState<string | 'total'>('total');
  const [limit, setLimit] = useState('');
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

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
      showToast('Limit anggaran harus lebih dari 0.', 'warning');
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
      showToast('Anggaran untuk kategori ini sudah ada di bulan terpilih.', 'warning');
      return;
    }

    if (editingBudget) {
      updateBudget(editingBudget.id, budgetData);
    } else {
      addBudget(budgetData);
    }
    onClose();
  };

  const selectedCategory = categoryId === 'total' ? null : categories.find(c => c.id === categoryId);

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
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setCategoryId('total')}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '12px',
                      background: categoryId === 'total' ? 'var(--bg-income)' : 'var(--bg-main)',
                      border: `1.5px solid ${categoryId === 'total' ? 'var(--primary)' : 'var(--border-color)'}`,
                      color: categoryId === 'total' ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: categoryId === 'total' ? 700 : 500, fontSize: '14px', textAlign: 'left',
                      cursor: editingBudget ? 'not-allowed' : 'pointer'
                    }}
                    disabled={!!editingBudget}
                  >
                    -- Total Anggaran (Global) --
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCatModalOpen(true)}
                    disabled={!!editingBudget}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', background: categoryId !== 'total' ? 'var(--bg-income)' : 'var(--bg-main)',
                      border: `1.5px solid ${categoryId !== 'total' ? 'var(--primary)' : 'var(--border-color)'}`,
                      borderRadius: '12px', cursor: editingBudget ? 'not-allowed' : 'pointer', textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Folder size={18} color={categoryId !== 'total' ? 'var(--primary)' : 'var(--text-muted)'} />
                      <span style={{ 
                        fontWeight: categoryId !== 'total' ? 700 : 500, 
                        color: categoryId !== 'total' ? 'var(--text-main)' : 'var(--text-muted)' 
                      }}>
                        {categoryId !== 'total' && selectedCategory ? selectedCategory.name : 'Pilih Kategori Spesifik...'}
                      </span>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </button>
                </div>

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

                <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '56px', borderRadius: '16px', fontWeight: 800 }}>
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

      <CategorySelectModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        categories={categories}
        type="pengeluaran"
        initialCategory={selectedCategory?.name}
        onSelect={(catName) => {
          const cat = categories.find(c => c.name === catName);
          if (cat) setCategoryId(cat.id);
        }}
      />
    </>
  );
};

export default BudgetModal;
