import React from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowRightLeft, Trash2, Pencil } from 'lucide-react';
import type { Transaction } from '../../contexts/MoneyContext';

interface TransactionItemProps {
  transaction: Transaction;
  assetName?: string;
  fromAssetName?: string;
  toAssetName?: string;
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ 
  transaction: tx, 
  assetName, 
  fromAssetName, 
  toAssetName, 
  onDelete,
  onEdit
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
          {tx.type === 'transfer' ? `Transfer: ${fromAssetName} \u2794 ${toAssetName}` : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
              <span>{tx.category}</span>
              {tx.subCategory && (
                <span style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--bg-main)', color: 'var(--text-muted)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  {tx.subCategory}
                </span>
              )}
            </div>
          )}
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

      <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
        <button 
          onClick={() => onEdit(tx)} 
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '4px', cursor: 'pointer', opacity: 0.6 }}
        >
          <Pencil size={16} />
        </button>
        <button 
          onClick={() => confirm('Hapus transaksi ini?') && onDelete(tx.id)} 
          style={{ background: 'none', border: 'none', color: 'var(--danger)', padding: '4px', cursor: 'pointer', opacity: 0.6 }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// Use React.memo for performance (rerender-memo)
export default React.memo(TransactionItem);
