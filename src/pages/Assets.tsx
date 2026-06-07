import React, { useState, useMemo, useCallback } from 'react';
import { useMoney } from '../contexts/MoneyContext';
import type { Asset, AssetType, Transaction } from '../contexts/MoneyContext';
import AssetModal from '../components/modals/AssetModal';
import TransactionModal from '../components/modals/TransactionModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
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
    case 'Cash': return 'secondary';
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
  const Icon = getIconForType(asset.type);
  const color = getColorForType(asset.type);

  const assetTxs = useMemo(() => {
    return transactions
      .filter(tx => {
        const isRelated = tx.assetId === asset.id || tx.fromAssetId === asset.id || tx.toAssetId === asset.id;
        if (!isRelated) return false;

        if (filterType === 'all') return true;
        
        const isIncoming = tx.type === 'pendapatan' || tx.toAssetId === asset.id;
        const isOutgoing = tx.type === 'pengeluaran' || tx.fromAssetId === asset.id;

        if (filterType === 'income') return isIncoming;
        if (filterType === 'expense') return isOutgoing;
        
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, asset.id, filterType]);

  const stats = useMemo(() => {
    let income = 0, expense = 0;
    // Calculate stats based on ALL asset transactions, not just filtered ones
    transactions.forEach(tx => {
      const isIncoming = tx.type === 'pendapatan' || tx.toAssetId === asset.id;
      const isOutgoing = tx.type === 'pengeluaran' || tx.fromAssetId === asset.id;
      
      if (tx.assetId === asset.id || tx.fromAssetId === asset.id || tx.toAssetId === asset.id) {
        if (isIncoming && tx.type !== 'transfer') income += tx.amount;
        else if (isOutgoing && tx.type !== 'transfer') expense += tx.amount;
        // Note: For transfers, we usually don't count them in income/expense summary 
        // but we show them in the filtered list.
      }
    });
    
    // Recalculate to match how they are displayed in the list if needed
    // But usually income/expense stats are for pendapatan/pengeluaran types.
    // Let's stick to the simpler logic for now to match the user's expectation of "Masuk" and "Keluar"
    let simpleIncome = 0, simpleExpense = 0;
    const allRelated = transactions.filter(tx => tx.assetId === asset.id || tx.fromAssetId === asset.id || tx.toAssetId === asset.id);
    allRelated.forEach(tx => {
      if (tx.type === 'pendapatan' || tx.toAssetId === asset.id) simpleIncome += tx.amount;
      if (tx.type === 'pengeluaran' || tx.fromAssetId === asset.id) simpleExpense += tx.amount;
    });

    return { income: simpleIncome, expense: simpleExpense, count: allRelated.length };
  }, [transactions, asset.id]);

  const getAssetName = (id?: string) =>
    allAssets.find(a => a.id === id)?.name || '';

  return (
    <>
      <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-end' }}>
        <Card
          variant="glass"
          data-testid="asset-drawer"
          className="modal-content"
          onClick={e => e.stopPropagation()}
          style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: 0, borderRadius: '28px 28px 0 0', margin: 0, width: '100%', maxWidth: '600px' }}
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
                  const isIncoming = tx.type === 'pendapatan' || tx.toAssetId === asset.id;
                  const amtColor = tx.type === 'transfer'
                    ? 'var(--text-muted)'
                    : isIncoming ? 'var(--primary)' : 'var(--danger)';
                  const prefix = tx.type === 'transfer' ? '↔' : isIncoming ? '+' : '-';

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
                        background: tx.type === 'pengeluaran' ? 'var(--bg-expense)' : tx.type === 'pendapatan' ? 'var(--bg-income)' : 'var(--bg-neutral)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: tx.type === 'pengeluaran' ? 'var(--danger)' : tx.type === 'pendapatan' ? 'var(--primary)' : 'var(--text-muted)',
                      }}>
                        {tx.type === 'pengeluaran'
                          ? <MaterialIcon name="arrow_downward" className="text-base" />
                          : tx.type === 'pendapatan'
                          ? <MaterialIcon name="arrow_upward" className="text-base" />
                          : <MaterialIcon name="sync_alt" className="text-base" />}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tx.type === 'transfer'
                            ? `Transfer → ${getAssetName(tx.toAssetId)}`
                            : tx.category}
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

