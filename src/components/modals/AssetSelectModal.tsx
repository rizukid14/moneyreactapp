import React, { useState, useEffect, useMemo } from 'react';

import { type Asset, type AssetType, useMoney } from '../../contexts/MoneyContext';
import AssetModal from './AssetModal';
import Modal from '../ui/Modal';
import MaterialIcon from '../common/MaterialIcon';

interface AssetSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  selectedAssetId?: string;
  onSelect: (assetId: string) => void;
}

const ASSET_TYPE_META: Record<AssetType, { label: string; icon: React.ReactNode }> = {
  'Cash': { label: 'Tunai', icon: <MaterialIcon name="account_balance_wallet" className="text-[18px]" /> },
  'Bank Account': { label: 'Bank', icon: <MaterialIcon name="account_balance" className="text-[18px]" /> },
  'Credit Card': { label: 'Kartu Kredit', icon: <MaterialIcon name="credit_card" className="text-[18px]" /> },
  'eWallet': { label: 'E-Wallet', icon: <MaterialIcon name="smartphone" className="text-[18px]" /> },
  'Savings': { label: 'Tabungan', icon: <MaterialIcon name="savings" className="text-[18px]" /> },
  'Investment': { label: 'Investasi', icon: <MaterialIcon name="trending_up" className="text-[18px]" /> },
  'Loan': { label: 'Pinjaman', icon: <MaterialIcon name="payments" className="text-[18px]" /> },
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
      <Modal isOpen={isOpen} onClose={onClose} title="Pilih Rekening">
        <div style={{ display: 'flex', flexDirection: 'column', height: '75vh', overflow: 'hidden' }}>
          {/* Header Action: Add Asset */}
          <div style={{ position: 'absolute', top: '16px', right: '56px', zIndex: 10 }}>
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
              <MaterialIcon name="add" className="text-[18px]" />
            </button>
          </div>

              {/* Search Bar */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
                <div style={{ position: 'relative' }}>
                  <MaterialIcon name="search" />
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
                      <MaterialIcon name="close" className="text-[14px]" />
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
                              let iconName = 'account_balance_wallet';
                              let colorClass = isSelected ? 'text-primary' : 'text-on-surface-variant';
                              switch (asset.type) {
                                case 'Cash': iconName = 'account_balance_wallet'; if (!isSelected) colorClass = 'text-secondary'; break;
                                case 'Bank Account': iconName = 'account_balance'; if (!isSelected) colorClass = 'text-primary'; break;
                                case 'Credit Card': iconName = 'credit_card'; if (!isSelected) colorClass = 'text-error'; break;
                                case 'eWallet': iconName = 'smartphone'; if (!isSelected) colorClass = 'text-success'; break;
                                case 'Savings': iconName = 'savings'; if (!isSelected) colorClass = 'text-blue-500'; break;
                                case 'Investment': iconName = 'trending_up'; if (!isSelected) colorClass = 'text-emerald-500'; break;
                                case 'Loan': iconName = 'payments'; if (!isSelected) colorClass = 'text-error'; break;
                              }
                              return <MaterialIcon name={iconName} className={`text-[16px] ${colorClass}`} />;
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
                          {isSelected && <MaterialIcon name="check" className="text-[18px]" />}
                        </button>
                      );
                    })
                  )}
                </div>

              </div>
              </div>
            </div>
        </div>
      </Modal>

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
