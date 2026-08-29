import React, { useMemo, useState, lazy, Suspense } from 'react';

import AssetSelectModal from './AssetSelectModal';
import CurrencyInput from '../common/CurrencyInput';
import { type Trip, type TripExpense, useMoney } from '../../contexts/MoneyContext';
import { useToast } from '../common/Toast';
import { getLocalDate, getLocalTime } from '../../lib/utils';
import { calculateDebtBalance } from '../../lib/debtCalculations';
const SettlementExplanationModal = lazy(() => import('./SettlementExplanationModal'));
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import MaterialIcon from '../common/MaterialIcon';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  expenses: TripExpense[];
}

const SettleUpModal: React.FC<SettleUpModalProps> = ({ isOpen, onClose, trip, expenses }) => {
  const { user, currencySymbol, debts, transactions, assets, addDebtPayment, addTransaction, updateTrip, defaultAssetId, getAssetBalance, categories } = useMoney();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'simple' | 'detailed'>(trip.settlementMode || 'simple');
  const [settlingTx, setSettlingTx] = useState<any | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(defaultAssetId || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);
  const [isAssetSelectOpen, setIsAssetSelectOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState<string>('0');

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
    if (isProcessing) return;
    
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
          const calc = calculateDebtBalance(d, transactions, categories);
          return { debt: d, remaining: calc.remaining };
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
                categoryId: 'Pelunasan Piutang',
                date: getLocalDate(),
                time: getLocalTime(),
                note: `Pelunasan Trip (Surplus): ${trip.name} (${fromName} → ${toName})`,
                assetId,
              });
            } else {
              addTransaction({
                type: 'hutang_keluar',
                amount: paymentLeft,
                categoryId: 'Bayar Hutang',
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
              categoryId: 'Pelunasan Piutang',
              date: getLocalDate(),
              time: getLocalTime(),
              note: `Pelunasan Trip: ${trip.name} (${fromName} → ${toName})`,
              assetId,
            });
          } else {
            addTransaction({
              type: 'hutang_keluar',
              amount: payAmtToRecord,
              categoryId: 'Bayar Hutang',
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
            categoryId: 'Pelunasan Piutang',
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
            categoryId: 'Bayar Hutang',
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

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Settle Up"
      >
          {settlingTx ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <Button variant="outline" onClick={() => setSettlingTx(null)} style={{ padding: '8px' }}>
                  Kembali
                </Button>
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
                <CurrencyInput 
                  value={settleAmount}
                  onChange={(val) => {
                    const numVal = parseInt(val) || 0;
                    const baseKey = `${settlingTx.from}-${settlingTx.to}-${settlingTx.idx}`;
                    const paidSoFar = trip.settlementPaidAmounts?.[baseKey] || 0;
                    const maxAllowed = Math.max(0, settlingTx.amount - paidSoFar);
                    const finalNum = Math.min(maxAllowed, Math.max(0, numVal));
                    setSettleAmount(finalNum.toString());
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

              <div className="flex flex-col gap-2 mb-8">
                <button
                  type="button"
                  onClick={() => setIsAssetSelectOpen(true)}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant w-full cursor-pointer hover:bg-surface-container transition-colors text-left text-on-surface"
                >
                  <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center">
                    <MaterialIcon name="account_balance_wallet" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{assets.find(a => a.id === selectedAssetId)?.name || 'Pilih Rekening'}</div>
                    <div className="text-[11px] text-on-surface-variant">
                      Saldo: {currencySymbol}{getAssetBalance(selectedAssetId).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="text-[13px] font-bold text-primary">Ganti</div>
                </button>

                <AssetSelectModal
                  isOpen={isAssetSelectOpen}
                  onClose={() => setIsAssetSelectOpen(false)}
                  assets={assets}
                  selectedAssetId={selectedAssetId}
                  onSelect={(id) => { setSelectedAssetId(id); setIsAssetSelectOpen(false); }}
                />

              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setSettlingTx(null)}>Batal</Button>
                <Button 
                  variant="primary"
                  onClick={() => handleMarkAsPaid(settlingTx, settlingTx.idx, selectedAssetId, parseInt(settleAmount) || 0)} 
                  disabled={isProcessing || !selectedAssetId || (parseInt(settleAmount) || 0) <= 0}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {isProcessing ? 'Memproses...' : !selectedAssetId ? 'Pilih Aset Dulu' : (parseInt(settleAmount) || 0) <= 0 ? 'Nominal tidak valid' : 'Konfirmasi Pelunasan'}
                  {!isProcessing && selectedAssetId && (parseInt(settleAmount) || 0) > 0 && <MaterialIcon name="chevron_right" className="text-[18px]" />}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Mode Toggle */}
              <div className={`grid grid-cols-2 bg-surface-container-low p-1 rounded-2xl mb-6 relative ${trip.settlementMode ? 'opacity-60 pointer-events-none' : ''}`}>
                <button 
                  onClick={() => setMode('simple')}
                  className={`p-2.5 rounded-xl border-none text-[13px] font-bold transition-all ${mode === 'simple' ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-on-surface-variant'}`}
                >
                  Simple
                </button>
                <button 
                  onClick={() => setMode('detailed')}
                  className={`p-2.5 rounded-xl border-none text-[13px] font-bold transition-all ${mode === 'detailed' ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-on-surface-variant'}`}
                >
                  Detailed
                </button>
                {trip.settlementMode && (
                  <div className="absolute -top-5 right-0 text-[10px] font-extrabold text-primary flex items-center gap-1">
                    <MaterialIcon name="history" className="text-[10px]" /> MODE TERKUNCI
                  </div>
                )}
              </div>

              {/* Balances Summary */}
              <div className="mb-6">
                <h3 className="text-xs font-extrabold text-on-surface-variant uppercase mb-3">Saldo Neto Anggota</h3>
                <div className="grid gap-2">
                  {trip.members.map(m => {
                    const bal = settlement.balances[m.id] || 0;
                    const cons = settlement.consumed[m.id] || 0;
                    const pd = settlement.paid[m.id] || 0;
                    const roundedBal = Math.round(bal);
                    return (
                        <Card key={m.id} variant="default" padding="none">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-4">
                            <div className="flex-1 min-w-0">
                              <div className="font-bold mb-1 text-on-surface truncate">{m.name}</div>
                              <div className="text-[11px] flex flex-wrap gap-x-3 gap-y-1">
                                <span className="text-error font-medium">Pakai: {currencySymbol}{Math.round(cons).toLocaleString('id-ID')}</span>
                                <span className="text-success font-medium">Nalangin: {currencySymbol}{Math.round(pd).toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                            <div className="flex sm:block justify-between items-center sm:text-right shrink-0 bg-surface-container-lowest sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-none border-outline-variant">
                              <div className="text-[10px] font-bold uppercase text-on-surface-variant">
                                {roundedBal > 0 ? 'Menerima' : roundedBal < 0 ? 'Membayar' : 'Lunas'}
                              </div>
                              <span className={`font-black text-lg sm:text-base ${
                                roundedBal > 0 ? 'text-success' : roundedBal < 0 ? 'text-error' : 'text-on-surface-variant'
                              }`}>
                                {roundedBal > 0 ? '+' : ''}{currencySymbol}{Math.abs(roundedBal).toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                        </Card>
                    );
                  })}
                </div>
              </div>

              {/* Transactions List */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-extrabold text-on-surface-variant uppercase m-0">Rencana Pembayaran</h3>
                  <span className="text-[11px] font-semibold text-primary px-2 py-1 bg-primary-fixed rounded-md">
                    {mode === 'simple' ? 'Minimum steps' : 'Detailed split'}
                  </span>
                </div>

                {settlement.transactions.length === 0 ? (
                  <div className="p-8 text-center text-on-surface-variant font-medium bg-surface-container-low rounded-2xl border border-dashed border-outline-variant">
                    Semua saldo sudah lunas! ✨
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {settlement.transactions.map((t, idx) => {
                       const from = trip.members.find(m => m.id === t.from);
                       const to = trip.members.find(m => m.id === t.to);
                       const baseKey = `${t.from}-${t.to}-${idx}`;
                       const paidSoFar = trip.settlementPaidAmounts?.[baseKey] || 0;
                       const remainingAmt = Math.max(0, t.amount - paidSoFar);
                       const isPaid = remainingAmt <= 0.5;
                       const isPartiallyPaid = paidSoFar > 0 && remainingAmt > 0.5;
 
                       return (
                          <Card 
                            key={idx}
                            variant="default"
                            padding="none"
                            className={`${isPaid ? 'opacity-60' : ''}`}
                          >
                            <div className="p-4 flex items-center gap-3">
                              <div className="flex-1 cursor-pointer" onClick={() => setSelectedSettlement(t)}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-extrabold text-sm">{from?.name}</span>
                                <MaterialIcon name="arrow_forward" className="text-[14px] text-on-surface-variant" />
                                <span className="font-extrabold text-sm">{to?.name}</span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <div className={`text-lg font-black ${isPaid ? 'text-success' : 'text-primary'}`}>
                                  {currencySymbol}{remainingAmt.toLocaleString('id-ID')}
                                </div>
                                {t.amount !== remainingAmt && (
                                  <div className="text-xs text-on-surface-variant line-through">
                                    {currencySymbol}{t.amount.toLocaleString('id-ID')}
                                  </div>
                                )}
                              </div>
                              {isPartiallyPaid && (
                                <div className="text-[11px] text-primary font-bold mt-1">
                                  Dibayar sebagian: {currencySymbol}{paidSoFar.toLocaleString('id-ID')}
                                </div>
                              )}
                              <div className="text-[10px] font-bold text-on-surface-variant mt-1 flex items-center gap-1 hover:text-primary transition-colors">
                                Kenapa bayar segini? <MaterialIcon name="info" className="text-[10px]" />
                              </div>
                            </div>
                            {(t.from === 'me' || t.to === 'me') && !isPaid && (
                              <button 
                                onClick={() => {
                                  setSettleAmount(remainingAmt.toString());
                                  setSettlingTx({ ...t, idx });
                                }}
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-success bg-green-100 hover:bg-green-200 transition-colors shrink-0"
                                title="Tandai sebagai Lunas / Cicil"
                              >
                                <MaterialIcon name="check_circle" className="text-[24px]" />
                              </button>
                            )}
                            {!(t.from === 'me' || t.to === 'me') && !isPaid && (
                              <div className="flex flex-col items-center justify-center bg-surface-container-low px-3 py-2 rounded-xl border border-outline-variant shrink-0" title="Hanya pihak yang bersangkutan yang bisa melunasi">
                                <MaterialIcon name="schedule" className="text-[18px] text-on-surface-variant mb-0.5" />
                                <span className="text-[9px] font-extrabold text-on-surface-variant uppercase text-center leading-tight">Menunggu<br/>Pelunasan</span>
                              </div>
                            )}
                            {isPaid && (
                              <div className="text-success flex items-center gap-1 text-[11px] font-extrabold bg-green-50 px-2 py-1 rounded-md shrink-0">
                                <MaterialIcon name="check_circle" className="text-[14px]" /> LUNAS
                              </div>
                            )}
                            </div>
                          </Card>
                        );
                     })}
                  </div>
                )}
              </div>

              <div className={`grid ${shareId ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mt-4`}>
                <Button 
                  variant="outline"
                  onClick={shareId ? handleCopyLink : handleShareLink}
                  disabled={isSharing}
                  className="flex items-center justify-center gap-2 py-3 text-xs"
                >
                  {isSharing ? '...' : shareId ? <><MaterialIcon name="check_circle" className="text-[16px]" /> Copy</> : <><MaterialIcon name="share" className="text-[16px]" /> Share Link</>}
                </Button>
                {shareId && (
                  <Button 
                    variant="outline"
                    onClick={() => window.open(`${window.location.origin}/shared-split/${shareId}`, '_blank')}
                    className="flex items-center justify-center gap-2 py-3 text-xs bg-primary-fixed text-primary border-primary-fixed"
                  >
                    <MaterialIcon name="open_in_new" className="text-[16px]" /> Buka
                  </Button>
                )}
                <Button 
                  variant="primary"
                  onClick={onClose}
                  className="py-3 text-xs font-bold"
                >
                  Selesai
                </Button>
              </div>
            </>
          )}
      </Modal>
    
    <Suspense fallback={null}>
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
    </Suspense>
    </>
  );
};

export default SettleUpModal;
