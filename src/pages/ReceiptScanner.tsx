import React, { useState } from 'react';
import { Camera, UploadCloud, CheckCircle } from 'lucide-react';

const ReceiptScanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<{ amount: number, date: string } | null>(null);

  const handleScanClick = () => {
    setIsScanning(true);
    setResult(null);
    
    // Simulate OCR processing delay
    setTimeout(() => {
      setIsScanning(false);
      setResult({
        amount: 154500,
        date: new Date().toISOString().split('T')[0]
      });
    }, 2500);
  };

  return (
    <div className="page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h1 className="title">Scan Struk (OCR)</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
        Arahkan kamera ke struk belanja Anda untuk mencatat otomatis. (Mode Simulasi)
      </p>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        
        {isScanning ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, 
              border: '4px solid var(--bg-color)', 
              borderTopColor: 'var(--primary-orange)', 
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px auto'
            }}></div>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            <h3>Menganalisa Teks...</h3>
          </div>
        ) : result ? (
          <div className="card" style={{ width: '100%', textAlign: 'center', borderColor: 'var(--success-green)', borderWidth: 1, borderStyle: 'solid' }}>
            <CheckCircle size={48} color="var(--success-green)" style={{ margin: '0 auto 10px auto' }} />
            <h2 style={{ marginBottom: '10px' }}>Berhasil Terdeteksi!</h2>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-orange)', marginBottom: '5px' }}>
              Rp{result.amount.toLocaleString('id-ID')}
            </div>
            <div style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
              Tanggal: {result.date}
            </div>
            <button className="btn btn-orange" onClick={() => setResult(null)}>Simpan Transaksi</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
            <button 
              onClick={handleScanClick}
              style={{ flex: 1, padding: '30px 10px', borderRadius: '16px', border: '2px dashed var(--secondary-blue)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--secondary-blue)' }}>
              <Camera size={36} style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 600 }}>Buka Kamera</div>
            </button>
            <button 
              onClick={handleScanClick}
              style={{ flex: 1, padding: '30px 10px', borderRadius: '16px', border: '2px dashed var(--text-muted)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-muted)' }}>
              <UploadCloud size={36} style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 600 }}>Unggah Foto</div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptScanner;
