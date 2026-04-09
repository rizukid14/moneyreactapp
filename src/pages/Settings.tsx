import React from 'react';
import { User, Bell, Shield, Moon, CircleHelp, LogOut, ChevronRight } from 'lucide-react';

const Settings: React.FC = () => {
  const menuItems = [
    { icon: User, label: 'Profil Saya' },
    { icon: Bell, label: 'Notifikasi' },
    { icon: Shield, label: 'Keamanan' },
    { icon: Moon, label: 'Tema Gelap' },
    { icon: CircleHelp, label: 'Bantuan & Dukungan' },
  ];

  return (
    <div className="page">
      <h1 className="title">Lainnya</h1>

      <div className="card" style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ width: 60, height: 60, borderRadius: '30px', backgroundColor: 'var(--text-muted)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', marginRight: '16px' }}>
          <User size={32} />
        </div>
        <div>
          <h2 className="subtitle" style={{ margin: 0, fontSize: '18px' }}>Pengguna MoneyApp</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Free Plan</div>
        </div>
      </div>

      <div className="card" style={{ padding: '8px 16px' }}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: index < menuItems.length - 1 ? '1px solid #f3f4f6' : 'none',
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Icon size={20} color="var(--text-muted)" style={{ marginRight: '16px' }} />
                <span style={{ fontWeight: 500 }}>{item.label}</span>
              </div>
              <ChevronRight size={20} color="var(--text-muted)" />
            </div>
          );
        })}
      </div>

      <button className="btn" style={{ 
        backgroundColor: '#fee2e2', 
        color: 'var(--danger-red)', 
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
        marginTop: '24px'
      }}>
        <LogOut size={20} />
        Keluar
      </button>
    </div>
  );
};

export default Settings;
