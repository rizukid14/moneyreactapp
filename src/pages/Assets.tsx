import React, { useState, useMemo, useCallback } from 'react';
import { useMoney } from '../contexts/MoneyContext';
import type { Asset, AssetType, Transaction } from '../contexts/MoneyContext';
import AssetModal from '../components/modals/AssetModal';
import { lazy, Suspense } from 'react';
const TransactionModal = lazy(() => import('../components/modals/TransactionModal'));
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useToast } from '../components/common/Toast';
import { motion } from 'framer-motion';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import AssetSummaryCarousel from '../components/AssetSummaryCarousel';
import type { CardId } from '../components/AssetSummaryCarousel';
import OnboardingTutorial from '../components/OnboardingTutorial';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/ui/PageWrapper';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionHeader } from '../components/ui/SectionHeader';
import { IconBlock } from '../components/ui/IconBlock';
import type { IconBlockColor } from '../components/ui/IconBlock';
import { EmptyState } from '../components/ui/EmptyState';
import MaterialIcon from '../components/common/MaterialIcon';
import { Button } from '../components/ui/Button';

const getIconForType = (type: AssetType): string => {
  switch (type) {
    case 'Cash': return 'account_balance_wallet';
    case 'Bank Account': return 'account_balance';
    case 'Credit Card': return 'credit_card';
    case 'eWallet': return 'smartphone';
    case 'Savings': return 'savings';
    case 'Investment': return 'trending_up';
    case 'Loan': return 'request_quote';
    default: return 'account_balance_wallet';
  }
};

const getColorForType = (type: AssetType): IconBlockColor => {
  switch (type) {
    case 'Cash': return 'primary';
    case 'Bank Account': return 'primary';
    case 'Credit Card': return 'error';
    case 'eWallet': return 'success';
    case 'Savings': return 'primary';
    case 'Investment': return 'success';
    case 'Loan': return 'error';
    default: return 'neutral';
  }
};


const TYPE_LABELS: Record<AssetType, string> = {
  'Cash': 'Tunai & Dompet Pribadi',
  'Bank Account': 'Rekening Operasional',
  'Savings': 'Tabungan',
  'eWallet': 'Dompet Digital',
  'Investment': 'Investasi',
  'Credit Card': 'Kartu Kredit',
  'Loan': 'Pinjaman / Hutang',
};

const fmt = (n: number, sym: string) => `${sym}${n.toLocaleString('id-ID')}`;

