import React, { useState, useMemo, useCallback } from 'react';
import { Wallet, CreditCard, Landmark, Plus, Smartphone, Pencil, EyeOff, Eye, TrendingUp, PiggyBank, HandCoins, X, ArrowUpRight, ArrowDownRight, ArrowRightLeft, ChevronRight } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import type { Asset, AssetType, Transaction } from '../contexts/MoneyContext';
import AssetModal from '../components/modals/AssetModal';
import TransactionModal from '../components/modals/TransactionModal';

const getIconForType = (type: AssetType) => {
  switch (type) {
    case 'Cash': return Wallet;
    case 'Bank Account': return Landmark;
    case 'Credit Card': return CreditCard;
    case 'eWallet': return Smartphone;
    case 'Savings': return PiggyBank;
    case 'Investment': return TrendingUp;
    case 'Loan': return HandCoins;
    default: return Wallet;
  }
};

const getColorForType = (type: AssetType) => {
  switch (type) {
    case 'Cash': return 'var(--secondary)';
    case 'Bank Account': return 'var(--primary)';
    case 'Credit Card': return 'var(--danger)';
    case 'eWallet': return 'var(--success)';
    case 'Savings': return '#3b82f6';
    case 'Investment': return '#10b981';
    case 'Loan': return 'var(--danger)';
    default: return 'var(--text-muted)';
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

const fmt = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

// ── Asset Detail Drawer ─────────────────────────────────────────────────────
const AssetDetailDrawer: React.FC<{
  asset: Asset;
  balance: number;
  transactions: Transaction[];
  allAssets: Asset[];
  isPrivateMode: boolean;
  onClose: () => void;
  onEditAsset: (a: Asset) => void;
  onEditTx: (tx: Transaction) => void;
}> = ({ asset, balance, transactions, allAssets, isPrivateMode, onClose, onEditAsset, onEditTx }) => {
  const Icon = getIconForType(asset.type);
  const color = getColorForType(asset.type);

  const assetTxs = useMemo(() => {
    return transactions
      .filter(tx =>
        tx.assetId === asset.id ||
        tx.fromAssetId === asset.id ||
        tx.toAssetId === asset.id
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, asset.id]);

  const stats = useMemo(() => {
    let income = 0, expense = 0;
    assetTxs.forEach(tx => {
      if (tx.type === 'pendapatan') income += tx.amount;
      else if (tx.type === 'pengeluaran') expense += tx.amount;
    });
    return { income, expense, count: assetTxs.length };
  }, [assetTxs]);

  const getAssetName = (id?: string) =>
    allAssets.find(a => a.id === id)?.name || '';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-end' }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: 0, borderRadius: '28px 28px 0 0' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            backgroundColor: 'var(--bg-main)', color,
            display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0
          }}>
            <Icon size={24} />
          </div>
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
              <Pencil size={16} />
            </button>
            <button className="close-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Balance */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Saldo Saat Ini</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: balance < 0 ? 'var(--danger)' : 'var(--text-main)', letterSpacing: '-1px' }}>
            {isPrivateMode ? 'Rp ••••••••' : fmt(Math.abs(balance))}
            {balance < 0 && <span style={{ fontSize: 13, marginLeft: 6, color: 'var(--danger)' }}>(minus)</span>}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <div style={{ flex: 1, background: 'var(--bg-income)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <ArrowUpRight size={12} color="var(--primary)" />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Masuk</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>
                {isPrivateMode ? '••••' : fmt(stats.income)}
              </div>
            </div>
            <div style={{ flex: 1, background: 'var(--bg-expense)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <ArrowDownRight size={12} color="var(--danger)" />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase' }}>Keluar</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--danger)' }}>
                {isPrivateMode ? '••••' : fmt(stats.expense)}
              </div>
            </div>
            <div style={{ flex: 1, background: 'var(--bg-neutral)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <ArrowRightLeft size={12} color="var(--text-muted)" />
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
                        ? <ArrowDownRight size={16} />
                        : tx.type === 'pendapatan'
                        ? <ArrowUpRight size={16} />
                        : <ArrowRightLeft size={16} />}
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
                      {prefix}{isPrivateMode ? '••••' : fmt(tx.amount)}
                    </div>

                    {/* Actions on hover */}
                    <div style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
                      <button
                        onClick={e => { e.stopPropagation(); onEditTx(tx); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: 5, cursor: 'pointer' }}
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Assets Page ────────────────────────────────────────────────────────
const Assets: React.FC = () => {
  const { assets, transactions, getAssetBalance, addAsset, updateAsset, updateTransaction, isPrivateMode, togglePrivateMode, addTransaction } = useMoney();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  const { total, balances, assetGroups } = useMemo(() => {
    let t = 0;
    const b: Record<string, number> = {};
    const groups: Record<AssetType, Asset[]> = {
      'Cash': [], 'Bank Account': [], 'Savings': [],
      'eWallet': [], 'Investment': [], 'Credit Card': [], 'Loan': []
    };

    assets.forEach(asset => {
      if (asset.isDeleted) return;
      const bal = getAssetBalance(asset.id);
      b[asset.id] = bal;
      if (!asset.isHidden) t += bal;
      if (groups[asset.type]) groups[asset.type].push(asset);
    });

    return { total: t, balances: b, assetGroups: groups };
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

  const getTierStyles = (amount: number) => {
    if (amount < 1000000) return { bg: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)' };
    if (amount < 10000000) return { bg: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)' };
    if (amount < 100000000) return { bg: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' };
    return { bg: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' };
  };

  const tier = getTierStyles(total);

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="title" style={{ margin: 0 }}>Aset Saya</h1>
      </div>

      {/* Total balance hero */}
      <div className="card" style={{
        padding: '24px', marginBottom: '32px',
        background: tier.bg, border: 'none', color: 'white',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>Total Kekayaan Bersih</div>
          <button onClick={togglePrivateMode} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', opacity: 0.8 }}>
            {isPrivateMode ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px' }}>
          {isPrivateMode ? 'Rp ••••••••' : `Rp${total.toLocaleString('id-ID')}`}
        </div>
      </div>

      {/* Asset list */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 className="subtitle" style={{ margin: 0 }}>Daftar Rekening</h2>
        <button onClick={handleAdd} style={{
          background: 'none', border: 'none', color: 'var(--primary)',
          display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '14px'
        }}>
          <Plus size={20} /> Tambah
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: 100 }}>
        {assets.filter(a => !a.isDeleted).length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada aset.</div>
        ) : (
          (Object.keys(assetGroups) as AssetType[]).map(typeKey => {
            const groupAssets = assetGroups[typeKey];
            if (groupAssets.length === 0) return null;
            return (
              <div key={typeKey}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '12px', marginLeft: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {TYPE_LABELS[typeKey]} ({groupAssets.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {groupAssets.map((asset: Asset) => {
                    const Icon = getIconForType(asset.type);
                    const color = getColorForType(asset.type);
                    const balance = balances[asset.id] || 0;
                    const isLiability = (asset.type === 'Credit Card' || asset.type === 'Loan') && balance < 0;
                    const displayBalance = isLiability ? Math.abs(balance) : balance;
                    const txCount = transactions.filter(tx =>
                      tx.assetId === asset.id || tx.fromAssetId === asset.id || tx.toAssetId === asset.id
                    ).length;

                    return (
                      <div
                        className="card"
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        style={{
                          display: 'flex', alignItems: 'center', marginBottom: 0,
                          opacity: asset.isHidden ? 0.6 : 1, border: 'none',
                          background: 'var(--bg-card)', cursor: 'pointer',
                          transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                      >
                        <div style={{
                          width: 48, height: 48, borderRadius: '16px', backgroundColor: 'var(--bg-main)',
                          color, display: 'flex', justifyContent: 'center', alignItems: 'center',
                          marginRight: '16px', flexShrink: 0
                        }}>
                          <Icon size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{asset.name}</div>
                            {asset.isHidden && <EyeOff size={14} color="var(--text-muted)" />}
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: '800', color: isLiability ? 'var(--danger)' : 'var(--text-main)', letterSpacing: '-0.5px' }}>
                            {isLiability && <span style={{ fontSize: '13px', marginRight: '4px', opacity: 0.8 }}>Hutang:</span>}
                            {isPrivateMode ? 'Rp ••••••••' : `Rp${displayBalance.toLocaleString('id-ID')}`}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {txCount} transaksi
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            onClick={e => { e.stopPropagation(); handleEdit(asset); }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '10px', cursor: 'pointer', opacity: 0.5 }}
                          >
                            <Pencil size={16} />
                          </button>
                          <ChevronRight size={16} color="var(--border-color)" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
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
      />

      {/* Asset detail drawer */}
      {selectedAsset && (
        <AssetDetailDrawer
          asset={selectedAsset}
          balance={balances[selectedAsset.id] || 0}
          transactions={transactions}
          allAssets={assets}
          isPrivateMode={isPrivateMode}
          onClose={() => setSelectedAsset(null)}
          onEditAsset={a => { handleEdit(a); }}
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
        editingTransaction={editingTx}
      />
    </div>
  );
};

export default Assets;
