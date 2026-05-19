import React, { useMemo, useState } from 'react';
import { X, Share2, ArrowRight, CheckCircle2, Wallet, ChevronRight, ExternalLink, Info, History as HistoryIcon } from 'lucide-react';
import AssetSelectModal from './AssetSelectModal';
import { motion, AnimatePresence } from 'framer-motion';
import { type Trip, type TripExpense, useMoney } from '../../contexts/MoneyContext';
import { useToast } from '../common/Toast';
import { getLocalDate, getLocalTime, isPrincipalTx } from '../../lib/utils';
import SettlementExplanationModal from './SettlementExplanationModal';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  expenses: TripExpense[];
}

const SettleUpModal: React.FC<SettleUpModalProps> = ({ isOpen, onClose, trip, expenses }) => {
  const { user, currencySymbol, debts, transactions, assets, addDebtPayment, addTransaction, updateTrip, defaultAssetId, getAssetBalance } = useMoney();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'simple' | 'detailed'>(trip.settlementMode || 'simple');
  const [settlingTx, setSettlingTx] = useState<any | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(defaultAssetId || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);
  const [isAssetSelectOpen, setIsAssetSelectOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState<number>(0);

  const settlement = useMemo(() => {
    // 1. Calculate net balances
    const balances: Record<string, number> = {};
    const consumed: Record<string, number> = {};
    const paid: Record<string, number> = {};
    trip.members.forEach(m => {
      balances[m.id] = 0;
      consumed[m.id] = 0;
      paid[m.id] = 0;
    });

    expenses.forEach(e => {
      // Payer gets back the full amount they paid
      if (paid[e.payerId] !== undefined) {
        paid[e.payerId] += e.amount;
        balances[e.payerId] += e.amount;
      }
      // Each member (including payer) owes their split amount
      e.splits.forEach(s => {
        if (consumed[s.memberId] !== undefined) {
          consumed[s.memberId] += s.amount;
          balances[s.memberId] -= s.amount;
        }
      });
    });

    // Ensure zero-sum (handle small rounding residues)
    const sum = Object.values(balances).reduce((a, b) => a + b, 0);
    if (Math.abs(sum) > 0.01 && trip.members.length > 0) {
      const biggestKey = Object.keys(balances).reduce((a, b) => 
        Math.abs(balances[a]) > Math.abs(balances[b]) ? a : b
      );
      balances[biggestKey] -= sum;
    }

    // 2. Simple Mode (Greedy)
    const simpleTransactions: { from: string, to: string, amount: number }[] = [];
    const tempBalances = { ...balances };
    
    // Sort keys alphabetically by ID to guarantee deterministic calculations across duplicate/cloned trips
    const debtors = Object.keys(tempBalances).filter(id => tempBalances[id] < -0.5).sort();
    const creditors = Object.keys(tempBalances).filter(id => tempBalances[id] > 0.5).sort();
    
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amountNeeded = -tempBalances[debtor];
      const amountAvailable = tempBalances[creditor];
      const amount = Math.min(amountNeeded, amountAvailable);
      
      if (amount > 0.5) {
        simpleTransactions.push({ from: debtor, to: creditor, amount: Math.round(amount) });
      }
      
      tempBalances[debtor] += amount;
      tempBalances[creditor] -= amount;
      
      if (tempBalances[debtor] > -0.5) i++;
      if (tempBalances[creditor] < 0.5) j++;
    }

    // 3. Detailed Mode (Proportional / Full Breakdown)
    const iouMap: Record<string, Record<string, number>> = {};
    trip.members.forEach(m1 => {
      iouMap[m1.id] = {};
      trip.members.forEach(m2 => {
        iouMap[m1.id][m2.id] = 0;
      });
    });

    expenses.forEach(e => {
      e.splits.forEach(s => {
        if (s.memberId !== e.payerId) {
          iouMap[s.memberId][e.payerId] += s.amount;
        }
      });
    });

    const detailedTransactions: { from: string, to: string, amount: number }[] = [];
    const processedPairs = new Set<string>();

    trip.members.forEach(m1 => {
      trip.members.forEach(m2 => {
        if (m1.id === m2.id) return;
        const pairKey = [m1.id, m2.id].sort().join('-');
        if (processedPairs.has(pairKey)) return;
        processedPairs.add(pairKey);

        const m1OwesM2 = iouMap[m1.id][m2.id];
        const m2OwesM1 = iouMap[m2.id][m1.id];

        if (m1OwesM2 > m2OwesM1) {
          const diff = m1OwesM2 - m2OwesM1;
          if (diff > 0.5) detailedTransactions.push({ from: m1.id, to: m2.id, amount: Math.round(diff) });
        } else if (m2OwesM1 > m1OwesM2) {
          const diff = m2OwesM1 - m1OwesM2;
          if (diff > 0.5) detailedTransactions.push({ from: m2.id, to: m1.id, amount: Math.round(diff) });
        }
      });
    });

    return { 
      balances,
      consumed,
      paid,
      simpleTransactions,
      detailedTransactions,
      transactions: mode === 'simple' ? simpleTransactions : detailedTransactions 
    };
  }, [trip, expenses, mode]);

  const [isSharing, setIsSharing] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);

  const handleShareLink = async () => {
    setIsSharing(true);
    try {
      const id = await import('../../lib/db').then(m => m.dbSaveSharedSplit({
        type: 'trip',
        sourceId: trip.id,
        merchantName: trip.name,
        date: trip.startDate,
        endDate: trip.endDate,
        totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
        currencySymbol,
        settlementMode: mode,
        splits: settlement.transactions.map(t => {
          const fromMember = trip.members.find(m => m.id === t.from);
          const toMember = trip.members.find(m => m.id === t.to);
          const fromName = fromMember ? (fromMember.id === 'me' ? (user.name || 'User') : fromMember.name) : 'Unknown';
          const toName = toMember ? (toMember.id === 'me' ? (user.name || 'User') : toMember.name) : 'Unknown';
          return {
            from: fromName,
            to: toName,
            amount: Number(t.amount) || 0
          };
        }),
        secondarySplits: (mode === 'simple' ? settlement.detailedTransactions : settlement.simpleTransactions).map(t => {
          const fromMember = trip.members.find(m => m.id === t.from);
          const toMember = trip.members.find(m => m.id === t.to);
          const fromName = fromMember ? (fromMember.id === 'me' ? (user.name || 'User') : fromMember.name) : 'Unknown';
          const toName = toMember ? (toMember.id === 'me' ? (user.name || 'User') : toMember.name) : 'Unknown';
          return {
            from: fromName,
            to: toName,
            amount: Number(t.amount) || 0
          };
        }),
        members: trip.members.map(m => m.id === 'me' ? { ...m, name: user.name || 'User' } : m),
        tripExpenses: expenses.map(e => {
          const payerMember = trip.members.find(m => m.id === e.payerId);
          const payerName = payerMember ? (payerMember.id === 'me' ? (user.name || 'User') : payerMember.name) : 'Unknown';
          return {
            id: e.id,
            description: e.description,
            amount: e.amount,
            payerId: e.payerId,
            payer: payerName,
            date: e.date,
            splits: e.splits,
            items: e.items
          };
        })
      }));
      setShareId(id);
      showToast('Link sharing berhasil dibuat!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal membuat link sharing. Pastikan Anda online.', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareId) return;
    const url = `${window.location.origin}/shared-split/${shareId}`;
    navigator.clipboard.writeText(url);
    showToast('Link disalin!', 'success');
  };

  const handleMarkAsPaid = async (t: any, idx: number, assetId: string, actualAmount?: number) => {
    if (!assetId) {
      showToast('Pilih sumber dana terlebih dahulu!', 'warning');
      return;
    }

    const payAmtToRecord = actualAmount !== undefined ? actualAmount : t.amount;
    if (payAmtToRecord <= 0) return;

    const fromName = trip.members.find(m => m.id === t.from)?.name || 'Unknown';
    const toName = trip.members.find(m => m.id === t.to)?.name || 'Unknown';
    
    setIsProcessing(true);
    try {
      const settlementKey = `${t.from}-${t.to}-${t.amount}-${idx}`;
      const baseKey = `${t.from}-${t.to}-${idx}`;

      // Determine contact name for debt lookup
      let contactName = '';
      let targetType: 'hutang' | 'piutang' | null = null;
      if (t.from === 'me') {
        contactName = toName;  // I owe them → hutang, contact = creditor name
        targetType = 'hutang';
      } else if (t.to === 'me') {
        contactName = fromName; // They owe me → piutang, contact = debtor name
        targetType = 'piutang';
      }

      // Find existing debts linked to this trip's expenses
      const tripExpenseIds = new Set(expenses.map(e => e.id));
      const relatedDebts = debts.filter(d =>
        d.type === targetType &&
        !d.isPaid &&
        ((d.relatedId && tripExpenseIds.has(d.relatedId)) || d.description.toLowerCase().includes(`[trip: ${trip.name.toLowerCase()}]`))
      );

      if (relatedDebts.length > 0 && contactName) {
        // Prioritize the direct contact's debts first, then others
        const sortedDebts = [...relatedDebts].sort((a, b) => {
          const aIsContact = a.contact.toLowerCase().trim() === contactName.toLowerCase().trim();
          const bIsContact = b.contact.toLowerCase().trim() === contactName.toLowerCase().trim();
          if (aIsContact && !bIsContact) return -1;
          if (!aIsContact && bIsContact) return 1;
          return 0;
        });

        // Calculate remaining amount for each related debt
        const activeDebts = sortedDebts.map(d => {
          const history = transactions.filter(tx => tx.relatedId === d.id);
          const paidAmt = history.reduce((sum, tx) => {
            if (isPrincipalTx(tx.note, tx.category)) return sum;
            return sum + Number(tx.amount || 0);
          }, 0);
          const remaining = Math.max(0, Number(d.totalAmount || 0) - paidAmt);
          return { debt: d, remaining };
        }).filter(item => item.remaining > 0);

        if (activeDebts.length > 0) {
          let paymentLeft = payAmtToRecord;

          // Sequentially allocate payment across related debts
          for (let i = 0; i < activeDebts.length; i++) {
            if (paymentLeft <= 0) break;
            const item = activeDebts[i];
            const portion = Math.min(paymentLeft, item.remaining);

            if (portion > 0) {
              addDebtPayment(
                item.debt.id,
                portion,
                assetId,
                getLocalDate(),
                getLocalTime(),
                `Pelunasan Trip: ${trip.name} (${item.debt.contact})`
              );
              paymentLeft -= portion;
            }
          }

          // If there is still a surplus leftover after paying off all trip debts, record a standalone transaction for the surplus
          if (paymentLeft > 0) {
            if (t.to === 'me') {
              addTransaction({
                type: 'piutang_masuk',
                amount: paymentLeft,
                category: 'Pelunasan Piutang',
                date: getLocalDate(),
                time: getLocalTime(),
                note: `Pelunasan Trip (Surplus): ${trip.name} (${fromName} → ${toName})`,
                assetId,
              });
            } else {
              addTransaction({
                type: 'hutang_keluar',
                amount: paymentLeft,
                category: 'Bayar Hutang',
                date: getLocalDate(),
                time: getLocalTime(),
                note: `Pelunasan Trip (Surplus): ${trip.name} (${fromName} → ${toName})`,
                assetId,
              });
            }
          }
        } else {
          // Fallback if activeDebts list evaluates to empty
          if (t.to === 'me') {
            addTransaction({
              type: 'piutang_masuk',
              amount: payAmtToRecord,
              category: 'Pelunasan Piutang',
              date: getLocalDate(),
              time: getLocalTime(),
              note: `Pelunasan Trip: ${trip.name} (${fromName} → ${toName})`,
              assetId,
            });
          } else {
            addTransaction({
              type: 'hutang_keluar',
              amount: payAmtToRecord,
              category: 'Bayar Hutang',
              date: getLocalDate(),
              time: getLocalTime(),
              note: `Pelunasan Trip: ${trip.name} (${fromName} → ${toName})`,
              assetId,
            });
          }
        }
      } else if (t.from === 'me' || t.to === 'me') {
        // No existing debts found (expense was "Hanya Catat" originally)
        // Create a standalone TX to record the money movement
        if (t.to === 'me') {
          // They pay me → piutang_masuk (money in)
          addTransaction({
            type: 'piutang_masuk',
            amount: payAmtToRecord,
            category: 'Pelunasan Piutang',
            date: getLocalDate(),
            time: getLocalTime(),
            note: `Pelunasan Trip: ${trip.name} (${fromName} → ${toName})`,
            assetId,
          });
        } else {
          // I pay them → hutang_keluar (money out)
          addTransaction({
            type: 'hutang_keluar',
            amount: payAmtToRecord,
            category: 'Bayar Hutang',
            date: getLocalDate(),
            time: getLocalTime(),
            note: `Pelunasan Trip: ${trip.name} (${fromName} → ${toName})`,
            assetId,
          });
        }
      }

      // Update paid amounts for this transaction slot
      const currentPaid = trip.settlementPaidAmounts?.[baseKey] || 0;
      const newPaid = currentPaid + payAmtToRecord;
      const updatedPaidAmounts = {
        ...(trip.settlementPaidAmounts || {}),
        [baseKey]: newPaid
      };

      // Mark as fully settled in paidSettlements if it meets or exceeds target
      let updatedPaid = [...(trip.paidSettlements || [])];
      if (newPaid >= t.amount && !updatedPaid.includes(settlementKey)) {
        updatedPaid.push(settlementKey);
      }

      await updateTrip(trip.id, {
        settlementMode: mode,
        paidSettlements: updatedPaid,
        settlementPaidAmounts: updatedPaidAmounts
      });

      showToast(`Pembayaran sebesar Rp ${payAmtToRecord.toLocaleString('id-ID')} dicatat!`, 'success');
      setSettlingTx(null);
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses penyelesaian.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };


  if (!isOpen) return null;

  return (
    <>

    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="modal-content"
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Settle Up</h2>
            <button onClick={onClose} className="btn-icon">
              <X size={20} />
            </button>
          </div>

          {settlingTx ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button onClick={() => setSettlingTx(null)} className="btn-icon">
                  <X size={18} />
                </button>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Pilih Aset & Jumlah Bayar</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Total Target: {currencySymbol}{settlingTx.amount.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Settle Amount Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Jumlah Pembayaran
                </label>
                <input 
                  type="number"
                  value={settleAmount || ''}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const baseKey = `${settlingTx.from}-${settlingTx.to}-${settlingTx.idx}`;
                    const paidSoFar = trip.settlementPaidAmounts?.[baseKey] || 0;
                    const maxAllowed = Math.max(0, settlingTx.amount - paidSoFar);
                    setSettleAmount(Math.min(maxAllowed, Math.max(0, val)));
                  }}
                  placeholder="Masukkan nominal"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    border: '1.5px solid var(--border-color)', background: 'var(--bg-neutral)',
                    color: 'var(--text-main)', fontSize: '15px', fontWeight: 700,
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px', fontWeight: 600 }}>
                  Sisa yang harus dibayar: {currencySymbol}{Math.max(0, settlingTx.amount - (trip.settlementPaidAmounts?.[`${settlingTx.from}-${settlingTx.to}-${settlingTx.idx}`] || 0)).toLocaleString('id-ID')}
                </span>
              </div>

              <div style={{ display: 'grid', gap: '8px', marginBottom: '32px' }}>
                <button
                  type="button"
                  onClick={() => setIsAssetSelectOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                    borderRadius: '16px', background: 'var(--bg-neutral)',
                    border: `1px solid var(--border-color)`,
                    width: '100%', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                    color: 'var(--text-main)'
                  }}
                >
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '10px', 
                    background: 'var(--bg-card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Wallet size={20} color={'var(--text-muted)'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>{assets.find(a => a.id === selectedAssetId)?.name || 'Pilih Rekening'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Saldo: {currencySymbol}{getAssetBalance(selectedAssetId).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)' }}>Ganti</div>
                </button>

                <AssetSelectModal
                  isOpen={isAssetSelectOpen}
                  onClose={() => setIsAssetSelectOpen(false)}
                  assets={assets}
                  selectedAssetId={selectedAssetId}
                  onSelect={(id) => { setSelectedAssetId(id); setIsAssetSelectOpen(false); }}
                />

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px' }}>
                <button onClick={() => setSettlingTx(null)} className="btn btn-secondary">Batal</button>
                <button 
                  onClick={() => handleMarkAsPaid(settlingTx, settlingTx.idx, selectedAssetId, settleAmount)} 
                  disabled={isProcessing || !selectedAssetId || settleAmount <= 0}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: (!selectedAssetId || settleAmount <= 0) ? 0.5 : 1 }}
                >
                  {isProcessing ? 'Memproses...' : !selectedAssetId ? 'Pilih Aset Dulu' : settleAmount <= 0 ? 'Nominal tidak valid' : 'Konfirmasi Pelunasan'}
                  {!isProcessing && selectedAssetId && settleAmount > 0 && <ChevronRight size={18} />}
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Mode Toggle */}
              <div style={{ 
                display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--bg-neutral)', 
                padding: '4px', borderRadius: '16px', marginBottom: '24px',
                opacity: trip.settlementMode ? 0.6 : 1,
                pointerEvents: trip.settlementMode ? 'none' : 'auto',
                position: 'relative'
              }}>
                <button 
                  onClick={() => setMode('simple')}
                  style={{ 
                    padding: '10px', borderRadius: '12px', border: 'none', fontSize: '13px', fontWeight: 700,
                    background: mode === 'simple' ? 'var(--bg-card)' : 'transparent',
                    color: mode === 'simple' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: mode === 'simple' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  Simple
                </button>
                <button 
                  onClick={() => setMode('detailed')}
                  style={{ 
                    padding: '10px', borderRadius: '12px', border: 'none', fontSize: '13px', fontWeight: 700,
                    background: mode === 'detailed' ? 'var(--bg-card)' : 'transparent',
                    color: mode === 'detailed' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: mode === 'detailed' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  Detailed
                </button>
                {trip.settlementMode && (
                  <div style={{ position: 'absolute', top: '-18px', right: '0', fontSize: '10px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <HistoryIcon size={10} /> MODE TERKUNCI
                  </div>
                )}
              </div>

              {/* Balances Summary */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Saldo Neto Anggota</h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {trip.members.map(m => {
                    const bal = settlement.balances[m.id] || 0;
                    const cons = settlement.consumed[m.id] || 0;
                    const pd = settlement.paid[m.id] || 0;
                    const roundedBal = Math.round(bal);
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div>
                          <div style={{ fontWeight: 800, marginBottom: '4px' }}>{m.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            <span style={{ color: 'var(--danger)' }}>Pakai: {currencySymbol}{Math.round(cons).toLocaleString('id-ID')}</span>
                            <span style={{ margin: '0 6px' }}>|</span>
                            <span style={{ color: 'var(--success)' }}>Nalangin: {currencySymbol}{Math.round(pd).toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            {roundedBal > 0 ? 'Menerima' : roundedBal < 0 ? 'Membayar' : 'Lunas'}
                          </div>
                          <span style={{ 
                            fontWeight: 900, fontSize: '16px',
                            color: roundedBal > 0 ? 'var(--success)' : roundedBal < 0 ? 'var(--danger)' : 'var(--text-muted)'
                          }}>
                            {roundedBal > 0 ? '+' : ''}{currencySymbol}{Math.abs(roundedBal).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transactions List */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Rencana Pembayaran</h3>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', padding: '4px 8px', background: 'var(--primary-glow)', borderRadius: '6px' }}>
                    {mode === 'simple' ? 'Minimum steps' : 'Detailed split'}
                  </span>
                </div>

                {settlement.transactions.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Semua saldo sudah lunas! ✨
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {settlement.transactions.map((t, idx) => {
                       const from = trip.members.find(m => m.id === t.from);
                       const to = trip.members.find(m => m.id === t.to);
                       const settlementKey = `${t.from}-${t.to}-${t.amount}-${idx}`;
                       const baseKey = `${t.from}-${t.to}-${idx}`;
                       const paidSoFar = trip.settlementPaidAmounts?.[baseKey] || 0;
                       const remainingAmt = Math.max(0, t.amount - paidSoFar);
                       const isPaid = remainingAmt <= 0.5;
                       const isPartiallyPaid = paidSoFar > 0 && remainingAmt > 0.5;
 
                       return (
                         <motion.div 
                           key={idx}
                           initial={{ opacity: 0, x: -10 }}
                           animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: idx * 0.05 }}
                           style={{ 
                             padding: '16px', background: 'var(--bg-card)', borderRadius: '16px',
                             border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px',
                             opacity: isPaid ? 0.6 : 1
                           }}
                         >
                           <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setSelectedSettlement(t)}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                               <span style={{ fontWeight: 800 }}>{from?.name}</span>
                               <ArrowRight size={14} color="var(--text-muted)" />
                               <span style={{ fontWeight: 800 }}>{to?.name}</span>
                             </div>
                             <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                               <div style={{ fontSize: '18px', fontWeight: 900, color: isPaid ? 'var(--success)' : 'var(--primary)' }}>
                                 {currencySymbol}{remainingAmt.toLocaleString('id-ID')}
                               </div>
                               {t.amount !== remainingAmt && (
                                 <div style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                                   {currencySymbol}{t.amount.toLocaleString('id-ID')}
                                 </div>
                               )}
                             </div>
                             {isPartiallyPaid && (
                               <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, marginTop: '2px' }}>
                                 Dibayar sebagian: {currencySymbol}{paidSoFar.toLocaleString('id-ID')}
                               </div>
                             )}
                             <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                               Kenapa bayar segini? <Info size={10} />
                             </div>
                           </div>
                           {(t.from === 'me' || t.to === 'me') && !isPaid && (
                             <button 
                               onClick={() => {
                                 setSettleAmount(remainingAmt);
                                 setSettlingTx({ ...t, idx });
                               }}
                               className="btn-icon"
                               style={{ color: 'var(--success)', background: 'var(--success-glow)' }}
                               title="Tandai sebagai Lunas / Cicil"
                             >
                               <CheckCircle2 size={20} />
                             </button>
                           )}
                           {isPaid && (
                             <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800 }}>
                               <CheckCircle2 size={16} /> LUNAS
                             </div>
                           )}
                         </motion.div>
                       );
                     })}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: shareId ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
                <button 
                  onClick={shareId ? handleCopyLink : handleShareLink}
                  disabled={isSharing}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 8px', fontSize: '12px' }}
                >
                  {isSharing ? '...' : shareId ? <><CheckCircle2 size={16} /> Copy</> : <><Share2 size={16} /> Share Link</>}
                </button>
                {shareId && (
                  <button 
                    onClick={() => window.open(`${window.location.origin}/shared-split/${shareId}`, '_blank')}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 8px', fontSize: '12px', background: 'var(--primary-glow)', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                  >
                    <ExternalLink size={16} /> Buka
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="btn btn-primary"
                  style={{ padding: '12px 8px', fontSize: '12px' }}
                >
                  Selesai
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
    
    <SettlementExplanationModal
      isOpen={!!selectedSettlement}
      onClose={() => setSelectedSettlement(null)}
      settlement={selectedSettlement}
      mode={mode}
      trip={trip}
      expenses={expenses}
      currencySymbol={currencySymbol}
      settlementData={settlement}
    />
    </>
  );
};

export default SettleUpModal;
