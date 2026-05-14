import React, { useState, useEffect } from 'react';
import { X, Check, Calculator, Camera, Plus, Trash2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney, type Trip, type TripExpense, type TripExpenseSplit } from '../../contexts/MoneyContext';
import { useReceiptOCR } from '../../hooks/useReceiptOCR';
import { generateId, getLocalTime } from '../../lib/utils';

interface AddTripExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  editingExpense?: TripExpense | null;
}

const AddTripExpenseModal: React.FC<AddTripExpenseModalProps> = ({ isOpen, onClose, trip, editingExpense }) => {
  const { currencySymbol, assets, defaultAssetId, addTripExpense, updateTripExpense, addTransaction, addDebt } = useMoney();
  const { scanReceipt, isScanning } = useReceiptOCR();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState(trip.members[0]?.id || '');
  const [selectedAssetId, setSelectedAssetId] = useState<string>(defaultAssetId || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>(trip.members.map(m => m.id));
  const [isCustomSplit, setIsCustomSplit] = useState(false);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  // OCR Items and assignments
  const [ocrItems, setOcrItems] = useState<{ id: string, name: string, amount: number }[]>([]);
  const [itemAssignments, setItemAssignments] = useState<Record<number, string[]>>({});
  const [showOCRUI, setShowOCRUI] = useState(false);

  useEffect(() => {
    if (editingExpense) {
      setDescription(editingExpense.description);
      setAmount(editingExpense.amount.toString());
      setPayerId(editingExpense.payerId);
      setDate(editingExpense.date);
      setSplitMemberIds(editingExpense.splits.map(s => s.memberId));

      const custom: Record<string, string> = {};
      editingExpense.splits.forEach(s => {
        custom[s.memberId] = s.amount.toString();
      });
      setCustomAmounts(custom);

      // Check if it was a custom split (if amounts are not perfectly equal)
      if (editingExpense.splits.length > 0) {
        const firstAmt = editingExpense.splits[0].amount;
        const allEqual = editingExpense.splits.every(s => Math.abs(s.amount - firstAmt) < 1);
        setIsCustomSplit(!allEqual);
      }
      setSelectedAssetId(''); // Reset or find if linked? Trip expenses usually not linked to assets yet
    } else {
      setDescription('');
      setAmount('');
      setPayerId(trip.members[0]?.id || 'me');
      setSelectedAssetId(defaultAssetId || '');
      setDate(new Date().toISOString().split('T')[0]);
      setSplitMemberIds(trip.members.map(m => m.id));
      setIsCustomSplit(false);
      setCustomAmounts({});
      setOcrItems([]);
      setItemAssignments({});
      setShowOCRUI(false);
    }
  }, [editingExpense, isOpen, trip]);

  // Clear selected asset if payer is not me
  useEffect(() => {
    if (payerId !== 'me') {
      setSelectedAssetId('');
    }
  }, [payerId]);

  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await scanReceipt(file);
    if (result) {
      setAmount(result.amount.toString());
      setDescription(result.merchantName || description);
      setOcrItems(result.lineItems.map(item => ({ id: generateId(), name: item.name, amount: item.amount })));

      // Default assignments: everyone splits every item
      const initialAssignments: Record<number, string[]> = {};
      result.lineItems.forEach((_, idx) => {
        initialAssignments[idx] = ['me']; // Default to 'me'
      });
      setItemAssignments(initialAssignments);
      setShowOCRUI(true);
      setIsCustomSplit(true);
    }
  };

  const addOcrItem = () => {
    const newItem = { id: generateId(), name: 'Item Baru', amount: 0 };
    setOcrItems([...ocrItems, newItem]);
  };

  const updateOcrItem = (idx: number, updates: Partial<{ name: string, amount: number }>) => {
    const next = [...ocrItems];
    next[idx] = { ...next[idx], ...updates };
    setOcrItems(next);

    // Recalculate total amount if items match total
    const newTotal = next.reduce((sum, item) => sum + item.amount, 0);
    setAmount(newTotal.toString());

    // Trigger assignment recalculation
    recalculateCustomAmounts(itemAssignments, next);
  };

  const removeOcrItem = (idx: number) => {
    const next = ocrItems.filter((_, i) => i !== idx);
    setOcrItems(next);

    const nextAssignments: Record<number, string[]> = {};
    Object.entries(itemAssignments).forEach(([key, val]) => {
      const k = parseInt(key);
      if (k < idx) nextAssignments[k] = val;
      if (k > idx) nextAssignments[k - 1] = val;
    });
    setItemAssignments(nextAssignments);
    recalculateCustomAmounts(nextAssignments, next);
  };

  const recalculateCustomAmounts = (assignments: Record<number, string[]>, items: typeof ocrItems) => {
    const newCustomAmounts: Record<string, number> = {};
    trip.members.forEach(m => newCustomAmounts[m.id] = 0);

    items.forEach((item, idx) => {
      const assigned = assignments[idx] || [];
      if (assigned.length > 0) {
        const share = Math.floor(item.amount / assigned.length);
        const remainder = item.amount - (share * assigned.length);
        assigned.forEach((id, i) => {
          newCustomAmounts[id] += (i === 0 ? share + remainder : share);
        });
      }
    });

    const formatted: Record<string, string> = {};
    Object.entries(newCustomAmounts).forEach(([id, amt]) => {
      formatted[id] = amt > 0 ? amt.toString() : '';
    });
    setCustomAmounts(formatted);
  };

  const toggleMember = (id: string) => {
    if (splitMemberIds.includes(id)) {
      setSplitMemberIds(splitMemberIds.filter(m => m !== id));
    } else {
      setSplitMemberIds([...splitMemberIds, id]);
    }
  };

  const toggleItemAssignment = (itemIdx: number, memberId: string) => {
    const current = itemAssignments[itemIdx] || [];
    const next = current.includes(memberId)
      ? current.filter(id => id !== memberId)
      : [...current, memberId];

    const newAssignments = { ...itemAssignments, [itemIdx]: next };
    setItemAssignments(newAssignments);

    // Ensure the member is in splitMemberIds if they are assigned an item
    if (next.includes(memberId) && !splitMemberIds.includes(memberId)) {
      setSplitMemberIds(prev => [...prev, memberId]);
    }

    recalculateCustomAmounts(newAssignments, ocrItems);
  };

  const handleSave = async () => {
    const totalAmount = parseInt(amount.replace(/\D/g, '')) || 0;
    if (!description.trim() || isNaN(totalAmount) || totalAmount <= 0) return;

    let splits: TripExpenseSplit[] = [];
    if (!isCustomSplit) {
      if (splitMemberIds.length === 0) return;
      const share = Math.floor(totalAmount / splitMemberIds.length);
      const remainder = totalAmount - (share * splitMemberIds.length);
      splits = splitMemberIds.map((id, idx) => ({
        memberId: id,
        amount: idx === 0 ? share + remainder : share
      }));
    } else {
      const allMemberIds = trip.members.map(m => m.id);
      splits = allMemberIds
        .map(id => ({
          memberId: id,
          amount: parseInt((customAmounts[id] || '0').replace(/\D/g, '')) || 0
        }))
        .filter(s => s.amount > 0);

      const sum = splits.reduce((s, x) => s + x.amount, 0);
      if (Math.abs(sum - totalAmount) > 0.1) {
        alert(`Total pembagian kustom (${sum.toLocaleString('id-ID')}) tidak sama dengan jumlah pengeluaran (${totalAmount.toLocaleString('id-ID')})!`);
        return;
      }
    }

    const expenseData = {
      tripId: trip.id,
      description: description.trim(),
      amount: totalAmount,
      payerId,
      splits,
      date
    };


    if (editingExpense) {
      await updateTripExpense(editingExpense.id, expenseData);
    } else {
      const newExpense = await addTripExpense(expenseData);

      // Create real transaction if asset is selected AND I am the payer
      if (selectedAssetId && payerId === 'me') {
        addTransaction({
          type: 'pengeluaran',
          amount: totalAmount,
          category: 'Liburan & Perjalanan',
          subCategory: 'Biaya Trip',
          date: expenseData.date,
          time: getLocalTime(),
          note: `[Trip: ${trip.name}] ${description}`,
          assetId: selectedAssetId,
          relatedId: newExpense.id // Link to trip expense
        });
      }

      // Create global debts if I am the payer (others owe me)
      if (payerId === 'me') {
        expenseData.splits.forEach(s => {
          if (s.memberId !== 'me') {
            const memberName = trip.members.find(m => m.id === s.memberId)?.name || 'Teman';
            addDebt({
              type: 'piutang',
              contact: memberName,
              totalAmount: s.amount,
              description: `[Trip: ${trip.name}] ${description}`,
              date: expenseData.date,
              isPaid: false,
              createdAt: new Date().toISOString(),
              isInstallment: false,
              paidInstallments: 0,
              relatedId: newExpense.id // Link to trip expense
            }, 'none');
          }
        });
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="modal-content"
          onClick={e => e.stopPropagation()}
          style={{ maxHeight: '90vh', overflowY: 'auto', paddingBottom: '32px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{editingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h2>
            <button onClick={onClose} className="btn-icon">
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Amount & Description Header */}
            <div style={{
              background: 'var(--bg-card)', borderRadius: '32px', padding: '24px',
              border: '1.5px solid var(--border-color)', position: 'relative', overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.02)'
            }}>
              <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--primary-glow)', filter: 'blur(40px)', borderRadius: '50%', opacity: 0.3 }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>Keterangan</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Makan siang di Bali..."
                    style={{
                      width: '100%', background: 'var(--bg-neutral)', border: '1px solid var(--border-color)',
                      fontSize: '15px', fontWeight: 700, color: 'var(--text-main)',
                      padding: '12px 16px', outline: 'none', borderRadius: '14px',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>Jumlah Nominal</label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-neutral)',
                    padding: '10px 16px', borderRadius: '16px', border: '1px solid var(--border-color)'
                  }}>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>{currencySymbol}</span>
                    <input
                      type="text"
                      value={amount === '0' ? '' : parseInt(amount || '0').toLocaleString('id-ID')}
                      onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
                      placeholder="0"
                      style={{
                        flex: 1, background: 'transparent', border: 'none',
                        fontSize: '32px', fontWeight: 900, color: 'var(--text-main)',
                        padding: 0, outline: 'none', letterSpacing: '-1px'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              <div>
                <label className="label">Tanggal</label>
                <div style={{ position: 'relative' }}>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" style={{ width: '100%', borderRadius: '14px', padding: '12px' }} />
                </div>
              </div>
              {payerId === 'me' && (
                <div>
                  <label className="label">Dibayar Pakai (Opsional)</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedAssetId}
                      onChange={e => setSelectedAssetId(e.target.value)}
                      className="input"
                      style={{ width: '100%', borderRadius: '14px', padding: '12px', fontWeight: 700, appearance: 'none', background: 'var(--bg-card)' }}
                    >
                      <option value="">Hanya Catat</option>
                      {assets.filter(a => !a.isDeleted).map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <ChevronRight size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Payer Selection - Horizontal Scroll */}
            <div>
              <label className="label" style={{ marginBottom: '12px', display: 'block' }}>Siapa yang bayar?</label>
              <div className="custom-scrollbar" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px', margin: '0 -4px' }}>
                {trip.members.map(m => {
                  const isActive = payerId === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPayerId(m.id)}
                      style={{
                        flexShrink: 0, padding: '12px 20px', borderRadius: '16px',
                        background: isActive ? 'var(--primary)' : 'var(--bg-neutral)',
                        color: isActive ? 'white' : 'var(--text-main)',
                        border: 'none', fontWeight: 800, fontSize: '13px',
                        cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: isActive ? '0 4px 12px var(--primary-glow)' : 'none',
                        display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                    >
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      {m.name}
                      {isActive && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* OCR Button */}
            {!editingExpense && (
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px', background: 'var(--bg-neutral)', borderRadius: '16px',
                color: 'var(--primary)', fontWeight: 800, cursor: 'pointer', border: '1px solid var(--border-color)'
              }}>
                {isScanning ? 'Memindai...' : <><Camera size={18} /> Scan Struk</>}
                <input type="file" accept="image/*" onChange={handleOCR} hidden disabled={isScanning} />
              </label>
            )}

            {/* OCR Item Assignment UI */}
            {showOCRUI && ocrItems.length > 0 && (
              <div style={{ background: 'var(--bg-neutral)', borderRadius: '24px', padding: '16px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calculator size={16} /> Rincian Item (Edit & Bagi)
                  </h3>
                  <button
                    onClick={addOcrItem}
                    style={{ padding: '6px 12px', borderRadius: '10px', background: 'var(--primary-glow)', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} /> Item
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {ocrItems.map((item, idx) => (
                    <div key={item.id} style={{ padding: '14px', background: 'var(--bg-card)', borderRadius: '18px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => updateOcrItem(idx, { name: e.target.value })}
                          placeholder="Nama item..."
                          style={{ flex: 1, background: 'var(--bg-neutral)', border: 'none', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', fontWeight: 700, outline: 'none' }}
                        />
                        <div style={{ position: 'relative', width: '100px' }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>{currencySymbol}</span>
                          <input
                            type="text"
                            value={item.amount === 0 ? '' : item.amount.toLocaleString('id-ID')}
                            onChange={e => updateOcrItem(idx, { amount: parseInt(e.target.value.replace(/\D/g, '')) || 0 })}
                            placeholder="0"
                            style={{ width: '100%', background: 'var(--bg-neutral)', border: 'none', borderRadius: '10px', padding: '8px 8px 8px 24px', fontSize: '13px', fontWeight: 800, textAlign: 'right', outline: 'none' }}
                          />
                        </div>
                        <button
                          onClick={() => removeOcrItem(idx)}
                          style={{ padding: '8px', color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {trip.members.map(m => {
                          const isAssigned = (itemAssignments[idx] || []).includes(m.id);
                          return (
                            <button
                              key={m.id}
                              onClick={() => toggleItemAssignment(idx, m.id)}
                              style={{
                                padding: '6px 12px', borderRadius: '10px', border: isAssigned ? '1.5px solid var(--primary)' : '1.5px solid transparent', fontSize: '11px', fontWeight: 700,
                                background: isAssigned ? 'var(--primary-glow)' : 'var(--bg-neutral)',
                                color: isAssigned ? 'var(--primary)' : 'var(--text-muted)',
                                cursor: 'pointer', transition: 'all 0.2s'
                              }}
                            >
                              {m.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Split Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label className="label" style={{ margin: 0 }}>Dibagi Ke Siapa?</label>
                <button
                  onClick={() => setIsCustomSplit(!isCustomSplit)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                >
                  {isCustomSplit ? 'Ganti ke Rata' : 'Ganti ke Kustom'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                {trip.members.map(m => {
                  const isIncluded = splitMemberIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => !isCustomSplit && toggleMember(m.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                        background: isIncluded ? 'var(--bg-card)' : 'transparent',
                        borderRadius: '16px', border: `1.5px solid ${isIncluded ? 'var(--primary)' : 'var(--border-color)'}`,
                        cursor: isCustomSplit ? 'default' : 'pointer', transition: 'all 0.2s',
                        minWidth: 0
                      }}
                    >
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '8px', border: '2px solid var(--border-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', background: isIncluded ? 'var(--primary)' : 'transparent',
                        borderColor: isIncluded ? 'var(--primary)' : 'var(--border-color)', color: 'white'
                      }}>
                        {isIncluded && <Check size={14} strokeWidth={4} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: isIncluded ? 'var(--text-main)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                      </div>
                      {isCustomSplit && isIncluded && (
                        <div style={{ position: 'relative', width: 'clamp(80px, 30%, 120px)', flexShrink: 0 }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>{currencySymbol}</span>
                          <input
                            type="text"
                            value={customAmounts[m.id] || ''}
                            onChange={e => setCustomAmounts({ ...customAmounts, [m.id]: e.target.value.replace(/\D/g, '') })}
                            placeholder="0"
                            className="input"
                            style={{ width: '100%', padding: '8px 8px 8px 24px', textAlign: 'right', fontSize: '14px', marginBottom: 0, background: 'var(--bg-neutral)', border: 'none' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSave}
              className="btn btn-primary"
              style={{ width: '100%', padding: '16px', borderRadius: '16px', fontWeight: 800, fontSize: '16px', marginTop: '12px' }}
            >
              Simpan Pengeluaran
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddTripExpenseModal;
