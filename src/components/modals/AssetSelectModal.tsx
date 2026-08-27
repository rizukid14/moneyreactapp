import React, { useState, useEffect, useMemo } from 'react';

import { type Asset, type AssetType, useMoney } from '../../contexts/MoneyContext';
import AssetModal from './AssetModal';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import MaterialIcon from '../common/MaterialIcon';

interface AssetSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  selectedAssetId?: string;
  onSelect: (assetId: string) => void;
}

const ASSET_TYPE_META: Record<AssetType, { label: string; icon: string; colorClass: string }> = {
  'Cash': { label: 'Tunai', icon: 'account_balance_wallet', colorClass: 'text-secondary' },
  'Bank Account': { label: 'Bank', icon: 'account_balance', colorClass: 'text-primary' },
  'Credit Card': { label: 'Kartu Kredit', icon: 'credit_card', colorClass: 'text-error' },
  'eWallet': { label: 'E-Wallet', icon: 'smartphone', colorClass: 'text-success' },
  'Savings': { label: 'Tabungan', icon: 'savings', colorClass: 'text-blue-500' },
  'Investment': { label: 'Investasi', icon: 'trending_up', colorClass: 'text-emerald-500' },
  'Loan': { label: 'Pinjaman', icon: 'payments', colorClass: 'text-error' },
};

const ALL_TYPES: AssetType[] = ['Cash', 'Bank Account', 'Credit Card', 'eWallet', 'Savings', 'Investment', 'Loan'];

