import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Asset, AssetType, Transaction } from '../../contexts/MoneyContext';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  updateAsset?: (id: string, asset: Partial<Asset>) => void;
  editingAsset?: Asset | null;
  currentBalance?: number;
  addTransaction?: (tx: Omit<Transaction, 'id'>) => void;
  onDelete?: (id: string) => void;
}

const AssetModal: React.FC<AssetModalProps> = ({ isOpen, onClose, addAsset, updateAsset, editingAsset, currentBalance, addTransaction, onDelete }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('Cash');
  const [initialBalance, setInitialBalance] = useState('');
  const [adjustedBalance, setAdjustedBalance] = useState('');
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    if (editingAsset) {
      setName(editingAsset.name);
      setType(editingAsset.type);
      setInitialBalance(editingAsset.initialBalance.toLocaleString('id-ID'));
      setAdjustedBalance(currentBalance !== undefined ? currentBalance.toLocaleString('id-ID') : '');
      setIsHidden(editingAsset.isHidden || false);
    } else {
      setName('');
      setType('Cash');
      setInitialBalance('');
      setAdjustedBalance('');
      setIsHidden(false);
    }
  }, [editingAsset, isOpen, currentBalance]);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (!numericValue) {
      setInitialBalance('');
      return;
    }
    setInitialBalance(Number(numericValue).toLocaleString('id-ID'));
  };

  const handleAdjustedBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (!numericValue) {
      setAdjustedBalance('');
      return;
    }
    setAdjustedBalance(Number(numericValue).toLocaleString('id-ID'));
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
      
      if (currentBalance !== undefined && addTransaction && adjustedBalance !== '') {
        const newTargetBalance = Number(adjustedBalance.replace(/\./g, '')) || 0;
        const difference = newTargetBalance - currentBalance;
        if (difference !== 0) {
          addTransaction({
            type: difference > 0 ? 'pendapatan' : 'pengeluaran',
            amount: Math.abs(difference),
            category: 'Koreksi Saldo',
            date: new Date().toISOString().split('T')[0],
            note: 'Penyesuaian saldo manual',
            assetId: editingAsset.id
          });
        }
      }
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
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Saldo Awal (Opsional)</label>
            <input 
              type="text" 
              inputMode="numeric" 
              placeholder="Saldo Awal (Rp)" 
              value={initialBalance} 
              onChange={handleAmountChange} 
              style={{ marginTop: '4px', marginBottom: 0 }}
            />
          </div>

          {editingAsset && currentBalance !== undefined && (
            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>Saldo Saat Ini (Penyesuaian)</label>
              <input 
                type="text" 
                inputMode="numeric" 
                placeholder="Saldo saat ini" 
                value={adjustedBalance} 
                onChange={handleAdjustedBalanceChange} 
                style={{ marginTop: '8px', marginBottom: 0, fontWeight: 700, color: 'var(--primary)' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
                Bila Anda mengubah nominal di atas, aplikasi akan membuat transaksi baru dengan kategori <strong>Koreksi Saldo</strong> untuk menyesuaikan perbedaan dari <strong>Rp{currentBalance.toLocaleString('id-ID')}</strong>.
              </div>
            </div>
          )}

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

          {editingAsset && onDelete && (
            <button 
              type="button" 
              onClick={() => {
                if (confirm(`Hapus aset "${name}"?\nSisa saldo akan tetap tercatat di histori histori, namun rekening tidak akan muncul lagi.`)) {
                  onDelete(editingAsset.id);
                  onClose();
                }
              }}
              style={{ 
                width: '100%', marginTop: '12px', background: 'none', border: '1px solid var(--danger)', 
                color: 'var(--danger)', borderRadius: '12px', padding: '12px', fontWeight: 600, cursor: 'pointer' 
              }}
            >
              Hapus Aset
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default AssetModal;
