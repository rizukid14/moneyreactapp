import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Asset, AssetType } from '../../contexts/MoneyContext';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  updateAsset?: (id: string, asset: Partial<Asset>) => void;
  editingAsset?: Asset | null;
}

const AssetModal: React.FC<AssetModalProps> = ({ isOpen, onClose, addAsset, updateAsset, editingAsset }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('Cash');
  const [initialBalance, setInitialBalance] = useState('');
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    if (editingAsset) {
      setName(editingAsset.name);
      setType(editingAsset.type);
      setInitialBalance(editingAsset.initialBalance.toLocaleString('id-ID'));
      setIsHidden(editingAsset.isHidden || false);
    } else {
      setName('');
      setType('Cash');
      setInitialBalance('');
      setIsHidden(false);
    }
  }, [editingAsset, isOpen]);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (!numericValue) {
      setInitialBalance('');
      return;
    }
    setInitialBalance(Number(numericValue).toLocaleString('id-ID'));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const assetData = {
      name,
      type,
      initialBalance: Number(initialBalance.replace(/\./g, '')) || 0,
      isHidden,
    };

    if (editingAsset && updateAsset) {
      updateAsset(editingAsset.id, assetData);
    } else {
      addAsset(assetData);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="subtitle" style={{ margin: 0 }}>{editingAsset ? 'Edit Aset' : 'Tambah Aset Baru'}</h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSave}>
          <input 
            type="text" 
            required 
            placeholder="Nama Aset (mis: Rekening Mandiri)" 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />
          
          <select value={type} onChange={e => setType(e.target.value as AssetType)}>
            <option value="Cash">Tunai / Dompet</option>
            <option value="Bank Account">Rekening Bank</option>
            <option value="eWallet">E-Wallet (Gopay, OVO)</option>
            <option value="Savings">Tabungan</option>
            <option value="Investment">Investasi (Saham, Reksadana)</option>
            <option value="Credit Card">Kartu Kredit</option>
            <option value="Loan">Pinjaman / Hutang</option>
          </select>
          
          <input 
            type="text" 
            inputMode="numeric" 
            placeholder="Saldo Awal Opsional (Rp)" 
            value={initialBalance} 
            onChange={handleAmountChange} 
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', marginBottom: '8px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={isHidden}
              onChange={(e) => setIsHidden(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', marginBottom: 0 }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>Sembunyikan dari Total</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tidak akan dihitung dalam Total Kekayaan Bersih.</div>
            </div>
          </label>
          
          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
            {editingAsset ? 'Simpan Perubahan' : 'Simpan Aset'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AssetModal;