// ── Asset Detail Drawer ─────────────────────────────────────────────────────
const AssetDetailDrawer: React.FC<{
  asset: Asset;
  balance: number;
  transactions: Transaction[];
  allAssets: Asset[];
  isPrivateMode: boolean;
  currencySymbol: string;
  onClose: () => void;
  onEditAsset: (a: Asset) => void;
  onDeleteAsset: (id: string) => void;
  onEditTx: (tx: Transaction) => void;
}> = ({ asset, balance, transactions, allAssets, isPrivateMode, currencySymbol, onClose, onEditAsset, onDeleteAsset, onEditTx }) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const { showToast } = useToast();
  const { categories } = useMoney();
  const Icon = getIconForType(asset.type);
  const color = getColorForType(asset.type);

  const assetTxs = useMemo(() => {
    return transactions
      .filter(tx => {
        const isRelated = tx.assetId === asset.id || tx.fromAssetId === asset.id || tx.toAssetId === asset.id;
        if (!isRelated) return false;

        if (filterType === 'all') return true;
        
        const isExpenseLike = ['pengeluaran', 'piutang_keluar', 'hutang_keluar'].includes(tx.type);
        const isIncomeLike = ['pendapatan', 'piutang_masuk', 'hutang_masuk'].includes(tx.type);
        
        const isOutgoing = isExpenseLike || tx.fromAssetId === asset.id;
        const isIncoming = isIncomeLike || tx.toAssetId === asset.id;

        if (filterType === 'income') return isIncoming && !isOutgoing;
        if (filterType === 'expense') return isOutgoing && !isIncoming;
        
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, asset.id, filterType]);

  const stats = useMemo(() => {
    let simpleIncome = 0, simpleExpense = 0;
    const allRelated = transactions.filter(tx => tx.assetId === asset.id || tx.fromAssetId === asset.id || tx.toAssetId === asset.id);
    allRelated.forEach(tx => {
      const isExpenseLike = ['pengeluaran', 'piutang_keluar', 'hutang_keluar'].includes(tx.type);
      const isIncomeLike = ['pendapatan', 'piutang_masuk', 'hutang_masuk'].includes(tx.type);
      
      if (isIncomeLike || (tx.type === 'transfer' && tx.toAssetId === asset.id)) simpleIncome += tx.amount;
      if (isExpenseLike || (tx.type === 'transfer' && tx.fromAssetId === asset.id)) simpleExpense += tx.amount;
    });

    return { income: simpleIncome, expense: simpleExpense, count: allRelated.length };
  }, [transactions, asset.id]);

  const getAssetName = (id?: string) =>
    allAssets.find(a => a.id === id)?.name || '';

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <Card
          variant="glass"
          data-testid="asset-drawer"
          className="modal-content"
          onClick={e => e.stopPropagation()}
          style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: 0, margin: 0, width: '100%', maxWidth: '600px' }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '20px 20px 16px',
            borderBottom: '1px solid var(--border-color)',
            flexShrink: 0
          }}>
            <IconBlock icon={Icon} color={color} size="lg" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-main)' }}>{asset.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {TYPE_LABELS[asset.type]}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => onEditAsset(asset)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: 8, cursor: 'pointer' }}
              >
                <MaterialIcon name="edit" className="text-base" />
              </button>
              <button
                onClick={() => setIsConfirmOpen(true)}
                style={{ background: 'none', border: 'none', color: 'var(--danger)', padding: 8, cursor: 'pointer', opacity: 0.8 }}
              >
                <MaterialIcon name="delete" className="text-base" />
              </button>
              <button className="close-btn" onClick={onClose}><MaterialIcon name="close" className="text-lg" /></button>
            </div>
          </div>
  
          <ConfirmDialog 
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={() => {
              onDeleteAsset(asset.id);
              onClose();
            }}
            title="Hapus Aset"
            message={`Hapus aset "${asset.name}"? Sisa saldo akan tetap tercatat di histori, namun aset tidak akan muncul lagi.`}
          />
          {/* Balance */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <MaterialIcon name={getIconForType(asset.type)} className="text-primary text-[18px]" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {TYPE_LABELS[asset.type as AssetType] || asset.type}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>{asset.name}</h2>
              {asset.accountNumber && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '6px 10px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px dashed var(--border-color)', width: 'fit-content' }}>
                  <MaterialIcon name="account_balance" className="text-[12px] text-text-muted" />
                  <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '1px' }}>{asset.accountNumber}</span>
                  <button 
                    onClick={() => { 
                      navigator.clipboard.writeText(asset.accountNumber!);
                      showToast('Nomor rekening disalin', 'success');
                    }} 
                    style={{ background: 'var(--primary-glow)', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                    title="Salin"
                  >
                    <MaterialIcon name="content_copy" className="text-[12px]" />
                  </button>
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Saldo Saat Ini</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: balance < 0 ? 'var(--danger)' : 'var(--text-main)', letterSpacing: '-1px' }}>
              {isPrivateMode ? `${currencySymbol} ••••••••` : fmt(Math.abs(balance), currencySymbol)}
              {balance < 0 && <span style={{ fontSize: 13, marginLeft: 6, color: 'var(--danger)' }}>(minus)</span>}
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div 
                onClick={() => setFilterType(filterType === 'income' ? 'all' : 'income')}
                style={{ 
                  flex: 1, 
                  background: 'var(--bg-income)', 
                  borderRadius: 12, 
                  padding: '10px 12px',
                  cursor: 'pointer',
                  border: filterType === 'income' ? '2px solid var(--primary)' : '2px solid transparent',
                  transition: 'all 0.2s ease',
                  boxShadow: filterType === 'income' ? '0 4px 12px var(--primary-glow)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <MaterialIcon name="arrow_upward" className="text-[12px] text-primary" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Masuk</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>
                  {isPrivateMode ? '••••' : fmt(stats.income, currencySymbol)}
                </div>
              </div>
              <div 
                onClick={() => setFilterType(filterType === 'expense' ? 'all' : 'expense')}
                style={{ 
                  flex: 1, 
                  background: 'var(--bg-expense)', 
                  borderRadius: 12, 
                  padding: '10px 12px',
                  cursor: 'pointer',
                  border: filterType === 'expense' ? '2px solid var(--danger)' : '2px solid transparent',
                  transition: 'all 0.2s ease',
                  boxShadow: filterType === 'expense' ? '0 4px 12px rgba(239, 68, 68, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <MaterialIcon name="arrow_downward" className="text-[12px] text-error" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase' }}>Keluar</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--danger)' }}>
                  {isPrivateMode ? '••••' : fmt(stats.expense, currencySymbol)}
                </div>
              </div>
              <div 
                onClick={() => setFilterType('all')}
                style={{ 
                  flex: 1, 
                  background: 'var(--bg-neutral)', 
                  borderRadius: 12, 
                  padding: '10px 12px',
                  cursor: 'pointer',
                  border: filterType === 'all' ? '2px solid var(--text-muted)' : '2px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <MaterialIcon name="sync_alt" className="text-[12px] text-on-surface-variant" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transaksi</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-main)' }}>{stats.count}</div>
              </div>
            </div>
          </div>

          {/* Transaction list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {assetTxs.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: 14 }}>
                Belum ada transaksi untuk aset ini.
              </div>
            ) : (
              <div style={{ padding: '8px 0 24px' }}>
                {assetTxs.map(tx => {
                  const isExpenseLike = ['pengeluaran', 'piutang_keluar', 'hutang_keluar'].includes(tx.type);
                  const isIncomeLike = ['pendapatan', 'piutang_masuk', 'hutang_masuk'].includes(tx.type);

                  const amtColor = tx.type === 'transfer'
                    ? 'var(--text-muted)'
                    : isIncomeLike ? 'var(--primary)' : 'var(--danger)';
                  const prefix = tx.type === 'transfer' ? '↔' : isIncomeLike ? '+' : '-';

                  return (
                    <div
                      key={tx.id}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '12px 20px',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-main)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Type icon */}
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0, marginRight: 12,
                        background: isExpenseLike ? 'var(--bg-expense)' : isIncomeLike ? 'var(--bg-income)' : 'var(--bg-neutral)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isExpenseLike ? 'var(--danger)' : isIncomeLike ? 'var(--primary)' : 'var(--text-muted)',
                      }}>
                        {isExpenseLike
                          ? <MaterialIcon name="arrow_downward" className="text-base" />
                          : isIncomeLike
                          ? <MaterialIcon name="arrow_upward" className="text-base" />
                          : <MaterialIcon name="sync_alt" className="text-base" />}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tx.type === 'transfer'
                            ? `Transfer → ${getAssetName(tx.toAssetId)}`
                            : (categories?.find((c: any) => c.id === tx.categoryId)?.name || 'Kategori Dihapus')}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {tx.date}
                          {tx.note && <span style={{ marginLeft: 5, opacity: 0.8 }}>• {tx.note}</span>}
                        </div>
                      </div>

                      {/* Amount */}
                      <div style={{ fontWeight: 800, fontSize: 14, color: amtColor, marginLeft: 10, textAlign: 'right', flexShrink: 0 }}>
                        {prefix}{isPrivateMode ? '••••' : fmt(tx.amount, currencySymbol)}
                      </div>

                      {/* Actions on hover */}
                      <div style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
                        <button
                          onClick={e => { e.stopPropagation(); onEditTx(tx); }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: 5, cursor: 'pointer' }}
                        >
                          <MaterialIcon name="edit" className="text-[13px]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
};

