import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMoney, type Debt, type Transaction } from '../contexts/MoneyContext';
import { isPrincipalTx } from '../lib/utils';
import DebtModal from '../components/modals/DebtModal';
import DebtPaymentModal from '../components/modals/DebtPaymentModal';
import DebtAddPrincipalModal from '../components/modals/DebtAddPrincipalModal';
import DebtOffsetModal from '../components/modals/DebtOffsetModal';
import TransactionModal from '../components/modals/TransactionModal';
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

const fmt = (n: number, sym: string = 'Rp') => `${sym}${Math.abs(n).toLocaleString('id-ID')}`;

const getDaysUntilDue = (dueDate?: string) => {
  if (!dueDate) return null;
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
};

const DebtCard: React.FC<{
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
}> = ({
  debt, onEdit, onDelete, onPay, onAddPrincipal, onSettle, onUnpay,
  liabilityName, paymentName, receiveName, history, onToggleExpand, isExpanded,
  currencySymbol, onHistoryClick
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const isHutang = debt.type === 'hutang';
    const daysLeft = getDaysUntilDue(debt.dueDate);
    const isOverdue = daysLeft !== null && daysLeft < 0 && !debt.isPaid;
    const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && !debt.isPaid;

    const progressPct = debt.isInstallment && debt.totalInstallments
      ? Math.round((debt.paidInstallments / debt.totalInstallments) * 100)
      : null;

    const paidAmount = history.reduce((sum, tx) => {
      if (isPrincipalTx(tx.note, tx.category)) return sum;
      return sum + Number(tx.amount || 0);
    }, 0);

    const remainingAmount = Number(debt.totalAmount || 0) - paidAmount;

    let borderClass = 'border-outline-variant';
    if (debt.isPaid) borderClass = 'border-success';
    else if (isOverdue) borderClass = 'border-error';
    else if (isDueSoon) borderClass = 'border-secondary';

    let shadowClass = debt.isPaid ? 'shadow-none' : isOverdue ? 'shadow-error-glow' : 'shadow-bento';
    
    return (
      <Card
        interactive
        data-testid={`debt-card-${debt.id}`} 
        onClick={onToggleExpand}
        className={`relative transition-all mb-4 border-2 ${borderClass} ${shadowClass} ${debt.isPaid ? 'opacity-65' : 'opacity-100'}`}
      >
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          {/* Icon */}
          <IconBlock 
            icon={isHutang ? 'trending_down' : 'trending_up'} 
            color={isHutang ? 'error' : 'success'} 
            size="md" 
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-bold text-sm text-on-surface">{debt.contact}</span>
              {debt.isPaid && (
                <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full tracking-wider">LUNAS</span>
              )}
              {isOverdue && (
                <span className="text-[10px] font-bold text-error bg-error/10 px-2 py-0.5 rounded-full tracking-wider">JATUH TEMPO</span>
              )}
              {isDueSoon && (
                <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full tracking-wider">SEGERA</span>
              )}
            </div>
            <div className="text-xs text-on-surface-variant truncate">{debt.description || (isHutang ? 'Hutang' : 'Piutang')}</div>
          </div>

          {/* Menu */}
          <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(p => !p)} className="p-1 rounded-full text-on-surface-variant hover:bg-surface-subtle transition-colors">
              <MaterialIcon name="more_vert" className="text-base" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 bg-surface-container rounded-xl shadow-bento py-1 z-10 w-48 border border-outline-variant">
                <button className="w-full text-left px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-subtle flex items-center gap-2" onClick={() => { onEdit(); setMenuOpen(false); }}>
                  <MaterialIcon name="edit" className="text-[13px]" /> Edit Catatan
                </button>
                <button className="w-full text-left px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-subtle flex items-center gap-2" onClick={() => { onAddPrincipal(); setMenuOpen(false); }}>
                  <MaterialIcon name="add" className="text-[13px]" /> Tambah Nominal
                </button>
                {!debt.isPaid ? (
                  <button className="w-full text-left px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-subtle flex items-center gap-2" onClick={() => { onSettle(); setMenuOpen(false); }}>
                    <MaterialIcon name="check_circle" className="text-[13px]" /> Tandai Lunas
                  </button>
                ) : (
                  <button className="w-full text-left px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-subtle flex items-center gap-2" onClick={() => { onUnpay(); setMenuOpen(false); }}>
                    <MaterialIcon name="check_circle" className="text-[13px]" /> Tandai Belum Lunas
                  </button>
                )}
                <button className="w-full text-left px-4 py-2 text-xs font-bold text-error hover:bg-error-container/20 flex items-center gap-2" onClick={() => { onDelete(); setMenuOpen(false); }}>
                  <MaterialIcon name="delete" className="text-[13px]" /> Hapus
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className={`flex justify-between items-end ${(debt.isInstallment || paidAmount > 0) ? 'mb-3' : 'mb-0'}`}>
          <div>
            <div className="text-[11px] text-on-surface-variant font-semibold mb-0.5">
              {isHutang ? 'Total Hutang' : 'Total Piutang'}
            </div>
            <div className={`text-xl font-extrabold tracking-tight ${isHutang ? 'text-error' : 'text-success'}`}>
              {fmt(debt.totalAmount, currencySymbol)}
            </div>
          </div>
          {paidAmount > 0 && (
            <div className="text-right shrink-0">
              <div className="text-[11px] text-on-surface-variant font-semibold mb-0.5">
                {remainingAmount <= 0 ? 'Status' : (isHutang ? 'Sisa Hutang' : 'Sisa Piutang')}
              </div>
              <div className={`text-xl font-extrabold tracking-tight ${remainingAmount <= 0 ? 'text-success' : (isHutang ? 'text-error' : 'text-success')}`}>
                {remainingAmount > 0 ? fmt(remainingAmount, currencySymbol) : (remainingAmount < 0 ? `Surplus ${fmt(remainingAmount, currencySymbol)}` : 'LUNAS')}
              </div>
            </div>
          )}
        </div>

        {/* Installment progress */}
        {debt.isInstallment && (
          <div className="mb-3">
            <div className="h-1.5 bg-surface-subtle rounded-full overflow-hidden mb-1.5">
              <div className={`h-full rounded-full transition-all duration-500 ease-out ${debt.isPaid ? 'bg-success' : (isHutang ? 'bg-error' : 'bg-success')}`}
                style={{ width: `${progressPct ?? 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-on-surface-variant font-semibold">
              <span>{debt.paidInstallments} / {debt.totalInstallments || '?'} cicilan</span>
              <span>{fmt(debt.installmentAmount || 0, currencySymbol)} / bulan</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-2.5">
          {/* Info row — wraps on mobile */}
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
            {/* Show asset info */}
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

          {/* Action buttons row */}
          <div className="flex justify-end gap-2">
            {!debt.isPaid && (
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
            >
              <MaterialIcon name="chevron_right" className="text-lg" />
            </button>
          </div>
        </div>

        {/* History section */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-dashed border-outline-variant animate-in fade-in">
            <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2.5">
              Riwayat Transaksi
            </div>
            {history.length === 0 ? (
              <div className="text-xs text-on-surface-variant italic py-2">
                Belum ada riwayat pembayaran.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[13px] text-on-surface-variant">Total Pinjaman:</span>
                  <span className="text-[13px] font-bold text-on-surface">{fmt(debt.totalAmount, currencySymbol)}</span>
                </div>
                {history.map(tx => (
                  <div key={tx.id} onClick={() => onHistoryClick?.(tx)} className={`flex justify-between items-center ${onHistoryClick ? 'cursor-pointer hover:bg-surface-subtle rounded-lg p-1.5 -mx-1.5' : ''}`}>
                    <div>
                      <div className="text-[13px] font-bold text-on-surface">{tx.note}</div>
                      <div className="text-[11px] text-on-surface-variant">{tx.date}</div>
                    </div>
                    <div className={`font-extrabold text-[13px] ${tx.type === 'pendapatan' ? 'text-success' : 'text-on-surface'}`}>
                      {tx.type === 'pengeluaran' ? '-' : tx.type === 'pendapatan' ? '+' : ''}{fmt(tx.amount, currencySymbol)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

const Debts: React.FC = () => {
  const { debts, transactions, assets, categories, addDebt, updateDebt, deleteDebt, settleDebt, addDebtPayment, addDebtPrincipal, offsetDebt, currencySymbol, updateTransaction, deleteTransaction } = useMoney();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [editingHistoryTx, setEditingHistoryTx] = useState<Transaction | null>(null);
  const [filter, setFilter] = useState<'all' | 'hutang' | 'piutang' | 'lunas'>('all');
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [principalModalDebtId, setPrincipalModalDebtId] = useState<string | null>(null);
  const [offsetTarget, setOffsetTarget] = useState<{ contact: string; h: number; p: number; amt: number } | null>(null);
  const [isOffsetModalOpen, setIsOffsetModalOpen] = useState(false);

  const openAdd = () => { setEditingDebt(null); setIsModalOpen(true); };
  const openEdit = (d: Debt) => { setEditingDebt(d); setIsModalOpen(true); };
  const handleSave = (data: Omit<Debt, 'id'>, initialMode?: 'none' | 'cash' | 'credit', categoryName?: string) => {
    if (editingDebt) updateDebt(editingDebt.id, data);
    else addDebt(data, initialMode ?? 'none', categoryName);
  };

  const getAssetName = (id?: string) => assets.find(a => a.id === id)?.name;

  const summary = useMemo(() => {
    let totalHutang = 0, totalPiutang = 0;
    debts.forEach(d => {
      if (d.isPaid) return;
      const history = transactions.filter(t => t.relatedId === d.id);
      const paidAmt = history.reduce((sum, tx) => {
        return isPrincipalTx(tx.note, tx.category) ? sum : sum + Number(tx.amount || 0);
      }, 0);

      const remaining = Math.max(0, Number(d.totalAmount || 0) - paidAmt);
      if (d.type === 'hutang') totalHutang += remaining;
      else totalPiutang += remaining;
    });
    return { totalHutang, totalPiutang, net: totalPiutang - totalHutang };
  }, [debts, transactions]);

  const offsetPotentials = useMemo(() => {
    const contactMap: Record<string, { h: number; p: number }> = {};
    debts.forEach(d => {
      if (d.isPaid) return;
      const history = transactions.filter(t => t.relatedId === d.id);
      const paidAmt = history.reduce((sum, tx) => {
        return isPrincipalTx(tx.note, tx.category) ? sum : sum + Number(tx.amount || 0);
      }, 0);
      const remaining = Math.max(0, Number(d.totalAmount || 0) - paidAmt);
      if (remaining <= 0) return;

      if (!contactMap[d.contact]) contactMap[d.contact] = { h: 0, p: 0 };
      if (d.type === 'hutang') contactMap[d.contact].h += remaining;
      else contactMap[d.contact].p += remaining;
    });

    return Object.entries(contactMap)
      .filter(([_, vals]) => vals.h > 0 && vals.p > 0)
      .map(([name, vals]) => ({
        contact: name,
        h: vals.h,
        p: vals.p,
        amt: Math.min(vals.h, vals.p)
      }));
  }, [debts, transactions]);

  const { showToast } = useToast();

  // Always keep ref to latest offsetDebt to avoid stale closure in the effect below
  const offsetDebtRef = useRef(offsetDebt);
  useEffect(() => { offsetDebtRef.current = offsetDebt; });

  // Auto-offset: cascade — processes one contact per render cycle to stay fresh
  useEffect(() => {
    if (offsetPotentials.length === 0) return;
    const p = offsetPotentials[0];
    offsetDebtRef.current(p.contact);
    showToast(
      `↔ Potong silang otomatis: ${p.contact} · ${currencySymbol}${p.amt.toLocaleString('id-ID')}`,
      'success'
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offsetPotentials]);

  const filtered = useMemo(() => {
    return debts.filter(d => {
      if (filter === 'lunas') return d.isPaid;
      if (filter === 'hutang') return d.type === 'hutang' && !d.isPaid;
      if (filter === 'piutang') return d.type === 'piutang' && !d.isPaid;
      return !d.isPaid; // 'all' shows active only
    }).sort((a, b) => {
      // Sort: overdue first → due soon → no due date
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDue - bDue;
    });
  }, [debts, filter]);

  return (
    <PageWrapper>
      {/* Header */}
      <PageHeader 
        title="Hutang & Piutang" 
        subtitle="Kelola semua catatan hutang & piutangmu" 
      />

      {/* Summary cards */}
      <div data-tour="debt-summary" className="grid grid-cols-2 gap-3 mb-5">
        <MetricCard
          label="Total Hutang"
          value={fmt(summary.totalHutang, currencySymbol)}
          icon="trending_down"
          iconColor="error"
          valueColor="text-error"
          glowColor="error"
          data-testid="debt-summary-hutang"
        />
        <MetricCard
          label="Total Piutang"
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
        <div data-testid="debt-net-position" className={`flex items-center gap-2 p-3 rounded-2xl mb-3 ${summary.net >= 0 ? 'bg-success/10 border border-success/20 text-success' : 'bg-error text-white shadow-error-glow'}`}>
          <MaterialIcon name="chevron_right" className="text-sm" />
          <span className="text-sm font-bold">
            {summary.net >= 0
               ? `Neto: kamu memiliki piutang lebih banyak ${fmt(summary.net, currencySymbol)}`
               : `Neto: kamu berhutang lebih banyak ${fmt(Math.abs(summary.net), currencySymbol)}`}
          </span>
        </div>
      )}

      {/* Offset Banner */}
      {offsetPotentials.length > 0 && (
        <div data-testid="debt-offset-banner" className="mb-5 p-4 rounded-3xl bg-gradient-to-br from-success to-[#1e7e46] text-white shadow-success-glow flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <MaterialIcon name="sync_alt" className="text-xl" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold">Tersedia Potong Silang (Offset)</div>
            <div className="text-xs font-semibold opacity-90">
              Ada {offsetPotentials.length} kontak dengan hutang & piutang aktif.
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

      {/* Filter tabs */}
      <div className="mb-4">
        <SegmentedControl
          tabs={[
            { id: 'all', label: 'Aktif' },
            { id: 'hutang', label: 'Hutang' },
            { id: 'piutang', label: 'Piutang' },
            { id: 'lunas', label: 'Lunas' }
          ]}
          activeTabId={filter}
          onChange={(val) => setFilter(val as any)}
        />
      </div>

      {/* Debt list */}
      <div className="flex flex-col gap-3 pb-24">
        {filtered.length === 0 ? (
          <EmptyState 
            icon="receipt_long" 
            title={filter === 'lunas' ? 'Belum ada yang lunas' : 'Tidak ada catatan hutang/piutang'} 
            description="Tambah catatan hutang atau piutang kamu." 
            actionLabel={filter !== 'lunas' ? "+ Tambah Sekarang" : undefined}
            onAction={filter !== 'lunas' ? openAdd : undefined}
          />
        ) : (
          filtered.map(d => (
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
              history={transactions.filter(t => t.relatedId === d.id).sort((a, b) => b.date.localeCompare(a.date))}
              onToggleExpand={() => setExpandedDebtId(expandedDebtId === d.id ? null : d.id)}
              isExpanded={expandedDebtId === d.id}
              currencySymbol={currencySymbol}
              onHistoryClick={(tx) => setEditingHistoryTx(tx)}
            />
          ))
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
        defaultType={filter === 'piutang' ? 'piutang' : 'hutang'}
      />

      {payingDebt && (
        <DebtPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          debt={payingDebt}
          assets={assets}
          currencySymbol={currencySymbol}
          paidAmountFromTxs={transactions.filter(t => t.relatedId === payingDebt.id).reduce((sum, tx) => {
            return isPrincipalTx(tx.note, tx.category) ? sum : sum + tx.amount;
          }, 0)}
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
          totalHutang={offsetTarget.h}
          totalPiutang={offsetTarget.p}
          offsetAmount={offsetTarget.amt}
          currencySymbol={currencySymbol}
        />
      )}

      {editingHistoryTx && (
        <TransactionModal
          isOpen={!!editingHistoryTx}
          onClose={() => setEditingHistoryTx(null)}
          assets={assets}
          addTransaction={() => ({} as any)} // Not used when editing
          updateTransaction={updateTransaction}
          deleteTransaction={deleteTransaction}
          editingTransaction={editingHistoryTx}
        />
      )}

      {/* Floating Action Button (FAB) matching Transactions page (Dynamic Theme & Visibility) */}
      {filter !== 'lunas' && (
        <button
          data-tour="add-debt"
          data-testid="add-debt-fab"
          className={`fixed bottom-20 right-4 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-bento z-50 transition-all active:scale-95 ${filter === 'piutang' ? 'bg-success shadow-success-glow' : 'bg-error shadow-error-glow'}`}
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