const AssetSelectModal: React.FC<AssetSelectModalProps> = ({
  isOpen, onClose, assets, selectedAssetId, onSelect
}) => {
  const { addAsset, updateAsset, addTransaction, deleteAsset, currencySymbol } = useMoney();
  const [activeType, setActiveType] = useState<AssetType>('Cash');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort available asset types
  const sortedTypes = useMemo(() => {
    let types = ALL_TYPES.filter(type => {
      return assets.some(a => a.type === type && (!a.isDeleted || a.id === selectedAssetId));
    });

    if (types.length === 0) {
      types = ALL_TYPES;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      types = types.filter(type => {
        const meta = ASSET_TYPE_META[type];
        const matchesType = meta.label.toLowerCase().includes(query) || type.toLowerCase().includes(query);
        const matchesAsset = assets.some(a =>
          a.type === type &&
          (!a.isDeleted || a.id === selectedAssetId) &&
          a.name.toLowerCase().includes(query)
        );
        return matchesType || matchesAsset;
      });
    }

    return types;
  }, [assets, searchQuery, selectedAssetId]);

  // Sync active type on open or when types change
  useEffect(() => {
    if (!isOpen) return;

    if (!sortedTypes.includes(activeType)) {
      if (selectedAssetId) {
        const selectedAsset = assets.find(a => a.id === selectedAssetId);
        if (selectedAsset && sortedTypes.includes(selectedAsset.type)) {
          setActiveType(selectedAsset.type);
          return;
        }
      }
      if (sortedTypes.length > 0) {
        setActiveType(sortedTypes[0]);
      }
    }
  }, [isOpen, selectedAssetId, sortedTypes, activeType, assets]);

  // Filter and sort assets for active type
  const sortedAssets = useMemo(() => {
    let result = assets.filter(a =>
      a.type === activeType &&
      (!a.isDeleted || a.id === selectedAssetId)
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const meta = ASSET_TYPE_META[activeType];
      const isTypeMatch = (meta && meta.label.toLowerCase().includes(query)) || activeType.toLowerCase().includes(query);

      if (!isTypeMatch) {
        result = result.filter(a => a.name.toLowerCase().includes(query));
      }
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [assets, activeType, searchQuery, selectedAssetId]);

  const handleSelect = (assetId: string) => {
    onSelect(assetId);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Pilih Rekening"
        headerActions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              background: 'var(--primary-gradient)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px var(--primary-glow)',
            }}
            title="Tambah Rekening Baru"
          >
            <MaterialIcon name="add" className="text-[18px]" />
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', overflow: 'hidden' }}>

          {/* Search Bar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
            <Input
              type="text"
              placeholder="Cari rekening atau tipe akun..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<MaterialIcon name="search" className="text-[16px]" />}
              rightElement={searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                >
                  <MaterialIcon name="close" className="text-[14px]" />
                </button>
              ) : undefined}
              style={{ marginBottom: 0 }}
            />
          </div>

          {/* Split View Content */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

            {/* Left Panel: Asset Types */}
            <div style={{
              flex: 1,
              borderRight: '1px solid var(--border-color)',
              overflowY: 'auto',
              background: 'var(--bg-main)',
              padding: '12px 0'
            }}>
              {sortedTypes.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>🏦</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Tipe rekening tidak ditemukan.
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setIsAddModalOpen(true)}
                    style={{ fontSize: '12px', padding: '8px 16px', height: 'auto', margin: '0 auto' }}
                  >
                    Tambah Rekening
                  </Button>
                </div>
              ) : (
                sortedTypes.map(type => {
                  const meta = ASSET_TYPE_META[type];
                  const isActive = type === activeType;
                  const query = searchQuery.trim().toLowerCase();
                  const count = assets.filter(a => {
                    if (a.isDeleted && a.id !== selectedAssetId) return false;
                    if (a.type !== type) return false;
                    if (!query) return true;
                    const labelLower = meta ? meta.label.toLowerCase() : '';
                    return (
                      a.name.toLowerCase().includes(query) ||
                      type.toLowerCase().includes(query) ||
                      labelLower.includes(query)
                    );
                  }).length;

                  return (
                    <button
                      key={type}
                      onClick={() => setActiveType(type)}
                      style={{
                        width: '100%', padding: '14px 16px', background: isActive ? 'var(--bg-card)' : 'transparent',
                        border: 'none', borderLeft: `4px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left',
                        boxShadow: isActive ? '0 2px 10px rgba(0,0,0,0.02)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <div style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }}>
                          <MaterialIcon name={meta.icon} className="text-[18px]" />
                        </div>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          minWidth: 0
                        }}>
                          {meta.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {count > 0 && (
                          <span style={{
                            fontSize: '10px',
                            background: isActive ? 'var(--primary)' : 'var(--border-color)',
                            color: isActive ? 'white' : 'var(--text-muted)',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontWeight: 700
                          }}>
                            {count}
                          </span>
                        )}
                        <MaterialIcon name="chevron_right" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Right Panel: Assets of active type */}
            <div style={{
              flex: 1.2,
              overflowY: 'auto',
              background: 'var(--bg-card-solid)',
              padding: '12px 0'
            }}>
              {sortedAssets.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>🏦</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: 4 }}>
                    Belum ada akun {ASSET_TYPE_META[activeType]?.label || ''}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 20 }}>
                    Tambahkan rekening baru untuk kategori tipe ini.
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setIsAddModalOpen(true)}
                    style={{ fontSize: '12px', padding: '8px 16px', height: 'auto', margin: '0 auto' }}
                  >
                    Tambah Rekening
                  </Button>
                </div>
              ) : (
                sortedAssets.map(asset => {
                  const isSelected = asset.id === selectedAssetId;
                  const meta = ASSET_TYPE_META[asset.type] || { icon: 'account_balance_wallet', colorClass: 'text-primary' };

                  return (
                    <button
                      key={asset.id}
                      onClick={() => handleSelect(asset.id)}
                      style={{
                        width: '100%', padding: '14px 20px',
                        background: isSelected ? 'var(--bg-income)' : 'transparent',
                        border: 'none', borderBottom: '1px solid var(--border-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                        <div style={{ flexShrink: 0 }}>
                          <MaterialIcon name={meta.icon} className={`text-[18px] ${meta.colorClass}`} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginRight: '8px'
                          }}>
                            {asset.name}
                          </div>
                          {asset.isDeleted && (
                            <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: 2 }}>Dihapus</div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <span style={{ flexShrink: 0 }}>
                          <MaterialIcon name="check" className="text-[16px] text-primary" />
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

          </div>

        </div>
      </Modal>

      <AssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        zIndex={4000}
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
