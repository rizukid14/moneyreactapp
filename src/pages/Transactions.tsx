import React, { useState } from 'react';
import { Plus, X, ArrowRightLeft, ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';

const Transactions: React.FC = () => {
  const { transactions, assets, addTransaction, deleteTransaction } = useMoney();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [type, setType] = useState<'pengeluaran' | 'pendapatan' | 'transfer'>('pengeluaran');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Makanan');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  
  // Asset selections
  const [assetId, setAssetId] = useState(assets[0]?.id || '');
  const [fromAssetId, setFromAssetId] = useState(assets[0]?.id || '');
  const [toAssetId, setToAssetId] = useState(assets[1]?.id || assets[0]?.id || '');

  // Reset form when modal opens
  const openModal = () => {
    setAssetId(assets[0]?.id || '');
    setFromAssetId(assets[0]?.id || '');
    setToAssetId(assets[1]?.id || assets[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (!numericValue) {
      setAmount('');
      return;
    }
    setAmount(Number(numericValue).toLocaleString('id-ID'));
  };

  const saveTransaction = (e: React.FormEvent) => {
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
    
    setIsModalOpen(false);
    setAmount(''); setNote('');
  };

  const getAssetName = (id?: string) => assets.find(a => a.id === id)?.name || 'Unknown';

  return (
    <div className="page" style={{ paddingBottom: '80px' }}>
      <h1 className="title">Transaksi</h1>
      
      {transactions.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
          Belum ada transaksi. Klik + untuk menambah.
        </div>
      ) : (
        transactions.map(tx => (
          <div className="card" key={tx.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: '20px', 
              backgroundColor: tx.type === 'pengeluaran' ? '#fff1f2' : tx.type === 'pendapatan' ? '#eff6ff' : '#f3f4f6',
              display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '16px',
              color: tx.type === 'pengeluaran' ? 'var(--danger-red)' : tx.type === 'pendapatan' ? 'var(--secondary-blue)' : 'var(--text-muted)'
            }}>
              {tx.type === 'pengeluaran' ? <ArrowDownRight size={20} /> : tx.type === 'pendapatan' ? <ArrowUpRight size={20} /> : <ArrowRightLeft size={20} />}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{tx.type === 'transfer' ? `Transfer: ${getAssetName(tx.fromAssetId)} ➔ ${getAssetName(tx.toAssetId)}` : tx.category}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {tx.date} • {tx.type !== 'transfer' ? getAssetName(tx.assetId) : ''} {tx.note && `(${tx.note})`}
              </div>
            </div>
            
            <div style={{ 
              fontWeight: 700, 
              color: tx.type === 'pengeluaran' ? 'var(--text-main)' : tx.type === 'pendapatan' ? 'var(--secondary-blue)' : 'var(--text-muted)' 
            }}>
              {tx.type === 'pengeluaran' ? '-' : tx.type === 'pendapatan' ? '+' : ''}Rp{tx.amount.toLocaleString('id-ID')}
            </div>
            
            <button onClick={() => confirm('Hapus transaksi ini?') && deleteTransaction(tx.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', padding: '0 0 0 12px', cursor: 'pointer' }}>
               <Trash2 size={16} />
            </button>
          </div>
        ))
      )}

      <button className="fab" onClick={openModal}>
        <Plus size={28} />
      </button>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="subtitle" style={{ margin: 0 }}>Tambah Transaksi</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            
            {assets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--danger-red)' }}>
                Anda belum memiliki Rekening/Dompet! Silakan buka tab <strong>Aset</strong> dan tambahkan akun terlebih dahulu.
              </div>
            ) : (
              <form onSubmit={saveTransaction}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button type="button" onClick={() => setType('pengeluaran')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: type === 'pengeluaran' ? '2px solid var(--primary-orange)' : '1px solid #e5e7eb', background: type === 'pengeluaran' ? '#fff7ed' : 'white', fontWeight: 600, color: type === 'pengeluaran' ? 'var(--primary-orange)' : 'var(--text-muted)' }}>Pengeluaran</button>
                  <button type="button" onClick={() => setType('pendapatan')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: type === 'pendapatan' ? '2px solid var(--secondary-blue)' : '1px solid #e5e7eb', background: type === 'pendapatan' ? '#eff6ff' : 'white', fontWeight: 600, color: type === 'pendapatan' ? 'var(--secondary-blue)' : 'var(--text-muted)' }}>Pendapatan</button>
                  <button type="button" onClick={() => setType('transfer')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: type === 'transfer' ? '2px solid #6b7280' : '1px solid #e5e7eb', background: type === 'transfer' ? '#f3f4f6' : 'white', fontWeight: 600, color: type === 'transfer' ? '#374151' : 'var(--text-muted)' }}>Transfer</button>
                </div>
                
                <input type="text" inputMode="numeric" required placeholder="Nominal (Rp)" value={amount} onChange={handleAmountChange} />
                
                {type !== 'transfer' ? (
                  <>
                    <input type="text" required placeholder="Kategori (Makan, Transport, dll)" value={category} onChange={e => setCategory(e.target.value)} />
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
                
                <button type="submit" className="btn btn-orange" style={{
                  backgroundColor: type === 'pendapatan' ? 'var(--secondary-blue)' : type === 'transfer' ? '#374151' : 'var(--primary-orange)'
                }}>
                  Simpan Transaksi
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
