import React, { useState, useRef } from 'react';
import { User, Bell, Shield, Moon, CircleHelp, ChevronRight, X, Lock, ShieldCheck, Mail, Camera, Tags, Plus, Trash2, Download, Upload, DatabaseBackup } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';

const Settings: React.FC = () => {
  const { user, updateUser, pin, setAppPin, lockApp, theme, toggleTheme, categories, addCategory, deleteCategory, addSubCategory, deleteSubCategory, exportData, importData } = useMoney();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Profile Form State
  const [tempName, setTempName] = useState(user.name);
  const [tempEmail, setTempEmail] = useState(user.email);
  const [tempAvatar, setTempAvatar] = useState(user.avatar || '');

  // PIN Form State
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Category State
  const [catTab, setCatTab] = useState<'pengeluaran' | 'pendapatan'>('pengeluaran');
  const [newCatName, setNewCatName] = useState('');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [newSubCatName, setNewSubCatName] = useState('');

  const menuItems = [
    { id: 'profile', icon: User, label: 'Profil Saya' },
    { id: 'categories', icon: Tags, label: 'Manajemen Kategori' },
    { id: 'notif', icon: Bell, label: 'Notifikasi' },
    { id: 'security', icon: Shield, label: 'Keamanan' },
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
      setTempAvatar(user.avatar || '');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to low quality JPEG to save storage space
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setTempAvatar(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name: tempName, email: tempEmail, avatar: tempAvatar });
    setActiveModal(null);
  };

  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 6) {
      setPinError('PIN harus 6 digit');
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

  const handleAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory({ name: newCatName.trim(), type: catTab });
    setNewCatName('');
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case 'categories':
        const filteredCats = categories.filter(c => c.type === catTab);
        return (
          <>
            <div className="modal-header">
              <h2 className="subtitle">Kategori</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)}><X /></button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px' }}>
              <button 
                type="button"
                onClick={() => setCatTab('pengeluaran')}
                style={{ 
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '13px',
                  background: catTab === 'pengeluaran' ? 'var(--bg-card)' : 'transparent',
                  color: catTab === 'pengeluaran' ? 'var(--secondary)' : 'var(--text-muted)',
                  boxShadow: catTab === 'pengeluaran' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Pengeluaran
              </button>
              <button 
                type="button"
                onClick={() => setCatTab('pendapatan')}
                style={{ 
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '13px',
                  background: catTab === 'pendapatan' ? 'var(--bg-card)' : 'transparent',
                  color: catTab === 'pendapatan' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: catTab === 'pendapatan' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Pendapatan
              </button>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
              {filteredCats.map(c => (
                <div key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', cursor: 'pointer' }}
                    onClick={() => setExpandedCat(expandedCat === c.id ? null : c.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <ChevronRight size={18} style={{ transform: expandedCat === c.id ? 'rotate(90deg)' : 'none', transition: 'all 0.2s', marginRight: '8px', color: 'var(--text-muted)' }} />
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteCategory(c.id); }} style={{ background: 'none', border: 'none', color: 'var(--danger-red)', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {expandedCat === c.id && (
                    <div style={{ padding: '0 12px 12px 36px', background: 'var(--bg-main)', borderRadius: '0 0 8px 8px' }}>
                      {(c.subcategories || []).map(sub => (
                        <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--border-color)', fontSize: '13px' }}>
                          <span>{sub.name}</span>
                          <button onClick={() => deleteSubCategory(c.id, sub.id)} style={{ background: 'none', border: 'none', color: 'var(--danger-red)', cursor: 'pointer' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <input 
                          type="text" 
                          value={newSubCatName} 
                          onChange={e => setNewSubCatName(e.target.value)} 
                          placeholder="Sub-kategori..." 
                          style={{ flex: 1, marginBottom: 0, padding: '6px 10px', fontSize: '13px' }}
                        />
                        <button 
                          onClick={() => {
                            if (newSubCatName.trim()) {
                              addSubCategory(c.id, newSubCatName.trim());
                              setNewSubCatName('');
                            }
                          }}
                          className="btn btn-blue" style={{ padding: '0 12px', margin: 0, fontSize: '13px' }}>
                          Tambah
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {filteredCats.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>Belum ada kategori.</div>
              )}
            </div>

            <form onSubmit={handleAddCat} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={newCatName} 
                onChange={e => setNewCatName(e.target.value)} 
                placeholder="Nama kategori baru..." 
                style={{ flex: 1, marginBottom: 0 }}
                required 
              />
              <button type="submit" className="btn btn-blue" style={{ width: 'auto', padding: '0 16px', margin: 0, display: 'flex', alignItems: 'center' }}>
                <Plus size={20} />
              </button>
            </form>
          </>
        );
      case 'profile':
        return (
          <form onSubmit={handleUpdateProfile}>
            <div className="modal-header">
              <h2 className="subtitle">Edit Profil</h2>
              <button type="button" className="close-btn" onClick={() => setActiveModal(null)}><X /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ 
                  width: 80, height: 80, borderRadius: '40px', 
                  backgroundColor: 'var(--secondary-blue)', 
                  display: 'flex', justifyContent: 'center', alignItems: 'center', 
                  color: 'white', fontSize: '32px', fontWeight: 700,
                  overflow: 'hidden', border: '3px solid var(--border-color)'
                }}>
                  {tempAvatar ? (
                    <img src={tempAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    tempName.charAt(0).toUpperCase()
                  )}
                </div>
                <label style={{
                  position: 'absolute', bottom: 0, right: -5,
                  backgroundColor: 'var(--primary-orange)', padding: '6px', borderRadius: '50%',
                  color: 'white', cursor: 'pointer', border: '2px solid var(--bg-card)'
                }}>
                  <Camera size={14} />
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                </label>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Pilih foto wajah</span>
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
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span>Pengingat Harian</span>
              <div style={{ width: 40, height: 20, borderRadius: 10, backgroundColor: 'var(--secondary-blue)', position: 'relative' }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: 'white', position: 'absolute', right: 2, top: 2 }} />
              </div>
            </div>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0' }}>
              <span>Laporan Mingguan</span>
              <div style={{ width: 40, height: 20, borderRadius: 10, backgroundColor: 'var(--bg-neutral)', position: 'relative' }}>
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
                <button onClick={handleDisablePin} className="btn" style={{ backgroundColor: 'var(--bg-danger-subtle)', color: 'var(--danger-red)', marginBottom: '10px' }}>Nonaktifkan PIN</button>
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
                  placeholder="Masukkan PIN Baru (6 digit)" 
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

      default:
        return null;
    }
  };

  return (
    <div className="page" style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="title" style={{ margin: 0 }}>Lainnya</h1>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ 
          width: 60, height: 60, borderRadius: '30px', 
          backgroundColor: 'var(--secondary-blue)', 
          display: 'flex', justifyContent: 'center', alignItems: 'center', 
          color: 'white', marginRight: '16px',
          fontSize: '24px', fontWeight: 700,
          overflow: 'hidden'
        }}>
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h2 className="subtitle" style={{ margin: 0, fontSize: '18px' }}>{user.name}</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{user.email}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '8px 16px' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <React.Fragment key={item.id}>
              <div onClick={() => handleMenuClick(item.id)} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '16px 0',
                borderBottom: '1px solid var(--border-subtle)',
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

              {/* Tema Row - Inserted after Security */}
              {item.id === 'security' && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '16px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Moon size={20} color="var(--text-muted)" style={{ marginRight: '16px' }} />
                    <span style={{ fontWeight: 500 }}>Tema Gelap</span>
                  </div>
                  <div 
                    onClick={toggleTheme}
                    style={{ 
                      width: '44px', height: '24px', borderRadius: '12px', 
                      backgroundColor: theme === 'dark' ? 'var(--secondary-blue)' : 'var(--border-color)',
                      display: 'flex', alignItems: 'center', padding: '0 2px',
                      cursor: 'pointer', transition: 'all 0.3s'
                    }}>
                    <div style={{ 
                      width: '20px', height: '20px', borderRadius: '10px', 
                      backgroundColor: 'white',
                      transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="card" style={{ 
        marginTop: '24px', 
        textAlign: 'center', 
        backgroundColor: 'var(--bg-info-subtle)', 
        borderColor: 'var(--secondary-blue)', 
        borderStyle: 'solid', 
        borderWidth: '1px' 
      }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--secondary-blue)', fontWeight: 700 }}>
            <Mail size={18} />
            Hubungi Dukungan
         </div>
         <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>rizqydaffa14@gmail.com</p>
      </div>


      {/* ── Data Backup Section ───────────────────────────────────────── */}
      <div className="card glass" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <DatabaseBackup size={20} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '15px' }}>Backup & Restore Data</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
          Data tersimpan di <strong>IndexedDB</strong> browser. Ekspor secara berkala sebagai file backup .json agar tidak kehilangan data jika browser di-reset.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={exportData}
          >
            <Download size={16} /> Ekspor Data (Download Backup)
          </button>
          <button
            className="btn"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--border-color)', color: 'var(--text-main)' }}
            onClick={() => importInputRef.current?.click()}
            disabled={isImporting}
          >
            <Upload size={16} /> {isImporting ? 'Mengimpor...' : 'Impor Data (Restore Backup)'}
          </button>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!confirm('Ini akan MENGGANTI semua data saat ini. Lanjutkan?')) return;
            try {
              setIsImporting(true);
              await importData(file);
              alert('Data berhasil diimpor! Halaman akan dimuat ulang.');
              window.location.reload();
            } catch {
              alert('File backup tidak valid atau rusak.');
            } finally {
              setIsImporting(false);
              e.target.value = '';
            }
          }}
        />
      </div>

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
