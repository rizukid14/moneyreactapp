import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney } from '../../contexts/MoneyContext';
import type { Asset, RecurringTransaction, Transaction } from '../../contexts/MoneyContext';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  addRecurringTransaction?: (rt: Omit<RecurringTransaction, 'id'>) => void;
  updateTransaction?: (id: string, tx: Partial<Transaction>) => void;
  editingTransaction?: Transaction | null;
  initialType?: 'pengeluaran' | 'pendapatan' | 'transfer';
}

const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, onClose, assets, addTransaction, addRecurringTransaction, updateTransaction, editingTransaction, initialType 
}) => {
  const activeAssets = assets.filter(a => !a.isDeleted);
  const { categories, budgets, transactions } = useMoney();
  const [type, setType] = useState<'pengeluaran' | 'pendapatan' | 'transfer'>('pengeluaran');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].slice(0, 5));
  const [note, setNote] = useState('');
  const [assetId, setAssetId] = useState(activeAssets[0]?.id || '');
  const [fromAssetId, setFromAssetId] = useState(activeAssets[0]?.id || '');
  const [toAssetId, setToAssetId] = useState(activeAssets[1]?.id || activeAssets[0]?.id || '');
  
  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [recurringEndDate, setRecurringEndDate] = useState('');

  const prevType = React.useRef(type);

  // Load drafts from localStorage on mount/open
  const [allDrafts, setAllDrafts] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem('tx_drafts');
    return saved ? JSON.parse(saved) : {};
  });

  // ─── Draft Logic ────────────────────────────────────────────────────────
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toLocaleString('id-ID'));
      setCategory(editingTransaction.category);
      setSubCategory(editingTransaction.subCategory || '');
      setDate(editingTransaction.date);
      setTime(editingTransaction.time || new Date().toTimeString().split(' ')[0].slice(0, 5));
      setNote(editingTransaction.note);
      setAssetId(editingTransaction.assetId || activeAssets[0]?.id || '');
      setFromAssetId(editingTransaction.fromAssetId || activeAssets[0]?.id || '');
      setToAssetId(editingTransaction.toAssetId || activeAssets[1]?.id || activeAssets[0]?.id || '');
    } else if (isOpen) {
      const targetType = initialType || type || 'pengeluaran';
      setType(targetType);
      
      const draft = allDrafts[targetType];
      if (draft) {
        setAmount(draft.amount || '');
        setCategory(draft.category || '');
        setSubCategory(draft.subCategory || '');
        setDate(draft.date || new Date().toISOString().split('T')[0]);
        setTime(draft.time || new Date().toTimeString().split(' ')[0].slice(0, 5));
        setNote(draft.note || '');
        setAssetId(draft.assetId || activeAssets[0]?.id || '');
        setFromAssetId(draft.fromAssetId || activeAssets[0]?.id || '');
        setToAssetId(draft.toAssetId || activeAssets[1]?.id || activeAssets[0]?.id || '');
        setIsRecurring(draft.isRecurring || false);
        setFrequency(draft.frequency || 'monthly');
        setRecurringEndDate(draft.recurringEndDate || '');
      } else {
        // Reset to defaults for this type
        setAmount('');
        setCategory('');
        setSubCategory('');
        setDate(new Date().toISOString().split('T')[0]);
        setTime(new Date().toTimeString().split(' ')[0].slice(0, 5));
        setNote('');
        setAssetId(activeAssets[0]?.id || '');
        setFromAssetId(activeAssets[0]?.id || '');
        setToAssetId(activeAssets[1]?.id || activeAssets[0]?.id || '');
        setIsRecurring(false);
        setRecurringEndDate('');
      }
      prevType.current = targetType;
    }
  }, [editingTransaction, isOpen, assets, initialType]);

  // Handle Internal Type Switching inside the modal
  useEffect(() => {
    if (isOpen && !editingTransaction && type !== prevType.current) {
      // Load draft for NEW type
      const draft = allDrafts[type];
      if (draft) {
        setAmount(draft.amount || '');
        setCategory(draft.category || '');
        setSubCategory(draft.subCategory || '');
        setDate(draft.date || new Date().toISOString().split('T')[0]);
        setTime(draft.time || new Date().toTimeString().split(' ')[0].slice(0, 5));
        setNote(draft.note || '');
        setAssetId(draft.assetId || activeAssets[0]?.id || '');
        setFromAssetId(draft.fromAssetId || activeAssets[0]?.id || '');
        setToAssetId(draft.toAssetId || activeAssets[1]?.id || activeAssets[0]?.id || '');
      } else {
        setAmount('');
        setCategory('');
        setSubCategory('');
        setNote('');
        // We keep date/time consistent when switching types unless there's a draft
      }
      prevType.current = type;
    }
  }, [type, isOpen, editingTransaction, allDrafts]);

  // Save draft whenever state changes
  useEffect(() => {
    if (isOpen && !editingTransaction) {
      const currentDraft = { 
        type, amount, category, subCategory, date, time, note, 
        assetId, fromAssetId, toAssetId, isRecurring, frequency, recurringEndDate 
      };
      setAllDrafts(prev => {
        const next = { ...prev, [type]: currentDraft };
        localStorage.setItem('tx_drafts', JSON.stringify(next));
        return next;
      });
    }
  }, [type, amount, category, subCategory, date, time, note, assetId, fromAssetId, toAssetId, isRecurring, frequency, recurringEndDate, isOpen, editingTransaction]);

  // ── Budget Alert Logic ──────────────────────────────────────
  const budgetAlerts = useMemo(() => {
    if (type !== 'pengeluaran' || !amount) return [];
    const txDate = new Date(date || new Date());
    const txMonth = txDate.getMonth();
    const txYear = txDate.getFullYear();
    const txAmount = Number(amount.replace(/\./g, ''));
    if (!txAmount) return [];

    // Current month spending (excluding editing transaction itself)
    const existingSpend = transactions.reduce((acc, tx) => {
      if (tx.id === editingTransaction?.id) return acc;
      const d = new Date(tx.date);
      if (d.getMonth() !== txMonth || d.getFullYear() !== txYear || tx.type !== 'pengeluaran') return acc;
      return { ...acc, total: acc.total + tx.amount };
    }, { total: 0 } as Record<string, number>);

    // Also track by category
    transactions.forEach(tx => {
      if (tx.id === editingTransaction?.id) return;
      const d = new Date(tx.date);
      if (d.getMonth() !== txMonth || d.getFullYear() !== txYear || tx.type !== 'pengeluaran') return;
      const cat = categories.find(c => c.name === tx.category && c.type === 'pengeluaran');
      if (cat) existingSpend[cat.id] = (existingSpend[cat.id] || 0) + tx.amount;
    });

    const alerts: { label: string; over: number }[] = [];
    const monthBudgets = budgets.filter(b => b.month === txMonth && b.year === txYear);

    // Global budget check
    const global = monthBudgets.find(b => b.categoryId === null);
    if (global) {
      const newTotal = (existingSpend.total || 0) + txAmount;
      if (newTotal > global.limit) {
        alerts.push({
          label: 'Total Anggaran Bulanan',
          over: newTotal - global.limit
        });
      }
    }

    // Category budget check
    const selCat = categories.find(c => c.name === category && c.type === 'pengeluaran');
    if (selCat) {
      const catBudget = monthBudgets.find(b => b.categoryId === selCat.id);
      if (catBudget) {
        const newCatTotal = (existingSpend[selCat.id] || 0) + txAmount;
        if (newCatTotal > catBudget.limit) {
          alerts.push({
            label: `Anggaran: ${selCat.name}`,
            over: newCatTotal - catBudget.limit
          });
        }
      }
    }

    return alerts;
  }, [type, amount, date, category, budgets, transactions, categories, editingTransaction]);
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (!numericValue) { setAmount(''); return; }
    setAmount(Number(numericValue).toLocaleString('id-ID'));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const txData = {
      type,
      amount: Number(amount.replace(/\./g, '')),
      category: type === 'transfer' ? 'Transfer' : category,
      subCategory: type === 'transfer' ? undefined : (subCategory || undefined),
      date,
      note,
      assetId: type !== 'transfer' ? assetId : undefined,
      fromAssetId: type === 'transfer' ? fromAssetId : undefined,
      toAssetId: type === 'transfer' ? toAssetId : undefined,
    };

    if (editingTransaction && updateTransaction) {
      updateTransaction(editingTransaction.id, txData);
    } else {
      addTransaction(txData);
      
      // Clear draft for this type after success
      setAllDrafts(prev => {
        const next = { ...prev };
        delete next[type];
        localStorage.setItem('tx_drafts', JSON.stringify(next));
        return next;
      });
      
      // Handle creating recurring transaction if toggled
      if (isRecurring && addRecurringTransaction) {
        addRecurringTransaction({
          ...txData,
          frequency,
          startDate: date,
          lastProcessedDate: date, 
          endDate: recurringEndDate || undefined,
          isActive: true
        });
      }
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="modal-overlay" 
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div 
            className="modal-content" 
            onClick={e => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 500 }}
          >
            <div className="modal-header">
              <h2 className="subtitle" style={{ margin: 0 }}>{editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi'}</h2>
              <button className="close-btn" onClick={onClose}><X size={24} /></button>
            </div>

            {assets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--danger)' }}>
                Anda belum memiliki Rekening/Dompet! Silakan buka tab <strong>Aset</strong> dan tambahkan akun terlebih dahulu.
              </div>
            ) : (
              <form onSubmit={handleSave}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button 
                    type="button" 
                    onClick={() => setType('pengeluaran')} 
                    style={{ 
                      flex: 1, padding: '10px', borderRadius: '8px', 
                      border: type === 'pengeluaran' ? '2px solid var(--secondary)' : '1px solid var(--border-color)', 
                      background: type === 'pengeluaran' ? 'var(--bg-expense)' : 'var(--bg-card)', 
                      fontWeight: 700, color: type === 'pengeluaran' ? 'var(--secondary)' : 'var(--text-muted)' 
                    }}
                  >Pengeluaran</button>
                  <button 
                    type="button" 
                    onClick={() => setType('pendapatan')} 
                    style={{ 
                      flex: 1, padding: '10px', borderRadius: '8px', 
                      border: type === 'pendapatan' ? '2px solid var(--primary)' : '1px solid var(--border-color)', 
                      background: type === 'pendapatan' ? 'var(--bg-income)' : 'var(--bg-card)', 
                      fontWeight: 700, color: type === 'pendapatan' ? 'var(--primary)' : 'var(--text-muted)' 
                    }}
                  >Pendapatan</button>
                  <button 
                    type="button" 
                    onClick={() => setType('transfer')} 
                    style={{ 
                      flex: 1, padding: '10px', borderRadius: '8px', 
                      border: type === 'transfer' ? '2px solid var(--text-muted)' : '1px solid var(--border-color)', 
                      background: type === 'transfer' ? 'var(--bg-neutral)' : 'var(--bg-card)', 
                      fontWeight: 700, color: type === 'transfer' ? 'var(--text-main)' : 'var(--text-muted)' 
                    }}
                  >Transfer</button>
                </div>

                <motion.div
                  key={type}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  <input type="text" inputMode="numeric" required placeholder="Nominal (Rp)" value={amount} onChange={handleAmountChange} />

                  {type !== 'transfer' ? (
                    <>
                      <select required value={category} onChange={e => {
                        setCategory(e.target.value);
                        setSubCategory('');
                      }}>
                        <option value="" disabled>-- Pilih Kategori --</option>
                        {categories.filter(c => c.type === type).map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      
                      {(() => {
                        const selCat = categories.find(c => c.name === category && c.type === type);
                        if (selCat && selCat.subcategories && selCat.subcategories.length > 0) {
                          return (
                            <select required value={subCategory} onChange={e => setSubCategory(e.target.value)}>
                              <option value="" disabled>-- Pilih Sub-Kategori --</option>
                              {selCat.subcategories.map(sub => (
                                <option key={sub.id} value={sub.name}>{sub.name}</option>
                              ))}
                            </select>
                          );
                        }
                        return null;
                      })()}

                      <select required value={assetId} onChange={e => setAssetId(e.target.value)}>
                        <option value="" disabled>-- Pilih Dompet/Rekening --</option>
                        {assets.filter(a => !a.isDeleted || a.id === assetId).map(a => (
                          <option key={a.id} value={a.id}>{a.name} {a.isDeleted ? '(Dihapus)' : ''}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <select style={{ marginBottom: 0 }} value={fromAssetId} onChange={e => setFromAssetId(e.target.value)}>
                        {assets.filter(a => !a.isDeleted || a.id === fromAssetId).map(a => (
                          <option key={a.id} value={a.id}>{a.name} {a.isDeleted ? '(Dihapus)' : ''}</option>
                        ))}
                      </select>
                      <ArrowRightLeft color="var(--text-muted)" size={20} />
                      <select style={{ marginBottom: 0 }} value={toAssetId} onChange={e => setToAssetId(e.target.value)}>
                        {assets.filter(a => !a.isDeleted || a.id === toAssetId).map(a => (
                          <option key={a.id} value={a.id}>{a.name} {a.isDeleted ? '(Dihapus)' : ''}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '16px' }}>
                    <input type="date" required value={date} onChange={e => setDate(e.target.value)} style={{ marginBottom: 0 }} />
                    <input type="time" required value={time} onChange={e => setTime(e.target.value)} style={{ marginBottom: 0 }} />
                  </div>
                  <input type="text" placeholder="Catatan opsional" value={note} onChange={e => setNote(e.target.value)} />

                  {!editingTransaction && (
                    <div style={{ 
                      margin: '12px 0', padding: '12px', borderRadius: '12px', 
                      background: isRecurring ? 'hsla(152,70%,42%,0.08)' : 'var(--bg-main)',
                      border: `1px solid ${isRecurring ? 'var(--primary)' : 'var(--border-color)'}`,
                      transition: 'all 0.2s'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', margin: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ArrowRightLeft size={16} color={isRecurring ? 'var(--primary)' : 'var(--text-muted)'} />
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Jadikan Transaksi Rutin</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={isRecurring} 
                          onChange={e => setIsRecurring(e.target.checked)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                        />
                      </label>

                      {isRecurring && (
                        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Frekuensi</label>
                            <select 
                              value={frequency} 
                              onChange={e => setFrequency(e.target.value as any)}
                              style={{ fontSize: '12px', padding: '8px', marginBottom: 0 }}
                            >
                              <option value="daily">Harian</option>
                              <option value="weekly">Mingguan</option>
                              <option value="monthly">Bulanan</option>
                              <option value="yearly">Tahunan</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Sampai Tanggal (Opsional)</label>
                            <input 
                              type="date" 
                              value={recurringEndDate} 
                              onChange={e => setRecurringEndDate(e.target.value)}
                              style={{ fontSize: '12px', padding: '8px', marginBottom: 0 }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Budget Alert Banner */}
                  {budgetAlerts.length > 0 && (
                    <div className="budget-alert-banner">
                      <AlertTriangle size={16} className="ba-icon" />
                      <div>
                        <div className="ba-title">Peringatan Anggaran</div>
                        {budgetAlerts.map((alert, i) => (
                          <div key={i} className="ba-body">
                            <strong>{alert.label}</strong> akan melebihi batas sebesar{' '}
                            <strong style={{ color: 'var(--danger)' }}>
                              Rp{alert.over.toLocaleString('id-ID')}
                            </strong>
                          </div>
                        ))}
                        <div className="ba-body" style={{ marginTop: 4 }}>Transaksi tetap bisa disimpan.</div>
                      </div>
                    </div>
                  )}
                </motion.div>

                <button 
                  type="submit" 
                  className={type === 'pendapatan' ? 'btn btn-primary' : type === 'pengeluaran' ? 'btn btn-secondary' : 'btn'}
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    backgroundColor: type === 'transfer' ? 'var(--text-muted)' : undefined,
                    color: type === 'transfer' ? 'white' : undefined
                  }}
                >
                  {editingTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TransactionModal;
