import React, { useState } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import type { Asset, Transaction } from '../../contexts/MoneyContext';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, assets, addTransaction }) => {
  const [type, setType] = useState<'pengeluaran' | 'pendapatan' | 'transfer'>('pengeluaran');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [assetId, setAssetId] = useState(assets[0]?.id || '');
  const [fromAssetId, setFromAssetId] = useState(assets[0]?.id || '');
  const [toAssetId, setToAssetId] = useState(assets[1]?.id || assets[0]?.id || '');

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
    addTransaction({
      type,
      amount: Number(amount.replace(/\./g, '')),
      category: type === 'transfer' ? 'Transfer' : category,
      date,
      note,
      assetId: type !== 'transfer' ? assetId : undefined,
      fromAssetId: type === 'transfer' ? fromAssetId : undefined,
      toAssetId: type === 'transfer' ? toAssetId : undefined,
    });
    setAmount(''); setNote(''); setCategory('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="subtitle" style={{ margin: 0 }}>Tambah Transaksi</h2>
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
                  background: type === 'pengeluaran' ? 'hsla(35, 95%, 55%, 0.15)' : 'var(--bg-card)', 
                  fontWeight: 700, color: type === 'pengeluaran' ? 'var(--secondary)' : 'var(--text-muted)' 
                }}
              >Pengeluaran</button>
              <button 
                type="button" 
                onClick={() => setType('pendapatan')} 
                style={{ 
                  flex: 1, padding: '10px', borderRadius: '8px', 
                  border: type === 'pendapatan' ? '2px solid var(--primary)' : '1px solid var(--border-color)', 
                  background: type === 'pendapatan' ? 'hsla(215, 90%, 55%, 0.15)' : 'var(--bg-card)', 
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
                <input type="text" required placeholder={type === 'pendapatan' ? 'Misal: Gaji' : 'Misal: Makan'} value={category} onChange={e => setCategory(e.target.value)} />
                <select value={assetId} onChange={e => setAssetId(e.target.value)}>
                  <option value="" disabled>-- Pilih Dompet/Rekening --</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <select style={{ marginBottom: 0 }} value={fromAssetId} onChange={e => setFromAssetId(e.target.value)}>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <ArrowRightLeft color="var(--text-muted)" size={20} />
                <select style={{ marginBottom: 0 }} value={toAssetId} onChange={e => setToAssetId(e.target.value)}>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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
              Simpan Transaksi
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default TransactionModal;
