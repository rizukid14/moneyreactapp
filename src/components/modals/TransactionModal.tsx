import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowRightLeft, AlertTriangle, Calculator, Folder, ChevronRight, Wallet, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney } from '../../contexts/MoneyContext';
import type { Asset, RecurringTransaction, Transaction } from '../../contexts/MoneyContext';
import CalculatorModal from './CalculatorModal';
import CategorySelectModal from './CategorySelectModal';
import AssetSelectModal from './AssetSelectModal';
import GoalSelectModal from './GoalSelectModal';
import { getLocalDate, getLocalTime } from '../../lib/utils';
import { useToast } from '../common/Toast';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => Transaction;
  addRecurringTransaction?: (rt: Omit<RecurringTransaction, 'id'>) => void;
  updateTransaction?: (id: string, tx: Partial<Transaction>) => void;
  deleteTransaction?: (id: string) => void;
  editingTransaction?: Transaction | null;
  isCopyMode?: boolean;
  initialType?: 'pengeluaran' | 'pendapatan' | 'transfer';
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen, onClose, assets, addTransaction, addRecurringTransaction, updateTransaction, deleteTransaction, editingTransaction, isCopyMode, initialType
}) => {
  const activeAssets = assets.filter(a => !a.isDeleted);
  const { categories, budgets, transactions, defaultAssetId, currencySymbol, goals } = useMoney();
  const { showToast } = useToast();
  const [type, setType] = useState<'pengeluaran' | 'pendapatan' | 'transfer'>('pengeluaran');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [date, setDate] = useState(getLocalDate());
  const [time, setTime] = useState(getLocalTime());
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [assetSelectingField, setAssetSelectingField] = useState<'assetId' | 'fromAssetId' | 'toAssetId'>('assetId');
  const [assetId, setAssetId] = useState(defaultAssetId || activeAssets[0]?.id || '');
  const [fromAssetId, setFromAssetId] = useState(defaultAssetId || activeAssets[0]?.id || '');
  const [toAssetId, setToAssetId] = useState(activeAssets[1]?.id || activeAssets[0]?.id || '');
  const [goalId, setGoalId] = useState<string | undefined>(undefined);

  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [recurringEndDate, setRecurringEndDate] = useState('');

  // Admin fee state (transfer only)
  const [adminFee, setAdminFee] = useState('');
  const [adminFeeTarget, setAdminFeeTarget] = useState<'sender' | 'receiver'>('sender');

  const prevType = React.useRef(type);
  const isSavingRef = React.useRef(false);
  const amountRef = React.useRef<HTMLInputElement>(null);
  const submitActionRef = React.useRef<'close' | 'continue'>('close');

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
      setDescription(editingTransaction.description || '');
      setAssetId(editingTransaction.assetId || activeAssets[0]?.id || '');
      setFromAssetId(editingTransaction.fromAssetId || activeAssets[0]?.id || '');
      setToAssetId(editingTransaction.toAssetId || activeAssets[1]?.id || activeAssets[0]?.id || '');
      setGoalId(editingTransaction.goalId);

      // Initialize admin fee state for transfers
      if (editingTransaction.type === 'transfer') {
        const feeTx = transactions.find(t => t.relatedId === editingTransaction.id && t.category === 'Biaya Admin');
        if (feeTx) {
          setAdminFee(feeTx.amount.toLocaleString('id-ID'));
          setAdminFeeTarget(feeTx.assetId === editingTransaction.toAssetId ? 'receiver' : 'sender');
        } else {
          setAdminFee('');
          setAdminFeeTarget('sender');
        }
      }
    } else if (isOpen) {
      const targetType = initialType || type || 'pengeluaran';
      setType(targetType);

      const draft = allDrafts[targetType];
      if (draft) {
        setAmount(draft.amount || '');
        setCategory(draft.category || '');
        setSubCategory(draft.subCategory || '');
        setDate(draft.date || getLocalDate());
        setTime(draft.time || getLocalTime());
        setNote(draft.note || '');
        setDescription(draft.description || '');
        setAssetId(draft.assetId || defaultAssetId || activeAssets[0]?.id || '');
        setFromAssetId(draft.fromAssetId || defaultAssetId || activeAssets[0]?.id || '');
        setToAssetId(draft.toAssetId || activeAssets[1]?.id || activeAssets[0]?.id || '');
        setIsRecurring(draft.isRecurring || false);
        setFrequency(draft.frequency || 'monthly');
        setRecurringEndDate(draft.recurringEndDate || '');
      } else {
        // Reset to defaults for this type
        setAmount('');
        setCategory('');
        setSubCategory('');
        setDate(getLocalDate());
        setTime(getLocalTime());
        setNote('');
        setDescription('');
        setAssetId(defaultAssetId || activeAssets[0]?.id || '');
        setFromAssetId(defaultAssetId || activeAssets[0]?.id || '');
        setToAssetId(activeAssets[1]?.id || activeAssets[0]?.id || '');
        setGoalId(undefined);
        setIsRecurring(false);
        setRecurringEndDate('');
      }
      prevType.current = targetType;
    }
  }, [editingTransaction, isOpen, assets, initialType, defaultAssetId]);

  // Handle Internal Type Switching inside the modal
  useEffect(() => {
    if (isOpen && !editingTransaction && type !== prevType.current) {
      // Load draft for NEW type
      const draft = allDrafts[type];
      if (draft) {
        setAmount(draft.amount || '');
        setCategory(draft.category || '');
        setSubCategory(draft.subCategory || '');
        setDate(draft.date || getLocalDate());
        setTime(draft.time || getLocalTime());
        setNote(draft.note || '');
        setAssetId(draft.assetId || defaultAssetId || activeAssets[0]?.id || '');
        setFromAssetId(draft.fromAssetId || defaultAssetId || activeAssets[0]?.id || '');
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
    if (isOpen && !editingTransaction && !isSavingRef.current) {
      const currentDraft = {
        type, amount, category, subCategory, date, time, note, description,
        assetId, fromAssetId, toAssetId, goalId, isRecurring, frequency, recurringEndDate
      };
      setAllDrafts(prev => {
        const next = { ...prev, [type]: currentDraft };
        localStorage.setItem('tx_drafts', JSON.stringify(next));
        return next;
      });
    }
  }, [type, amount, category, subCategory, date, time, note, description, assetId, fromAssetId, toAssetId, isRecurring, frequency, recurringEndDate, isOpen, editingTransaction]);

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
    const el = e.target;
    const oldCursor = el.selectionStart || 0;
    const oldLength = el.value.length;

    const numericValue = el.value.replace(/\D/g, '');
    if (!numericValue) { setAmount(''); return; }

    const newVal = Number(numericValue).toLocaleString('id-ID');
    setAmount(newVal);

    window.requestAnimationFrame(() => {
      if (amountRef.current) {
        const diff = newVal.length - oldLength;
        const newCursor = Math.max(0, oldCursor + diff);
        amountRef.current.setSelectionRange(newCursor, newCursor);
      }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (type !== 'transfer' && !category) {
      showToast('Silakan pilih kategori terlebih dahulu.', 'warning');
      return;
    }

    const txData = {
      type,
      amount: Number(amount.replace(/\./g, '')),
      category: type === 'transfer' ? 'Transfer' : category,
      subCategory: type === 'transfer' ? undefined : (subCategory || undefined),
      date,
      time,
      note: note.trim(),
      description: description.trim() || undefined,
      assetId: type !== 'transfer' ? assetId : undefined,
      fromAssetId: type === 'transfer' ? fromAssetId : undefined,
      toAssetId: type === 'transfer' ? toAssetId : undefined,
      goalId,
    };

    if (editingTransaction && updateTransaction && !isCopyMode) {
      updateTransaction(editingTransaction.id, txData);

      // Handle admin fee for edited transfer
      if (type === 'transfer') {
        const adminFeeAmount = Number(adminFee.replace(/\./g, ''));
        const existingFeeTx = transactions.find(t => t.relatedId === editingTransaction.id && t.category === 'Biaya Admin');
        const feeAssetId = adminFeeTarget === 'sender' ? fromAssetId : toAssetId;
        const feeAssetName = assets.find(a => a.id === feeAssetId)?.name || '';
        const feeNote = `Biaya admin transfer${feeAssetName ? ` (${feeAssetName})` : ''}`;

        if (existingFeeTx) {
          if (adminFeeAmount > 0) {
            updateTransaction(existingFeeTx.id, {
              amount: adminFeeAmount,
              assetId: feeAssetId,
              note: feeNote,
              date,
              time
            });
          } else if (deleteTransaction) {
            deleteTransaction(existingFeeTx.id);
          }
        } else if (adminFeeAmount > 0) {
          addTransaction({
            type: 'pengeluaran',
            amount: adminFeeAmount,
            category: 'Biaya Admin',
            date,
            time,
            note: feeNote,
            assetId: feeAssetId,
            relatedId: editingTransaction.id
          });
        }
      }
    } else {
      isSavingRef.current = true;
      const newTx = addTransaction(txData);

      // Create separate pengeluaran transaction for admin fee
      const adminFeeAmount = Number(adminFee.replace(/\./g, ''));
      if (type === 'transfer' && adminFeeAmount > 0) {
        const feeAssetId = adminFeeTarget === 'sender' ? fromAssetId : toAssetId;
        const feeAssetName = assets.find(a => a.id === feeAssetId)?.name || '';
        addTransaction({
          type: 'pengeluaran',
          amount: adminFeeAmount,
          category: 'Biaya Admin',
          date,
          time,
          note: `Biaya admin transfer${feeAssetName ? ` (${feeAssetName})` : ''}`,
          assetId: feeAssetId,
          relatedId: newTx.id,
        });
      }

      // Clear draft for this type after success
      setAllDrafts(prev => {
        const next = { ...prev };
        delete next[type];
        localStorage.setItem('tx_drafts', JSON.stringify(next));
        return next;
      });

      // Reset local fields immediately so reopening doesn't flash old data
      setAmount('');
      setCategory('');
      setSubCategory('');
      setNote('');
      setIsRecurring(false);
      setGoalId(undefined);
      setAdminFee('');
      setAdminFeeTarget('sender');

      setTimeout(() => { isSavingRef.current = false; }, 200);

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

    if (submitActionRef.current === 'close') {
      onClose();
    } else {
      submitActionRef.current = 'close'; // reset
    }

    if (editingTransaction && updateTransaction && !isCopyMode) {
      showToast('Transaksi berhasil diperbarui!', 'success');
    } else {
      showToast('Transaksi berhasil ditambahkan!', 'success');
    }
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
                <h2 className="subtitle" style={{ margin: 0 }}>
                  {editingTransaction && !isCopyMode ? 'Edit Transaksi' : isCopyMode ? 'Salin Transaksi' : 'Tambah Transaksi'}
                </h2>
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
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <input
                        ref={amountRef}
                        type="text"
                        inputMode="numeric"
                        required
                        placeholder={`Nominal (${currencySymbol})`}
                        value={amount}
                        onChange={handleAmountChange}
                        style={{ flex: 1, marginBottom: 0 }}
                      />
                      <button
                        type="button"
                        onClick={() => setIsCalculatorOpen(true)}
                        style={{
                          width: '48px', height: '48px', borderRadius: '12px',
                          background: 'var(--bg-income)', border: '1px solid var(--primary-glow)',
                          color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', flexShrink: 0
                        }}
                      >
                        <Calculator size={20} />
                      </button>
                    </div>

                    {type !== 'transfer' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsCategoryModalOpen(true)}
                          style={{
                            width: '100%', padding: '14px 16px', background: 'var(--bg-card-solid)',
                            border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: '16px', cursor: 'pointer', color: category ? 'var(--text-main)' : 'var(--text-muted)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Folder size={18} color="var(--primary)" />
                            <span style={{ fontSize: '14px', fontWeight: category ? 700 : 500 }}>
                              {category ? (subCategory ? `${category}  >  ${subCategory}` : category) : '-- Pilih Kategori --'}
                            </span>
                          </div>
                          <ChevronRight size={18} color="var(--text-muted)" />
                        </button>

                        {/* Asset selector button */}
                        {(() => {
                          const selectedAsset = assets.find(a => a.id === assetId);
                          return (
                            <button
                              type="button"
                              onClick={() => {
                            setAssetSelectingField('assetId');
                            setIsAssetModalOpen(true);
                          }}
                              style={{
                                width: '100%', padding: '14px 16px', background: 'var(--bg-card-solid)',
                                border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                marginBottom: '16px', cursor: 'pointer', color: selectedAsset ? 'var(--text-main)' : 'var(--text-muted)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Wallet size={18} color="var(--primary)" />
                                <span style={{ fontSize: '14px', fontWeight: selectedAsset ? 700 : 500 }}>
                                  {selectedAsset ? selectedAsset.name : '-- Pilih Dompet/Rekening --'}
                                </span>
                              </div>
                              <ChevronRight size={18} color="var(--text-muted)" />
                            </button>
                          );
                        })()}

                        {/* Goal Selector (for pendapatan / pengeluaran) */}
                        {goals.length > 0 && (
                          <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.04em' }}>
                              Hubungkan ke Tabungan (Opsional)
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsGoalModalOpen(true)}
                              style={{
                                width: '100%', padding: '14px 16px', background: goalId ? 'var(--bg-income)' : 'var(--bg-card-solid)',
                                border: `2px solid ${goalId ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-sm)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer', color: goalId ? 'var(--text-main)' : 'var(--text-muted)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Target size={18} color="var(--primary)" />
                                <span style={{ fontSize: '14px', fontWeight: goalId ? 700 : 500 }}>
                                  {goals.find(g => g.id === goalId)?.name || '-- Pilih Target Tabungan --'}
                                </span>
                              </div>
                              <ChevronRight size={18} color="var(--text-muted)" />
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        {/* From Asset Button */}
                        {(() => {
                          const asset = assets.find(a => a.id === fromAssetId);
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setAssetSelectingField('fromAssetId');
                                setIsAssetModalOpen(true);
                              }}
                              style={{
                                flex: 1, padding: '12px 14px', background: 'var(--bg-card-solid)',
                                border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer', color: asset ? 'var(--text-main)' : 'var(--text-muted)'
                              }}
                            >
                              <span style={{ fontSize: '13px', fontWeight: asset ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {asset ? asset.name : '-- Dari --'}
                              </span>
                              <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                            </button>
                          );
                        })()}

                        <ArrowRightLeft color="var(--text-muted)" size={18} style={{ flexShrink: 0 }} />

                        {/* To Asset Button */}
                        {(() => {
                          const asset = assets.find(a => a.id === toAssetId);
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setAssetSelectingField('toAssetId');
                                setIsAssetModalOpen(true);
                              }}
                              style={{
                                flex: 1, padding: '12px 14px', background: 'var(--bg-card-solid)',
                                border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer', color: asset ? 'var(--text-main)' : 'var(--text-muted)'
                              }}
                            >
                              <span style={{ fontSize: '13px', fontWeight: asset ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {asset ? asset.name : '-- Ke --'}
                              </span>
                              <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                            </button>
                          );
                        })()}
                      </div>

                      {/* Goal Selector (within transfer) */}
                      {goals.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.04em' }}>
                            Hubungkan ke Tabungan (Opsional)
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsGoalModalOpen(true)}
                            style={{
                              width: '100%', padding: '14px 16px', background: goalId ? 'var(--bg-income)' : 'var(--bg-card-solid)',
                              border: `2px solid ${goalId ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-sm)',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              cursor: 'pointer', color: goalId ? 'var(--text-main)' : 'var(--text-muted)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Target size={18} color="var(--primary)" />
                              <span style={{ fontSize: '14px', fontWeight: goalId ? 700 : 500 }}>
                                {goals.find(g => g.id === goalId)?.name || '-- Pilih Target Tabungan --'}
                              </span>
                            </div>
                            <ChevronRight size={18} color="var(--text-muted)" />
                          </button>
                        </div>
                      )}

                      {/* Admin Fee Section */}
                      <div style={{
                        padding: '10px 12px', borderRadius: '10px',
                        background: adminFee ? 'hsla(35, 90%, 55%, 0.08)' : 'var(--bg-main)',
                        border: `1px solid ${adminFee ? 'hsla(35, 90%, 55%, 0.3)' : 'var(--border-color)'}`,
                        marginBottom: '16px', transition: 'all 0.2s'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: adminFee ? '10px' : 0 }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', flex: 1 }}>Biaya Admin</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={adminFee}
                            onChange={e => {
                              const numericValue = e.target.value.replace(/\D/g, '');
                              setAdminFee(numericValue ? Number(numericValue).toLocaleString('id-ID') : '');
                            }}
                            style={{
                              width: '100px', fontSize: '13px', fontWeight: 700, textAlign: 'right',
                              padding: '6px 10px', marginBottom: 0, borderRadius: '8px',
                              border: '1px solid var(--border-color)', background: 'var(--bg-card-solid)'
                            }}
                          />
                        </div>

                        {adminFee && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setAdminFeeTarget('sender')}
                              style={{
                                flex: 1, padding: '7px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                                border: `1.5px solid ${adminFeeTarget === 'sender' ? 'var(--secondary)' : 'var(--border-color)'}`,
                                background: adminFeeTarget === 'sender' ? 'var(--bg-expense)' : 'var(--bg-card)',
                                color: adminFeeTarget === 'sender' ? 'var(--secondary)' : 'var(--text-muted)',
                                cursor: 'pointer', transition: 'all 0.15s'
                              }}
                            >Pengirim</button>
                            <button
                              type="button"
                              onClick={() => setAdminFeeTarget('receiver')}
                              style={{
                                flex: 1, padding: '7px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                                border: `1.5px solid ${adminFeeTarget === 'receiver' ? 'var(--secondary)' : 'var(--border-color)'}`,
                                background: adminFeeTarget === 'receiver' ? 'var(--bg-expense)' : 'var(--bg-card)',
                                color: adminFeeTarget === 'receiver' ? 'var(--secondary)' : 'var(--text-muted)',
                                cursor: 'pointer', transition: 'all 0.15s'
                              }}
                            >Penerima</button>
                          </div>
                        )}
                      </div>
                      </>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '16px' }}>
                      <input type="date" required value={date} onChange={e => setDate(e.target.value)} style={{ marginBottom: 0 }} />
                      <input type="time" required value={time} onChange={e => setTime(e.target.value)} style={{ marginBottom: 0 }} />
                    </div>
                    <input type="text" placeholder="Catatan opsional" value={note} onChange={e => setNote(e.target.value)} />
                    
                    <div style={{ marginBottom: '16px' }}>
                      <textarea
                        placeholder="Detail item / Catatan tambahan..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-main)',
                          color: 'var(--text-main)',
                          fontSize: '13px',
                          resize: 'vertical',
                          outline: 'none',
                          marginTop: '4px'
                        }}
                      />
                    </div>

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

                  <div style={{ position: 'sticky', bottom: 0, background: 'var(--bg-card-solid)', paddingTop: 12, paddingBottom: 4, zIndex: 1 }}>
                  {!editingTransaction || isCopyMode ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="submit"
                        onClick={() => { submitActionRef.current = 'continue'; }}
                        className="btn"
                        style={{ flex: 1, border: `2px solid ${type === 'pendapatan' ? 'var(--primary)' : type === 'pengeluaran' ? 'var(--secondary)' : 'var(--text-muted)'}`, color: type === 'pendapatan' ? 'var(--primary)' : type === 'pengeluaran' ? 'var(--secondary)' : 'var(--text-main)' }}
                      >
                        Simpan & Lanjut
                      </button>
                      <button
                        type="submit"
                        onClick={() => { submitActionRef.current = 'close'; }}
                        className={type === 'pendapatan' ? 'btn btn-primary' : type === 'pengeluaran' ? 'btn btn-secondary' : 'btn'}
                        style={{
                          flex: 1,
                          backgroundColor: type === 'transfer' ? 'var(--text-muted)' : undefined,
                          color: type === 'transfer' ? 'white' : undefined
                        }}
                      >
                        {isCopyMode ? 'Simpan Salinan' : 'Simpan & Tutup'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      onClick={() => { submitActionRef.current = 'close'; }}
                      className={type === 'pendapatan' ? 'btn btn-primary' : type === 'pengeluaran' ? 'btn btn-secondary' : 'btn'}
                      style={{
                        width: '100%',
                        backgroundColor: type === 'transfer' ? 'var(--text-muted)' : undefined,
                        color: type === 'transfer' ? 'white' : undefined
                      }}
                    >
                      Simpan Perubahan
                    </button>
                  )}
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        initialValue={amount}
        onConfirm={(val) => {
          setAmount(val.toLocaleString('id-ID'));
        }}
      />

      <CategorySelectModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        type={type as 'pengeluaran' | 'pendapatan'}
        initialCategory={category}
        initialSubCategory={subCategory}
        onSelect={(cat, sub) => {
          setCategory(cat);
          setSubCategory(sub);
        }}
      />

      <AssetSelectModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        assets={assets.filter(a => !a.isDeleted)}
        selectedAssetId={
          assetSelectingField === 'assetId' ? assetId :
          assetSelectingField === 'fromAssetId' ? fromAssetId :
          toAssetId
        }
        onSelect={(id) => {
          if (assetSelectingField === 'assetId') setAssetId(id);
          else if (assetSelectingField === 'fromAssetId') setFromAssetId(id);
          else setToAssetId(id);
        }}
      />

      <GoalSelectModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        goals={goals}
        selectedGoalId={goalId}
        onSelect={(id) => setGoalId(id)}
      />
    </>
  );
};

export default TransactionModal;
