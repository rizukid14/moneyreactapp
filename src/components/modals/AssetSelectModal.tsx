import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Wallet, CreditCard, Landmark, Smartphone, PiggyBank, TrendingUp, HandCoins, Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Asset, type AssetType, useMoney } from '../../contexts/MoneyContext';
import AssetModal from './AssetModal';

interface AssetSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  selectedAssetId?: string;
  onSelect: (assetId: string) => void;
}

const ASSET_TYPE_META: Record<AssetType, { label: string; icon: React.ReactNode }> = {
  'Cash':         { label: 'Tunai',        icon: <Wallet size={18} /> },
  'Bank Account': { label: 'Bank',         icon: <Landmark size={18} /> },
  'Credit Card':  { label: 'Kartu Kredit', icon: <CreditCard size={18} /> },
  'eWallet':      { label: 'E-Wallet',     icon: <Smartphone size={18} /> },
  'Savings':      { label: 'Tabungan',     icon: <PiggyBank size={18} /> },
  'Investment':   { label: 'Investasi',    icon: <TrendingUp size={18} /> },
  'Loan':         { label: 'Pinjaman',     icon: <HandCoins size={18} /> },
};

const ALL_TYPES: AssetType[] = ['Cash', 'Bank Account', 'Credit Card', 'eWallet', 'Savings', 'Investment', 'Loan'];

const AssetSelectModal: React.FC<AssetSelectModalProps> = ({
  isOpen, onClose, assets, selectedAssetId, onSelect
}) => {
  const { addAsset, updateAsset, addTransaction, deleteAsset, currencySymbol } = useMoney();
  const [activeType, setActiveType] = useState<AssetType>('Cash');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get types that have at least one active asset
  const availableTypes = useMemo(() => {
    return ALL_TYPES;
  }, [assets]);

  // On open, set active type to the currently selected asset's type
  useEffect(() => {
    if (isOpen) {
      if (selectedAssetId) {
        const selectedAsset = assets.find(a => a.id === selectedAssetId);
        if (selectedAsset) {
          setActiveType(selectedAsset.type);
          return;
        }
      }
      // Default to first type that has assets, or 'Cash'
      const firstTypeWithAssets = ALL_TYPES.find(t => assets.some(a => a.type === t && (!a.isDeleted || a.id === selectedAssetId)));
      setActiveType(firstTypeWithAssets || 'Cash');
    }
  }, [isOpen, selectedAssetId, assets]);

  // Assets of the active type, sorted alphabetically
  const filteredAssets = useMemo(() => {
    let result = assets.filter(a => !a.isDeleted || a.id === selectedAssetId);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(query));
    } else {
      result = result.filter(a => a.type === activeType);
    }
    
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [assets, activeType, searchQuery, selectedAssetId]);

  const handleSelect = (assetId: string) => {
    onSelect(assetId);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="modal-overlay"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ zIndex: 3000 }}
          >
            <motion.div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400, mass: 0.5 }}
              style={{ padding: 0, height: '75vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              {/* Header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0,
              }}>
                <h2 className="subtitle" style={{ margin: 0, fontSize: '16px' }}>Pilih Rekening</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    style={{ 
                      background: 'var(--primary-gradient)', color: 'white', border: 'none', 
                      borderRadius: '10px', width: '32px', height: '32px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      cursor: 'pointer', boxShadow: '0 4px 10px var(--primary-glow)'
                    }}
                    title="Tambah Rekening Baru"
                  >
                    <Plus size={18} />
                  </button>
                  <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Cari rekening..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-main)',
                      fontSize: '13px',
                      fontWeight: 600,
                      marginBottom: 0,
                    }}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Split View */}
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Left Panel: Asset Types */}
                <div style={{
                  width: '35%',
                  flexShrink: 0,
                  borderRight: '1px solid var(--border-color)',
                  overflowY: 'auto',
                  background: 'var(--bg-main)',
                  padding: '8px 0',
                }}>
                  {availableTypes.map(type => {
                    const meta = ASSET_TYPE_META[type];
                    const isActive = type === activeType && !searchQuery;
                    const count = assets.filter(a => a.type === type && (!a.isDeleted || a.id === selectedAssetId)).length;

                    return (
                      <button
                        key={type}
                        onClick={() => {
                          setActiveType(type);
                          setSearchQuery('');
                        }}
                        style={{
                          width: '100%', padding: '12px 16px', background: isActive ? 'var(--bg-card)' : 'transparent',
                          border: 'none', borderLeft: `3px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                          cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left', gap: '4px',
                          opacity: searchQuery ? 0.5 : 1
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <div style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}>
                            {meta.icon}
                          </div>
                          {count > 0 && (
                             <span style={{ fontSize: '10px', background: isActive ? 'var(--primary)' : 'var(--border-color)', color: isActive ? 'white' : 'var(--text-muted)', padding: '2px 6px', borderRadius: '10px', fontWeight: 700 }}>
                               {count}
                             </span>
                          )}
                        </div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                          lineHeight: 1.2,
                        }}>
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Right Panel: Assets of selected type */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  background: 'var(--bg-card-solid)',
                  padding: '8px 0',
                }}>
                  {filteredAssets.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>🏦</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Belum ada akun {ASSET_TYPE_META[activeType].label}.
                      </div>
                      <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn btn-primary"
                        style={{ fontSize: '12px', padding: '8px 16px', height: 'auto', margin: '0 auto' }}
                      >
                        Tambah Rekening
                      </button>
                    </div>
                  ) : (
                    filteredAssets.map(asset => {
                      const isSelected = asset.id === selectedAssetId;
                      return (
                        <button
                          key={asset.id}
                          onClick={() => handleSelect(asset.id)}
                          style={{
                            width: '100%', padding: '16px 20px',
                            background: isSelected ? 'var(--bg-income)' : 'transparent',
                            border: 'none', borderBottom: '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {(() => {
                              let Icon = Wallet;
                              let color = isSelected ? 'var(--primary)' : 'var(--text-muted)';
                              switch (asset.type) {
                                case 'Cash': Icon = Wallet; if (!isSelected) color = 'var(--secondary)'; break;
                                case 'Bank Account': Icon = Landmark; if (!isSelected) color = 'var(--primary)'; break;
                                case 'Credit Card': Icon = CreditCard; if (!isSelected) color = 'var(--danger)'; break;
                                case 'eWallet': Icon = Smartphone; if (!isSelected) color = 'var(--success)'; break;
                                case 'Savings': Icon = PiggyBank; if (!isSelected) color = '#3b82f6'; break;
                                case 'Investment': Icon = TrendingUp; if (!isSelected) color = '#10b981'; break;
                                case 'Loan': Icon = HandCoins; if (!isSelected) color = 'var(--danger)'; break;
                              }
                              return <Icon size={16} color={color} />;
                            })()}
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                                {asset.name}
                              </div>
                              {asset.isDeleted && (
                                <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: 2 }}>Dihapus</div>
                              )}
                            </div>
                          </div>
                          {isSelected && <Check size={18} color="var(--primary)" />}
                        </button>
                      );
                    })
                  )}
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        addAsset={addAsset}
        updateAsset={updateAsset}
        addTransaction={addTransaction}
        onDelete={deleteAsset}
        currencySymbol={currencySymbol || 'Rp'}
        existingAssets={assets}
      />
    </>
  );
};

export default AssetSelectModal;
