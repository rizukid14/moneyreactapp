import React, { useMemo, useState } from 'react';
import { X, Share2, ArrowRight, CheckCircle2, Wallet, ChevronRight, History, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney, type Trip, type TripExpense } from '../../contexts/MoneyContext';
import { useToast } from '../common/Toast';
import { generateId, getLocalDate, getLocalTime } from '../../lib/utils';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  expenses: TripExpense[];
}

const SettleUpModal: React.FC<SettleUpModalProps> = ({ isOpen, onClose, trip, expenses }) => {
  const { user, currencySymbol, addDebt, assets, addDebtPayment, updateTrip, defaultAssetId, getAssetBalance } = useMoney();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'simple' | 'detailed'>(trip.settlementMode || 'simple');
  const [settlingTx, setSettlingTx] = useState<any | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(defaultAssetId || '');
  const [isProcessing, setIsProcessing] = useState(false);

  const settlement = useMemo(() => {
    // 1. Calculate net balances
    const balances: Record<string, number> = {};
    trip.members.forEach(m => balances[m.id] = 0);

    expenses.forEach(e => {
      // Payer gets back the full amount they paid
      if (balances[e.payerId] !== undefined) {
        balances[e.payerId] += e.amount;
      }
      // Each member (including payer) owes their split amount
      e.splits.forEach(s => {
        if (balances[s.memberId] !== undefined) {
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
    
    const debtors = Object.keys(tempBalances).filter(id => tempBalances[id] < -0.5);
    const creditors = Object.keys(tempBalances).filter(id => tempBalances[id] > 0.5);
    
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
    // We sum all individual IOUs and then net them
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
        members: trip.members,
        tripExpenses: expenses.map(e => {
          const payerMember = trip.members.find(m => m.id === e.payerId);
          const payerName = payerMember ? (payerMember.id === 'me' ? (user.name || 'User') : payerMember.name) : 'Unknown';
          return {
            description: e.description,
            amount: e.amount,
            payer: payerName,
            date: e.date
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

  const handleMarkAsPaid = async (t: any, idx: number, assetId?: string) => {
    const fromName = trip.members.find(m => m.id === t.from)?.name || 'Unknown';
    const toName = trip.members.find(m => m.id === t.to)?.name || 'Unknown';
    
    setIsProcessing(true);
    try {
      const debtId = generateId();
      const settlementKey = `${t.from}-${t.to}-${t.amount}-${idx}`;

      // 1. Create a Debt record (unpaid initially)
      let debtType: 'hutang' | 'piutang' = 'hutang';
      let contact = '';
      
      if (t.from === 'me') {
        debtType = 'hutang';
        contact = toName;
      } else if (t.to === 'me') {
        debtType = 'piutang';
        contact = fromName;
      } else {
        contact = `${fromName} -> ${toName}`;
      }

      await addDebt({
        id: debtId,
        type: debtType,
        contact: contact,
        description: `Settle Trip: ${trip.name}`,
        totalAmount: t.amount,
        isPaid: false, // Will be marked paid by addDebtPayment
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        isInstallment: false,
        paidInstallments: 0
      } as any, 'none');

      // 2. If asset selected, record the payment TX
      if (assetId) {
        await addDebtPayment(
          debtId,
          t.amount,
          assetId,
          getLocalDate(),
          getLocalTime(),
          `Pelunasan Trip: ${trip.name}`
        );
      }

      // 3. Update Trip with locked mode and paid settlement key
      const updatedPaid = [...(trip.paidSettlements || []), settlementKey];
      await updateTrip(trip.id, {
        settlementMode: mode,
        paidSettlements: updatedPaid
      });

      showToast(assetId ? `Pembayaran dicatat & saldo diperbarui!` : `Penyelesaian dicatat di Debts!`, 'success');
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
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
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
                  <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Pilih Sumber Dana</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Penyelesaian sebesar {currencySymbol}{settlingTx.amount.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '8px', marginBottom: '32px' }}>
                {assets.filter(a => !a.isDeleted && !a.isHidden).map(asset => (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                      borderRadius: '16px', background: selectedAssetId === asset.id ? 'var(--primary-glow)' : 'var(--bg-neutral)',
                      border: `1px solid ${selectedAssetId === asset.id ? 'var(--primary)' : 'var(--border-color)'}`,
                      width: '100%', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                    }}
                  >
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '10px', 
                      background: selectedAssetId === asset.id ? 'var(--bg-card)' : 'var(--bg-card)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: selectedAssetId === asset.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                    }}>
                      <Wallet size={20} color={selectedAssetId === asset.id ? 'var(--primary)' : (asset.type === 'Cash' ? 'var(--secondary)' : asset.type === 'Bank Account' ? 'var(--primary)' : asset.type === 'eWallet' ? 'var(--success)' : 'var(--text-muted)')} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '14px' }}>{asset.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Saldo: {currencySymbol}{getAssetBalance(asset.id).toLocaleString('id-ID')}
                      </div>
                    </div>
                    {selectedAssetId === asset.id && <CheckCircle2 size={20} color="var(--primary)" />}
                  </button>
                ))}

                <button
                  onClick={() => setSelectedAssetId('')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                    borderRadius: '16px', background: selectedAssetId === '' ? 'var(--primary-glow)' : 'var(--bg-neutral)',
                    border: `1px solid ${selectedAssetId === '' ? 'var(--primary)' : 'var(--border-color)'}`,
                    width: '100%', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                  }}
                >
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <History size={20} color={selectedAssetId === '' ? 'var(--primary)' : 'var(--text-muted)'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>Hanya Catat (Tanpa Saldo)</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hanya masuk ke riwayat Hutang/Piutang</div>
                  </div>
                  {selectedAssetId === '' && <CheckCircle2 size={20} color="var(--primary)" />}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px' }}>
                <button onClick={() => setSettlingTx(null)} className="btn btn-secondary">Batal</button>
                <button 
                  onClick={() => handleMarkAsPaid(settlingTx, settlingTx.idx, selectedAssetId || undefined)} 
                  disabled={isProcessing}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {isProcessing ? 'Memproses...' : 'Konfirmasi Pelunasan'}
                  {!isProcessing && <ChevronRight size={18} />}
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
                    <History size={10} /> MODE TERKUNCI
                  </div>
                )}
              </div>

              {/* Balances Summary */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Saldo Neto Anggota</h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {trip.members.map(m => {
                    const bal = settlement.balances[m.id] || 0;
                    const roundedBal = Math.round(bal);
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-neutral)', borderRadius: '12px' }}>
                        <span style={{ fontWeight: 700 }}>{m.name}</span>
                        <span style={{ 
                          fontWeight: 800, 
                          color: roundedBal > 0 ? 'var(--success)' : roundedBal < 0 ? 'var(--danger)' : 'var(--text-muted)'
                        }}>
                          {roundedBal > 0 ? '+' : ''}{currencySymbol}{Math.abs(roundedBal).toLocaleString('id-ID')}
                        </span>
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
                      const isPaid = trip.paidSettlements?.includes(settlementKey);

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
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 800 }}>{from?.name}</span>
                              <ArrowRight size={14} color="var(--text-muted)" />
                              <span style={{ fontWeight: 800 }}>{to?.name}</span>
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: isPaid ? 'var(--success)' : 'var(--primary)' }}>
                              {currencySymbol}{t.amount.toLocaleString('id-ID')}
                            </div>
                          </div>
                          {(t.from === 'me' || t.to === 'me') && !isPaid && (
                            <button 
                              onClick={() => setSettlingTx({ ...t, idx })}
                              className="btn-icon"
                              style={{ color: 'var(--success)', background: 'var(--success-glow)' }}
                              title="Tandai sebagai Lunas"
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
  );
};

export default SettleUpModal;
