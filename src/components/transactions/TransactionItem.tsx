import React, { useState } from 'react';
import { useMoney } from '../../contexts/MoneyContext';
import type { Transaction } from '../../contexts/MoneyContext';
import ConfirmDialog from '../common/ConfirmDialog';
import MaterialIcon from '../common/MaterialIcon';
import { formatCurrency } from '../../lib/utils';

interface TransactionItemProps {
  transaction: Transaction;
  assetName?: string;
  fromAssetName?: string;
  toAssetName?: string;
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onCopy?: (tx: Transaction) => void;
  showDate?: boolean;
}

const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction: tx,
  assetName,
  fromAssetName,
  toAssetName,
  onDelete,
  onEdit,
  onCopy,
  showDate = true
}) => {
  const { currencySymbol } = useMoney();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const isExpenseLike = ['pengeluaran', 'piutang_keluar', 'hutang_keluar'].includes(tx.type);
  const isIncomeLike = ['pendapatan', 'piutang_masuk', 'hutang_masuk'].includes(tx.type);

  return (
    <>
      <div
        data-testid={`transaction-item-${tx.id}`}
        className="p-4 flex items-center justify-between hover:bg-surface-subtle transition-colors cursor-pointer group relative overflow-hidden"
        onClick={() => onEdit(tx)}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center transition-colors shrink-0
            ${isIncomeLike ? 'text-tertiary group-hover:bg-tertiary-container group-hover:text-on-tertiary-container' :
              isExpenseLike ? 'text-primary group-hover:bg-primary-container group-hover:text-on-primary-container' : 'text-secondary'}
          `}>
            <MaterialIcon name={isIncomeLike ? 'work' : tx.type === 'transfer' ? 'sync_alt' : 'shopping_bag'} />
          </div>
          <div className="truncate pr-2">
            <h4 className="font-label-md text-label-md text-on-surface truncate flex flex-col">
              {tx.type === 'transfer' ? (
                <span className="flex items-center gap-1 text-[13px]">
                  {fromAssetName} <MaterialIcon name="arrow_forward" className="text-[12px] mx-1" /> {toAssetName}
                </span>
              ) : (
                <div className="flex flex-col">
                  <span>{tx.category}</span>
                  {tx.subCategory && (
                    <span className="text-[11px] text-on-surface-variant font-semibold mt-[1px]">
                      {tx.subCategory}
                    </span>
                  )}
                </div>
              )}
            </h4>
            <div className="text-[11px] text-on-surface-variant font-medium flex items-center flex-wrap">
              {showDate && <span className="mr-1.5">{tx.date}</span>}
              {tx.time && <span className="mr-1.5 font-bold text-primary">{tx.time} WIB</span>}
              <span>{tx.type !== 'transfer' ? assetName : 'Transfer'}</span>
              {tx.note && <span className="ml-1.5 opacity-80 truncate max-w-[120px]">• {tx.note}</span>}
              {tx.description && <MaterialIcon name="description" className="text-[10px] ml-1.5 opacity-60" />}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 flex flex-col items-end">
          <p className={`font-bold ${isIncomeLike ? 'text-tertiary' : isExpenseLike ? 'text-error' : 'text-on-surface'}`}>
            {isIncomeLike ? '+' : isExpenseLike ? '-' : ''} {formatCurrency(tx.amount, currencySymbol)}
          </p>
          <div className="flex items-center gap-1">
            {showDate && <p className="text-[10px] text-on-surface-variant">{tx.date}</p>}
            {tx.time && <p className="text-[10px] text-on-surface-variant font-medium text-primary">{tx.time} WIB</p>}
          </div>

          {/* Action buttons */}
          <div className="flex gap-1 mt-2 lg:mt-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            {onCopy && (
              <button
                onClick={(e) => { e.stopPropagation(); onCopy(tx); }}
                title="Salin"
                className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-md transition-colors"
              >
                <MaterialIcon name="content_copy" className="text-[14px]" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(tx); }}
              title="Edit"
              className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-md transition-colors"
            >
              <MaterialIcon name="edit" className="text-[14px]" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsConfirmOpen(true); }}
              title="Hapus"
              className="p-1.5 text-error hover:bg-error-container rounded-md transition-colors"
            >
              <MaterialIcon name="delete" className="text-[14px]" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => onDelete(tx.id)}
        title="Hapus Transaksi"
        message={`Apakah Anda yakin ingin menghapus transaksi "${tx.type === 'transfer' ? 'Transfer' : tx.category}" sebesar ${formatCurrency(tx.amount, currencySymbol)}?`}
      />
    </>
  );
};

export default React.memo(TransactionItem);
