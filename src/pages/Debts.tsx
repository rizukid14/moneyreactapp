import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMoney, type Debt, type Transaction, type AutoSettleOptions } from '../contexts/MoneyContext';
import { calculateDebtBalance, calculateContactOffsetPotentials } from '../lib/debtCalculations';
import DropdownMenu from '../components/common/DropdownMenu';
import DebtModal from '../components/modals/DebtModal';
import DebtPaymentModal from '../components/modals/DebtPaymentModal';
import DebtAddPrincipalModal from '../components/modals/DebtAddPrincipalModal';
import DebtOffsetModal from '../components/modals/DebtOffsetModal';
const TransactionModal = lazy(() => import('../components/modals/TransactionModal'));
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useToast } from '../components/common/Toast';
import OnboardingTutorial from '../components/OnboardingTutorial';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import MaterialIcon from '../components/common/MaterialIcon';
import { IconBlock } from '../components/ui/IconBlock';
import { PageWrapper } from '../components/ui/PageWrapper';
import { PageHeader } from '../components/ui/PageHeader';
import { SegmentedControl } from '../components/ui/TabBar';
import { MetricCard } from '../components/ui/MetricCard';
import { EmptyState } from '../components/ui/EmptyState';
import { motion } from 'framer-motion';
import { useSwipeGesture } from '../hooks/useSwipeGesture';

const fmt = (n: number, sym: string = 'Rp') => `${sym}${Math.abs(n).toLocaleString('id-ID')}`;

const getDaysUntilDue = (dueDate?: string) => {
  if (!dueDate) return null;
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
};

interface DebtCardProps {
  debt: Debt;
  onEdit: () => void;
  onDelete: () => void;
  onPay: () => void;
  onAddPrincipal: () => void;
  onSettle: () => void;
  onUnpay: () => void;
  liabilityName?: string;
  paymentName?: string;
  receiveName?: string;
  history: Transaction[];
  onToggleExpand: () => void;
  isExpanded: boolean;
  currencySymbol: string;
  onHistoryClick?: (tx: Transaction) => void;
}

