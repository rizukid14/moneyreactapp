import React from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowRightLeft, Trash2 } from 'lucide-react';
import type { Transaction } from '../../contexts/MoneyContext';

interface TransactionItemProps {
  transaction: Transaction;
  assetName?: string;
  fromAssetName?: string;
  toAssetName?: string;
  onDelete: (id: string) => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ 
  transaction: tx, 
  assetName, 
  fromAssetName, 
  toAssetName, 
  onDelete 
}) => {
  return (
    <div className="card transaction-card" style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{
        width: 40, height: 40, borderRadius: '20px',
        backgroundColor: tx.type === 'pengeluaran' ? 'var(--bg-expense)' : tx.type === 'pendapatan' ? 'var(--bg-income)' : 'var(--bg-neutral)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '16px',
        color: tx.type === 'pengeluaran' ? 'var(--danger)' : tx.type === 'pendapatan' ? 'var(--primary)' : 'var(--text-muted)'
      }}>
        {tx.type === 'pengeluaran' ? <ArrowDownRight size={20} /> : tx.type === 'pendapatan' ? <ArrowUpRight size={20} /> : <ArrowRightLeft size={20} />}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>
          {tx.type === 'transfer' ? `Transfer: ${fromAssetName} ➔ ${toAssetName}` : tx.category}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {tx.date} • {tx.type !== 'transfer' ? assetName : ''} {tx.note && `(${tx.note})`}
        </div>
      </div>

      <div style={{
        fontWeight: 700,
        color: tx.type === 'pengeluaran' ? 'var(--text-main)' : tx.type === 'pendapatan' ? 'var(--primary)' : 'var(--text-muted)'
      }}>
        {tx.type === 'pengeluaran' ? '-' : tx.type === 'pendapatan' ? '+' : ''}Rp{tx.amount.toLocaleString('id-ID')}
      </div>

      <button 
        onClick={() => confirm('Hapus transaksi ini?') && onDelete(tx.id)} 
        style={{ background: 'none', border: 'none', color: '#cbd5e1', padding: '0 0 0 12px', cursor: 'pointer' }}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

// Use React.memo for performance (rerender-memo)
export default React.memo(TransactionItem);
