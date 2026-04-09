import React, { useState } from 'react';
import { Wallet, CreditCard, Landmark, Plus, Trash2, Smartphone, X } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import type { AssetType } from '../contexts/MoneyContext';

const getIconForType = (type: AssetType) => {
  switch (type) {
    case 'Cash': return Wallet;
    case 'Bank Account': return Landmark;
    case 'Credit Card': return CreditCard;
    case 'eWallet': return Smartphone;
    default: return Wallet;
  }
};

const getColorForType = (type: AssetType) => {
  switch (type) {
    case 'Cash': return 'var(--primary-orange)';
    case 'Bank Account': return 'var(--secondary-blue)';
    case 'Credit Card': return 'var(--danger-red)';
    case 'eWallet': return 'var(--success-green)';
    default: return 'var(--text-muted)';
  }
};

const Assets: React.FC = () => {
  const { assets, getAssetBalance, addAsset, deleteAsset } = useMoney();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('Cash');
  const [initialBalance, setInitialBalance] = useState('');

  const total = assets.reduce((acc, asset) => acc + getAssetBalance(asset.id), 0);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (!numericValue) {
      setInitialBalance('');
      return;
    }
    setInitialBalance(Number(numericValue).toLocaleString('id-ID'));
  };

  const saveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    addAsset({
      name,
      type,
      initialBalance: Number(initialBalance.replace(/\./g, '')) || 0,
    });
    setIsModalOpen(false);
    setName('');
    setInitialBalance('');
  };

  return (
    <div className="page" style={{ paddingBottom: '80px' }}>
      <h1 className="title">Aset Saya</h1>

      <div className="card" style={{ background: 'linear-gradient(135deg, var(--secondary-blue), #1e3a8a)', color: 'white', border: 'none' }}>
        <div style={{ opacity: 0.8, fontSize: '14px', marginBottom: '8px' }}>Total Kekayaan Bersih</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px' }}>Rp{total.toLocaleString('id-ID')}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '16px' }}>
        <h2 className="subtitle" style={{ margin: 0 }}>Daftar Rekening</h2>
        <button onClick={() => setIsModalOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--primary-orange)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> Tambah
        </button>
      </div>
      
      {assets.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '20px 0' }}>Belum ada aset.</div>
      ) : (
        assets.map(asset => {
          const Icon = getIconForType(asset.type);
          const color = getColorForType(asset.type);
          const balance = getAssetBalance(asset.id);
          
          return (
            <div className="card" key={asset.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ 
                width: 48, height: 48, 
                borderRadius: '12px', 
                backgroundColor: `${color}20`, 
                color: color,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                marginRight: '16px'
              }}>
                <Icon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{asset.name}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Rp{balance.toLocaleString('id-ID')}</div>
              </div>
              <button onClick={() => confirm(`Hapus aset ${asset.name}?`) && deleteAsset(asset.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '8px', cursor: 'pointer' }}>
                <Trash2 size={20} />
              </button>
            </div>
          );
        })
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="subtitle" style={{ margin: 0 }}>Tambah Aset Baru</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            
            <form onSubmit={saveAsset}>
              <input type="text" required placeholder="Nama Aset (mis: Rekening Mandiri)" value={name} onChange={e => setName(e.target.value)} />
              
              <select value={type} onChange={e => setType(e.target.value as AssetType)}>
                <option value="Cash">Tunai / Dompet</option>
                <option value="Bank Account">Rekening Bank</option>
                <option value="eWallet">E-Wallet (Gopay, OVO)</option>
                <option value="Credit Card">Kartu Kredit</option>
              </select>
              
              <input type="text" inputMode="numeric" placeholder="Saldo Awal Opsional (Rp)" value={initialBalance} onChange={handleAmountChange} />
              
              <button type="submit" className="btn btn-blue" style={{ marginTop: '10px' }}>
                Simpan Aset
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assets;
