import React, { useState, useMemo, useCallback } from 'react';
import { Wallet, CreditCard, Landmark, Plus, Trash2, Smartphone, Pencil, EyeOff, Eye, TrendingUp, PiggyBank, HandCoins } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import type { Asset, AssetType } from '../contexts/MoneyContext';
import AssetModal from '../components/modals/AssetModal';

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

const Assets: React.FC = () => {
  const { assets, getAssetBalance, addAsset, deleteAsset, updateAsset, isPrivateMode, togglePrivateMode } = useMoney();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  
  // Optimized derived state
  const { total, balances, assetGroups } = useMemo(() => {
    let t = 0;
    const b: Record<string, number> = {};
    const groups: Record<AssetType, Asset[]> = {
      'Cash': [],
      'Bank Account': [],
      'Savings': [],
      'eWallet': [],
      'Investment': [],
      'Credit Card': [],
      'Loan': []
    };
    
    assets.forEach(asset => {
      if (asset.isDeleted) return;

      const bal = getAssetBalance(asset.id);
      b[asset.id] = bal;
      if (!asset.isHidden) {
        t += bal;
      }
      
      if (groups[asset.type]) {
         groups[asset.type].push(asset);
      }
    });

    return { total: t, balances: b, assetGroups: groups };
  }, [assets, getAssetBalance]);

  const TYPE_LABELS: Record<AssetType, string> = {
    'Cash': 'Tunai & Dompet Pribadi',
    'Bank Account': 'Rekening Operasional',
    'Savings': 'Tabungan',
    'eWallet': 'Dompet Digital',
    'Investment': 'Investasi',
    'Credit Card': 'Kartu Kredit',
    'Loan': 'Pinjaman / Hutang'
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
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
    <div className="page">
      <h1 className="title">Aset Saya</h1>

      <div className="card glass" style={{ 
        background: 'linear-gradient(135deg, var(--primary), #1e40af)', 
        color: 'white', 
        border: 'none',
        padding: '24px',
        boxShadow: '0 10px 25px var(--primary-glow)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ opacity: 0.9, fontSize: '14px', fontWeight: 600 }}>Total Kekayaan Bersih</div>
          <button 
            onClick={togglePrivateMode} 
            style={{ background: 'none', border: 'none', color: 'white', opacity: 0.8, cursor: 'pointer', display: 'flex' }}
          >
            {isPrivateMode ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-1px' }}>
          {isPrivateMode ? 'Rp ••••••••' : `Rp${total.toLocaleString('id-ID')}`}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', marginBottom: '16px' }}>
        <h2 className="subtitle" style={{ margin: 0 }}>Daftar Rekening</h2>
        <button onClick={handleAdd} className="btn-text" style={{ 
          background: 'none', border: 'none', color: 'var(--primary)', 
          display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, cursor: 'pointer' 
        }}>
          <Plus size={20} /> Tambah
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {assets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada aset.</div>
        ) : (
          (Object.keys(assetGroups) as AssetType[]).map(typeKey => {
            const groupAssets = assetGroups[typeKey];
            if (groupAssets.length === 0) return null;

            return (
              <div key={typeKey}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', marginLeft: '4px' }}>
                  {TYPE_LABELS[typeKey]} ({groupAssets.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {groupAssets.map(asset => {
                    const Icon = getIconForType(asset.type);
                    const color = getColorForType(asset.type);
                    const balance = balances[asset.id] || 0;
                    
                    const isLiability = (asset.type === 'Credit Card' || asset.type === 'Loan') && balance < 0;
                    const displayBalance = isLiability ? Math.abs(balance) : balance;
                    
                    return (
                      <div className="card" key={asset.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 0, opacity: asset.isHidden ? 0.6 : 1 }}>
                        <div style={{ 
                          width: 52, height: 52, 
                          borderRadius: '14px', 
                          backgroundColor: `${color}15`, 
                          color: color,
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          marginRight: '16px',
                          border: `1px solid ${color}30`
                        }}>
                          <Icon size={26} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '13px' }}>{asset.name}</div>
                            {asset.isHidden && <EyeOff size={14} color="var(--text-muted)" />}
                          </div>
                          
                          <div style={{ fontSize: '18px', fontWeight: '800', color: isLiability ? 'var(--danger)' : 'var(--text-main)' }}>
                            {isLiability && <span style={{ fontSize: '12px', marginRight: '4px', opacity: 0.8 }}>Hutang:</span>}
                            {isPrivateMode ? 'Rp ••••••••' : `Rp${displayBalance.toLocaleString('id-ID')}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            onClick={() => handleEdit(asset)} 
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '10px', cursor: 'pointer', opacity: 0.6 }}
                          >
                            <Pencil size={18} />
                          </button>
                          <button 
                            onClick={() => confirm(`Hapus aset ${asset.name}?`) && deleteAsset(asset.id)} 
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', padding: '10px', cursor: 'pointer', opacity: 0.6 }}
                          >
                            <Trash2 size={18} />
                          </button>
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

      <AssetModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        addAsset={addAsset}
        updateAsset={updateAsset}
        editingAsset={editingAsset}
      />
    </div>
  );
};

export default Assets;
