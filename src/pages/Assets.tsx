import React from 'react';
import { Wallet, CreditCard, Landmark } from 'lucide-react';

const assets = [
  { id: 1, name: 'Dompet Tunai', balance: 150000, color: 'var(--primary-orange)', icon: Wallet },
  { id: 2, name: 'Rekening BCA', balance: 8500000, color: 'var(--secondary-blue)', icon: Landmark },
  { id: 3, name: 'GoPay', balance: 345000, color: 'var(--success-green)', icon: CreditCard },
];

const Assets: React.FC = () => {
  const total = assets.reduce((acc, curr) => acc + curr.balance, 0);

  return (
    <div className="page">
      <h1 className="title">Aset Saya</h1>

      <div className="card" style={{ background: 'linear-gradient(135deg, var(--secondary-blue), #1e3a8a)', color: 'white', border: 'none' }}>
        <div style={{ opacity: 0.8, fontSize: '14px', marginBottom: '8px' }}>Total Kekayaan Bersih</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px' }}>Rp{total.toLocaleString('id-ID')}</div>
      </div>

      <h2 className="subtitle" style={{ marginTop: '24px' }}>Daftar Rekening</h2>
      
      {assets.map(asset => {
        const Icon = asset.icon;
        return (
          <div className="card" key={asset.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: 48, height: 48, 
              borderRadius: '12px', 
              backgroundColor: `${asset.color}20`, 
              color: asset.color,
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              marginRight: '16px'
            }}>
              <Icon size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{asset.name}</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Rp{asset.balance.toLocaleString('id-ID')}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Assets;
