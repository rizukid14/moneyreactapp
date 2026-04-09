import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'pengeluaran' | 'pendapatan' | 'transfer';
  amount: number;
  category: string;
  date: string;
  note: string;
}

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [type, setType] = useState<'pengeluaran' | 'pendapatan' | 'transfer'>('pengeluaran');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Makanan');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('moneyapp_transactions');
    if (saved) {
      setTransactions(JSON.parse(saved));
    }
  }, []);

  const saveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const newTx: Transaction = {
      id: Date.now().toString(),
      type,
      amount: Number(amount),
      category,
      date,
      note
    };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    localStorage.setItem('moneyapp_transactions', JSON.stringify(updated));
    setIsModalOpen(false);
    // Reset
    setAmount(''); setNote('');
  };

  return (
    <div className="page">
      <h1 className="title">Transaksi</h1>
      
      {transactions.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
          Belum ada transaksi. Klik + untuk menambah.
        </div>
      ) : (
        transactions.map(tx => (
          <div className="card" key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{tx.category}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tx.date} • {tx.note}</div>
            </div>
            <div style={{ 
              fontWeight: 700, 
              color: tx.type === 'pengeluaran' ? 'var(--primary-orange)' : 'var(--secondary-blue)' 
            }}>
              {tx.type === 'pengeluaran' ? '-' : '+'}Rp{tx.amount.toLocaleString('id-ID')}
            </div>
          </div>
        ))
      )}

      <button className="fab" onClick={() => setIsModalOpen(true)}>
        <Plus size={28} />
      </button>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="subtitle" style={{ margin: 0 }}>Tambah Transaksi</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            
            <form onSubmit={saveTransaction}>
              <select value={type} onChange={e => setType(e.target.value as any)}>
                <option value="pengeluaran">Pengeluaran</option>
                <option value="pendapatan">Pendapatan</option>
                <option value="transfer">Transfer</option>
              </select>
              
              <input type="number" required placeholder="Nominal (Rp)" value={amount} onChange={e => setAmount(e.target.value)} />
              
              <input type="text" required placeholder="Kategori (Makan, Transport, dll)" value={category} onChange={e => setCategory(e.target.value)} />
              
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} />
              
              <input type="text" placeholder="Catatan opsional" value={note} onChange={e => setNote(e.target.value)} />
              
              <button type="submit" className="btn btn-orange" style={{
                backgroundColor: type === 'pendapatan' ? 'var(--secondary-blue)' : 'var(--primary-orange)'
              }}>
                Simpan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