// ── Asset Card Component with Swipe Gesture ──────────────────────────────────
const AssetCard: React.FC<{
  asset: Asset;
  balance: number;
  isPrivateMode: boolean;
  currencySymbol: string;
  color: IconBlockColor;
  Icon: string;
  stats: { lastActive: string; income: number; expense: number; count: number };
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
  isHidden?: boolean;
}> = ({ asset, balance, isPrivateMode, currencySymbol, color, Icon, stats, onEdit, onDelete, onSelect, isHidden }) => {
  const { dragProps, swipeOffset } = useSwipeGesture({
    onSwipeLeft: onDelete,
    onSwipeRight: onEdit,
  });

  const isLiability = (asset.type === 'Credit Card' || asset.type === 'Loan') && balance < 0;
  const displayBalance = isLiability ? Math.abs(balance) : balance;
  const isBankLike = asset.type === 'Bank Account' || asset.type === 'Credit Card' || asset.type === 'eWallet';

  return (
    <div className="relative overflow-hidden rounded-[24px] w-full h-full">
      {/* Swipe Action Backgrounds */}
      <div className="absolute inset-0 flex justify-between items-center pointer-events-none rounded-[24px]">
        <div 
          className="h-full bg-secondary/15 flex items-center pl-6 text-secondary font-extrabold text-xs transition-opacity duration-150" 
          style={{ opacity: swipeOffset > 20 ? 1 : 0 }}
        >
          <MaterialIcon name="edit" className="mr-1.5 text-base animate-pulse" />
          Edit
        </div>
        <div 
          className="h-full bg-error/15 flex items-center pr-6 text-error font-extrabold text-xs ml-auto transition-opacity duration-150" 
          style={{ opacity: swipeOffset < -20 ? 1 : 0 }}
        >
          Hapus
          <MaterialIcon name="delete" className="ml-1.5 text-base animate-pulse" />
        </div>
      </div>

      <motion.div {...dragProps} className="relative z-10 h-full w-full">
        <div
          data-testid={`asset-card-${asset.id}`}
          onClick={onSelect}
          className={`relative overflow-hidden p-5 rounded-[24px] cursor-pointer group hover:-translate-y-1.5 transition-all duration-300 shadow-sm hover:shadow-xl border h-full ${
            isHidden 
              ? 'border-dashed border-outline-variant/50 opacity-60 hover:opacity-100' 
              : 'border-white/40 dark:border-white/5'
          } ${
            isLiability 
              ? isHidden 
                ? 'bg-gradient-to-br from-error-container/40 to-error-container/10 dark:from-error/10 dark:to-error/5'
                : 'bg-gradient-to-br from-error-container/80 to-error-container/20 dark:from-error/20 dark:to-error/5'
              : color === 'primary' 
                ? isHidden 
                  ? 'bg-gradient-to-br from-primary-container/40 to-primary-container/10 dark:from-primary/10 dark:to-primary/5'
                  : 'bg-gradient-to-br from-primary-container/80 to-primary-container/20 dark:from-primary/20 dark:to-primary/5'
                : color === 'success'
                  ? 'bg-gradient-to-br from-[#10b981]/10 to-[#10b981]/5 dark:from-[#10b981]/10 dark:to-[#10b981]/5'
                  : 'bg-gradient-to-br from-surface-container to-surface-container-lowest'
          }`}
        >
          {/* Decorative blur circle */}
          <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-[24px] opacity-40 transition-opacity duration-500 group-hover:opacity-70 ${
             isLiability ? 'bg-error' : color === 'primary' ? 'bg-primary' : color === 'success' ? 'bg-[#10b981]' : 'bg-outline-variant'
          }`}></div>

          {/* Decorative glass overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent dark:from-white/5 pointer-events-none"></div>

          <div className="relative z-10 h-full flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm backdrop-blur-md border border-white/50 dark:border-white/10 transition-transform duration-300 group-hover:scale-110
                  ${color === 'primary' ? 'bg-white/60 text-primary dark:bg-black/20' : 
                    color === 'error' ? 'bg-white/60 text-error dark:bg-black/20' : 
                    color === 'success' ? 'bg-white/60 text-[#10b981] dark:bg-black/20' : 
                    'bg-white/60 text-on-surface-variant dark:bg-black/20'}`}
                >
                  <MaterialIcon name={Icon} className="text-[20px]" />
                </div>
              </div>

              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={e => { e.stopPropagation(); onEdit(); }} 
                  className="p-1.5 text-on-surface-variant hover:text-primary bg-white/50 hover:bg-white/90 dark:bg-black/30 dark:hover:bg-black/60 backdrop-blur-sm rounded-full transition-colors shadow-sm"
                >
                  <MaterialIcon name="edit" className="text-[14px]" />
                </button>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between items-end mb-1">
                <div>
                  <div className="font-bold text-on-surface-variant text-[11px] uppercase tracking-wider line-clamp-1 opacity-80">{asset.name}</div>
                  {/* Masked Account Number */}
                  {isBankLike && (
                    <div className="font-mono text-[10px] tracking-widest opacity-60 mt-0.5">
                      •••• •••• {asset.accountNumber ? asset.accountNumber.slice(-4).padStart(4, '•') : asset.id.replace(/[^0-9]/g, '').padEnd(4, '0').slice(-4)}
                    </div>
                  )}
                </div>
                {isLiability && <div className="text-[9px] text-error mb-1 font-extrabold bg-error/10 dark:bg-error/20 inline-block px-2 py-0.5 rounded-md tracking-widest shrink-0">HUTANG</div>}
              </div>
              
              <div className="text-xl md:text-2xl font-black tracking-tight truncate">
                {isPrivateMode ? `${currencySymbol} ••••••••` : `${currencySymbol}${displayBalance.toLocaleString('id-ID')}`}
              </div>
              
              {/* Bottom Stats Row */}
              <div className="mt-3 flex items-center justify-between opacity-60 bg-black/5 dark:bg-white/5 rounded-lg px-2 py-1.5">
                {/* Last Active */}
                <div className="flex items-center gap-1.5">
                  <MaterialIcon name="update" className="text-[11px]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    {stats.count === 0 ? 'Belum Aktif' : `Aktif: ${stats.lastActive}`}
                  </span>
                </div>
                
                {/* Mini Cashflow */}
                {stats.count > 0 && (
                  <div className="flex items-center gap-2 text-[9px] font-bold">
                    <span className="text-primary flex items-center"><MaterialIcon name="arrow_drop_up" className="text-[12px] -mr-0.5" />{isPrivateMode ? '•••' : (stats.income/1000).toFixed(0)}k</span>
                    <span className="text-error flex items-center"><MaterialIcon name="arrow_drop_down" className="text-[12px] -mr-0.5" />{isPrivateMode ? '•••' : (stats.expense/1000).toFixed(0)}k</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main Assets Page ────────────────────────────────────────────────────────
const Assets: React.FC = () => {
  const { assets, transactions, getAssetBalance, addAsset, updateAsset, deleteAsset, deleteTransaction, updateTransaction, isPrivateMode, togglePrivateMode, addTransaction, currencySymbol, assetCarouselCards } = useMoney();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  const { balances, assetGroups } = useMemo(() => {
    const b: Record<string, number> = {};
    const groups: Record<AssetType, Asset[]> = {
      'Cash': [], 'Bank Account': [], 'Savings': [],
      'eWallet': [], 'Investment': [], 'Credit Card': [], 'Loan': []
    };
    
    let total = 0;

    assets.forEach(asset => {
      if (asset.isDeleted) return;
      const bal = getAssetBalance(asset.id);
      b[asset.id] = bal;
      if (groups[asset.type]) groups[asset.type].push(asset);
      if (bal > 0 && asset.type !== 'Credit Card' && asset.type !== 'Loan') {
        total += bal;
      }
    });

    return { balances: b, assetGroups: groups, totalNetWorth: total };
  }, [assets, getAssetBalance]);

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setSelectedAsset(null);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingAsset(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingAsset(null);
  }, []);

  const getAssetStats = useCallback((assetId: string) => {
    const txList = transactions.filter(tx => tx.assetId === assetId || tx.fromAssetId === assetId || tx.toAssetId === assetId);
    txList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastActive = txList[0] ? new Date(txList[0].date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Baru';
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let income = 0;
    let expense = 0;
    
    txList.forEach(tx => {
      const d = new Date(tx.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        if (tx.type === 'pendapatan' || tx.toAssetId === assetId) income += tx.amount;
        if (tx.type === 'pengeluaran' || tx.fromAssetId === assetId) expense += tx.amount;
      }
    });

    return { lastActive, income, expense, count: txList.length };
  }, [transactions]);

  return (
    <PageWrapper>
      <PageHeader title="Aset Saya" subtitle="Pantau saldo rekening, e-wallet, dan investasi Anda" />

      {/* Asset Summary Carousel */}
      <div data-tour="net-worth" data-testid="net-worth-carousel">
        <AssetSummaryCarousel
          cardIds={assetCarouselCards as CardId[]}
          assets={assets}
          balances={balances}
          currencySymbol={currencySymbol}
          isPrivateMode={isPrivateMode}
          onTogglePrivate={togglePrivateMode}
        />
      </div>

      {/* Asset list */}
      <SectionHeader 
        title="Daftar Rekening" 
        action={
          <Button variant="ghost" size="sm" onClick={handleAdd} data-tour="add-asset" data-testid="add-asset-btn" className="text-primary hover:bg-primary/10">
            <MaterialIcon name="add" className="text-lg" /> Tambah
          </Button>
        } 
      />

      <div className="flex flex-col gap-5 pb-24">
        {assets.filter(a => !a.isDeleted).length === 0 ? (
          <EmptyState icon="account_balance_wallet" title="Belum ada aset" description="Tambahkan aset pertama Anda." actionLabel="Tambah Aset" onAction={handleAdd} />
        ) : (
          <>
            {(Object.keys(assetGroups) as AssetType[]).map(typeKey => {
              const visibleAssets = assetGroups[typeKey].filter(a => !a.isHidden);
              if (visibleAssets.length === 0) return null;
              return (
                <div key={typeKey}>
                  <div className="flex justify-between items-center mb-3 px-3">
                    <div className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">
                      {TYPE_LABELS[typeKey]} ({visibleAssets.length})
                    </div>
                    <div className="text-xs font-extrabold text-on-surface">
                      {isPrivateMode ? `${currencySymbol} ••••••••` : `${currencySymbol}${visibleAssets.reduce((sum, a) => sum + (balances[a.id] || 0), 0).toLocaleString('id-ID')}`}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {visibleAssets.map((asset: Asset) => {
                      const Icon = getIconForType(asset.type);
                      const color = getColorForType(asset.type);
                      const balance = balances[asset.id] || 0;
                      const stats = getAssetStats(asset.id);
                      
                      return (
                        <AssetCard
                          key={asset.id}
                          asset={asset}
                          balance={balance}
                          isPrivateMode={isPrivateMode}
                          currencySymbol={currencySymbol}
                          color={color}
                          Icon={Icon}
                          stats={stats}
                          onEdit={() => handleEdit(asset)}
                          onDelete={() => setDeletingAssetId(asset.id)}
                          onSelect={() => setSelectedAsset(asset)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* ── Hidden assets accordion ── */}
            {(() => {
              const hiddenAssets = assets.filter(a => !a.isDeleted && a.isHidden);
              if (hiddenAssets.length === 0) return null;
              return (
                <div>
                  <button
                    data-testid="hidden-assets-toggle"
                    onClick={() => setHiddenOpen(o => !o)}
                    className="w-full flex items-center justify-between border-2 border-dashed border-outline-variant rounded-2xl p-4 cursor-pointer transition-colors hover:border-primary hover:bg-primary/5 group"
                  >
                    <div className="flex items-center gap-2">
                      <MaterialIcon name="visibility_off" className="text-sm text-on-surface-variant group-hover:text-primary transition-colors" />
                      <span className="text-sm font-bold text-on-surface-variant group-hover:text-primary transition-colors">
                        Tersembunyi ({hiddenAssets.length})
                      </span>
                    </div>
                    <MaterialIcon 
                      name="chevron_right" 
                      className={`text-on-surface-variant group-hover:text-primary transition-all ${hiddenOpen ? 'rotate-90' : ''}`} 
                    />
                  </button>

                  {hiddenOpen && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                      {hiddenAssets.map((asset: Asset) => {
                        const Icon = getIconForType(asset.type);
                        const color = getColorForType(asset.type);
                        const balance = balances[asset.id] || 0;
                        const stats = getAssetStats(asset.id);
                        
                        return (
                          <AssetCard
                            key={asset.id}
                            asset={asset}
                            balance={balance}
                            isPrivateMode={isPrivateMode}
                            currencySymbol={currencySymbol}
                            color={color}
                            Icon={Icon}
                            stats={stats}
                            onEdit={() => handleEdit(asset)}
                            onDelete={() => setDeletingAssetId(asset.id)}
                            onSelect={() => setSelectedAsset(asset)}
                            isHidden={true}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Asset modal (add/edit) */}
      <AssetModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        addAsset={addAsset}
        updateAsset={updateAsset}
        editingAsset={editingAsset}
        currentBalance={editingAsset ? balances[editingAsset.id] : undefined}
        addTransaction={addTransaction}
        onDelete={deleteAsset}
        currencySymbol={currencySymbol}
        existingAssets={assets}
      />

      {/* Asset detail drawer */}
      {selectedAsset && (
        <AssetDetailDrawer
          asset={selectedAsset}
          balance={balances[selectedAsset.id] || 0}
          transactions={transactions}
          allAssets={assets}
          isPrivateMode={isPrivateMode}
          currencySymbol={currencySymbol}
          onClose={() => setSelectedAsset(null)}
          onEditAsset={a => { handleEdit(a); }}
          onDeleteAsset={deleteAsset}
          onEditTx={tx => {
            setEditingTx(tx);
            setSelectedAsset(null);
            setIsTxModalOpen(true);
          }}
        />
      )}

      {/* Transaction edit modal from drawer */}
      {isTxModalOpen && (
        <Suspense fallback={null}>
          <TransactionModal
            isOpen={isTxModalOpen}
            onClose={() => { setIsTxModalOpen(false); setEditingTx(null); }}
            assets={assets.filter(a => !a.isDeleted)}
            addTransaction={addTransaction}
            updateTransaction={updateTransaction}
            deleteTransaction={deleteTransaction}
            editingTransaction={editingTx}
          />
        </Suspense>
      )}

      <OnboardingTutorial 
        pageKey="assets" 
        steps={[
          { targetSelector: '[data-tour="net-worth"]', title: '💼 Ringkasan Aset', description: 'Lihat total kekayaan bersih dan ringkasan keuangan kamu. Geser kartu ini untuk melihat metrik lainnya!' },
          { targetSelector: '[data-tour="add-asset"]', title: '🏦 Tambah Rekening', description: 'Tap di sini untuk menambahkan rekening bank, dompet digital, atau aset tunai baru.' }
        ]} 
      />

      <ConfirmDialog
        isOpen={!!deletingAssetId}
        onClose={() => setDeletingAssetId(null)}
        onConfirm={() => {
          if (deletingAssetId) {
            deleteAsset(deletingAssetId);
            setDeletingAssetId(null);
            showToast('Aset berhasil dihapus', 'success');
          }
        }}
        title="Hapus Aset"
        message="Hapus aset ini? Sisa saldo akan tetap tercatat di histori, namun aset tidak akan muncul lagi."
      />
    </PageWrapper>
  );
};

export default Assets;
