import React, { useState, useRef } from 'react';
import { Camera, UploadCloud, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
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

  const handleSave = () => {
    if (!result) return;
    addTransaction({
      type: 'pengeluaran',
      amount: result.amount,
      category: 'Belanja (OCR)',
      date: result.date,
      note: 'Scan Otomatis',
      assetId: assets[0]?.id
    });
    alert('Transaksi berhasil disimpan!');
    resetScanner();
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
        capture="environment" 
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
            
            <h2 style={{ marginBottom: '10px' }}>Hasil Deteksi</h2>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary-orange)', marginBottom: '5px' }}>
              Rp{result.amount.toLocaleString('id-ID')}
            </div>
            <div style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '14px' }}>
              Tanggal Terdeteksi: {result.date}
            </div>
            
            <details style={{ textAlign: 'left', marginBottom: '20px' }}>
               <summary style={{ fontSize: '12px', color: 'var(--secondary-blue)', cursor: 'pointer', fontWeight: 600 }}>Lihat Teks Mentah</summary>
               <div style={{ background: 'var(--bg-neutral)', padding: '10px', borderRadius: '8px', marginTop: '8px', maxHeight: '100px', overflowY: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>
                  {result.rawText}
               </div>
            </details>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn" style={{ flex: 1, backgroundColor: 'var(--bg-neutral)', color: 'var(--text-muted)' }} onClick={resetScanner}>Batal</button>
              <button className="btn btn-orange" style={{ flex: 2 }} onClick={handleSave}>Simpan Transaksi</button>
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
