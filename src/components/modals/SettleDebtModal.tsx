import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Debt, Asset } from '../../contexts/MoneyContext';

interface SettleDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assetId: string) => void;
  debt: Debt;
  assets: Asset[];
}

const SettleDebtModal: React.FC<SettleDebtModalProps> = ({ isOpen, onClose, onConfirm, debt, assets }) => {
  const isHutang = debt.type === 'hutang';
  const activeAssets = assets.filter(a => !a.isDeleted);
  
  // Default to the pre-configured asset if available
  const defaultAssetId = isHutang ? debt.paymentAssetId : debt.receiveAssetId;
  const [selectedAssetId, setSelectedAssetId] = useState(defaultAssetId || (activeAssets[0]?.id || ''));

  if (!isOpen) return null;

  const remaining = debt.isInstallment
    ? Math.max(0, debt.totalAmount - (debt.paidInstallments * (debt.installmentAmount || 0)))
    : debt.totalAmount;

  const formatCurrency = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="subtitle" style={{ margin: 0 }}>
            Pelunasan {isHutang ? 'Hutang' : 'Piutang'}
          </h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            Jumlah yang akan dilunaskan:
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: isHutang ? 'var(--danger)' : 'var(--primary)' }}>
            {formatCurrency(remaining)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Kontak: <strong>{debt.contact}</strong>
          </div>
        </div>

        <div style={{ background: 'var(--bg-main)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
            {isHutang ? '🏦 Bayar menggunakan rekening:' : '🏦 Terima uang ke rekening:'}
          </label>
          <select 
            value={selectedAssetId} 
            onChange={(e) => setSelectedAssetId(e.target.value)}
            style={{ width: '100%', marginBottom: 0 }}
          >
            <option value="">-- Pilih Rekening --</option>
            {activeAssets.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => onConfirm(selectedAssetId)}
          className="btn"
          style={{
            width: '100%',
            fontWeight: 700,
            background: isHutang ? 'var(--danger)' : 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '13px',
          }}
        >
          Konfirmasi Pelunasan
        </button>
      </div>
    </div>
  );
};

export default SettleDebtModal;
