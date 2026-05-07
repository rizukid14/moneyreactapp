import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Trash2, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney } from '../../contexts/MoneyContext';
import ContactSelectModal from './ContactSelectModal';
import { type LineItem } from '../../hooks/useReceiptOCR';

interface SplitPerson {
  id: string;
  contactName: string;
  amount: number;
  isPayer: boolean;
}

interface SplitBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  merchantName: string;
  date: string;
  lineItems?: LineItem[];
  onSave: (splits: SplitPerson[]) => void;
}

const SplitBillModal: React.FC<SplitBillModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  merchantName,
  date,
  lineItems,
  onSave,
}) => {
  const { contacts, currencySymbol } = useMoney();
  const [splits, setSplits] = useState<SplitPerson[]>([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom' | 'items'>('equal');
  const [itemAssignments, setItemAssignments] = useState<Record<number, string[]>>({});

  useEffect(() => {
    if (isOpen) {
      setSplits([{ id: 'me', contactName: 'Saya', amount: totalAmount, isPayer: true }]);
      setSplitMethod(lineItems && lineItems.length > 0 ? 'items' : 'equal');
      setItemAssignments({});
    }
  }, [isOpen, totalAmount, lineItems]);

  const addPerson = (contactName: string) => {
    const newPerson: SplitPerson = {
      id: Date.now().toString(),
      contactName,
      amount: 0,
      isPayer: false,
    };
    setSplits([...splits, newPerson]);
    
    if (splitMethod === 'equal') {
      calculateEqualSplit([...splits, newPerson]);
    }
  };

  const removePerson = (id: string) => {
    const newSplits = splits.filter(s => s.id !== id);
    setSplits(newSplits);
    
    if (splitMethod === 'equal') {
      calculateEqualSplit(newSplits);
    }
  };

  const calculateEqualSplit = (currentSplits: SplitPerson[]) => {
    if (currentSplits.length === 0) return;
    
    const amountPerPerson = Math.floor(totalAmount / currentSplits.length);
    const remainder = totalAmount - (amountPerPerson * currentSplits.length);
    
    const updated = currentSplits.map((split, index) => ({
      ...split,
      amount: index === 0 ? amountPerPerson + remainder : amountPerPerson,
    }));
    
    setSplits(updated);
  };

  const calculateItemSplit = (currentSplits: SplitPerson[], assignments: Record<number, string[]>) => {
    if (!lineItems || currentSplits.length === 0) return;

    const personAmounts: Record<string, number> = {};
    currentSplits.forEach(p => { personAmounts[p.id] = 0; });

    lineItems.forEach((item, idx) => {
      const assignedIds = assignments[idx] || [];
      if (assignedIds.length > 0) {
        const share = Math.floor(item.amount / assignedIds.length);
        const remainder = item.amount - (share * assignedIds.length);
        assignedIds.forEach((id, i) => {
          if (personAmounts[id] !== undefined) {
            personAmounts[id] += i === 0 ? share + remainder : share;
          }
        });
      } else {
        // Unassigned items go to the first person (usually 'Saya')
        const firstId = currentSplits[0].id;
        personAmounts[firstId] += item.amount;
      }
    });

    const updated = currentSplits.map(split => ({
      ...split,
      amount: personAmounts[split.id] || 0,
    }));

    setSplits(updated);
  };

  const toggleItemAssignment = (itemIdx: number, personId: string) => {
    setItemAssignments(prev => {
      const current = prev[itemIdx] || [];
      const next = current.includes(personId)
        ? current.filter(id => id !== personId)
        : [...current, personId];
      
      const newAssignments = { ...prev, [itemIdx]: next };
      calculateItemSplit(splits, newAssignments);
      return newAssignments;
    });
  };

  const updateAmount = (id: string, amount: number) => {
    setSplits(splits.map(s => s.id === id ? { ...s, amount } : s));
  };

  const togglePayer = (id: string) => {
    setSplits(splits.map(s => s.id === id ? { ...s, isPayer: !s.isPayer } : s));
  };

  const handleSplitMethodChange = (method: 'equal' | 'custom' | 'items') => {
    setSplitMethod(method);
    if (method === 'equal') {
      calculateEqualSplit(splits);
    } else if (method === 'items') {
      calculateItemSplit(splits, itemAssignments);
    }
  };

  const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
  const difference = totalAmount - totalSplit;

  const handleSave = () => {
    if (splits.length === 0) {
      alert('Tambahkan minimal 1 orang untuk split bill');
      return;
    }

    if (Math.abs(difference) > 0) {
      alert(`Total split (${currencySymbol}${totalSplit.toLocaleString('id-ID')}) tidak sama dengan total tagihan (${currencySymbol}${totalAmount.toLocaleString('id-ID')})`);
      return;
    }

    onSave(splits);
    onClose();
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
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 600, mass: 0.5 }}
            >
              <div className="modal-header">
                <h2 className="subtitle" style={{ margin: 0 }}>
                  Split Bill
                </h2>
                <button className="close-btn" onClick={onClose}>
                  <X size={20} />
                </button>
              </div>

              <div
                style={{
                  background: 'var(--bg-income)',
                  border: '1.5px solid var(--primary)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {merchantName} • {date}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <DollarSign size={20} color="var(--primary)" />
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>
                    {currencySymbol}{totalAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  background: 'var(--bg-main)',
                  borderRadius: 12,
                  padding: 4,
                  marginBottom: 16,
                  border: '1px solid var(--border-color)',
                }}
              >
                <button
                  onClick={() => handleSplitMethodChange('equal')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: splitMethod === 'equal' ? 'var(--primary)' : 'transparent',
                    color: splitMethod === 'equal' ? 'white' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Bagi Rata
                </button>
                {lineItems && lineItems.length > 0 && (
                  <button
                    onClick={() => handleSplitMethodChange('items')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: splitMethod === 'items' ? 'var(--primary)' : 'transparent',
                      color: splitMethod === 'items' ? 'white' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    Per Item
                  </button>
                )}
                <button
                  onClick={() => handleSplitMethodChange('custom')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: splitMethod === 'custom' ? 'var(--primary)' : 'transparent',
                    color: splitMethod === 'custom' ? 'white' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Custom
                </button>
              </div>

              <div
                style={{
                  maxHeight: splitMethod === 'items' ? 200 : 300,
                  overflowY: 'auto',
                  marginBottom: 16,
                  paddingRight: 8,
                  marginRight: -8,
                }}
                className="custom-scrollbar"
              >
                {splits.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: 'var(--text-muted)',
                      background: 'var(--bg-main)',
                      borderRadius: 12,
                      border: '1.5px dashed var(--border-color)',
                    }}
                  >
                    <Users size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <div style={{ fontSize: 14, marginBottom: 8 }}>
                      Belum ada orang ditambahkan
                    </div>
                    <div style={{ fontSize: 12 }}>
                      Klik tombol "Tambah Orang" di bawah
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {splits.map((split) => (
                      <div
                        key={split.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          background: split.isPayer ? 'var(--bg-income)' : 'var(--bg-expense)',
                          border: `1.5px solid ${split.isPayer ? 'var(--primary)' : 'var(--danger)'}`,
                          borderRadius: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: split.isPayer
                              ? 'hsla(215,85%,58%,0.2)'
                              : 'hsla(350,80%,58%,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          {split.contactName.charAt(0).toUpperCase()}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              color: 'var(--text-main)',
                              marginBottom: 2,
                            }}
                          >
                            {split.contactName}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: split.isPayer ? 'var(--primary)' : 'var(--danger)',
                              fontWeight: 600,
                            }}
                          >
                            {split.isPayer ? '💰 Yang Bayar (Piutang)' : '💸 Yang Hutang'}
                          </div>
                        </div>

                          <input
                            type="text"
                            inputMode="numeric"
                            value={split.amount === 0 ? '' : split.amount.toLocaleString('id-ID')}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              updateAmount(split.id, parseInt(raw) || 0);
                            }}
                            disabled={splitMethod !== 'custom'}
                            style={{
                              width: 90,
                              padding: '6px 8px',
                              borderRadius: 8,
                              border: '1.5px solid var(--border-color)',
                              textAlign: 'right',
                              fontWeight: 700,
                              fontSize: 12,
                              marginBottom: 0,
                              background: splitMethod !== 'custom' ? 'var(--bg-main)' : 'white',
                            }}
                            placeholder="0"
                          />

                        <button
                          onClick={() => togglePayer(split.id)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: 'none',
                            background: split.isPayer ? 'var(--primary)' : 'var(--danger)',
                            color: 'white',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                          title="Toggle pembayar/hutang"
                        >
                          {split.isPayer ? '💰' : '💸'}
                        </button>

                        <button
                          onClick={() => removePerson(split.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            padding: 4,
                            flexShrink: 0,
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {splitMethod === 'items' && lineItems && lineItems.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pilih Item untuk Orang</span>
                    <span style={{ fontSize: 10, fontWeight: 500 }}>* Item belum dipilih otomatis ke Saya</span>
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }} className="custom-scrollbar">
                    {lineItems.map((item, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-main)', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>{currencySymbol}{item.amount.toLocaleString('id-ID')}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {splits.map(person => {
                            const isAssigned = (itemAssignments[idx] || []).includes(person.id);
                            return (
                              <button
                                key={person.id}
                                onClick={() => toggleItemAssignment(idx, person.id)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  border: 'none',
                                  background: isAssigned ? 'var(--primary)' : 'var(--bg-neutral)',
                                  color: isAssigned ? 'white' : 'var(--text-muted)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                              >
                                {person.contactName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {splits.length > 0 && (
                <div
                  style={{
                    background: 'var(--bg-main)',
                    borderRadius: 12,
                    padding: '10px 12px',
                    marginBottom: 16,
                    border: `1.5px solid ${Math.abs(difference) === 0 ? 'var(--success)' : 'var(--danger)'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Total Split:</span>
                    <span style={{ fontWeight: 700 }}>
                      {currencySymbol}{totalSplit.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Total Tagihan:</span>
                    <span style={{ fontWeight: 700 }}>
                      {currencySymbol}{totalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      fontWeight: 700,
                      paddingTop: 8,
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    <span>Selisih:</span>
                    <span
                      style={{
                        color: Math.abs(difference) === 0 ? 'var(--success)' : 'var(--danger)',
                      }}
                    >
                      {difference === 0 ? '✓ Pas' : `${currencySymbol}${Math.abs(difference).toLocaleString('id-ID')}`}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setContactModalOpen(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'none',
                  border: '1.5px dashed var(--border-color)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  color: 'var(--primary)',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 16,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-income)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)';
                  (e.currentTarget as HTMLElement).style.background = 'none';
                }}
              >
                <Plus size={16} />
                Tambah Orang
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn"
                  onClick={onClose}
                  style={{ flex: 1 }}
                >
                  Batal
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  style={{ flex: 2 }}
                  disabled={splits.length === 0 || Math.abs(difference) !== 0}
                >
                  Simpan Split Bill
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ContactSelectModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        contacts={contacts}
        selectedContactName=""
        onSelect={(contactName) => {
          addPerson(contactName);
          setContactModalOpen(false);
        }}
      />
    </>
  );
};

export default SplitBillModal;