const DebtCard = React.memo<DebtCardProps>(({
  debt, onEdit, onDelete, onPay, onAddPrincipal, onSettle, onUnpay,
  liabilityName, paymentName, receiveName, history, onToggleExpand, isExpanded,
  currencySymbol, onHistoryClick
}) => {
  const { categories } = useMoney();

  const isHutang = debt.type === 'hutang';
  const daysLeft = getDaysUntilDue(debt.dueDate);
  const isOverdue = daysLeft !== null && daysLeft < 0 && !debt.isPaid;
  const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && !debt.isPaid;

  const balance = useMemo(
    () => calculateDebtBalance(debt, history, categories),
    [debt, history, categories]
  );

  let borderClass = 'border-outline-variant';
  if (debt.isPaid || balance.isPaid) borderClass = 'border-success';
  else if (isOverdue) borderClass = 'border-error';
  else if (isDueSoon) borderClass = 'border-secondary';

  const shadowClass = (debt.isPaid || balance.isPaid) ? 'shadow-none' : isOverdue ? 'shadow-error-glow' : 'shadow-bento';
  
  const { dragProps, swipeOffset, reset } = useSwipeGesture({
    onSwipeLeft: () => {
      reset();
      onDelete();
    },
    onSwipeRight: () => {
      reset();
      onEdit();
    },
  });

  return (
    <div className="relative overflow-hidden rounded-3xl w-full h-full">
      {/* Swipe Action Backgrounds */}
      <div className="absolute inset-0 flex justify-between items-center pointer-events-none rounded-3xl">
        <div 
          className="h-full bg-secondary/15 flex items-center pl-6 text-secondary font-extrabold text-xs transition-opacity duration-150" 
          style={{ opacity: swipeOffset > 20 ? 1 : 0 }}
        >
          <MaterialIcon name="edit" className="mr-1.5 text-base animate-pulse" />
          Edit
        </div>
        <div 
          className="h-full bg-error/15 flex items-center pr-6 text-error font-extrabold text-xs ml-auto transition-opacity duration-150" 
          style={{ opacity: swipeOffset < -20 ? 1 : 0 }}
        >
          Hapus
          <MaterialIcon name="delete" className="ml-1.5 text-base animate-pulse" />
        </div>
      </div>

      <motion.div {...dragProps} className="relative z-10 h-full w-full">
        <Card
          interactive
          data-testid={`debt-card-${debt.id}`} 
          onClick={onToggleExpand}
          className={`relative transition-all h-full border-2 ${borderClass} ${shadowClass} ${(debt.isPaid || balance.isPaid) ? 'opacity-75' : 'opacity-100'}`}
        >
          {/* Header row */}
          <div className="flex items-start gap-3 mb-3">
            <IconBlock 
              icon={isHutang ? 'trending_down' : 'trending_up'} 
              color={isHutang ? 'error' : 'success'} 
              size="md" 
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <span className="font-bold text-sm text-on-surface">{debt.contact}</span>
                {(debt.isPaid || balance.isPaid) && (
                  <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full tracking-wider">LUNAS</span>
                )}
                {isOverdue && (
                  <span className="text-[10px] font-bold text-error bg-error/10 px-2 py-0.5 rounded-full tracking-wider">JATUH TEMPO</span>
                )}
                {isDueSoon && (
                  <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full tracking-wider">SEGERA</span>
                )}
                {debt.excludeAutoOffset && !debt.isPaid && !balance.isPaid && (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full tracking-wider" title="Catatan Mandiri (Dilewati dari Auto Potong Silang)">🔒 MANDIRI</span>
                )}
              </div>
              <div className="text-xs text-on-surface-variant truncate">{debt.description || (isHutang ? 'Hutang' : 'Piutang')}</div>
            </div>

            {/* Menu */}
            <DropdownMenu 
              items={[
                { icon: 'edit', label: 'Edit Catatan', onClick: onEdit },
                { icon: 'add', label: 'Tambah Nominal Pokok', onClick: onAddPrincipal },
                !(debt.isPaid || balance.isPaid) 
                  ? { icon: 'check_circle', label: 'Tandai Lunas', onClick: onSettle }
                  : { icon: 'undo', label: 'Tandai Belum Lunas', onClick: onUnpay },
                { icon: 'delete', label: 'Hapus Catatan', danger: true, onClick: onDelete }
              ]}
            />
          </div>

          {/* Amount info */}
          <div className={`flex justify-between items-end ${(debt.isInstallment || balance.totalPaid > 0) ? 'mb-3' : 'mb-0'}`}>
            <div>
              <div className="text-[11px] text-on-surface-variant font-semibold mb-0.5">
                {isHutang ? 'Total Hutang' : 'Total Piutang'}
              </div>
              <div className={`text-xl font-extrabold tracking-tight ${isHutang ? 'text-error' : 'text-success'}`}>
                {fmt(balance.totalPrincipal, currencySymbol)}
              </div>
            </div>
            {balance.totalPaid > 0 && (
              <div className="text-right shrink-0">
                <div className="text-[11px] text-on-surface-variant font-semibold mb-0.5">
                  {balance.remaining <= 0 ? 'Status' : (isHutang ? 'Sisa Hutang' : 'Sisa Piutang')}
                </div>
                <div className={`text-xl font-extrabold tracking-tight ${balance.remaining <= 0 ? 'text-success' : (isHutang ? 'text-error' : 'text-success')}`}>
                  {balance.remaining > 0 ? fmt(balance.remaining, currencySymbol) : 'LUNAS'}
                </div>
              </div>
            )}
          </div>

          {/* Installment / Payment progress bar */}
          {debt.isInstallment ? (
            <div className="mb-3">
              <div className="h-1.5 bg-surface-subtle rounded-full overflow-hidden mb-1.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${(debt.isPaid || balance.isPaid) ? 'bg-success' : (isHutang ? 'bg-error' : 'bg-success')}`}
                  style={{ width: `${balance.progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-on-surface-variant font-semibold">
                <span>{balance.paidInstallmentCount} / {debt.totalInstallments || '?'} cicilan</span>
                <span>{fmt(debt.installmentAmount || 0, currencySymbol)} / bln</span>
              </div>
            </div>
          ) : balance.totalPaid > 0 && !debt.isPaid && !balance.isPaid && (
            <div className="mb-3">
              <div className="h-1.5 bg-surface-subtle rounded-full overflow-hidden mb-1.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${isHutang ? 'bg-error' : 'bg-success'}`}
                  style={{ width: `${balance.progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-on-surface-variant font-semibold">
                <span>Terbayar: {fmt(balance.totalPaid, currencySymbol)}</span>
                <span>{balance.progressPercent}%</span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-2.5">
            {/* Info row */}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-on-surface-variant mb-2.5">
              {debt.dueDate && (
                <div className="flex items-center gap-1">
                  <MaterialIcon name="schedule" className="text-[11px]" />
                  <span className={isOverdue ? 'text-error font-bold' : isDueSoon ? 'text-secondary font-bold' : ''}>
                    {isOverdue
                      ? `Telat ${Math.abs(daysLeft!)} hari`
                      : daysLeft === 0 ? 'Jatuh tempo hari ini'
                        : `${daysLeft} hari lagi`}
                  </span>
                </div>
              )}
              {debt.type === 'hutang' ? (
                <>
                  {liabilityName && (
                    <div className="flex items-center gap-1">
                      <span className="opacity-70">Hutang di:</span>
                      <span className="font-bold text-error">{liabilityName}</span>
                    </div>
                  )}
                  {paymentName && (
                    <div className="flex items-center gap-1">
                      <MaterialIcon name="sync_alt" className="text-[10px]" />
                      <span className="opacity-70">Bayar via:</span>
                      <span className="font-bold">{paymentName}</span>
                    </div>
                  )}
                </>
              ) : (
                receiveName && (
                  <div className="flex items-center gap-1">
                    <MaterialIcon name="sync_alt" className="text-[10px]" />
                    <span className="opacity-70">Terima ke:</span>
                    <span className="font-bold text-success">{receiveName}</span>
                  </div>
                )
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 items-center">
              {!(debt.isPaid || balance.isPaid) && (
                <Button
                  variant={isHutang ? 'danger' : 'primary'}
                  size="sm"
                  data-testid={`debt-pay-${debt.id}`}
                  onClick={(e) => { e.stopPropagation(); onPay(); }}
                  className="py-1.5 h-auto text-xs"
                >
                  <MaterialIcon name="play_circle" className="text-sm mr-1" /> Cicil / Lunas
                </Button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                className={`p-1 rounded-full text-on-surface-variant hover:bg-surface-subtle transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                aria-label="Riwayat Transaksi"
              >
                <MaterialIcon name="chevron_right" className="text-lg" />
              </button>
            </div>
          </div>

          {/* History drawer */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-dashed border-outline-variant animate-in fade-in">
              <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2.5">
                Riwayat Transaksi
              </div>
              {history.length === 0 ? (
                <div className="text-xs text-on-surface-variant italic py-2">
                  Belum ada riwayat transaksi tercatat.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <span className="text-on-surface-variant">Pokok Hutang/Piutang:</span>
                    <span className="font-bold text-on-surface">{fmt(balance.totalPrincipal, currencySymbol)}</span>
                  </div>
                  {history.map(tx => (
                    <div 
                      key={tx.id} 
                      onClick={() => onHistoryClick?.(tx)} 
                      className={`flex justify-between items-center p-2 rounded-xl transition-colors ${onHistoryClick ? 'cursor-pointer hover:bg-surface-subtle bg-surface-container-low/50' : 'bg-surface-container-low/30'}`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-on-surface truncate">{tx.note || 'Transaksi Hutang'}</div>
                        <div className="text-[10px] text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                          <span>{tx.date}</span>
                          {tx.debtRole && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-primary/10 text-primary font-bold rounded">
                              {tx.debtRole === 'principal' ? 'Pokok' : tx.debtRole === 'offset' ? 'Potong Silang' : 'Cicilan'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`font-extrabold text-xs shrink-0 ${tx.type === 'pendapatan' || tx.type === 'piutang_masuk' || tx.type === 'hutang_masuk' ? 'text-success' : 'text-on-surface'}`}>
                        {tx.type === 'pengeluaran' || tx.type === 'hutang_keluar' || tx.type === 'piutang_keluar' ? '-' : '+'}{fmt(tx.amount, currencySymbol)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
});

const Debts: React.FC = () => {
  const navigate = useNavigate();
  const { 
    debts, transactions, assets, categories, 
    addDebt, updateDebt, deleteDebt, settleDebt, 
    addDebtPayment, addDebtPrincipal, offsetDebt, 
    currencySymbol, updateTransaction, deleteTransaction,
    autoOffsetDebts
  } = useMoney();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [editingHistoryTx, setEditingHistoryTx] = useState<Transaction | null>(null);
  
  // Option 2: 2 Main Status Tabs + Unified Type Filter & Sort/Group Toolbar
  const [statusTab, setStatusTab] = useState<'active' | 'settled'>('active');
  const [typeFilter, setTypeFilter] = useState<'all' | 'hutang' | 'piutang'>('all');
  const [sortOption, setSortOption] = useState<'due_date' | 'newest' | 'amount_desc' | 'contact_asc'>('due_date');
  const [grouping, setGrouping] = useState<'none' | 'month' | 'contact'>('none');

  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [principalModalDebtId, setPrincipalModalDebtId] = useState<string | null>(null);
  const [offsetTarget, setOffsetTarget] = useState<{ contact: string; hutangTotal: number; piutangTotal: number; offsetAmount: number } | null>(null);
  const [isOffsetModalOpen, setIsOffsetModalOpen] = useState(false);

  const openAdd = () => { setEditingDebt(null); setIsModalOpen(true); };
  const openEdit = (d: Debt) => { setEditingDebt(d); setIsModalOpen(true); };

  const handleSave = (
    data: Omit<Debt, 'id'>,
    initialMode?: 'none' | 'cash' | 'credit',
    categoryName?: string,
    subCategoryName?: string,
    autoSettleOptions?: AutoSettleOptions
  ) => {
    if (editingDebt) updateDebt(editingDebt.id, data);
    else addDebt(data, initialMode ?? 'none', categoryName, subCategoryName, autoSettleOptions);
  };

  const assetMap = useMemo(() => new Map(assets.map(a => [a.id, a])), [assets]);
  const getAssetName = (id?: string) => id ? assetMap.get(id)?.name : undefined;

  // Active Summary
  const summary = useMemo(() => {
    let totalHutang = 0;
    let totalPiutang = 0;

    debts.forEach(d => {
      if (d.isPaid || d.isDeleted) return;
      const calc = calculateDebtBalance(d, transactions, categories);
      if (calc.isPaid || calc.remaining <= 0) return;

      if (d.type === 'hutang') totalHutang += calc.remaining;
      else totalPiutang += calc.remaining;
    });

    return { totalHutang, totalPiutang, net: totalPiutang - totalHutang };
  }, [debts, transactions, categories]);

  // Settled Summary for Selesai tab
  const lunasSummary = useMemo(() => {
    let settledHutang = 0;
    let settledPiutang = 0;
    let settledCount = 0;

    debts.forEach(d => {
      if (d.isDeleted) return;
      const calc = calculateDebtBalance(d, transactions, categories);
      if (d.isPaid || calc.isPaid || calc.remaining <= 0) {
        settledCount++;
        if (d.type === 'hutang') settledHutang += calc.totalPrincipal;
        else settledPiutang += calc.totalPrincipal;
      }
    });

    return { settledHutang, settledPiutang, settledCount };
  }, [debts, transactions, categories]);

  // Potentials for Potong Silang (Auto & Manual)
  const offsetPotentials = useMemo(() => {
    return calculateContactOffsetPotentials(debts, transactions, categories);
  }, [debts, transactions, categories]);

  const { showToast } = useToast();
  const offsetDebtRef = useRef(offsetDebt);
  useEffect(() => { offsetDebtRef.current = offsetDebt; });

  // Auto-offset effect
  useEffect(() => {
    if (!autoOffsetDebts) return;
    if (offsetPotentials.length === 0) return;

    const p = offsetPotentials[0];
    offsetDebtRef.current(p.contact);
    showToast(
      `↔ Potong silang otomatis: ${p.contact} · ${currencySymbol}${p.offsetAmount.toLocaleString('id-ID')}`,
      'success'
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offsetPotentials, autoOffsetDebts]);

  // Filtered & Sorted Debts
  const filtered = useMemo(() => {
    const isSettledView = statusTab === 'settled';

    let result = debts.filter(d => {
      if (d.isDeleted) return false;
      const calc = calculateDebtBalance(d, transactions, categories);
      const isSettled = Boolean(d.isPaid || calc.isPaid || calc.remaining <= 0);

      // Status check
      if (isSettledView !== isSettled) return false;

      // Type check
      if (typeFilter === 'hutang' && d.type !== 'hutang') return false;
      if (typeFilter === 'piutang' && d.type !== 'piutang') return false;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortOption === 'amount_desc') {
        return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);
      }
      if (sortOption === 'contact_asc') {
        return (a.contact || '').localeCompare(b.contact || '');
      }
      if (sortOption === 'newest') {
        const aDate = a.date || a.createdAt || '';
        const bDate = b.date || b.createdAt || '';
        return bDate.localeCompare(aDate);
      }
      // 'due_date'
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDue - bDue;
    });

    return result;
  }, [debts, statusTab, typeFilter, sortOption, transactions, categories]);

  // Grouped records
  const groupedDebts = useMemo(() => {
    if (grouping === 'none') return null;

    const groups: Record<string, Debt[]> = {};

    filtered.forEach(d => {
      let groupKey = 'Lainnya';
      if (grouping === 'month') {
        const dStr = d.date || d.createdAt;
        if (dStr) {
          const dateObj = new Date(dStr);
          if (!isNaN(dateObj.getTime())) {
            groupKey = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
          }
        }
      } else if (grouping === 'contact') {
        groupKey = d.contact || 'Tanpa Nama';
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(d);
    });

    return groups;
  }, [filtered, grouping]);

  return (
    <PageWrapper>
      {/* Header */}
      <PageHeader 
        title="Hutang & Piutang" 
        subtitle="Kelola semua catatan hutang & piutangmu"
        leftAction={
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white border-none shadow-sm cursor-pointer hover:bg-primary/90 transition-colors"
          >
            <MaterialIcon name="chevron_left" className="text-xl" />
          </button>
        }
      />

      {/* Summary cards */}
      {statusTab === 'active' ? (
        <>
          <div data-tour="debt-summary" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <MetricCard
              label="Total Hutang Aktif"
              value={fmt(summary.totalHutang, currencySymbol)}
              icon="trending_down"
              iconColor="error"
              valueColor="text-error"
              glowColor="error"
              data-testid="debt-summary-hutang"
            />
            <MetricCard
              label="Total Piutang Aktif"
              value={fmt(summary.totalPiutang, currencySymbol)}
              icon="trending_up"
              iconColor="success"
              valueColor="text-success"
              glowColor="success"
              data-testid="debt-summary-piutang"
            />
          </div>

          {/* Net position */}
          {(summary.totalHutang > 0 || summary.totalPiutang > 0) && (
            <div data-testid="debt-net-position" className={`flex items-center gap-2 p-3 rounded-2xl mb-4 ${summary.net >= 0 ? 'bg-success/10 border border-success/20 text-success' : 'bg-error text-white shadow-error-glow'}`}>
              <MaterialIcon name={summary.net >= 0 ? 'verified' : 'priority_high'} className="text-sm" />
              <span className="text-sm font-bold">
                {summary.net >= 0
                   ? `Neto: kamu memiliki piutang lebih banyak ${fmt(summary.net, currencySymbol)}`
                   : `Neto: kamu berhutang lebih banyak ${fmt(Math.abs(summary.net), currencySymbol)}`}
              </span>
            </div>
          )}
        </>
      ) : (
        /* Selesai / Lunas Tab Metric Cards matching active debts */
        <div data-tour="debt-summary-lunas" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <MetricCard
            label="Total Hutang Terselesaikan"
            value={fmt(lunasSummary.settledHutang, currencySymbol)}
            icon="task_alt"
            iconColor="primary"
            valueColor="text-on-surface"
            glowColor="primary"
            data-testid="debt-lunas-hutang"
          />
          <MetricCard
            label="Total Piutang Tertagih"
            value={fmt(lunasSummary.settledPiutang, currencySymbol)}
            icon="savings"
            iconColor="success"
            valueColor="text-success"
            glowColor="success"
            data-testid="debt-lunas-piutang"
          />
        </div>
      )}

      {/* Offset Banner (for Manual or Active Potentials) */}
      {offsetPotentials.length > 0 && statusTab === 'active' && (
        <div data-testid="debt-offset-banner" className="mb-4 p-4 rounded-3xl bg-gradient-to-br from-success to-[#1e7e46] text-white shadow-success-glow flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <MaterialIcon name="sync_alt" className="text-xl" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold">Tersedia Potong Silang (Offset)</div>
            <div className="text-xs font-semibold opacity-90">
              Ada {offsetPotentials.length} kontak dengan hutang & piutang aktif yang impas.
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setOffsetTarget(offsetPotentials[0]);
              setIsOffsetModalOpen(true);
            }}
            className="bg-white text-success border-white h-auto py-2 px-4 text-xs font-bold shrink-0"
          >
            Selesaikan
          </Button>
        </div>
      )}

      {/* Main Status Tabs (Option 2: 2 Status Tabs Only) */}
      <div className="mb-3">
        <SegmentedControl
          tabs={[
            { id: 'active', label: 'Aktif' },
            { id: 'settled', label: 'Selesai / Lunas' }
          ]}
          activeTabId={statusTab}
          onChange={(val) => {
            const nextStatus = val as 'active' | 'settled';
            setStatusTab(nextStatus);
            if (nextStatus === 'settled' && sortOption === 'due_date') {
              setSortOption('newest');
            }
          }}
        />
      </div>

      {/* Unified Filter & Toolbar Row */}
      <div className="relative z-30 flex items-center justify-between gap-2 mb-4 animate-in fade-in duration-200">
        {/* Type Filter Pills (Semua / Hutang / Piutang) */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'hutang', label: 'Hutang' },
            { id: 'piutang', label: 'Piutang' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTypeFilter(item.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                typeFilter === item.id
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-container-high'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Sort & Group Dropdowns */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sort Menu */}
          <DropdownMenu
            items={[
              ...(statusTab === 'active' ? [{ label: 'Jatuh Tempo', icon: 'event', onClick: () => setSortOption('due_date') }] : []),
              { label: 'Terbaru', icon: 'schedule', onClick: () => setSortOption('newest') },
              { label: 'Nominal Terbesar', icon: 'trending_up', onClick: () => setSortOption('amount_desc') },
              { label: 'Nama Kontak (A-Z)', icon: 'sort_by_alpha', onClick: () => setSortOption('contact_asc') },
            ]}
            customButton={
              <button
                className="px-2.5 py-1.5 rounded-full text-xs font-bold bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                title="Urutkan"
              >
                <MaterialIcon name="swap_vert" className="text-sm" />
                <span className="hidden sm:inline">
                  {sortOption === 'due_date' ? 'Jatuh Tempo' : sortOption === 'newest' ? 'Terbaru' : sortOption === 'amount_desc' ? 'Nominal' : 'A-Z'}
                </span>
                <MaterialIcon name="arrow_drop_down" className="text-xs -ml-0.5" />
              </button>
            }
          />

          {/* Group Menu */}
          <DropdownMenu
            items={[
              { label: 'Daftar Rata (Flat)', icon: 'list', onClick: () => setGrouping('none') },
              { label: 'Per Bulan', icon: 'calendar_month', onClick: () => setGrouping('month') },
              { label: 'Per Kontak', icon: 'person', onClick: () => setGrouping('contact') },
            ]}
            customButton={
              <button
                className="px-2.5 py-1.5 rounded-full text-xs font-bold bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                title="Pengelompokan"
              >
                <MaterialIcon name="folder_open" className="text-sm" />
                <span className="hidden sm:inline">
                  {grouping === 'month' ? 'Bulan' : grouping === 'contact' ? 'Kontak' : 'Rata'}
                </span>
                <MaterialIcon name="arrow_drop_down" className="text-xs -ml-0.5" />
              </button>
            }
          />
        </div>
      </div>

      {/* Debt Cards List */}
      <div className="pb-24">
        {filtered.length === 0 ? (
          <EmptyState 
            icon="receipt_long" 
            title={statusTab === 'settled' ? 'Belum ada catatan yang lunas' : 'Tidak ada catatan hutang/piutang aktif'} 
            description={statusTab === 'settled' ? 'Semua hutang atau piutang yang telah terlunasi akan tercatat rapi di sini.' : 'Tambah catatan hutang atau piutang barumu.'} 
            actionLabel={statusTab === 'active' ? "+ Tambah Sekarang" : undefined}
            onAction={statusTab === 'active' ? openAdd : undefined}
          />
        ) : groupedDebts ? (
          /* Render grouped list */
          <div className="space-y-6">
            {Object.entries(groupedDebts).map(([groupTitle, groupItems]) => {
              const groupTotal = groupItems.reduce((sum, d) => sum + Number(d.totalAmount || 0), 0);
              return (
                <div key={groupTitle} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <MaterialIcon name={grouping === 'month' ? 'calendar_month' : 'person'} className="text-primary text-base" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-on-surface">{groupTitle}</h4>
                      <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                        {groupItems.length} item
                      </span>
                    </div>
                    <span className="text-xs font-black text-on-surface-variant">{fmt(groupTotal, currencySymbol)}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupItems.map(d => (
                      <DebtCard
                        key={d.id}
                        debt={d}
                        liabilityName={getAssetName(d.liabilityAssetId)}
                        paymentName={getAssetName(d.paymentAssetId)}
                        receiveName={getAssetName(d.receiveAssetId)}
                        onEdit={() => openEdit(d)}
                        onAddPrincipal={() => setPrincipalModalDebtId(d.id)}
                        onDelete={() => {
                          setDeletingId(d.id);
                          setIsConfirmOpen(true);
                        }}
                        onPay={() => {
                          setPayingDebt(d);
                          setIsPaymentModalOpen(true);
                        }}
                        onSettle={() => {
                          setPayingDebt(d);
                          setIsPaymentModalOpen(true);
                        }}
                        onUnpay={() => updateDebt(d.id, { isPaid: false })}
                        history={transactions.filter(t => t.relatedId === d.id && !t.isDeleted).sort((a, b) => b.date.localeCompare(a.date))}
                        onToggleExpand={() => setExpandedDebtId(expandedDebtId === d.id ? null : d.id)}
                        isExpanded={expandedDebtId === d.id}
                        currencySymbol={currencySymbol}
                        onHistoryClick={(tx) => setEditingHistoryTx(tx)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Render flat grid list */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(d => (
              <DebtCard
                key={d.id}
                debt={d}
                liabilityName={getAssetName(d.liabilityAssetId)}
                paymentName={getAssetName(d.paymentAssetId)}
                receiveName={getAssetName(d.receiveAssetId)}
                onEdit={() => openEdit(d)}
                onAddPrincipal={() => setPrincipalModalDebtId(d.id)}
                onDelete={() => {
                  setDeletingId(d.id);
                  setIsConfirmOpen(true);
                }}
                onPay={() => {
                  setPayingDebt(d);
                  setIsPaymentModalOpen(true);
                }}
                onSettle={() => {
                  setPayingDebt(d);
                  setIsPaymentModalOpen(true);
                }}
                onUnpay={() => updateDebt(d.id, { isPaid: false })}
                history={transactions.filter(t => t.relatedId === d.id && !t.isDeleted).sort((a, b) => b.date.localeCompare(a.date))}
                onToggleExpand={() => setExpandedDebtId(expandedDebtId === d.id ? null : d.id)}
                isExpanded={expandedDebtId === d.id}
                currencySymbol={currencySymbol}
                onHistoryClick={(tx) => setEditingHistoryTx(tx)}
              />
            ))}
          </div>
        )}
      </div>

      <DebtModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingDebt={editingDebt}
        assets={assets}
        categories={categories.filter(c => c.type === 'pengeluaran')}
        currencySymbol={currencySymbol}
        defaultType={typeFilter === 'piutang' ? 'piutang' : 'hutang'}
      />

      {payingDebt && (
        <DebtPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          debt={payingDebt}
          assets={assets}
          currencySymbol={currencySymbol}
          paidAmountFromTxs={calculateDebtBalance(payingDebt, transactions, categories).totalPaid}
          onConfirm={(amt, assetId, date, time, note, isFull) => {
            if (isFull) {
              settleDebt(payingDebt.id, assetId, date, time, amt);
            } else {
              addDebtPayment(payingDebt.id, amt, assetId, date, time, note);
            }
            setIsPaymentModalOpen(false);
          }}
        />
      )}

      {principalModalDebtId && debts.find(d => d.id === principalModalDebtId) && (
        <DebtAddPrincipalModal
          isOpen={true}
          onClose={() => setPrincipalModalDebtId(null)}
          debt={debts.find(d => d.id === principalModalDebtId)!}
          assets={assets}
          currencySymbol={currencySymbol}
          onConfirm={(amt, assetId, date, time, note) => {
            addDebtPrincipal(principalModalDebtId, amt, assetId, date, time, note);
            setPrincipalModalDebtId(null);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setDeletingId(null);
        }}
        onConfirm={() => {
          if (deletingId) deleteDebt(deletingId);
        }}
        title="Hapus Catatan"
        message="Apakah Anda yakin ingin menghapus catatan hutang/piutang ini? Semua transaksi terkait juga akan ikut terhapus."
      />

      {offsetTarget && (
        <DebtOffsetModal
          isOpen={isOffsetModalOpen}
          onClose={() => setIsOffsetModalOpen(false)}
          onConfirm={(date) => {
            offsetDebt(offsetTarget.contact, date);
            setIsOffsetModalOpen(false);
            setOffsetTarget(null);
          }}
          contactName={offsetTarget.contact}
          totalHutang={offsetTarget.hutangTotal}
          totalPiutang={offsetTarget.piutangTotal}
          offsetAmount={offsetTarget.offsetAmount}
          currencySymbol={currencySymbol}
        />
      )}

      {editingHistoryTx && (
        <Suspense fallback={null}>
          <TransactionModal
            isOpen={!!editingHistoryTx}
            onClose={() => setEditingHistoryTx(null)}
            assets={assets}
            addTransaction={() => ({} as any)}
            updateTransaction={updateTransaction}
            deleteTransaction={deleteTransaction}
            editingTransaction={editingHistoryTx}
          />
        </Suspense>
      )}

      {/* Floating Action Button (FAB) */}
      {statusTab === 'active' && (
        <button
          data-tour="add-debt"
          data-testid="add-debt-fab"
          className={`fixed bottom-20 right-4 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-bento z-50 transition-all active:scale-95 ${typeFilter === 'piutang' ? 'bg-success shadow-success-glow' : 'bg-error shadow-error-glow'}`}
          onClick={openAdd}
          aria-label="Tambah Hutang/Piutang"
        >
          <MaterialIcon name="add" className="text-3xl" />
        </button>
      )}

      <OnboardingTutorial 
        pageKey="debts" 
        steps={[
          { targetSelector: '[data-tour="debt-summary"]', title: '📊 Ringkasan Hutang', description: 'Lihat total hutang (uang yang kamu pinjam) dan piutang (uangmu yang dipinjam orang lain).' },
          { targetSelector: '[data-tour="add-debt"]', title: '📝 Tambah Catatan', description: 'Tap tombol ini untuk mencatat hutang atau piutang baru.' },
          { targetSelector: '[data-tour="debt-modal-contact"]', title: '👤 Pilih Kontak', description: 'Pilih siapa kontak / orang yang bersangkutan dengan hutang piutang ini.', onBeforeShow: () => openAdd() },
          { targetSelector: '[data-tour="debt-modal-description"]', title: '📝 Keterangan', description: 'Tulis keterangan singkat untuk apa hutang piutang ini dibuat.' },
          { targetSelector: '[data-tour="debt-modal-amount"]', title: '💵 Nominal Pokok', description: 'Masukkan jumlah uang atau nominal pokok hutang piutang.' },
          { targetSelector: '[data-tour="debt-modal-submit"]', title: '💾 Simpan Catatan', description: 'Simpan catatan untuk mencatat data ini ke dalam sistem.' },
        ]} 
      />
    </PageWrapper>
  );
};

export default Debts;
