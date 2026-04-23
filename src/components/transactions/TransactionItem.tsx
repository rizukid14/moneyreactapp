import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowRightLeft, Trash2, Pencil } from 'lucide-react';
import { useMoney } from '../../contexts/MoneyContext';
import type { Transaction } from '../../contexts/MoneyContext';
import ConfirmDialog from '../common/ConfirmDialog';

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
  const { currencySymbol } = useMoney();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <>
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
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>{tx.category}</span>
                {tx.subCategory && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '1px' }}>
                    {tx.subCategory}
                  </span>
                )}
              </div>
            )}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
            {showDate && <span style={{ marginRight: '6px' }}>{tx.date}</span>}
            {tx.time && <span style={{ marginRight: '6px', color: 'var(--primary)', fontWeight: 700 }}>{tx.time}</span>}
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
          {tx.type === 'pengeluaran' ? '-' : tx.type === 'pendapatan' ? '+' : ''}{currencySymbol}{tx.amount.toLocaleString('id-ID')}
        </div>

        <div className="transaction-actions" style={{ display: 'flex', gap: '4px', marginLeft: '16px' }}>
          <button 
            onClick={() => onEdit(tx)} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '6px', cursor: 'pointer' }}
          >
            <Pencil size={14} />
          </button>
          <button 
            onClick={() => setIsConfirmOpen(true)} 
            style={{ background: 'none', border: 'none', color: 'var(--danger)', padding: '6px', cursor: 'pointer' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => onDelete(tx.id)}
        title="Hapus Transaksi"
        message={`Apakah Anda yakin ingin menghapus transaksi "${tx.type === 'transfer' ? 'Transfer' : tx.category}" sebesar Rp${tx.amount.toLocaleString('id-ID')}?`}
      />
    </>
  );
};

// Use React.memo for performance (rerender-memo)
export default React.memo(TransactionItem);
