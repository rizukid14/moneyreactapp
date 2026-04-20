import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { useMoney } from '../../contexts/MoneyContext';
import type { Asset, Transaction } from '../../contexts/MoneyContext';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction?: (id: string, tx: Partial<Transaction>) => void;
  editingTransaction?: Transaction | null;
  initialType?: 'pengeluaran' | 'pendapatan' | 'transfer';
}

const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, onClose, assets, addTransaction, updateTransaction, editingTransaction, initialType 
}) => {
  const activeAssets = assets.filter(a => !a.isDeleted);
  const { categories } = useMoney();
  const [type, setType] = useState<'pengeluaran' | 'pendapatan' | 'transfer'>('pengeluaran');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [assetId, setAssetId] = useState(activeAssets[0]?.id || '');
  const [fromAssetId, setFromAssetId] = useState(activeAssets[0]?.id || '');
  const [toAssetId, setToAssetId] = useState(activeAssets[1]?.id || activeAssets[0]?.id || '');

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toLocaleString('id-ID'));
      setCategory(editingTransaction.category);
      setSubCategory(editingTransaction.subCategory || '');
      setDate(editingTransaction.date);
      setNote(editingTransaction.note);
      setAssetId(editingTransaction.assetId || activeAssets[0]?.id || '');
      setFromAssetId(editingTransaction.fromAssetId || activeAssets[0]?.id || '');
      setToAssetId(editingTransaction.toAssetId || activeAssets[1]?.id || activeAssets[0]?.id || '');
    } else {
      setType(initialType || 'pengeluaran');
      setAmount('');
      setCategory('');
      setSubCategory('');
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setAssetId(activeAssets[0]?.id || '');
      setFromAssetId(activeAssets[0]?.id || '');
      setToAssetId(activeAssets[1]?.id || activeAssets[0]?.id || '');
    }
  }, [editingTransaction, isOpen, assets, initialType]);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (!numericValue) {
      setAmount('');
      return;
    }
    setAmount(Number(numericValue).toLocaleString('id-ID'));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const txData = {
      type,
      amount: Number(amount.replace(/\./g, '')),
      category: type === 'transfer' ? 'Transfer' : category,
      subCategory: type === 'transfer' ? undefined : (subCategory || undefined),
      date,
      note,
      assetId: type !== 'transfer' ? assetId : undefined,
      fromAssetId: type === 'transfer' ? fromAssetId : undefined,
      toAssetId: type === 'transfer' ? toAssetId : undefined,
    };

    if (editingTransaction && updateTransaction) {
      updateTransaction(editingTransaction.id, txData);
    } else {
      addTransaction(txData);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="subtitle" style={{ margin: 0 }}>{editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi'}</h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        {assets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--danger)' }}>
            Anda belum memiliki Rekening/Dompet! Silakan buka tab <strong>Aset</strong> dan tambahkan akun terlebih dahulu.
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button 
                type="button" 
                onClick={() => setType('pengeluaran')} 
                style={{ 
                  flex: 1, padding: '10px', borderRadius: '8px', 
                  border: type === 'pengeluaran' ? '2px solid var(--secondary)' : '1px solid var(--border-color)', 
                  background: type === 'pengeluaran' ? 'var(--bg-expense)' : 'var(--bg-card)', 
                  fontWeight: 700, color: type === 'pengeluaran' ? 'var(--secondary)' : 'var(--text-muted)' 
                }}
              >Pengeluaran</button>
              <button 
                type="button" 
                onClick={() => setType('pendapatan')} 
                style={{ 
                  flex: 1, padding: '10px', borderRadius: '8px', 
                  border: type === 'pendapatan' ? '2px solid var(--primary)' : '1px solid var(--border-color)', 
                  background: type === 'pendapatan' ? 'var(--bg-income)' : 'var(--bg-card)', 
                  fontWeight: 700, color: type === 'pendapatan' ? 'var(--primary)' : 'var(--text-muted)' 
                }}
              >Pendapatan</button>
              <button 
                type="button" 
                onClick={() => setType('transfer')} 
                style={{ 
                  flex: 1, padding: '10px', borderRadius: '8px', 
                  border: type === 'transfer' ? '2px solid var(--text-muted)' : '1px solid var(--border-color)', 
                  background: type === 'transfer' ? 'var(--bg-neutral)' : 'var(--bg-card)', 
                  fontWeight: 700, color: type === 'transfer' ? 'var(--text-main)' : 'var(--text-muted)' 
                }}
              >Transfer</button>
            </div>

            <input type="text" inputMode="numeric" required placeholder="Nominal (Rp)" value={amount} onChange={handleAmountChange} />

            {type !== 'transfer' ? (
              <>
                <select required value={category} onChange={e => {
                  setCategory(e.target.value);
                  setSubCategory('');
                }}>
                  <option value="" disabled>-- Pilih Kategori --</option>
                  {categories.filter(c => c.type === type).map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                
                {(() => {
                  const selCat = categories.find(c => c.name === category && c.type === type);
                  if (selCat && selCat.subcategories && selCat.subcategories.length > 0) {
                    return (
                      <select required value={subCategory} onChange={e => setSubCategory(e.target.value)}>
                        <option value="" disabled>-- Pilih Sub-Kategori --</option>
                        {selCat.subcategories.map(sub => (
                          <option key={sub.id} value={sub.name}>{sub.name}</option>
                        ))}
                      </select>
                    );
                  }
                  return null;
                })()}

                <select required value={assetId} onChange={e => setAssetId(e.target.value)}>
                  <option value="" disabled>-- Pilih Dompet/Rekening --</option>
                  {assets.filter(a => !a.isDeleted || a.id === assetId).map(a => (
                    <option key={a.id} value={a.id}>{a.name} {a.isDeleted ? '(Dihapus)' : ''}</option>
                  ))}
                </select>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <select style={{ marginBottom: 0 }} value={fromAssetId} onChange={e => setFromAssetId(e.target.value)}>
                  {assets.filter(a => !a.isDeleted || a.id === fromAssetId).map(a => (
                    <option key={a.id} value={a.id}>{a.name} {a.isDeleted ? '(Dihapus)' : ''}</option>
                  ))}
                </select>
                <ArrowRightLeft color="var(--text-muted)" size={20} />
                <select style={{ marginBottom: 0 }} value={toAssetId} onChange={e => setToAssetId(e.target.value)}>
                  {assets.filter(a => !a.isDeleted || a.id === toAssetId).map(a => (
                    <option key={a.id} value={a.id}>{a.name} {a.isDeleted ? '(Dihapus)' : ''}</option>
                  ))}
                </select>
              </div>
            )}

            <input type="date" required value={date} onChange={e => setDate(e.target.value)} />
            <input type="text" placeholder="Catatan opsional" value={note} onChange={e => setNote(e.target.value)} />

            <button 
              type="submit" 
              className={type === 'pendapatan' ? 'btn btn-primary' : type === 'pengeluaran' ? 'btn btn-secondary' : 'btn'}
              style={{
                width: '100%',
                marginTop: '10px',
                backgroundColor: type === 'transfer' ? 'var(--text-muted)' : undefined,
                color: type === 'transfer' ? 'white' : undefined
              }}
            >
              {editingTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default TransactionModal;
