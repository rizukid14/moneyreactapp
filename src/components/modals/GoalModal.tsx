import React, { useState, useEffect } from 'react';
import { X, Target, Calculator, Wallet, ChevronRight } from 'lucide-react';
import { type Goal, type Asset, useMoney } from '../../contexts/MoneyContext';
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
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'isCompleted'>) => Goal;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  editingGoal: Goal | null;
  currencySymbol: string;
}

const GoalModal: React.FC<GoalModalProps> = ({ 
  isOpen, onClose, assets, addGoal, updateGoal, editingGoal, currencySymbol 
}) => {
  const { showToast } = useToast();
  const { addRecurringTransaction } = useMoney();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState(getLocalDate());
  const [assetId, setAssetId] = useState<string | undefined>(undefined);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  // Auto Tabungan State
  const [isAutoTabungan, setIsAutoTabungan] = useState(false);
  const [autoAmount, setAutoAmount] = useState('');
  const [autoFrequency, setAutoFrequency] = useState<'daily'|'weekly'|'monthly'|'yearly'>('monthly');
  const [autoStartDate, setAutoStartDate] = useState(getLocalDate());
  const [autoFromAssetId, setAutoFromAssetId] = useState<string | undefined>(undefined);
  const [isAutoFromAssetModalOpen, setIsAutoFromAssetModalOpen] = useState(false);

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
      setIsAutoTabungan(false);
      setAutoAmount('');
      setAutoFrequency('monthly');
      setAutoStartDate(getLocalDate());
      setAutoFromAssetId(undefined);
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
      const newGoal = addGoal(goalData);
      
      if (isAutoTabungan) {
        const numericAutoAmount = Number(autoAmount.replace(/\./g, ''));
        if (numericAutoAmount > 0 && autoFromAssetId && assetId) {
          const rt = addRecurringTransaction({
            type: 'transfer',
            amount: numericAutoAmount,
            category: 'Transfer',
            note: `Tabungan: ${name.trim()}`,
            frequency: autoFrequency,
            startDate: autoStartDate,
            isActive: true,
            fromAssetId: autoFromAssetId,
            toAssetId: assetId,
            goalId: newGoal.id
          });
          updateGoal(newGoal.id, { recurringTransactionId: rt.id });
        } else {
          showToast('Data tabungan otomatis tidak lengkap. Pastikan nominal, sumber dana, dan rekening target sudah diisi.', 'warning');
        }
      }
    }
    onClose();
  };

  const selectedAsset = assets.find(a => a.id === assetId);
  const selectedAutoFromAsset = assets.find(a => a.id === autoFromAssetId);

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

                {!editingGoal && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '12px', background: 'var(--bg-card-solid)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>Tabung Otomatis</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Otomatis memotong saldo secara rutin</span>
                      </div>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={isAutoTabungan} onChange={e => setIsAutoTabungan(e.target.checked)} />
                        <span className="slider round"></span>
                      </label>
                    </div>

                    {isAutoTabungan && (
                      <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                        
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>
                          Nominal Tabungan Rutin ({currencySymbol})
                        </label>
                        <CurrencyInput 
                          required={isAutoTabungan}
                          placeholder="Contoh: 500.000" 
                          value={autoAmount} 
                          onChange={setAutoAmount}
                          style={{ marginBottom: '16px' }}
                        />

                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>Siklus</label>
                            <div style={{ display: 'flex', background: 'var(--bg-card-solid)', borderRadius: '12px', padding: '3px', border: '1px solid var(--border-color)' }}>
                              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((freq) => {
                                const labels: Record<string, string> = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', yearly: 'Tahunan' };
                                const isActive = autoFrequency === freq;
                                return (
                                  <button
                                    key={freq}
                                    type="button"
                                    onClick={() => setAutoFrequency(freq)}
                                    style={{
                                      flex: 1,
                                      padding: '8px 4px',
                                      borderRadius: '9px',
                                      border: 'none',
                                      background: isActive ? 'var(--bg-neutral)' : 'transparent',
                                      color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                                      fontSize: '12px',
                                      fontWeight: isActive ? 700 : 500,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s',
                                      textAlign: 'center'
                                    }}
                                  >
                                    {labels[freq]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>Tgl Mulai</label>
                            <input 
                              type="date" 
                              required={isAutoTabungan}
                              value={autoStartDate} 
                              onChange={e => setAutoStartDate(e.target.value)}
                              style={{ width: '100%', marginBottom: 0 }}
                            />
                          </div>
                        </div>

                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>
                          Sumber Dana (Dipotong Dari)
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsAutoFromAssetModalOpen(true)}
                          style={{
                            width: '100%', padding: '12px 16px', background: 'var(--bg-card-solid)',
                            border: '1px solid var(--border-color)', borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            cursor: 'pointer', color: selectedAutoFromAsset ? 'var(--text-main)' : 'var(--text-muted)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Wallet size={16} color="var(--primary)" />
                            <span style={{ fontSize: '14px', fontWeight: selectedAutoFromAsset ? 700 : 500 }}>
                              {selectedAutoFromAsset ? selectedAutoFromAsset.name : '-- Pilih Rekening Sumber --'}
                            </span>
                          </div>
                          <ChevronRight size={16} color="var(--text-muted)" />
                        </button>
                      </div>
                    )}
                  </>
                )}

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

      <AssetSelectModal
        isOpen={isAutoFromAssetModalOpen}
        onClose={() => setIsAutoFromAssetModalOpen(false)}
        assets={assets.filter(a => !a.isDeleted)}
        selectedAssetId={autoFromAssetId}
        onSelect={(id) => setAutoFromAssetId(id)}
      />
    </>
  );
};

export default GoalModal;
