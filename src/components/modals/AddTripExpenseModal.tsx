import React, { useState, useEffect } from 'react';
import { X, Check, Calculator, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney, type Trip, type TripExpense, type TripExpenseSplit } from '../../contexts/MoneyContext';
import { useReceiptOCR } from '../../hooks/useReceiptOCR';

interface AddTripExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  editingExpense?: TripExpense | null;
}

const AddTripExpenseModal: React.FC<AddTripExpenseModalProps> = ({ isOpen, onClose, trip, editingExpense }) => {
  const { addTripExpense, updateTripExpense, currencySymbol } = useMoney();
  const { scanReceipt, isScanning } = useReceiptOCR();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState(trip.members[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>(trip.members.map(m => m.id));
  const [isCustomSplit, setIsCustomSplit] = useState(false);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  
  // OCR Items and assignments
  const [ocrItems, setOcrItems] = useState<{name: string, amount: number}[]>([]);
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
    } else {
      setDescription('');
      setAmount('');
      setPayerId(trip.members[0]?.id || 'me');
      setDate(new Date().toISOString().split('T')[0]);
      setSplitMemberIds(trip.members.map(m => m.id));
      setIsCustomSplit(false);
      setCustomAmounts({});
      setOcrItems([]);
      setItemAssignments({});
      setShowOCRUI(false);
    }
  }, [editingExpense, isOpen, trip]);

  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await scanReceipt(file);
    if (result) {
      setAmount(result.amount.toString());
      setDescription(result.merchantName || description);
      setOcrItems(result.lineItems.map(item => ({ name: item.name, amount: item.amount })));
      
      // Default assignments: everyone splits every item
      const initialAssignments: Record<number, string[]> = {};
      result.lineItems.forEach((_, idx) => {
        initialAssignments[idx] = ['me']; // Default to 'me' if exists, or first member
      });
      setItemAssignments(initialAssignments);
      setShowOCRUI(true);
      setIsCustomSplit(true);
    }
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

    // Recalculate custom amounts based on assignments
    const newCustomAmounts: Record<string, number> = {};
    trip.members.forEach(m => newCustomAmounts[m.id] = 0);
    
    ocrItems.forEach((item, idx) => {
      const assigned = newAssignments[idx] || [];
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

  const handleSave = () => {
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
      // In custom mode, consider all members who have an amount entered
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
      updateTripExpense(editingExpense.id, expenseData);
    } else {
      addTripExpense(expenseData);
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
            {/* Description & Amount */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label className="label">Keterangan</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Makan siang, bensin, dll"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="label">Jumlah</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--text-muted)' }}>{currencySymbol}</span>
                  <input 
                    type="text" 
                    value={amount}
                    onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    className="input"
                    style={{ width: '100%', paddingLeft: '36px', fontWeight: 900 }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label className="label">Tanggal</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Dibayar Oleh</label>
                <select 
                  value={payerId}
                  onChange={e => setPayerId(e.target.value)}
                  className="input"
                  style={{ width: '100%', fontWeight: 700 }}
                >
                  {trip.members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
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
              <div style={{ background: 'var(--bg-neutral)', borderRadius: '24px', padding: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 800, marginBottom: '16px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calculator size={16} /> Hubungkan Item ke Teman
                </h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {ocrItems.map((item, idx) => (
                    <div key={idx} style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>{item.name}</span>
                        <span style={{ fontWeight: 800, fontSize: '13px' }}>{currencySymbol}{item.amount.toLocaleString('id-ID')}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {trip.members.map(m => {
                          const isAssigned = (itemAssignments[idx] || []).includes(m.id);
                          return (
                            <button
                              key={m.id}
                              onClick={() => toggleItemAssignment(idx, m.id)}
                              style={{ 
                                padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: 800,
                                background: isAssigned ? 'var(--primary)' : 'var(--bg-neutral)',
                                color: isAssigned ? 'white' : 'var(--text-muted)',
                                cursor: 'pointer'
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

              <div style={{ display: 'grid', gap: '8px' }}>
                {trip.members.map(m => {
                  const isIncluded = splitMemberIds.includes(m.id);
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button 
                        onClick={() => toggleMember(m.id)}
                        style={{ 
                          width: '24px', height: '24px', borderRadius: '6px', border: '2px solid var(--border-color)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', background: isIncluded ? 'var(--primary)' : 'transparent',
                          borderColor: isIncluded ? 'var(--primary)' : 'var(--border-color)', color: 'white', cursor: 'pointer'
                        }}
                      >
                        {isIncluded && <Check size={14} strokeWidth={4} />}
                      </button>
                      <span style={{ flex: 1, fontWeight: 700, fontSize: '14px' }}>{m.name}</span>
                      {isCustomSplit && isIncluded && (
                        <div style={{ position: 'relative', width: '120px' }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>{currencySymbol}</span>
                          <input 
                            type="text"
                            value={customAmounts[m.id] || ''}
                            onChange={e => setCustomAmounts({ ...customAmounts, [m.id]: e.target.value.replace(/\D/g, '') })}
                            placeholder="0"
                            className="input"
                            style={{ width: '100%', padding: '8px 8px 8px 24px', textAlign: 'right', fontSize: '14px' }}
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
