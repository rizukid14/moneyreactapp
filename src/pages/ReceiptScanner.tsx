import React, { useState, useRef, useCallback } from 'react';
import { Camera, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import { useReceiptOCR, type OCRResult } from '../hooks/useReceiptOCR';

const ReceiptScanner: React.FC = () => {
  const { addTransaction, assets, categories } = useMoney();
  const { scanReceipt, isScanning, progress, error, setError } = useReceiptOCR();
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  
  // Customization State
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedType, setSelectedType] = useState<'pengeluaran' | 'pendapatan'>('pengeluaran');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editableAmount, setEditableAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [recentSaves, setRecentSaves] = useState<{amount: number, category: string, subCategory?: string, type: string}[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetScanner = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setRecentSaves([]);
  }, [previewUrl, setError]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setRecentSaves([]);

    const ocrResult = await scanReceipt(file);
    
    if (ocrResult) {
      if (ocrResult.amount === 0) {
        setError("Tidak dapat menemukan nominal uang. Pastikan struk terlihat jelas.");
      }
      setResult(ocrResult);

      // Initialize customization states
      setSelectedAssetId(assets[0]?.id || '');
      setSelectedType('pengeluaran');
      setSelectedDate(ocrResult.date);
      setEditableAmount(ocrResult.amount.toString());
      setSelectedCategory('');
      setSelectedSubCategory('');
    }
  };

  const handleSave = (shouldClose: boolean) => {
    if (!result) return;
    const finalAmount = parseInt(editableAmount.replace(/\D/g, '')) || 0;
    
    if (finalAmount <= 0) {
      alert('Nominal harus lebih dari 0');
      return;
    }

    if (!selectedAssetId) {
      alert('Pilih rekening terlebih dahulu');
      return;
    }

    addTransaction({
      type: selectedType,
      amount: finalAmount,
      category: selectedCategory || 'Belanja (OCR)',
      subCategory: selectedSubCategory || undefined,
      date: selectedDate,
      note: 'Scan Otomatis',
      assetId: selectedAssetId
    });

    if (shouldClose) {
      alert('Transaksi berhasil disimpan!');
      resetScanner();
    } else {
      setRecentSaves(prev => [...prev, { amount: finalAmount, category: selectedCategory || 'Belanja (OCR)', subCategory: selectedSubCategory || undefined, type: selectedType }]);
      setEditableAmount('');
      setSelectedCategory('');
      setSelectedSubCategory('');
    }
  };

  return (
    <div className="page">
      <h1 className="title">Scan Struk</h1>
      <p className="text-muted" style={{ marginBottom: '24px' }}>
        Gunakan AI untuk membaca nominal belanja dari kamera Anda.
      </p>

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileSelect} 
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        
        {isScanning ? (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative', marginBottom: '20px', border: 'none' }}>
              {previewUrl && <img src={previewUrl} alt="Preview" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', opacity: 0.5 }} />}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <Loader2 size={60} className="spin" color="var(--primary)" />
                <div style={{ fontWeight: 800, fontSize: '24px', color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.5)', marginTop: '12px' }}>{progress}%</div>
              </div>
            </div>
            <h3 className="subtitle">Menganalisa Struk...</h3>
            <p className="text-muted" style={{ fontSize: '12px' }}>Stuk diproses secara lokal dan aman</p>
          </div>
        ) : result && !error ? (
          <div className="card glass" style={{ width: '100%', textAlign: 'center' }}>
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              {previewUrl && <img src={previewUrl} alt="Struk" style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '12px' }} />}
              <div style={{ position: 'absolute', top: -10, right: -10, backgroundColor: 'var(--success)', color: 'white', borderRadius: '50%', padding: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                <CheckCircle size={24} />
              </div>
            </div>
            
            <h2 className="subtitle" style={{ marginBottom: '20px' }}>Detail Transaksi</h2>
            
            <div className="flex-gap" style={{ marginBottom: '20px' }}>
              <button 
                onClick={() => setSelectedType('pengeluaran')}
                style={{ 
                  flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)',
                  backgroundColor: selectedType === 'pengeluaran' ? 'var(--bg-expense)' : 'transparent',
                  color: selectedType === 'pengeluaran' ? 'var(--danger)' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer'
                }}>Pengeluaran</button>
              <button 
                onClick={() => setSelectedType('pendapatan')}
                style={{ 
                  flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)',
                  backgroundColor: selectedType === 'pendapatan' ? 'var(--bg-income)' : 'transparent',
                  color: selectedType === 'pendapatan' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer'
                }}>Pendapatan</button>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
              <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Nominal</div>
              <input 
                type="text" 
                value={editableAmount} 
                onChange={e => setEditableAmount(e.target.value.replace(/\D/g, ''))}
                style={{ fontSize: '28px', fontWeight: '800', color: 'var(--primary)', textAlign: 'center', marginBottom: '16px' }}
              />

              <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Kategori & Rekening</div>
              <select required value={selectedCategory} onChange={e => {
                setSelectedCategory(e.target.value);
                setSelectedSubCategory('');
              }} style={{ marginBottom: '10px' }}>
                <option value="" disabled>-- Pilih Kategori --</option>
                {categories.filter(c => c.type === selectedType).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              {(() => {
                const selCat = categories.find(c => c.name === selectedCategory && c.type === selectedType);
                if (selCat && selCat.subcategories && selCat.subcategories.length > 0) {
                  return (
                    <select required value={selectedSubCategory} onChange={e => setSelectedSubCategory(e.target.value)} style={{ marginBottom: '10px' }}>
                      <option value="" disabled>-- Pilih Sub-Kategori --</option>
                      {selCat.subcategories.map(sub => (
                        <option key={sub.id} value={sub.name}>{sub.name}</option>
                      ))}
                    </select>
                  );
                }
                return null;
              })()}
              <select value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)} style={{ marginBottom: '16px' }}>
                <option value="" disabled>-- Pilih Rekening --</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Tanggal</div>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
            
            {recentSaves.length > 0 && (
              <div style={{ textAlign: 'left', marginBottom: '20px', backgroundColor: 'var(--bg-income)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--primary)', marginBottom: '10px', fontWeight: 700 }}>Item Terdeteksi:</h3>
                {recentSaves.map((save, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px dashed var(--border-color)' }}>
                      <span>{save.category}</span>
                      <span style={{ fontWeight: 800, color: save.type === 'pengeluaran' ? 'var(--danger)' : 'var(--primary)' }}>
                        {save.type === 'pengeluaran' ? '-' : '+'}Rp{save.amount.toLocaleString('id-ID')}
                      </span>
                    </div>
                ))}
              </div>
            )}
            
            <details style={{ textAlign: 'left', marginBottom: '24px' }}>
               <summary style={{ fontSize: '12px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}>Lihat Teks AI</summary>
               <div className="glass" style={{ padding: '12px', borderRadius: '10px', marginTop: '8px', maxHeight: '100px', overflowY: 'auto', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {result.rawText}
               </div>
            </details>

            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <div className="flex-gap">
                 <button className="btn" style={{ flex: 1, backgroundColor: 'var(--border-color)', color: 'var(--text-main)' }} onClick={resetScanner}>Batal</button>
                 <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => handleSave(false)}>Tambah Lagi</button>
              </div>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => handleSave(true)}>Simpan & Tutup</button>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            {error && (
              <div className="card" style={{ backgroundColor: 'hsla(350, 85%, 60%, 0.1)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <AlertCircle color="var(--danger)" size={20} />
                <span style={{ fontSize: '14px', color: 'var(--danger)', fontWeight: 600 }}>{error}</span>
                <button onClick={resetScanner} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={20}/></button>
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="glass"
                style={{ width: '100%', padding: '50px 24px', borderRadius: '24px', border: '4px dashed var(--primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--primary)' }}>
                <Camera size={64} style={{ marginBottom: 16 }} />
                <div style={{ fontWeight: 800, fontSize: '20px' }}>Ambil Foto Struk</div>
                <div className="text-muted" style={{ fontSize: '13px', marginTop: '8px' }}>Mendukung Lampiran Gambar</div>
              </button>
              
              <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
                 <p className="text-muted" style={{ fontSize: '13px', lineHeight: 1.5 }}>
                   Posisikan struk belanja di tempat terang agar AI dapat mendeteksi teks dan angka dengan performa terbaik.
                 </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptScanner;