// ── Main Assets Page ────────────────────────────────────────────────────────
const Assets: React.FC = () => {
  const { assets, transactions, getAssetBalance, addAsset, updateAsset, deleteAsset, deleteTransaction, updateTransaction, isPrivateMode, togglePrivateMode, addTransaction, currencySymbol, assetCarouselCards } = useMoney();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [hiddenOpen, setHiddenOpen] = useState(false);

  const { balances, assetGroups } = useMemo(() => {
    const b: Record<string, number> = {};
    const groups: Record<AssetType, Asset[]> = {
      'Cash': [], 'Bank Account': [], 'Savings': [],
      'eWallet': [], 'Investment': [], 'Credit Card': [], 'Loan': []
    };

    assets.forEach(asset => {
      if (asset.isDeleted) return;
      const bal = getAssetBalance(asset.id);
      b[asset.id] = bal;
      if (groups[asset.type]) groups[asset.type].push(asset);
    });

    return { balances: b, assetGroups: groups };
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

  return (
    <PageWrapper>
      <PageHeader title="Aset Saya" />

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
                      const isLiability = (asset.type === 'Credit Card' || asset.type === 'Loan') && balance < 0;
                      const displayBalance = isLiability ? Math.abs(balance) : balance;
                      return (
                        <div
                          key={asset.id}
                          data-testid={`asset-card-${asset.id}`}
                          onClick={() => setSelectedAsset(asset)}
                          className="bg-bg-card p-3.5 rounded-[20px] shadow-sm flex flex-col justify-between cursor-pointer group hover:-translate-y-1 transition-all border border-outline-variant/30"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm
                              ${color === 'primary' ? 'bg-primary-container text-primary-color' : 
                                color === 'error' ? 'bg-error-container/30 text-error' : 
                                color === 'success' ? 'bg-[#10b981]/10 text-[#10b981]' : 
                                'bg-surface-container text-on-surface-variant'}`}
                            >
                              <MaterialIcon name={Icon} className="text-[18px]" />
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={e => { e.stopPropagation(); handleEdit(asset); }} 
                                className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary-container rounded-full transition-colors"
                              >
                                <MaterialIcon name="edit" className="text-[12px]" />
                              </button>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold text-on-surface-variant text-[10px] uppercase tracking-wider line-clamp-1 mb-0.5">{asset.name}</div>
                            {isLiability && <div className="text-[9px] text-error mb-0.5 font-bold">HUTANG</div>}
                            <div data-testid={`asset-balance-${asset.id}`} className={`text-sm md:text-base font-extrabold tracking-tight truncate ${isLiability ? 'text-error' : 'text-on-surface'}`}>
                              {isPrivateMode ? `${currencySymbol} ••••••••` : `${currencySymbol}${displayBalance.toLocaleString('id-ID')}`}
                            </div>
                          </div>
                        </div>
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
                        const isLiability = (asset.type === 'Credit Card' || asset.type === 'Loan') && balance < 0;
                        const displayBalance = isLiability ? Math.abs(balance) : balance;
                        return (
                          <div
                            key={asset.id}
                            data-testid={`asset-card-${asset.id}`}
                            onClick={() => setSelectedAsset(asset)}
                            className="bg-bg-card p-3.5 rounded-[20px] shadow-sm flex flex-col justify-between cursor-pointer group hover:-translate-y-1 transition-all border border-dashed border-outline-variant opacity-60 hover:opacity-100"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm
                                ${color === 'primary' ? 'bg-primary-container text-primary-color' : 
                                  color === 'error' ? 'bg-error-container/30 text-error' : 
                                  color === 'success' ? 'bg-[#10b981]/10 text-[#10b981]' : 
                                  'bg-surface-container text-on-surface-variant'}`}
                              >
                                <MaterialIcon name={Icon} className="text-[18px]" />
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={e => { e.stopPropagation(); handleEdit(asset); }} 
                                  className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary-container rounded-full transition-colors"
                                >
                                  <MaterialIcon name="edit" className="text-[12px]" />
                                </button>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="font-bold text-on-surface-variant text-[10px] uppercase tracking-wider line-clamp-1">{asset.name}</span>
                                <MaterialIcon name="visibility_off" className="text-[10px] text-on-surface-variant" />
                              </div>
                              {isLiability && <div className="text-[9px] text-error mb-0.5 font-bold">HUTANG</div>}
                              <div data-testid={`asset-balance-${asset.id}`} className={`text-sm md:text-base font-extrabold tracking-tight truncate ${isLiability ? 'text-error' : 'text-on-surface'}`}>
                                {isPrivateMode ? `${currencySymbol} ••••••••` : `${currencySymbol}${displayBalance.toLocaleString('id-ID')}`}
                              </div>
                            </div>
                          </div>
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
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => { setIsTxModalOpen(false); setEditingTx(null); }}
        assets={assets.filter(a => !a.isDeleted)}
        addTransaction={addTransaction}
        updateTransaction={updateTransaction}
        deleteTransaction={deleteTransaction}
        editingTransaction={editingTx}
      />

      <OnboardingTutorial 
        pageKey="assets" 
        steps={[
          { targetSelector: '[data-tour="net-worth"]', title: '💼 Ringkasan Aset', description: 'Lihat total kekayaan bersih dan ringkasan keuangan kamu. Geser kartu ini untuk melihat metrik lainnya!' },
          { targetSelector: '[data-tour="add-asset"]', title: '🏦 Tambah Rekening', description: 'Tap di sini untuk menambahkan rekening bank, dompet digital, atau aset tunai baru.' }
        ]} 
      />
    </PageWrapper>
  );
};

export default Assets;
