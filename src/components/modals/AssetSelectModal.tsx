import React, { useState, useEffect, useMemo } from 'react';

import { type Asset, type AssetType, useMoney } from '../../contexts/MoneyContext';
import AssetModal from './AssetModal';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import MaterialIcon from '../common/MaterialIcon';

export interface AssetSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  selectedAssetId?: string;
  onSelect?: (assetId: string) => void;
  // Multi-select mode for filters
  isMultiSelect?: boolean;
  selectedAssetIds?: string[];
  onMultiSelect?: (assetIds: string[]) => void;
  title?: string;
}

export const ASSET_TYPE_META: Record<AssetType, { label: string; icon: string; colorClass: string }> = {
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
  isOpen,
  onClose,
  assets,
  selectedAssetId,
  onSelect,
  isMultiSelect = false,
  selectedAssetIds,
  onMultiSelect,
  title
}) => {
  const { addAsset, updateAsset, addTransaction, deleteAsset, currencySymbol } = useMoney();
  const [activeType, setActiveType] = useState<AssetType>('Cash');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeAssets = useMemo(() => assets.filter(a => !a.isDeleted), [assets]);

  // Multi-select temporary selection state
  const [tempSelectedIds, setTempSelectedIds] = useState<Set<string>>(new Set());

  // Initialize tempSelectedIds on open
  useEffect(() => {
    if (!isOpen) return;
    if (isMultiSelect) {
      if (selectedAssetIds && selectedAssetIds.length > 0) {
        setTempSelectedIds(new Set(selectedAssetIds));
      } else {
        // Empty means all selected by default
        setTempSelectedIds(new Set(activeAssets.map(a => a.id)));
      }
    }
  }, [isOpen, isMultiSelect, selectedAssetIds, activeAssets]);

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

  const handleSingleSelect = (assetId: string) => {
    if (onSelect) {
      onSelect(assetId);
    }
    onClose();
  };

  const handleToggleAsset = (assetId: string) => {
    setTempSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const handleToggleType = (type: AssetType, e: React.MouseEvent) => {
    e.stopPropagation();
    const typeAssets = activeAssets.filter(a => a.type === type);
    const allSelected = typeAssets.length > 0 && typeAssets.every(a => tempSelectedIds.has(a.id));

    setTempSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        typeAssets.forEach(a => next.delete(a.id));
      } else {
        typeAssets.forEach(a => next.add(a.id));
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    const allSelected = activeAssets.length > 0 && tempSelectedIds.size === activeAssets.length;
    setTempSelectedIds(allSelected ? new Set() : new Set(activeAssets.map(a => a.id)));
  };

  const handleApplyMultiSelect = () => {
    if (onMultiSelect) {
      // If all are selected, we pass all IDs or empty array
      onMultiSelect(Array.from(tempSelectedIds));
    }
    onClose();
  };

  const modalTitle = title || (isMultiSelect ? 'Filter Akun & Kategori Aset' : 'Pilih Rekening');

  const isAllSelected = activeAssets.length > 0 && tempSelectedIds.size === activeAssets.length;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={modalTitle}
        headerActions={
          !isMultiSelect ? (
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
          ) : undefined
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', overflow: 'hidden' }}>

          {/* Search Bar & Multi-Select Header Option */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

            {/* Quick All Assets Toggle Bar for Multi-Select */}
            {isMultiSelect && (
              <div
                onClick={handleToggleAll}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer border border-outline-variant select-none"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    isAllSelected
                      ? 'bg-primary border-primary text-white'
                      : tempSelectedIds.size > 0
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'border-outline text-transparent'
                  }`}>
                    <MaterialIcon name={isAllSelected ? 'check' : tempSelectedIds.size > 0 ? 'remove' : 'check'} className="text-[14px] font-bold" />
                  </div>
                  <span className="text-xs font-bold text-on-surface truncate">
                    Pilih Semua Rekening
                  </span>
                </div>
                <span className="text-[11px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                  {tempSelectedIds.size} / {activeAssets.length} Terpilih
                </span>
              </div>
            )}
          </div>

          {/* Split View Content */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

            {/* Left Panel: Asset Types */}
            <div style={{
              flex: 1,
              borderRight: '1px solid var(--border-color)',
              overflowY: 'auto',
              background: 'var(--bg-main)',
              padding: '8px 0'
            }}>
              {sortedTypes.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>🏦</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Tipe rekening tidak ditemukan.
                  </div>
                  {!isMultiSelect && (
                    <Button
                      variant="primary"
                      onClick={() => setIsAddModalOpen(true)}
                      style={{ fontSize: '12px', padding: '8px 16px', height: 'auto', margin: '0 auto' }}
                    >
                      Tambah Rekening
                    </Button>
                  )}
                </div>
              ) : (
                sortedTypes.map(type => {
                  const meta = ASSET_TYPE_META[type];
                  const isActive = type === activeType;
                  const query = searchQuery.trim().toLowerCase();

                  const typeAssets = assets.filter(a => {
                    if (a.isDeleted && a.id !== selectedAssetId) return false;
                    if (a.type !== type) return false;
                    if (!query) return true;
                    const labelLower = meta ? meta.label.toLowerCase() : '';
                    return (
                      a.name.toLowerCase().includes(query) ||
                      type.toLowerCase().includes(query) ||
                      labelLower.includes(query)
                    );
                  });

                  const count = typeAssets.length;

                  // Multi-select type check state
                  const selectedInType = typeAssets.filter(a => tempSelectedIds.has(a.id)).length;
                  const isTypeFullySelected = count > 0 && selectedInType === count;
                  const isTypePartiallySelected = selectedInType > 0 && selectedInType < count;

                  return (
                    <button
                      key={type}
                      onClick={() => setActiveType(type)}
                      style={{
                        width: '100%', padding: '12px 14px', background: isActive ? 'var(--bg-card)' : 'transparent',
                        border: 'none', borderLeft: `4px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left',
                        boxShadow: isActive ? '0 2px 10px rgba(0,0,0,0.02)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        {isMultiSelect && (
                          <div
                            onClick={(e) => handleToggleType(type, e)}
                            title={`Pilih semua ${meta.label}`}
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                              isTypeFullySelected
                                ? 'bg-primary border-primary text-white'
                                : isTypePartiallySelected
                                ? 'bg-primary/20 border-primary text-primary'
                                : 'border-outline text-transparent'
                            }`}
                          >
                            <MaterialIcon name={isTypeFullySelected ? 'check' : isTypePartiallySelected ? 'remove' : 'check'} className="text-[12px] font-bold" />
                          </div>
                        )}

                        <div style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }}>
                          <MaterialIcon name={meta.icon} className="text-[18px]" />
                        </div>
                        <span style={{
                          fontSize: '13px',
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {count > 0 && (
                          <span style={{
                            fontSize: '10px',
                            background: isActive ? 'var(--primary)' : 'var(--border-color)',
                            color: isActive ? 'white' : 'var(--text-muted)',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontWeight: 700
                          }}>
                            {isMultiSelect ? `${selectedInType}/${count}` : count}
                          </span>
                        )}
                        <MaterialIcon name="chevron_right" className="text-xs text-on-surface-variant" />
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
              padding: '8px 0'
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
                  {!isMultiSelect && (
                    <Button
                      variant="primary"
                      onClick={() => setIsAddModalOpen(true)}
                      style={{ fontSize: '12px', padding: '8px 16px', height: 'auto', margin: '0 auto' }}
                    >
                      Tambah Rekening
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Category Header Banner in Right Panel (Multi-Select Mode) */}
                  {isMultiSelect && (
                    <div className="flex items-center justify-between px-4 py-2 mb-1 bg-surface-container-low border-b border-outline-variant">
                      <span className="text-xs font-bold text-on-surface">
                        Daftar Rekening {ASSET_TYPE_META[activeType]?.label}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleToggleType(activeType, e)}
                        className="text-[11px] font-bold text-primary hover:underline bg-transparent border-none cursor-pointer"
                      >
                        {sortedAssets.every(a => tempSelectedIds.has(a.id)) ? 'Hapus Semua' : 'Pilih Semua'}
                      </button>
                    </div>
                  )}

                  {sortedAssets.map(asset => {
                    const isSelected = isMultiSelect
                      ? tempSelectedIds.has(asset.id)
                      : asset.id === selectedAssetId;
                    const meta = ASSET_TYPE_META[asset.type] || { icon: 'account_balance_wallet', colorClass: 'text-primary' };

                    return (
                      <button
                        key={asset.id}
                        onClick={() => isMultiSelect ? handleToggleAsset(asset.id) : handleSingleSelect(asset.id)}
                        style={{
                          width: '100%', padding: '12px 16px',
                          background: isSelected && !isMultiSelect ? 'var(--bg-income)' : 'transparent',
                          border: 'none', borderBottom: '1px solid var(--border-color)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                          {isMultiSelect ? (
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                              isSelected ? 'bg-primary border-primary text-white' : 'border-outline text-transparent'
                            }`}>
                              <MaterialIcon name="check" className="text-[12px] font-bold" />
                            </div>
                          ) : (
                            <div style={{ flexShrink: 0 }}>
                              <MaterialIcon name={meta.icon} className={`text-[18px] ${meta.colorClass}`} />
                            </div>
                          )}

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: isSelected ? 700 : 500,
                              color: isSelected && !isMultiSelect ? 'var(--primary)' : 'var(--text-main)',
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

                        {!isMultiSelect && isSelected && (
                          <span style={{ flexShrink: 0 }}>
                            <MaterialIcon name="check" className="text-[16px] text-primary" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>

          </div>

          {/* Multi-Select Footer */}
          {isMultiSelect && (
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexShrink: 0
            }}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTempSelectedIds(new Set())}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer bg-transparent"
                >
                  Reset
                </button>
                <span className="text-xs text-on-surface-variant font-medium">
                  {tempSelectedIds.size === 0 ? 'Tidak ada akun dipilih (Semua)' : `${tempSelectedIds.size} akun aktif`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer border-none bg-transparent"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyMultiSelect}
                  style={{
                    background: 'var(--primary-gradient)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px var(--primary-glow)'
                  }}
                >
                  Terapkan Filter
                </button>
              </div>
            </div>
          )}

        </div>
      </Modal>

      {!isMultiSelect && (
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
      )}
    </>
  );
};

export default AssetSelectModal;
