import React, { useState, useMemo } from 'react';
import { Plus, CheckCircle2, ChevronRight, Edit2, Trash2, PlayCircle, MoreVertical, TrendingDown, TrendingUp, ArrowRightLeft, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMoney, type Debt, type Transaction } from '../contexts/MoneyContext';
import { isPrincipalTx } from '../lib/utils';
import DebtModal from '../components/modals/DebtModal';
import DebtPaymentModal from '../components/modals/DebtPaymentModal';
import DebtAddPrincipalModal from '../components/modals/DebtAddPrincipalModal';
import DebtOffsetModal from '../components/modals/DebtOffsetModal';
import ConfirmDialog from '../components/common/ConfirmDialog';

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
}> = ({
  debt, onEdit, onDelete, onPay, onAddPrincipal, onSettle, onUnpay,
  liabilityName, paymentName, receiveName, history, onToggleExpand, isExpanded,
  currencySymbol
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

    const borderColor = debt.isPaid ? 'var(--success)' : isOverdue ? 'var(--danger)' : isDueSoon ? 'var(--secondary)' : 'var(--border-color)';

    return (
      <div style={{
        background: 'var(--bg-card)', borderRadius: 18, padding: '16px 20px',
        border: `1.5px solid ${borderColor}`,
        boxShadow: debt.isPaid ? 'none' : isOverdue ? '0 4px 16px var(--danger-glow)' : '0 4px 20px rgba(0,0,0,0.02)',
        opacity: debt.isPaid ? 0.65 : 1,
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }} onClick={onToggleExpand}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          {/* Icon */}
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: isHutang ? 'var(--bg-expense)' : 'var(--bg-income)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isHutang ? 'var(--danger)' : 'var(--primary)',
          }}>
            {isHutang ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)' }}>{debt.contact}</span>
              {debt.isPaid && (
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--success)', background: 'var(--success-glow)', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em' }}>LUNAS</span>
              )}
              {isOverdue && (
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--danger)', background: 'var(--danger-glow)', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em' }}>JATUH TEMPO</span>
              )}
              {isDueSoon && (
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--secondary)', background: 'var(--secondary-glow)', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em' }}>SEGERA</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{debt.description || (isHutang ? 'Hutang' : 'Piutang')}</div>
          </div>

          {/* Menu */}
          <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(p => !p)} className="btn-icon" style={{ padding: 4 }}>
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="budget-dropdown" style={{ right: 0, top: 32 }}>
                <button className="budget-dropdown-item" onClick={() => { onEdit(); setMenuOpen(false); }}><Edit2 size={13} /> Edit Catatan</button>
                <button className="budget-dropdown-item" onClick={() => { onAddPrincipal(); setMenuOpen(false); }}><Plus size={13} /> Tambah Nominal</button>
                {!debt.isPaid ? (
                  <button className="budget-dropdown-item" onClick={() => { onSettle(); setMenuOpen(false); }}>
                    <CheckCircle2 size={13} /> Tandai Lunas
                  </button>
                ) : (
                  <button className="budget-dropdown-item" onClick={() => { onUnpay(); setMenuOpen(false); }}>
                    <CheckCircle2 size={13} /> Tandai Belum Lunas
                  </button>
                )}
                <button className="budget-dropdown-item danger" onClick={() => { onDelete(); setMenuOpen(false); }}><Trash2 size={13} /> Hapus</button>
              </div>
            )}
          </div>
        </div>

        {/* Amount */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: (debt.isInstallment || paidAmount > 0) ? 12 : 0 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>
              {isHutang ? 'Total Hutang' : 'Total Piutang'}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: isHutang ? 'var(--danger)' : 'var(--primary)', letterSpacing: '-0.5px' }}>
              {fmt(debt.totalAmount, currencySymbol)}
            </div>
          </div>
          {paidAmount > 0 && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>
                {remainingAmount <= 0 ? 'Status' : (isHutang ? 'Sisa Hutang' : 'Sisa Piutang')}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: remainingAmount <= 0 ? 'var(--success)' : (isHutang ? 'var(--danger)' : 'var(--primary)'), letterSpacing: '-0.5px' }}>
                {remainingAmount > 0 ? fmt(remainingAmount, currencySymbol) : (remainingAmount < 0 ? `Surplus ${fmt(remainingAmount, currencySymbol)}` : 'LUNAS')}
              </div>
            </div>
          )}
        </div>

        {/* Installment progress */}
        {debt.isInstallment && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ height: 6, background: 'var(--bg-neutral)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${progressPct ?? 0}%`,
                background: debt.isPaid ? 'var(--success)' : 'var(--primary)',
                transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
              <span>{debt.paidInstallments} / {debt.totalInstallments || '?'} cicilan</span>
              <span>{fmt(debt.installmentAmount || 0, currencySymbol)} / bulan</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 10 }}>
          {/* Info row — wraps on mobile */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
            {debt.dueDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} />
                <span style={{ color: isOverdue ? 'var(--danger)' : isDueSoon ? 'var(--secondary)' : 'inherit' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ opacity: 0.7 }}>Hutang di:</span>
                    <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{liabilityName}</span>
                  </div>
                )}
                {paymentName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <ArrowRightLeft size={10} />
                    <span style={{ opacity: 0.7 }}>Bayar via:</span>
                    <span style={{ fontWeight: 700 }}>{paymentName}</span>
                  </div>
                )}
              </>
            ) : (
              receiveName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <ArrowRightLeft size={10} />
                  <span style={{ opacity: 0.7 }}>Terima ke:</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{receiveName}</span>
                </div>
              )
            )}
          </div>

          {/* Action buttons row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {!debt.isPaid && (
              <button
                onClick={(e) => { e.stopPropagation(); onPay(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 10,
                  background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  boxShadow: '0 3px 10px var(--primary-glow)', whiteSpace: 'nowrap',
                }}
              >
                <PlayCircle size={14} /> Cicil / Lunas
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              className="btn-icon"
              style={{
                padding: 4, transform: isExpanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.3s'
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* History section */}
        {isExpanded && (
          <div style={{
            marginTop: 16, paddingTop: 16, borderTop: '1px dashed var(--border-color)',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
              Riwayat Transaksi
            </div>
            {history.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
                Belum ada riwayat pembayaran.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Pinjaman:</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{fmt(debt.totalAmount, currencySymbol)}</span>
                </div>
                {history.map(tx => (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{tx.note}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.date}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: tx.type === 'pendapatan' ? 'var(--primary)' : 'var(--text-main)' }}>
                      {tx.type === 'pengeluaran' ? '-' : tx.type === 'pendapatan' ? '+' : ''}{fmt(tx.amount, currencySymbol)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

const Debts: React.FC = () => {
  const { debts, transactions, assets, categories, addDebt, updateDebt, deleteDebt, settleDebt, addDebtPayment, addDebtPrincipal, offsetDebt, currencySymbol } = useMoney();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
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
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="title" style={{ margin: 0 }}>Hutang & Piutang</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>Kelola semua catatan hutang & piutangmu</p>
        </div>
        <button
          onClick={openAdd}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--primary-gradient)', color: '#fff',
            border: 'none', borderRadius: 14, padding: '10px 16px',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            boxShadow: '0 4px 16px var(--primary-glow)',
          }}
        >
          <Plus size={16} /> Tambah
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          padding: '16px',
          border: '1.5px solid var(--border-color)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            width: 4,
            background: 'var(--danger)'
          }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total Hutang</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>{fmt(summary.totalHutang, currencySymbol)}</div>
        </div>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          padding: '16px',
          border: '1.5px solid var(--border-color)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            width: 4,
            background: 'var(--primary)'
          }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total Piutang</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>{fmt(summary.totalPiutang, currencySymbol)}</div>
        </div>
      </div>

      {/* Net position */}
      {(summary.totalHutang > 0 || summary.totalPiutang > 0) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          borderRadius: 12, marginBottom: 12,
          background: summary.net >= 0 ? 'var(--bg-income)' : 'var(--bg-expense)',
          border: `1px solid ${summary.net >= 0 ? 'hsla(var(--p-h), 80%, 54%, 0.25)' : 'hsla(355, 75%, 54%, 0.25)'}`,
        }}>
          <ChevronRight size={14} color={summary.net >= 0 ? 'var(--primary)' : 'var(--danger)'} />
          <span style={{ fontSize: 13, fontWeight: 700, color: summary.net >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
            {summary.net >= 0
               ? `Neto: kamu memiliki piutang lebih banyak ${fmt(summary.net, currencySymbol)}`
               : `Neto: kamu berhutang lebih banyak ${fmt(summary.net, currencySymbol)}`}
          </span>
        </div>
      )}

      {/* Offset Banner */}
      {offsetPotentials.length > 0 && (
        <div style={{
          marginBottom: 20, padding: '14px', borderRadius: '16px',
          background: 'var(--primary-gradient)', color: 'white',
          boxShadow: '0 8px 20px var(--primary-glow)',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.2)', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <ArrowRightLeft size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 800 }}>Tersedia Potong Silang (Offset)</div>
            <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 600 }}>
              Ada {offsetPotentials.length} kontak dengan hutang & piutang aktif.
            </div>
          </div>
          <button
            onClick={() => {
              setOffsetTarget(offsetPotentials[0]);
              setIsOffsetModalOpen(true);
            }}
            style={{
              padding: '8px 16px', borderRadius: '10px', background: 'white',
              color: 'var(--primary)', border: 'none', fontWeight: 800,
              fontSize: '12px', cursor: 'pointer'
            }}
          >
            Selesaikan
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--bg-neutral)', borderRadius: 12, padding: 4, position: 'relative' }}>
        {([['all', 'Aktif'], ['hutang', 'Hutang'], ['piutang', 'Piutang'], ['lunas', 'Lunas']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              border: 'none',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              background: 'transparent',
              color: filter === key ? 'var(--text-main)' : 'var(--text-muted)',
              position: 'relative',
              transition: 'color 0.2s ease',
            }}
          >
            {filter === key && (
              <motion.div
                layoutId="activeDebtFilter"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'var(--bg-card)',
                  borderRadius: 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  zIndex: 1,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 2 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Debt list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 100 }}>
        {filtered.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)', border: '2px dashed var(--border-color)',
            borderRadius: 18, padding: '40px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)', marginBottom: 4 }}>
              {filter === 'lunas' ? 'Belum ada yang lunas' : 'Tidak ada catatan hutang/piutang'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
              Tambah catatan hutang atau piutang kamu.
            </div>
            {filter !== 'lunas' && (
              <button onClick={openAdd} style={{
                background: 'var(--primary-gradient)', color: '#fff', border: 'none',
                borderRadius: 12, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>+ Tambah Sekarang</button>
            )}
          </div>
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
    </div>
  );
};

export default Debts;
