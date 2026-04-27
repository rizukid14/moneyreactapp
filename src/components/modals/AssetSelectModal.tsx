import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Wallet, CreditCard, Landmark, Smartphone, PiggyBank, TrendingUp, HandCoins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Asset, AssetType } from '../../contexts/MoneyContext';

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
  isOpen, onClose, assets, selectedAssetId, onSelect,
}) => {
  const [activeType, setActiveType] = useState<AssetType>('Cash');

  // Get types that have at least one active asset
  const availableTypes = useMemo(() => {
    return ALL_TYPES.filter(t => assets.some(a => a.type === t));
  }, [assets]);

  // On open, set active type to the currently selected asset's type
  useEffect(() => {
    if (isOpen) {
      if (selectedAssetId) {
        const selectedAsset = assets.find(a => a.id === selectedAssetId);
        if (selectedAsset && availableTypes.includes(selectedAsset.type)) {
          setActiveType(selectedAsset.type);
          return;
        }
      }
      if (availableTypes.length > 0) {
        setActiveType(availableTypes[0]);
      }
    }
  }, [isOpen, selectedAssetId, assets, availableTypes]);

  // Assets of the active type, sorted alphabetically
  const filteredAssets = useMemo(() => {
    return [...assets]
      .filter(a => a.type === activeType)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assets, activeType]);

  const handleSelect = (assetId: string) => {
    onSelect(assetId);
    onClose();
  };

  return (
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
              padding: '20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0,
            }}>
              <h2 className="subtitle" style={{ margin: 0, fontSize: '16px' }}>Pilih Rekening / Dompet</h2>
              <button className="close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            {/* Split View */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

              {/* Left Panel: Asset Types */}
              <div style={{
                width: '40%',
                flexShrink: 0,
                borderRight: '1px solid var(--border-color)',
                overflowY: 'auto',
                background: 'var(--bg-main)',
                padding: '12px 0',
              }}>
                {availableTypes.map(type => {
                  const meta = ASSET_TYPE_META[type];
                  const isActive = type === activeType;
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveType(type)}
                      style={{
                        width: '100%', padding: '14px 16px', background: isActive ? 'var(--bg-card)' : 'transparent',
                        border: 'none', borderLeft: `4px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                        cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left', gap: '6px',
                      }}
                    >
                      <div style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {meta.icon}
                      </div>
                      <span style={{
                        fontSize: '12px',
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
                padding: '12px 0',
              }}>
                {filteredAssets.length === 0 ? (
                  <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Tidak ada akun {ASSET_TYPE_META[activeType].label}.
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
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                            {asset.name}
                          </div>
                          {asset.isDeleted && (
                            <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: 2 }}>Dihapus</div>
                          )}
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
  );
};

export default AssetSelectModal;
