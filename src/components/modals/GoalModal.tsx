import React, { useState, useEffect } from 'react';
import { X, Target, Calculator, Wallet, ChevronRight } from 'lucide-react';
import { type Goal, type Asset } from '../../contexts/MoneyContext';
import { motion, AnimatePresence } from 'framer-motion';
import CalculatorModal from './CalculatorModal';
import AssetSelectModal from './AssetSelectModal';
import CurrencyInput from '../common/CurrencyInput';
import { useToast } from '../common/Toast';
import { getLocalDate } from '../../lib/utils';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: Goal[];
  assets: Asset[];
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'isCompleted'>) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  editingGoal: Goal | null;
  currencySymbol: string;
}

const GoalModal: React.FC<GoalModalProps> = ({ 
  isOpen, onClose, assets, addGoal, updateGoal, editingGoal, currencySymbol 
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState(getLocalDate());
  const [assetId, setAssetId] = useState<string | undefined>(undefined);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  useEffect(() => {
    if (editingGoal) {
      setName(editingGoal.name);
      setTargetAmount(editingGoal.targetAmount.toLocaleString('id-ID'));
      setTargetDate(editingGoal.targetDate);
      setAssetId(editingGoal.assetId);
    } else {
      setName('');
      setTargetAmount('');
      setTargetDate(getLocalDate());
      setAssetId(undefined);
    }
  }, [editingGoal, isOpen]);



  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(targetAmount.replace(/\./g, ''));
    
    if (numericAmount <= 0) {
      showToast('Target dana harus lebih dari 0.', 'warning');
      return;
    }

    if (!name.trim()) {
      showToast('Nama tabungan tidak boleh kosong.', 'warning');
      return;
    }

    const goalData = {
      name: name.trim(),
      targetAmount: numericAmount,
      targetDate,
      assetId: assetId || undefined,
    };

    if (editingGoal) {
      updateGoal(editingGoal.id, goalData);
    } else {
      addGoal(goalData);
    }
    onClose();
  };

  const selectedAsset = assets.find(a => a.id === assetId);

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
            style={{ zIndex: 2000 }}
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
                   <h2 className="subtitle" style={{ margin: 0 }}>{editingGoal ? 'Edit Tabungan' : 'Target Tabungan Baru'}</h2>
                </div>
                <button className="close-btn" onClick={onClose}><X size={24} /></button>
              </div>

              <form onSubmit={handleSave}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>
                  Nama Tabungan (Contoh: Beli Laptop)
                </label>
                <input 
                  type="text" 
                  required 
                  placeholder="Apa yang ingin Anda capai?" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                />

                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>
                  Target Dana ({currencySymbol})
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <CurrencyInput 
                    required 
                    placeholder="Contoh: 10.000.000" 
                    value={targetAmount} 
                    onChange={setTargetAmount}
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

                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>
                  Target Tanggal Pencapaian
                </label>
                <input 
                  type="date" 
                  required 
                  value={targetDate} 
                  onChange={e => setTargetDate(e.target.value)}
                />

                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>
                  Hubungkan ke Rekening Khusus (Opsional)
                </label>
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(true)}
                  style={{
                    width: '100%', padding: '14px 16px', background: 'var(--bg-card-solid)',
                    border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '20px', cursor: 'pointer', color: selectedAsset ? 'var(--text-main)' : 'var(--text-muted)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Wallet size={18} color="var(--primary)" />
                    <span style={{ fontSize: '14px', fontWeight: selectedAsset ? 700 : 500 }}>
                      {selectedAsset ? selectedAsset.name : '-- Pilih Rekening --'}
                    </span>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </button>

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                  MoneyApp akan membantu memantau progres tabungan Anda berdasarkan transaksi yang dihubungkan ke target ini.
                </p>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  {editingGoal ? 'Simpan Perubahan' : 'Buat Target Tabungan'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        initialValue={targetAmount}
        onConfirm={(val) => setTargetAmount(val.toLocaleString('id-ID'))}
      />

      <AssetSelectModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        assets={assets.filter(a => !a.isDeleted)}
        selectedAssetId={assetId}
        onSelect={(id) => setAssetId(id)}
      />
    </>
  );
};

export default GoalModal;
