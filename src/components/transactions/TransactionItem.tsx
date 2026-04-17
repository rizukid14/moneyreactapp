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
  showDate?: boolean;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ 
  transaction: tx, 
  assetName, 
  fromAssetName, 
  toAssetName, 
  onDelete,
  onEdit,
  showDate = true
}) => {
  return (
    <div className="card transaction-card" style={{ 
      display: 'flex', 
      alignItems: 'center',
      padding: '12px 16px',
      marginBottom: '0'
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '10px',
        backgroundColor: tx.type === 'pengeluaran' ? 'var(--bg-expense)' : tx.type === 'pendapatan' ? 'var(--bg-income)' : 'var(--bg-neutral)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '14px',
        color: tx.type === 'pengeluaran' ? 'var(--danger)' : tx.type === 'pendapatan' ? 'var(--primary)' : 'var(--text-muted)',
        flexShrink: 0
      }}>
        {tx.type === 'pengeluaran' ? <ArrowDownRight size={18} /> : tx.type === 'pendapatan' ? <ArrowUpRight size={18} /> : <ArrowRightLeft size={18} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', marginBottom: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {tx.type === 'transfer' ? (
            <span style={{ fontSize: '13px' }}>{fromAssetName} <ArrowRightLeft size={12} style={{ margin: '0 2px' }} /> {toAssetName}</span>
          ) : (
            <>
              <span>{tx.category}</span>
              {tx.subCategory && (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, background: 'var(--bg-main)', padding: '2px 6px', borderRadius: '6px' }}>
                  {tx.subCategory}
                </span>
              )}
            </>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
          {showDate && <span style={{ marginRight: '6px' }}>{tx.date}</span>}
          <span>{tx.type !== 'transfer' ? assetName : 'Transfer'}</span>
          {tx.note && <span style={{ marginLeft: '6px', opacity: 0.8 }}>• {tx.note}</span>}
        </div>
      </div>

      <div style={{
        fontWeight: 800,
        fontSize: '15px',
        color: tx.type === 'pendapatan' ? 'var(--primary)' : 'var(--text-main)',
        marginLeft: '12px',
        textAlign: 'right'
      }}>
        {tx.type === 'pengeluaran' ? '-' : tx.type === 'pendapatan' ? '+' : ''}Rp{tx.amount.toLocaleString('id-ID')}
      </div>

      <div className="transaction-actions" style={{ display: 'flex', gap: '4px', marginLeft: '16px' }}>
        <button 
          onClick={() => onEdit(tx)} 
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '6px', cursor: 'pointer' }}
        >
          <Pencil size={14} />
        </button>
        <button 
          onClick={() => confirm('Hapus transaksi ini?') && onDelete(tx.id)} 
          style={{ background: 'none', border: 'none', color: 'var(--danger)', padding: '6px', cursor: 'pointer' }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// Use React.memo for performance (rerender-memo)
export default React.memo(TransactionItem);
