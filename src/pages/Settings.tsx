import React, { useState, useRef } from 'react';
import { User, Bell, Shield, Moon, CircleHelp, ChevronRight, X, Lock, ShieldCheck, Mail, Camera, Tags, Plus, Trash2, Download, Upload, DatabaseBackup, LogOut, FileSpreadsheet, AlertCircle, CheckCircle2, Target, RefreshCw } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import { setupPushNotifications } from '../lib/notifications';
import { downloadSampleExcel, parseExcelFile, type ImportResult } from '../lib/excelImport';
import { BudgetManagement } from '../components/BudgetManagement';

const Settings: React.FC = () => {
  const { user, updateUser, pin, setAppPin, lockApp, theme, toggleTheme, categories, assets, addCategory, deleteCategory, addSubCategory, deleteSubCategory, exportData, importData, addTransaction, logOut } = useMoney();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const importInputRef = useRef<HTMLInputElement>(null);
  const excelImportRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [excelResult, setExcelResult] = useState<ImportResult | null>(null);

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
    { id: 'budgets', icon: Target, label: 'Anggaran & Target' },
    { id: 'security', icon: Shield, label: 'Keamanan' },
    { id: 'recurring', icon: RefreshCw, label: 'Transaksi Rutin' },
    { id: 'backup', icon: DatabaseBackup, label: 'Backup & Restore Data' },
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

  const { recurringTransactions, deleteRecurringTransaction, updateRecurringTransaction } = useMoney();

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
                  color: catTab === 'pengeluaran' ? 'var(--danger)' : 'var(--text-muted)',
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
                <div key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', cursor: 'pointer' }}
                    onClick={() => setExpandedCat(expandedCat === c.id ? null : c.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <ChevronRight size={18} style={{ transform: expandedCat === c.id ? 'rotate(90deg)' : 'none', transition: 'all 0.2s', marginRight: '8px', color: 'var(--text-muted)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.name}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteCategory(c.id); }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {expandedCat === c.id && (
                    <div style={{ padding: '0 12px 12px 36px', background: 'var(--bg-main)', borderRadius: '0 0 8px 8px' }}>
                      {(c.subcategories || []).map(sub => (
                        <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--border-color)', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-main)' }}>{sub.name}</span>
                          <button onClick={() => deleteSubCategory(c.id, sub.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
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
                          className="btn btn-primary" style={{ padding: '0 12px', margin: 0, fontSize: '13px' }}>
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
              <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0 16px', margin: 0, display: 'flex', alignItems: 'center' }}>
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
                  backgroundColor: 'var(--primary)', 
                  display: 'flex', justifyContent: 'center', alignItems: 'center', 
                  color: 'white', fontSize: '32px', fontWeight: 700,
                  overflow: 'hidden', border: '3px solid var(--bg-card)'
                }}>
                  {tempAvatar ? (
                    <img src={tempAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    tempName.charAt(0).toUpperCase()
                  )}
                </div>
                <label style={{
                  position: 'absolute', bottom: 0, right: -5,
                  backgroundColor: 'var(--secondary)', padding: '6px', borderRadius: '50%',
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
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Simpan Perubahan</button>
          </form>
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
                <ShieldCheck size={48} color="var(--success)" style={{ margin: '0 auto 16px auto' }} />
                <p style={{ marginBottom: '20px', color: 'var(--text-main)', fontWeight: 600 }}>Keamanan PIN Aktif</p>
                <button onClick={handleDisablePin} className="btn" style={{ backgroundColor: 'var(--bg-expense)', color: 'var(--danger)', marginBottom: '10px' }}>Nonaktifkan PIN</button>
                <button onClick={lockApp} className="btn btn-primary" style={{ width: '100%' }}>Kunci Sekarang</button>
              </div>
            ) : (
              <form onSubmit={handleSetPin}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <Lock size={48} color="var(--secondary)" style={{ margin: '0 auto 16px auto' }} />
                  <p style={{ color: 'var(--text-muted)' }}>Setel PIN untuk mengamankan data Anda.</p>
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

      case 'backup':
        return (
          <>
            <div className="modal-header">
              <h2 className="subtitle">Backup & Restore</h2>
              <button className="close-btn" onClick={() => { setActiveModal(null); setExcelResult(null); }}><X /></button>
            </div>

            {/* ── Section 1: JSON Backup ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <DatabaseBackup size={15} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Backup JSON (Full Data)</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Ekspor semua data (transaksi, aset, kategori, pengaturan) ke file .json untuk restore penuh.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onClick={exportData}
                >
                  <Download size={15} /> Ekspor Backup (.json)
                </button>
                <button
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--border-color)', color: 'var(--text-main)' }}
                  onClick={() => importInputRef.current?.click()}
                  disabled={isImporting}
                >
                  <Upload size={15} /> {isImporting ? 'Mengimpor...' : 'Restore Backup (.json)'}
                </button>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0 20px' }} />

            {/* ── Section 2: Excel Import ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <FileSpreadsheet size={15} color="hsl(152,70%,42%)" />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Import dari Excel</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Tambahkan transaksi dari file Excel (.xlsx/.xls). Download dulu contoh format-nya agar sesuai.
              </p>

              {/* Excel result feedback */}
              {excelResult && (
                <div style={{
                  padding: '12px 14px', borderRadius: 12, marginBottom: 14,
                  background: excelResult.errors.length > 0 ? 'hsla(350,80%,58%,0.08)' : 'hsla(152,70%,42%,0.08)',
                  border: `1.5px solid ${excelResult.errors.length > 0 ? 'hsla(350,80%,58%,0.25)' : 'hsla(152,70%,42%,0.25)'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    {excelResult.imported > 0
                      ? <CheckCircle2 size={15} color="var(--success)" />
                      : <AlertCircle size={15} color="var(--danger)" />}
                    <span style={{ fontWeight: 700, fontSize: 13, color: excelResult.imported > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {excelResult.imported > 0
                        ? `${excelResult.imported} transaksi berhasil diimpor`
                        : 'Import gagal'}
                      {excelResult.skipped > 0 ? `, ${excelResult.skipped} baris dilewati` : ''}
                    </span>
                  </div>
                  {excelResult.errors.slice(0, 5).map((e, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>• {e}</div>
                  ))}
                  {excelResult.errors.length > 5 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>...dan {excelResult.errors.length - 5} error lainnya.</div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'hsla(152,70%,42%,0.1)', color: 'hsl(152,70%,35%)', border: '1px solid hsla(152,70%,42%,0.25)', fontWeight: 700 }}
                  onClick={() => excelImportRef.current?.click()}
                  disabled={isImportingExcel}
                >
                  <FileSpreadsheet size={15} /> {isImportingExcel ? 'Memproses...' : 'Import Excel (.xlsx / .xls)'}
                </button>
                <button
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--bg-neutral)', color: 'var(--text-muted)', border: '1px dashed var(--border-color)' }}
                  onClick={downloadSampleExcel}
                >
                  <Download size={15} /> Download Contoh Format Excel
                </button>
              </div>
            </div>

            {/* Hidden inputs */}
            <input
              ref={importInputRef}
              type="file" accept=".json" style={{ display: 'none' }}
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
            <input
              ref={excelImportRef}
              type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setExcelResult(null);
                setIsImportingExcel(true);
                try {
                  const { rows, result } = await parseExcelFile(file, categories, assets);
                  if (rows.length > 0) {
                    for (const tx of rows) addTransaction(tx);
                  }
                  setExcelResult(result);
                } catch (err) {
                  setExcelResult({ imported: 0, skipped: 0, errors: [`Gagal membaca file: ${String(err)}`] });
                } finally {
                  setIsImportingExcel(false);
                  e.target.value = '';
                }
              }}
            />
          </>
        );

      case 'recurring':
        return (
          <>
            <div className="modal-header">
              <h2 className="subtitle">Transaksi Rutin</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)}><X /></button>
            </div>
            
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Daftar transaksi yang akan tercatat otomatis sesuai jadwal.
            </p>

            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recurringTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  Belum ada transaksi rutin. Tambahkan dari menu Transaksi!
                </div>
              ) : (
                recurringTransactions.map(rt => {
                  const freqLabel = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', yearly: 'Tahunan' }[rt.frequency];
                  return (
                    <div key={rt.id} className="card" style={{ 
                      padding: '12px', background: 'var(--bg-main)', 
                      opacity: rt.isActive ? 1 : 0.6,
                      border: rt.isActive ? '1px solid var(--border-color)' : '1px dashed var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>{rt.note || rt.category}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {freqLabel} • Mulai {new Date(rt.startDate).toLocaleDateString('id-ID')}
                            {rt.endDate && ` • Sampai ${new Date(rt.endDate).toLocaleDateString('id-ID')}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                           <button 
                            onClick={() => updateRecurringTransaction(rt.id, { isActive: !rt.isActive })}
                            style={{ 
                              padding: '4px 8px', borderRadius: '6px', border: 'none', 
                              backgroundColor: rt.isActive ? 'var(--bg-expense)' : 'var(--bg-income)',
                              color: rt.isActive ? 'var(--danger)' : 'var(--primary)',
                              fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                            }}
                          >
                            {rt.isActive ? 'Matikan' : 'Aktifkan'}
                          </button>
                          <button 
                            onClick={() => { if(confirm('Hapus jadwal ini?')) deleteRecurringTransaction(rt.id); }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ 
                          fontSize: '12px', fontWeight: 600, 
                          color: rt.type === 'pengeluaran' ? 'var(--danger)' : rt.type === 'pendapatan' ? 'var(--primary)' : 'var(--text-main)'
                        }}>
                          {rt.type === 'pengeluaran' ? '-' : rt.type === 'pendapatan' ? '+' : ''}
                          Rp{rt.amount.toLocaleString('id-ID')}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Terakhir: {rt.lastProcessedDate ? new Date(rt.lastProcessedDate).toLocaleDateString('id-ID') : 'Belum pernah'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        );

      case 'budgets':
        return (
          <>
            <div className="modal-header">
              <h2 className="subtitle">Anggaran & Target</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)}><X /></button>
            </div>
            <BudgetManagement />
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

      <div className="card" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ 
          width: 56, height: 56, borderRadius: '28px', 
          backgroundColor: 'var(--primary)', 
          display: 'flex', justifyContent: 'center', alignItems: 'center', 
          color: 'white', marginRight: '16px',
          fontSize: '20px', fontWeight: 700,
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
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === menuItems.length - 1;
          return (
            <React.Fragment key={item.id}>
              <div onClick={() => handleMenuClick(item.id)} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '16px 0',
                borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Icon size={20} color={item.id === 'security' && pin ? 'var(--success)' : 'var(--text-muted)'} style={{ marginRight: '16px' }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.id === 'security' && pin && <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 700 }}>AKTIF</span>}
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
                  borderBottom: '1px solid var(--border-color)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Moon size={20} color="var(--text-muted)" style={{ marginRight: '16px' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Tema Gelap</span>
                  </div>
                  <div 
                    onClick={toggleTheme}
                    style={{ 
                      width: '44px', height: '24px', borderRadius: '12px', 
                      backgroundColor: theme === 'dark' ? 'var(--primary)' : 'var(--border-color)',
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

      <div style={{ marginTop: '24px', padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Bell size={18} color="var(--text-muted)" style={{ marginRight: '12px' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Notifikasi Otomatis</span>
          </div>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 700, 
            backgroundColor: notifPermission === 'granted' ? 'var(--success-glow)' : 'var(--danger-glow)',
            color: notifPermission === 'granted' ? 'var(--success)' : 'var(--danger)' 
          }}>
            {notifPermission === 'granted' ? 'AKTIF' : 'NONAKTIF'}
          </span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
          Pengingat harian dan laporan mingguan dikirimkan otomatis ke perangkat ini. 
          {notifPermission !== 'granted' && " Klik untuk mengaktifkan izin notifikasi."}
        </p>
        {notifPermission !== 'granted' && (
          <button 
            onClick={async () => {
              const res = await Notification.requestPermission();
              setNotifPermission(res);
              if (res === 'granted') {
                setupPushNotifications();
              }
            }}
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '12px', padding: '8px', fontSize: '12px' }}
          >
            Aktifkan Izin Notifikasi
          </button>
        )}
      </div>

      <div className="card" style={{ 
        marginTop: '16px', 
        textAlign: 'center', 
        backgroundColor: 'var(--bg-main)', 
        borderColor: 'var(--border-color)', 
        borderStyle: 'solid', 
        borderWidth: '1px' 
      }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: 700 }}>
            <Mail size={18} />
            Hubungi Dukungan
         </div>
         <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>rizqydaffa14@gmail.com</p>
      </div>




      <div style={{ marginTop: '24px', paddingBottom: '20px' }}>
        <button
          onClick={() => {
            if (confirm('Apakah Anda yakin ingin keluar?')) {
              logOut();
            }
          }}
          className="btn"
          style={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            background: 'var(--bg-expense)', 
            color: 'var(--danger)',
            padding: '12px',
            borderRadius: '12px',
            fontWeight: 700,
            border: '1px solid var(--danger-glow)'
          }}
        >
          <LogOut size={20} /> Logout dari Akun
        </button>
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px' }}>
          MoneyApp v1.0.8 • Dibuat dengan ❤️ by Dappal
        </p>
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
