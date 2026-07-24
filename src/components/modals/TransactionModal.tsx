import React, { useState, useEffect, useMemo } from 'react';

import { useMoney } from '../../contexts/MoneyContext';
import type { Asset, RecurringTransaction, Transaction } from '../../contexts/MoneyContext';
import CalculatorModal from './CalculatorModal';
import CategorySelectModal from './CategorySelectModal';
import AssetSelectModal from './AssetSelectModal';
import ContactSelectModal from './ContactSelectModal';
import GoalSelectModal from './GoalSelectModal';
import { getLocalDate, getLocalTime } from '../../lib/utils';
import { useToast } from '../common/Toast';
import { lazy, Suspense } from 'react';
const OverspendReallocationModal = lazy(() => import('./OverspendReallocationModal'));
import CurrencyInput from '../common/CurrencyInput';
import ConfirmDialog from '../common/ConfirmDialog';
import { SYS_CAT } from '../../contexts/MoneyContext';
import { Modal } from '../ui/Modal';
import { TabBar } from '../ui/TabBar';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import MaterialIcon from '../common/MaterialIcon';

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
  initialType?: Transaction['type'];
  initialAssetId?: string;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen, onClose, assets, addTransaction, addRecurringTransaction, updateTransaction, deleteTransaction, editingTransaction, isCopyMode, initialType, initialAssetId
}) => {
  const activeAssets = assets.filter(a => !a.isDeleted);
  const { categories, budgets, transactions, defaultAssetId, currencySymbol, goals, validateTransactionBudget, zbbMode, startOfMonthDay, addDebt, contacts } = useMoney();
  const { showToast } = useToast();
  const [type, setType] = useState<Transaction['type']>('pengeluaran');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [date, setDate] = useState(getLocalDate());
  const [time, setTime] = useState(getLocalTime());
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [assetSelectingField, setAssetSelectingField] = useState<'assetId' | 'fromAssetId' | 'toAssetId'>('assetId');
  const [assetId, setAssetId] = useState(initialAssetId || defaultAssetId || activeAssets[0]?.id || '');
  const [fromAssetId, setFromAssetId] = useState(initialAssetId || defaultAssetId || activeAssets[0]?.id || '');
  const [toAssetId, setToAssetId] = useState(activeAssets[1]?.id || activeAssets[0]?.id || '');
  const [goalId, setGoalId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [recurringEndDate, setRecurringEndDate] = useState('');

  // Debt link state
  const [isDebtLinked, setIsDebtLinked] = useState(false);
  const [debtType, setDebtType] = useState<'hutang' | 'piutang'>('hutang');
  const [debtContact, setDebtContact] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [showDebtInfo, setShowDebtInfo] = useState(false);
  const [showRecurringInfo, setShowRecurringInfo] = useState(false);

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

  const [reallocationModal, setReallocationModal] = useState<{ isOpen: boolean; deficitCategoryId: string | null; deficitAmount: number; month: number; year: number }>({ isOpen: false, deficitCategoryId: null, deficitAmount: 0, month: 0, year: 0 });
  const [pendingTxData, setPendingTxData] = useState<any>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // ─── Draft Logic ────────────────────────────────────────────────────────
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toLocaleString('id-ID'));
      setCategoryId(editingTransaction.categoryId || '');
      setSubCategoryId(editingTransaction.subCategoryId || '');
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
        const feeTx = transactions.find(t => t.relatedId === editingTransaction.id && t.categoryId === SYS_CAT.ADMIN_FEE);
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
        setCategoryId(draft.categoryId || '');
        setSubCategoryId(draft.subCategoryId || '');
        setDate(draft.date || getLocalDate());
        setTime(draft.time || getLocalTime());
        setNote(draft.note || '');
        setDescription(draft.description || '');
        setAssetId(initialAssetId || draft.assetId || defaultAssetId || activeAssets[0]?.id || '');
        setFromAssetId(initialAssetId || draft.fromAssetId || defaultAssetId || activeAssets[0]?.id || '');
        setToAssetId(draft.toAssetId || activeAssets[1]?.id || activeAssets[0]?.id || '');
        setIsRecurring(draft.isRecurring || false);
        setFrequency(draft.frequency || 'monthly');
        setRecurringEndDate(draft.recurringEndDate || '');
        setGoalId(draft.goalId);
      } else {
        // Reset to defaults for this type
        setAmount('');
        setCategoryId('');
        setSubCategoryId('');
        setDate(getLocalDate());
        setTime(getLocalTime());
        setNote('');
        setDescription('');
        setAssetId(initialAssetId || defaultAssetId || activeAssets[0]?.id || '');
        setFromAssetId(initialAssetId || defaultAssetId || activeAssets[0]?.id || '');
        // Keep current assetIds unless we specifically want to clear them, 
        // but prefer initialAssetId if available.
        if (initialAssetId) {
          setAssetId(initialAssetId);
          setFromAssetId(initialAssetId);
        }
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
        setCategoryId(draft.categoryId || '');
        setSubCategoryId(draft.subCategoryId || '');
        setDate(draft.date || getLocalDate());
        setTime(draft.time || getLocalTime());
        setNote(draft.note || '');
        setDescription(draft.description || '');
        setAssetId(initialAssetId || draft.assetId || defaultAssetId || activeAssets[0]?.id || '');
        setFromAssetId(initialAssetId || draft.fromAssetId || defaultAssetId || activeAssets[0]?.id || '');
        setToAssetId(draft.toAssetId || activeAssets[1]?.id || activeAssets[0]?.id || '');
      } else {
        setAmount('');
        setCategoryId('');
        setSubCategoryId('');
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
        type, amount, categoryId, subCategoryId, date, time, note, description,
        assetId, fromAssetId, toAssetId, goalId, isRecurring, frequency, recurringEndDate
      };
      setAllDrafts(prev => {
        const next = { ...prev, [type]: currentDraft };
        localStorage.setItem('tx_drafts', JSON.stringify(next));
        return next;
      });
    }
  }, [type, amount, categoryId, subCategoryId, date, time, note, description, assetId, fromAssetId, toAssetId, isRecurring, frequency, recurringEndDate, isOpen, editingTransaction]);

  // ── Budget Alert Logic ──────────────────────────────────────
  const budgetAlerts = useMemo(() => {
    if (type !== 'pengeluaran' || !amount) return [];
    const txDate = new Date(date || new Date());
    let txMonth = txDate.getMonth();
    let txYear = txDate.getFullYear();
    const sDay = startOfMonthDay || 1;
    
    if (sDay > 1) {
      if (txDate.getDate() >= sDay) {
        txMonth++;
        if (txMonth > 11) {
          txMonth = 0;
          txYear++;
        }
      }
    }
    
    const txAmount = Number(amount.replace(/\./g, ''));
    if (!txAmount) return [];

    const periodStart = new Date(txYear, txMonth - (sDay > 1 ? 1 : 0), sDay);
    const periodEnd = new Date(txYear, txMonth + (sDay > 1 ? 0 : 1), sDay);

    // Current month spending (excluding editing transaction itself)
    const existingSpend = transactions.reduce((acc, tx) => {
      if (tx.id === editingTransaction?.id) return acc;
      if (tx.type !== 'pengeluaran') return acc;
      const d = new Date(tx.date);
      if (d >= periodStart && d < periodEnd) {
        acc.total += tx.amount;
        const cat = categories.find(c => c.id === tx.categoryId && c.type === 'pengeluaran' && !c.isDeleted) ||
                    categories.find(c => c.id === tx.categoryId && c.type === 'pengeluaran');
        if (cat) acc[cat.id] = (acc[cat.id] || 0) + tx.amount;
      }
      return acc;
    }, { total: 0 } as Record<string, number>);

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
    const selCat = categories.find(c => c.id === categoryId && c.type === 'pengeluaran' && !c.isDeleted) ||
                   categories.find(c => c.id === categoryId && c.type === 'pengeluaran');
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
  }, [type, amount, date, categoryId, budgets, transactions, categories, editingTransaction, startOfMonthDay]);
  const handleRawAmountChange = (val: string) => {
    setAmount(val);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (type !== 'transfer' && !categoryId) {
      showToast('Silakan pilih kategori terlebih dahulu.', 'warning');
      setIsSubmitting(false);
      return;
    }

    const txData = {
      type,
      amount: Number(amount.replace(/\./g, '')),
      categoryId: type === 'transfer' ? undefined : categoryId,
      subCategoryId: type === 'transfer' ? undefined : (subCategoryId || undefined),
      date,
      time,
      note: note.trim(),
      description: description.trim() || undefined,
      assetId: type !== 'transfer' ? assetId : undefined,
      fromAssetId: type === 'transfer' ? fromAssetId : undefined,
      toAssetId: type === 'transfer' ? toAssetId : undefined,
      goalId,
    };

    if (zbbMode === 'strict' && type === 'pengeluaran') {
      const validation = validateTransactionBudget({ ...txData, id: editingTransaction?.id });
      if (!validation.isValid) {
        setPendingTxData(txData);
        setReallocationModal({
          isOpen: true,
          deficitCategoryId: validation.deficitCategory,
          deficitAmount: validation.deficitAmount,
          month: new Date(date).getMonth(),
          year: new Date(date).getFullYear()
        });
        setIsSubmitting(false);
        return; // Intercept and wait for reallocation
      }
    }

    performSave(txData);
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  const performSave = (txData: any) => {
    if (editingTransaction && updateTransaction && !isCopyMode) {
      updateTransaction(editingTransaction.id, txData);

      // Handle admin fee for edited transfer
      if (type === 'transfer') {
        const adminFeeAmount = Number(adminFee.replace(/\./g, ''));
        const existingFeeTx = transactions.find(t => t.relatedId === editingTransaction.id && t.categoryId === SYS_CAT.ADMIN_FEE);
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
            categoryId: SYS_CAT.ADMIN_FEE,
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
          categoryId: SYS_CAT.ADMIN_FEE,
          date,
          time,
          note: `Biaya admin transfer${feeAssetName ? ` (${feeAssetName})` : ''}`,
          assetId: feeAssetId,
          relatedId: newTx.id,
        });
      }

      // Clear draft for this type after success - explicitly read and write to bypass any state delays
      const savedStr = localStorage.getItem('tx_drafts');
      if (savedStr) {
        try {
          const savedObj = JSON.parse(savedStr);
          delete savedObj[type];
          localStorage.setItem('tx_drafts', JSON.stringify(savedObj));
          setAllDrafts(savedObj);
        } catch (e) {}
      }

      // Handle creating linked debt if toggled
      if (isDebtLinked && debtContact.trim() && (type === 'pengeluaran' || type === 'pendapatan')) {
        const numAmount = Number(amount.replace(/\./g, ''));
        addDebt(
          {
            type: debtType,
            contact: debtContact.trim(),
            description: note.trim() || 'Dari transaksi',
            totalAmount: numAmount,
            principalAmount: numAmount,
            date,
            createdAt: `${date}T${time}:00`,
            isPaid: false,
            isInstallment: false,
            paidInstallments: 0,
            dueDate: debtDueDate || undefined,
            paymentAssetId: assetId,
          },
          debtType === 'hutang' ? 'cash' : undefined
        );
      }

      // Reset local fields immediately so reopening doesn't flash old data
      setAmount('');
      setCategoryId('');
      setSubCategoryId('');
      setNote('');
      setDescription('');
      setIsRecurring(false);
      setIsDebtLinked(false);
      setDebtType('hutang');
      setDebtContact('');
      setDebtDueDate('');
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

  const handleReallocationSuccess = () => {
    setReallocationModal({ isOpen: false, deficitCategoryId: null, deficitAmount: 0, month: 0, year: 0 });
    if (pendingTxData) {
      setIsSubmitting(true);
      performSave(pendingTxData);
      setTimeout(() => setIsSubmitting(false), 1000);
      setPendingTxData(null);
    }
  };

  const handleDeleteCurrentTransaction = () => {
    if (!editingTransaction || !deleteTransaction) return;

    // If deleting a transfer, also remove linked admin fee transactions.
    if (editingTransaction.type === 'transfer') {
      transactions
        .filter(t => t.relatedId === editingTransaction.id && t.categoryId === SYS_CAT.ADMIN_FEE)
        .forEach(t => deleteTransaction(t.id));
    }

    deleteTransaction(editingTransaction.id);
    showToast('Transaksi berhasil dihapus!', 'success');
    setIsDeleteConfirmOpen(false);
    onClose();
  };


  const isFormValid = useMemo(() => {
    const rawAmount = Number(amount.replace(/\./g, ''));
    if (rawAmount <= 0) return false;
    if (!date || !time) return false;
    if (type === 'transfer') {
      return !!(fromAssetId && toAssetId && fromAssetId !== toAssetId);
    } else {
      return !!(categoryId && assetId);
    }
  }, [amount, date, time, type, fromAssetId, toAssetId, categoryId, assetId]);

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={editingTransaction && !isCopyMode ? 'Edit Transaksi' : isCopyMode ? 'Salin Transaksi' : 'Tambah Transaksi'}
        data-testid="transaction-modal"
      >
        {assets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--danger)' }}>
            Anda belum memiliki Rekening/Dompet! Silakan buka tab <strong>Aset</strong> dan tambahkan akun terlebih dahulu.
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
                  {['piutang_keluar', 'piutang_masuk', 'hutang_masuk', 'hutang_keluar'].includes(type) ? (
                    <div style={{ padding: '12px', background: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center', fontWeight: 700, color: 'var(--text-main)' }}>
                      Tipe: {type === 'piutang_keluar' ? 'Memberi Pinjaman' : type === 'piutang_masuk' ? 'Pelunasan Piutang' : type === 'hutang_masuk' ? 'Terima Pinjaman' : 'Bayar Hutang'}
                    </div>
                  ) : (
                    <TabBar
                      activeTabId={type}
                      onChange={(id) => setType(id as any)}
                      tabs={[
                        { id: 'pengeluaran', label: 'Pengeluaran', 'data-testid': 'tx-type-pengeluaran' },
                        { id: 'pendapatan', label: 'Pendapatan', 'data-testid': 'tx-type-pendapatan' },
                        { id: 'transfer', label: 'Transfer', 'data-testid': 'tx-type-transfer' }
                      ]}
                      activeStyle={type === 'pengeluaran' ? { backgroundColor: 'var(--danger)', color: 'var(--on-danger)' } : type === 'pendapatan' ? { backgroundColor: 'var(--success)', color: 'var(--on-success)' } : { backgroundColor: 'var(--surface-container-highest)', color: 'var(--on-surface)' }}
                    />
                  )}

                  <div key={type} className="flex flex-col gap-4 animate-in fade-in duration-150">
                    {type !== 'transfer' ? (
                      <>
                        {/* Asset selector button */}
                        {(() => {
                          const selectedAsset = assets.find(a => a.id === assetId);
                          return (
                            <button
                              type="button"
                              data-testid="tx-asset-select"
                              onClick={() => {
                                setAssetSelectingField('assetId');
                                setIsAssetModalOpen(true);
                              }}
                              style={{
                                width: '100%', padding: '14px 16px', background: 'var(--bg-card-solid)',
                                border: !assetId ? '2px solid var(--danger)' : '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer', color: selectedAsset ? 'var(--text-main)' : 'var(--text-muted)'
                              }}
                              data-tour="modal-asset"
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <MaterialIcon name="account_balance_wallet" className="text-[18px]" />
                                <span style={{ fontSize: '14px', fontWeight: selectedAsset ? 700 : 500 }}>
                                  {selectedAsset ? selectedAsset.name : '-- Pilih Dompet/Rekening --'}
                                </span>
                              </div>
                              <MaterialIcon name="chevron_right" className="text-[18px]" />
                            </button>
                          );
                        })()}
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* From Asset Button */}
                          {(() => {
                            const asset = assets.find(a => a.id === fromAssetId);
                            return (
                              <button
                                type="button"
                                data-testid="tx-from-asset-select"
                                onClick={() => {
                                  setAssetSelectingField('fromAssetId');
                                  setIsAssetModalOpen(true);
                                }}
                                style={{
                                  flex: 1, padding: '12px 14px', background: 'var(--bg-card-solid)',
                                  border: !fromAssetId ? '2px solid var(--danger)' : '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  cursor: 'pointer', color: asset ? 'var(--text-main)' : 'var(--text-muted)'
                                }}
                                data-tour="modal-asset"
                              >
                                <span style={{ fontSize: '13px', fontWeight: asset ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {asset ? asset.name : '-- Dari --'}
                                </span>
                                <MaterialIcon name="chevron_right" />
                              </button>
                            );
                          })()}

                          <button
                            type="button"
                            onClick={() => {
                              const temp = fromAssetId;
                              setFromAssetId(toAssetId);
                              setToAssetId(temp);
                            }}
                            className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container"
                            title="Tukar Aset"
                          >
                            <MaterialIcon name="swap_horiz" />
                          </button>

                          {/* To Asset Button */}
                          {(() => {
                            const asset = assets.find(a => a.id === toAssetId);
                            return (
                              <button
                                type="button"
                                data-testid="tx-to-asset-select"
                                onClick={() => {
                                  setAssetSelectingField('toAssetId');
                                  setIsAssetModalOpen(true);
                                }}
                                style={{
                                  flex: 1, padding: '12px 14px', background: 'var(--bg-card-solid)',
                                  border: !toAssetId ? '2px solid var(--danger)' : '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  cursor: 'pointer', color: asset ? 'var(--text-main)' : 'var(--text-muted)'
                                }}
                                data-tour="modal-asset"
                              >
                                <span style={{ fontSize: '13px', fontWeight: asset ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {asset ? asset.name : '-- Ke --'}
                                </span>
                                <MaterialIcon name="chevron_right" />
                              </button>
                            );
                          })()}
                        </div>
                        
                        {/* Admin Fee Section */}
                        <div style={{
                          padding: '10px 12px', borderRadius: '10px',
                          background: adminFee ? 'hsla(35, 90%, 55%, 0.08)' : 'var(--bg-main)',
                          border: `1px solid ${adminFee ? 'hsla(35, 90%, 55%, 0.3)' : 'var(--border-color)'}`,
                          transition: 'all 0.2s'
                        }} className="flex flex-col gap-2">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: adminFee ? '4px' : 0 }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', flex: 1 }}>Biaya Admin</span>
                            <CurrencyInput
                              placeholder="0"
                              value={adminFee}
                              onChange={setAdminFee}
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

                    <div className="flex gap-2">
                      <CurrencyInput
                        data-testid="tx-amount-input"
                        ref={amountRef}
                        required
                        placeholder={`Nominal (${currencySymbol})`}
                        value={amount}
                        onChange={handleRawAmountChange}
                        style={{ flex: 1, height: '48px', padding: '12px 14px', marginBottom: 0, border: (!amount || Number(amount.replace(/\./g, '')) <= 0) ? '2px solid var(--danger)' : undefined }}
                        data-tour="modal-amount"
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
                        <MaterialIcon name="calculate" className="text-[20px]" />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input data-testid="tx-date-input" type="date" required value={date} onChange={e => setDate(e.target.value)} style={{ marginBottom: 0, borderColor: !date ? 'var(--danger)' : undefined, borderWidth: !date ? '2px' : undefined }} />
                      </div>
                      <div className="w-[110px]">
                        <Input type="time" required value={time} onChange={e => setTime(e.target.value)} style={{ marginBottom: 0, borderColor: !time ? 'var(--danger)' : undefined, borderWidth: !time ? '2px' : undefined }} />
                      </div>
                    </div>

                    {type !== 'transfer' && (
                      <button
                        type="button"
                        data-testid="tx-category-select"
                        onClick={() => setIsCategoryModalOpen(true)}
                        style={{
                          width: '100%', padding: '14px 16px', background: 'var(--bg-card-solid)',
                          border: !categoryId ? '2px solid var(--danger)' : '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          cursor: 'pointer', color: categoryId ? 'var(--text-main)' : 'var(--text-muted)'
                        }}
                        data-tour="modal-category"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <MaterialIcon name="folder" className="text-[18px]" />
                          <span style={{ fontSize: '14px', fontWeight: categoryId ? 700 : 500 }}>
                            {categoryId ? (() => {
                              const cat = categories.find(c => c.id === categoryId);
                              const catName = cat?.name || categoryId;
                              if (subCategoryId) {
                                const subName = cat?.subcategories?.find(s => s.id === subCategoryId)?.name || subCategoryId;
                                return `${catName}  >  ${subName}`;
                              }
                              return catName;
                            })() : '-- Pilih Kategori --'}
                          </span>
                        </div>
                        <MaterialIcon name="chevron_right" className="text-[18px]" />
                      </button>
                    )}

                    <Input data-testid="tx-note-input" type="text" placeholder="Catatan opsional" value={note} onChange={e => setNote(e.target.value)} data-tour="modal-note" style={{ marginBottom: 0 }} />
                    
                    <div className="flex flex-col gap-1.5">
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
                        }}
                      />
                    </div>

                    {/* Goal Selector (Moved Below Notes) */}
                    {goals.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
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
                            <MaterialIcon name="track_changes" className="text-[18px]" />
                            <span style={{ fontSize: '14px', fontWeight: goalId ? 700 : 500 }}>
                              {goals.find(g => g.id === goalId)?.name || '-- Pilih Target Tabungan --'}
                            </span>
                          </div>
                          <MaterialIcon name="chevron_right" className="text-[18px]" />
                        </button>
                      </div>
                    )}

                    {!editingTransaction && (
                      <div style={{
                        padding: '12px', borderRadius: '12px',
                        background: isRecurring ? 'hsla(152,70%,42%,0.08)' : 'var(--bg-main)',
                        border: `1px solid ${isRecurring ? 'var(--primary)' : 'var(--border-color)'}`,
                        transition: 'all 0.2s'
                      }} className="flex flex-col gap-2">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, flex: 1 }}>
                            <MaterialIcon name="swap_horiz" />
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Jadikan Transaksi Rutin</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowRecurringInfo(prev => !prev);
                              }}
                              style={{
                                border: 'none', background: 'transparent', cursor: 'pointer',
                                color: showRecurringInfo ? 'var(--primary)' : 'var(--text-muted)',
                                padding: '2px', display: 'flex', alignItems: 'center'
                              }}
                              title="Informasi Transaksi Rutin"
                            >
                              <MaterialIcon name="info" className="text-[16px]" />
                            </button>
                            <input
                              type="checkbox"
                              checked={isRecurring}
                              onChange={e => setIsRecurring(e.target.checked)}
                              style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', marginLeft: 'auto' }}
                            />
                          </label>
                        </div>

                        {showRecurringInfo && (
                          <div style={{
                            padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-card-solid)',
                            border: '1px solid var(--border-color)', fontSize: '12px', lineHeight: 1.5,
                            color: 'var(--text-main)', marginTop: '4px'
                          }}>
                            <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--primary)' }}>🔄 Transaksi Rutin:</div>
                            <div>Transaksi ini akan diulangi secara otomatis sesuai frekuensi yang dipilih (Harian, Mingguan, Bulanan, atau Tahunan) tanpa perlu diisi ulang secara manual di kemudian hari.</div>
                          </div>
                        )}

                        {isRecurring && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Frekuensi</label>
                              <div style={{ display: 'flex', background: 'var(--bg-card-solid)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color)', minWidth: '130px' }}>
                                {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((freq) => {
                                  const labels: Record<string, string> = { daily: 'H', weekly: 'M', monthly: 'B', yearly: 'T' };
                                  const fullLabels: Record<string, string> = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', yearly: 'Tahunan' };
                                  const isActive = frequency === freq;
                                  return (
                                    <button
                                      key={freq}
                                      type="button"
                                      title={fullLabels[freq]}
                                      onClick={() => setFrequency(freq)}
                                      style={{
                                        flex: 1,
                                        padding: '6px 0',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: isActive ? 'var(--bg-neutral)' : 'transparent',
                                        color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                                        fontSize: '11px',
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

                    {!editingTransaction && (
                      <div style={{
                        padding: '12px', borderRadius: '12px',
                        background: isDebtLinked ? 'hsla(35, 90%, 55%, 0.08)' : 'var(--bg-main)',
                        border: `1px solid ${isDebtLinked ? 'hsla(35, 90%, 55%, 0.4)' : 'var(--border-color)'}`,
                        transition: 'all 0.2s'
                      }} className="flex flex-col gap-2">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, flex: 1 }}>
                            <MaterialIcon name="account_balance" />
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Catat sebagai Hutang / Piutang</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowDebtInfo(prev => !prev);
                              }}
                              style={{
                                border: 'none', background: 'transparent', cursor: 'pointer',
                                color: showDebtInfo ? 'var(--primary)' : 'var(--text-muted)',
                                padding: '2px', display: 'flex', alignItems: 'center'
                              }}
                              title="Informasi Penjelasan"
                            >
                              <MaterialIcon name="info" className="text-[16px]" />
                            </button>
                            <input
                              type="checkbox"
                              checked={isDebtLinked}
                              onChange={e => setIsDebtLinked(e.target.checked)}
                              style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', marginLeft: 'auto' }}
                            />
                          </label>
                        </div>

                        {showDebtInfo && (
                          <div style={{
                            padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-card-solid)',
                            border: '1px solid var(--border-color)', fontSize: '12px', lineHeight: 1.5,
                            color: 'var(--text-main)', marginTop: '4px'
                          }}>
                            <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--primary)' }}>ℹ️ Pemetaan Mode Hutang / Piutang:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div>🔴 <strong>Pengeluaran + Saya Berhutang (Hutang):</strong> masuk ke <em>Mode Kredit / Paylater</em> (belanja dulu utang kemudian).</div>
                              <div>🔴 <strong>Pengeluaran + Orang Berhutang (Piutang):</strong> masuk ke <em>Mode Piutang / Talangan</em> (memberikan pinjaman ke teman).</div>
                              <div>🟢 <strong>Pendapatan + Saya Berhutang (Hutang):</strong> masuk ke <em>Mode Pinjaman Tunai</em> (menerima pencairan utang dari orang/bank).</div>
                              <div>🟢 <strong>Pendapatan + Orang Berhutang (Piutang):</strong> masuk ke <em>Mode Pelunasan Piutang</em> (menerima pembayaran uang dari teman).</div>
                            </div>
                          </div>
                        )}

                        {isDebtLinked && (
                          <div className="flex flex-col gap-3 pt-1">
                            {/* Type Pills */}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setDebtType('hutang')}
                                style={{
                                  flex: 1, padding: '7px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                                  border: `1.5px solid ${debtType === 'hutang' ? 'var(--danger)' : 'var(--border-color)'}`,
                                  background: debtType === 'hutang' ? 'var(--bg-expense)' : 'var(--bg-card)',
                                  color: debtType === 'hutang' ? 'var(--danger)' : 'var(--text-muted)',
                                  cursor: 'pointer', transition: 'all 0.15s'
                                }}
                              >
                                Saya Berhutang (Hutang)
                              </button>
                              <button
                                type="button"
                                onClick={() => setDebtType('piutang')}
                                style={{
                                  flex: 1, padding: '7px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                                  border: `1.5px solid ${debtType === 'piutang' ? 'var(--success)' : 'var(--border-color)'}`,
                                  background: debtType === 'piutang' ? 'var(--bg-income)' : 'var(--bg-card)',
                                  color: debtType === 'piutang' ? 'var(--success)' : 'var(--text-muted)',
                                  cursor: 'pointer', transition: 'all 0.15s'
                                }}
                              >
                                Orang Berhutang (Piutang)
                              </button>
                            </div>

                            {/* Contact Selector Button */}
                            <button
                              type="button"
                              onClick={() => setIsContactModalOpen(true)}
                              style={{
                                width: '100%', padding: '10px 12px', background: 'var(--bg-card-solid)',
                                border: !debtContact ? '1px dashed var(--danger)' : '1px solid var(--border-color)', borderRadius: '8px',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer', color: debtContact ? 'var(--text-main)' : 'var(--text-muted)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MaterialIcon name="person" className="text-[16px]" />
                                <span style={{ fontSize: '13px', fontWeight: debtContact ? 600 : 400 }}>
                                  {debtContact ? `Kontak: ${debtContact}` : '-- Pilih / Tambah Kontak --'}
                                </span>
                              </div>
                              <MaterialIcon name="chevron_right" className="text-[16px]" />
                            </button>

                            {/* Due Date */}
                            <div>
                              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tenggat Waktu / Jatuh Tempo (Opsional)</label>
                              <input
                                type="date"
                                value={debtDueDate}
                                onChange={e => setDebtDueDate(e.target.value)}
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
                        <MaterialIcon name="warning" className="text-[16px] ba-icon" />
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

                    <div className="pt-2 pb-[env(safe-area-inset-bottom)]">
                      {!editingTransaction || isCopyMode ? (
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            variant="outline"
                            data-testid="tx-submit-continue-btn"
                            onClick={() => { submitActionRef.current = 'continue'; }}
                            disabled={!isFormValid || isSubmitting}
                            fullWidth
                          >
                            Simpan & Lanjut
                          </Button>
                          <Button
                            type="submit"
                            variant="primary"
                            data-testid="tx-submit-btn"
                            onClick={() => { submitActionRef.current = 'close'; }}
                            disabled={!isFormValid || isSubmitting}
                            fullWidth
                          >
                            {isCopyMode ? 'Simpan Salinan' : 'Simpan & Tutup'}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {deleteTransaction && (
                            <Button
                              type="button"
                              variant="danger"
                              data-testid="tx-delete-btn"
                              onClick={() => setIsDeleteConfirmOpen(true)}
                              fullWidth
                            >
                              Hapus Transaksi
                            </Button>
                          )}
                          <Button
                            type="submit"
                            variant="primary"
                            data-testid="tx-submit-btn"
                            onClick={() => { submitActionRef.current = 'close'; }}
                            disabled={!isFormValid || isSubmitting}
                            fullWidth
                          >
                            Simpan Perubahan
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              )}
      </Modal>

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
        initialCategoryId={categoryId}
        initialSubCategoryId={subCategoryId}
        onSelect={(cat, sub) => {
          setCategoryId(cat);
          setSubCategoryId(sub);
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

      <ContactSelectModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        contacts={contacts}
        selectedContactName={debtContact}
        onSelect={(name) => {
          setDebtContact(name);
          setIsContactModalOpen(false);
        }}
      />

      <GoalSelectModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        goals={goals}
        selectedGoalId={goalId}
        onSelect={(id) => setGoalId(id)}
      />

      {reallocationModal.isOpen && (
        <Suspense fallback={null}>
          <OverspendReallocationModal
            isOpen={reallocationModal.isOpen}
            onClose={() => setReallocationModal(prev => ({ ...prev, isOpen: false }))}
            onSuccess={handleReallocationSuccess}
            deficitCategoryId={reallocationModal.deficitCategoryId}
            deficitAmount={reallocationModal.deficitAmount}
            month={reallocationModal.month}
            year={reallocationModal.year}
          />
        </Suspense>
      )}

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteCurrentTransaction}
        title="Hapus Transaksi"
        message="Apakah Anda yakin ingin menghapus transaksi ini?"
      />
    </>
  );
};

export default TransactionModal;
