import React, { useState, useRef } from 'react';
import { Camera, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { useMoney } from '../contexts/MoneyContext';

const ReceiptScanner: React.FC = () => {
  const { addTransaction, assets } = useMoney();
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<{ amount: number, date: string, rawText: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Customization State
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedType, setSelectedType] = useState<'pengeluaran' | 'pendapatan'>('pengeluaran');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editableAmount, setEditableAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Belanja (OCR)');
  const [recentSaves, setRecentSaves] = useState<{amount: number, category: string, type: string}[]>([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    setIsScanning(true);
    setResult(null);
    setError(null);
    setProgress(0);
    setRecentSaves([]);

    try {
      const worker = await createWorker('ind', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });
      
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const parsed = parseReceiptText(text);
      if (parsed.amount === 0) {
        setError("Tidak dapat menemukan nominal uang. Pastikan struk terlihat jelas.");
      }
      
      setResult({
        ...parsed,
        rawText: text
      });

      // Initialize customization states
      setSelectedAssetId(assets[0]?.id || '');
      setSelectedType('pengeluaran');
      setSelectedDate(parsed.date);
      setEditableAmount(parsed.amount.toString());
      setSelectedCategory('Belanja (OCR)');
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat memproses gambar.");
    } finally {
      setIsScanning(false);
    }
  };

  const parseReceiptText = (text: string) => {
    const lines = text.split('\n').map(l => l.trim().toLowerCase());
    let detectedAmount = 0;
    const keywords = ['total', 'jumlah', 'bayar', 'amount', 'harga', 'subtotal'];
    
    for (const line of lines) {
      if (keywords.some(k => line.includes(k))) {
        const numbers = line.match(/\d+[\d.,]*/g);
        if (numbers) {
          const cleanNum = (n: string) => parseInt(n.replace(/[.,]/g, ''));
          const candidates = numbers.map(cleanNum).filter(n => n > 100);
          if (candidates.length > 0) {
            detectedAmount = Math.max(detectedAmount, ...candidates);
          }
        }
      }
    }

    if (detectedAmount === 0) {
      const allNumbers = text.match(/\b\d+[\d.,]*\b/g);
      if (allNumbers) {
        const cleanNum = (n: string) => parseInt(n.replace(/[.,]/g, ''));
        const candidates = allNumbers.map(cleanNum).filter(n => n > 500 && n < 10000000);
        if (candidates.length > 0) {
          detectedAmount = Math.max(...candidates);
        }
      }
    }

    return {
      amount: detectedAmount,
      date: new Date().toISOString().split('T')[0]
    };
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
      date: selectedDate,
      note: 'Scan Otomatis',
      assetId: selectedAssetId
    });

    if (shouldClose) {
      alert('Transaksi berhasil disimpan!');
      resetScanner();
    } else {
      setRecentSaves(prev => [...prev, { amount: finalAmount, category: selectedCategory || 'Belanja (OCR)', type: selectedType }]);
      setEditableAmount('');
      setSelectedCategory('');
      alert('Item berhasil disisihkan, silakan tambah nominal lainnya.');
    }
  };

  const resetScanner = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setIsScanning(false);
  };

  return (
    <div className="page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h1 className="title">Scan Struk Nyata</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
        Gunakan teknologi AI (OCR) untuk membaca nominal belanja dari kamera Anda.
      </p>

      <input 
        type="file" 
        accept="image/*" 
        capture={undefined} 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileSelect} 
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        
        {isScanning ? (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative', marginBottom: '20px' }}>
              {previewUrl && <img src={previewUrl} alt="Preview" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', opacity: 0.5 }} />}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <Loader2 size={48} className="spin" color="var(--primary-orange)" />
                <div style={{ fontWeight: 800, fontSize: '20px', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)', marginTop: '10px' }}>{progress}%</div>
              </div>
            </div>
            <h3>Menganalisa Struk...</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Proses ini dilakukan langsung di HP Anda</p>
            <style>{`.spin { animation: spin 2s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : result && !error ? (
          <div className="card" style={{ width: '100%', textAlign: 'center', border: '1px solid var(--success-green)' }}>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              {previewUrl && <img src={previewUrl} alt="Struk" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px' }} />}
              <div style={{ position: 'absolute', top: -10, right: -10, backgroundColor: 'var(--success-green)', color: 'white', borderRadius: '50%', padding: '4px' }}>
                <CheckCircle size={24} />
              </div>
            </div>
            
            <h2 style={{ marginBottom: '16px' }}>Konfirmasi Deteksi</h2>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button 
                onClick={() => setSelectedType('pengeluaran')}
                style={{ 
                  flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)',
                  backgroundColor: selectedType === 'pengeluaran' ? 'var(--bg-expense)' : 'transparent',
                  color: selectedType === 'pengeluaran' ? 'var(--danger-red)' : 'var(--text-muted)',
                  fontWeight: 600, fontSize: '13px', cursor: 'pointer'
                }}>Pengeluaran</button>
              <button 
                onClick={() => setSelectedType('pendapatan')}
                style={{ 
                  flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)',
                  backgroundColor: selectedType === 'pendapatan' ? 'var(--bg-income)' : 'transparent',
                  color: selectedType === 'pendapatan' ? 'var(--secondary-blue)' : 'var(--text-muted)',
                  fontWeight: 600, fontSize: '13px', cursor: 'pointer'
                }}>Pendapatan</button>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>Nominal (Rp)</label>
              <input 
                type="text" 
                value={editableAmount} 
                onChange={e => setEditableAmount(e.target.value.replace(/\D/g, ''))}
                style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-orange)', textAlign: 'center', marginBottom: '12px' }}
              />

              <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>Kategori</label>
              <input 
                type="text" 
                value={selectedCategory} 
                onChange={e => setSelectedCategory(e.target.value)}
                placeholder="Kategori"
                style={{ marginBottom: '12px' }}
              />

              <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>Rekening / Dompet</label>
              <select value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)} style={{ marginBottom: '12px' }}>
                <option value="" disabled>-- Pilih Rekening --</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>Tanggal Transaksi</label>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)}
                style={{ marginBottom: '12px' }}
              />
            </div>
            
            {recentSaves.length > 0 && (
              <div style={{ textAlign: 'left', marginBottom: '16px', backgroundColor: 'var(--bg-info-subtle)', padding: '12px', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '13px', color: 'var(--secondary-blue)', marginBottom: '8px' }}>Tersimpan dari Struk ini:</h3>
                {recentSaves.map((save, idx) => (
                   <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px dashed var(--border-color)' }}>
                     <span style={{ color: 'var(--text-main)' }}>{save.category}</span>
                     <span style={{ fontWeight: 'bold', color: save.type === 'pengeluaran' ? 'var(--danger-red)' : 'var(--secondary-blue)' }}>
                       {save.type === 'pengeluaran' ? '-' : '+'}Rp{save.amount.toLocaleString('id-ID')}
                     </span>
                   </div>
                ))}
              </div>
            )}
            
            <details style={{ textAlign: 'left', marginBottom: '20px' }}>
               <summary style={{ fontSize: '12px', color: 'var(--secondary-blue)', cursor: 'pointer', fontWeight: 600 }}>Lihat Teks Mentah AI</summary>
               <div style={{ background: 'var(--bg-neutral)', padding: '10px', borderRadius: '8px', marginTop: '8px', maxHeight: '100px', overflowY: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>
                  {result.rawText}
               </div>
            </details>

            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                 <button className="btn" style={{ flex: 1, backgroundColor: 'var(--bg-neutral)', color: 'var(--text-muted)', fontSize: '14px' }} onClick={resetScanner}>Batal</button>
                 <button className="btn btn-blue" style={{ flex: 2, fontSize: '14px' }} onClick={() => handleSave(false)}>Simpan & Tambah Lagi</button>
              </div>
              <button className="btn btn-orange" style={{ width: '100%' }} onClick={() => handleSave(true)}>Selesai & Tutup</button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="card" style={{ width: '100%', backgroundColor: 'var(--bg-expense)', borderColor: 'var(--danger-red)', borderStyle: 'solid', borderWidth: 1, display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <AlertCircle color="var(--danger-red)" />
                <span style={{ fontSize: '14px', color: 'var(--danger-red)' }}>{error}</span>
                <button onClick={resetScanner} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={16}/></button>
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <button 
                onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', padding: '40px 20px', borderRadius: '16px', border: '2px dashed var(--secondary-blue)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--secondary-blue)' }}>
                <Camera size={48} style={{ marginBottom: 15 }} />
                <div style={{ fontWeight: 700, fontSize: '18px' }}>Ambil Foto Struk</div>
                <div style={{ fontSize: '12px', marginTop: '5px' }}>Mendukung Galeri & Kamera</div>
              </button>
              
              <div style={{ textAlign: 'center', padding: '10px' }}>
                 <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pastikan struk berada di tempat terang agar AI dapat mendeteksi angka dengan akurat.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReceiptScanner;
