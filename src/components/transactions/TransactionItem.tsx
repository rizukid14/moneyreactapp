import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useMoney } from '../../contexts/MoneyContext';
import type { Transaction } from '../../contexts/MoneyContext';

/** Simple string hash for deterministic color mapping */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}
import ConfirmDialog from '../common/ConfirmDialog';
import MaterialIcon from '../common/MaterialIcon';
import { ListItem } from '../ui/ListItem';
import { IconBlock } from '../ui/IconBlock';
import { formatCurrency } from '../../lib/utils';

interface TransactionItemProps {
  transaction: Transaction;
  assetName?: string;
  fromAssetName?: string;
  toAssetName?: string;
  onDelete: (id: string, tx?: Transaction) => void;
  onEdit: (tx: Transaction) => void;
  onCopy?: (tx: Transaction) => void;
  showDate?: boolean;
}

const TX_TYPE_LABELS: Record<string, string> = {
  pengeluaran: 'Pengeluaran',
  pendapatan: 'Pendapatan',
  transfer: 'Transfer',
  piutang_keluar: 'Beri Pinjaman',
  piutang_masuk: 'Terima Pelunasan',
  hutang_masuk: 'Terima Pinjaman',
  hutang_keluar: 'Bayar Hutang',
};

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
  const { currencySymbol, categories } = useMoney();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const isExpenseLike = ['pengeluaran', 'piutang_keluar', 'hutang_keluar'].includes(tx.type);
  const isIncomeLike = ['pendapatan', 'piutang_masuk', 'hutang_masuk'].includes(tx.type);

  const category = categories.find(c => c.id === tx.categoryId);
  let categoryName = category ? category.name : (tx.categoryId || '');
  if (!categoryName) {
    categoryName = TX_TYPE_LABELS[tx.type] || 'Transaksi';
  }
  const subCategoryName = category?.subcategories?.find(s => s.id === tx.subCategoryId)?.name || tx.subCategoryId;
  // Deterministic color from category ID for the dot
  const CATEGORY_COLORS = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#06B6D4','#F97316','#84CC16','#6366F1'];
  const categoryColor = category
    ? CATEGORY_COLORS[Math.abs(hashCode(category.id)) % CATEGORY_COLORS.length]
    : '#94A3B8';
  const categoryDot = tx.type !== 'transfer' && category ? (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: categoryColor }}></span>
      {categoryName}
    </span>
  ) : categoryName;

  const { dragProps, swipeOffset } = useSwipeGesture({
    onSwipeLeft: () => setIsConfirmOpen(true),
    onSwipeRight: () => onEdit(tx),
  });

  return (
    <>
      <div className="relative overflow-hidden rounded-xl w-full" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 80px' }}>
        {/* Swipe Action Backgrounds */}
        <div className="absolute inset-0 flex justify-between items-center pointer-events-none rounded-xl">
          <div 
            className="h-full bg-secondary/15 flex items-center pl-4 text-secondary font-extrabold text-xs transition-opacity duration-150" 
            style={{ opacity: swipeOffset > 20 ? 1 : 0 }}
          >
            <MaterialIcon name="edit" className="mr-1.5 text-base animate-pulse" />
            Edit
          </div>
          <div 
            className="h-full bg-error/15 flex items-center pr-4 text-error font-extrabold text-xs ml-auto transition-opacity duration-150" 
            style={{ opacity: swipeOffset < -20 ? 1 : 0 }}
          >
            Hapus
            <MaterialIcon name="delete" className="ml-1.5 text-base animate-pulse" />
          </div>
        </div>

        <motion.div {...dragProps} className="relative z-10 w-full">
          <ListItem
            data-testid={`transaction-item-${tx.id}`}
            onClick={() => onEdit(tx)}
            left={
              <IconBlock 
                icon={isIncomeLike ? 'work' : tx.type === 'transfer' ? 'sync_alt' : 'shopping_bag'} 
                color={isIncomeLike ? 'income' : isExpenseLike ? 'expense' : 'neutral'}
                size="md"
              />
            }
            title={tx.type === 'transfer' ? `${fromAssetName} → ${toAssetName}` : categoryDot}
            subtitle={
              <div className="flex flex-col gap-0.5">
                {tx.type !== 'transfer' && subCategoryName && (
                  <span className="font-semibold text-[11px]">{subCategoryName}</span>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {showDate && <span>{tx.date}</span>}
                  {tx.time && <span className="font-bold text-primary">{tx.time} WIB</span>}
                  <span className="opacity-70">•</span>
                  <span>{tx.type !== 'transfer' ? assetName : 'Transfer'}</span>
                  {tx.note && <span className="truncate max-w-[100px] opacity-80">• {tx.note}</span>}
                  {tx.description && <MaterialIcon name="description" className="text-[10px] opacity-60" />}
                </div>
              </div>
            }
            right={
              <div className="flex flex-col items-end gap-1">
                <span className={`font-bold text-sm ${isIncomeLike ? 'text-primary-color' : isExpenseLike ? 'text-error' : 'text-on-surface'}`}>
                  {isIncomeLike ? '+' : isExpenseLike ? '-' : ''} {formatCurrency(tx.amount, currencySymbol)}
                </span>
                <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity lg:translate-x-2 lg:group-hover:translate-x-0">
                  {onCopy && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onCopy(tx); }}
                      title="Salin"
                      className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary-container rounded-lg transition-colors bg-surface-container"
                    >
                      <MaterialIcon name="content_copy" className="text-[14px]" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(tx); }}
                    title="Edit"
                    className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary-container rounded-lg transition-colors bg-surface-container"
                  >
                    <MaterialIcon name="edit" className="text-[14px]" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsConfirmOpen(true); }}
                    title="Hapus"
                    className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container rounded-lg transition-colors bg-surface-container"
                  >
                    <MaterialIcon name="delete" className="text-[14px]" />
                  </button>
                </div>
              </div>
            }
            className="group"
          />
        </motion.div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => onDelete(tx.id, tx)}
        title="Hapus Transaksi"
        message={`Apakah Anda yakin ingin menghapus transaksi "${tx.type === 'transfer' ? 'Transfer' : categoryName}" sebesar ${formatCurrency(tx.amount, currencySymbol)}?`}
      />
    </>
  );
};

export default React.memo(TransactionItem);
