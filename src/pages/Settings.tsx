import React, { useState } from 'react';
import { User, Bell, Shield, Moon, CircleHelp, LogOut, ChevronRight, X, Lock, ShieldCheck, Mail } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';

const Settings: React.FC = () => {
  const { user, updateUser, pin, setAppPin, lockApp } = useMoney();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Profile Form State
  const [tempName, setTempName] = useState(user.name);
  const [tempEmail, setTempEmail] = useState(user.email);

  // PIN Form State
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  const menuItems = [
    { id: 'profile', icon: User, label: 'Profil Saya' },
    { id: 'notif', icon: Bell, label: 'Notifikasi' },
    { id: 'security', icon: Shield, label: 'Keamanan' },
    { id: 'theme', icon: Moon, label: 'Tema Gelap' },
    { id: 'help', icon: CircleHelp, label: 'Bantuan & Dukungan' },
  ];

  const handleMenuClick = (id: string) => {
    if (id === 'help') {
      window.location.href = 'mailto:rizqydaffa14@gmail.com?subject=Bantuan MoneyApp&body=Halo, saya butuh bantuan terkait...';
      return;
    }
    setActiveModal(id);
    if (id === 'profile') {
      setTempName(user.name);
      setTempEmail(user.email);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name: tempName, email: tempEmail });
    setActiveModal(null);
  };

  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4) {
      setPinError('PIN minimal 4 digit');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PIN tidak cocok');
      return;
    }
    setAppPin(newPin);
    setActiveModal(null);
    setNewPin(''); setConfirmPin(''); setPinError('');
    alert('PIN Berhasil diaktifkan!');
  };

  const handleDisablePin = () => {
    if (confirm('Matikan keamanan PIN?')) {
      setAppPin(null);
      setActiveModal(null);
    }
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case 'profile':
        return (
          <form onSubmit={handleUpdateProfile}>
            <div className="modal-header">
              <h2 className="subtitle">Edit Profil</h2>
              <button type="button" className="close-btn" onClick={() => setActiveModal(null)}><X /></button>
            </div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nama Lengkap</label>
            <input type="text" value={tempName} onChange={e => setTempName(e.target.value)} required />
            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email</label>
            <input type="email" value={tempEmail} onChange={e => setTempEmail(e.target.value)} required />
            <button type="submit" className="btn btn-blue">Simpan Perubahan</button>
          </form>
        );
      case 'notif':
        return (
          <>
            <div className="modal-header">
              <h2 className="subtitle">Notifikasi</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)}><X /></button>
            </div>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span>Pengingat Harian</span>
              <div style={{ width: 40, height: 20, borderRadius: 10, backgroundColor: 'var(--secondary-blue)', position: 'relative' }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: 'white', position: 'absolute', right: 2, top: 2 }} />
              </div>
            </div>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0' }}>
              <span>Laporan Mingguan</span>
              <div style={{ width: 40, height: 20, borderRadius: 10, backgroundColor: '#e5e7eb', position: 'relative' }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: 'white', position: 'absolute', left: 2, top: 2 }} />
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>Fitur push notification sedang dikembangkan.</p>
          </>
        );
      case 'security':
        return (
          <>
            <div className="modal-header">
              <h2 className="subtitle">Keamanan</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)}><X /></button>
            </div>
            
            {pin ? (
              <div style={{ textAlign: 'center' }}>
                <ShieldCheck size={48} color="var(--success-green)" style={{ margin: '0 auto 16px auto' }} />
                <p style={{ marginBottom: '20px' }}>Keamanan PIN Aktif</p>
                <button onClick={handleDisablePin} className="btn" style={{ backgroundColor: '#fee2e2', color: 'var(--danger-red)', marginBottom: '10px' }}>Nonaktifkan PIN</button>
                <button onClick={lockApp} className="btn btn-blue">Kunci Sekarang</button>
              </div>
            ) : (
              <form onSubmit={handleSetPin}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <Lock size={48} color="var(--primary-orange)" style={{ margin: '0 auto 16px auto' }} />
                  <p>Setel PIN untuk mengamankan data Anda.</p>
                </div>
                <input 
                  type="password" 
                  inputMode="numeric" 
                  maxLength={6} 
                  placeholder="Masukkan PIN Baru (Min 4 digit)" 
                  value={newPin} 
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} 
                />
                <input 
                  type="password" 
                  inputMode="numeric" 
                  maxLength={6} 
                  placeholder="Konfirmasi PIN" 
                  value={confirmPin} 
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} 
                />
                {pinError && <p style={{ color: 'var(--danger-red)', fontSize: '12px', marginBottom: '10px' }}>{pinError}</p>}
                <button type="submit" className="btn btn-orange">Aktifkan Keamanan</button>
              </form>
            )}
          </>
        );
      case 'theme':
        return (
          <>
            <div className="modal-header">
              <h2 className="subtitle">Tema Aplikasi</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)}><X /></button>
            </div>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Moon size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
              <p>Tema Gelap akan segera hadir di pembaruan mendatang!</p>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="page" style={{ paddingBottom: '80px' }}>
      <h1 className="title">Lainnya</h1>

      <div className="card" style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ 
          width: 60, height: 60, borderRadius: '30px', 
          backgroundColor: 'var(--secondary-blue)', 
          display: 'flex', justifyContent: 'center', alignItems: 'center', 
          color: 'white', marginRight: '16px',
          fontSize: '24px', fontWeight: 700
        }}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="subtitle" style={{ margin: 0, fontSize: '18px' }}>{user.name}</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{user.email}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '8px 16px' }}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.id} onClick={() => handleMenuClick(item.id)} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: index < menuItems.length - 1 ? '1px solid #f3f4f6' : 'none',
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Icon size={20} color={item.id === 'security' && pin ? 'var(--success-green)' : 'var(--text-muted)'} style={{ marginRight: '16px' }} />
                <span style={{ fontWeight: 500 }}>{item.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {item.id === 'security' && pin && <span style={{ fontSize: '10px', color: 'var(--success-green)', fontWeight: 600 }}>AKTIF</span>}
                <ChevronRight size={20} color="var(--text-muted)" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: '24px', textAlign: 'center', backgroundColor: '#f0f9ff', borderColor: '#bae6fd', borderStyle: 'solid', borderWidth: '1px' }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--secondary-blue)', fontWeight: 600 }}>
            <Mail size={18} />
            Hubungi Dukungan
         </div>
         <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>rizqydaffa14@gmail.com</p>
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

      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
