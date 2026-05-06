import React from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, LayoutPanelTop, Users, CheckCircle2 } from 'lucide-react';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const features = [
    {
      icon: <Users className="text-blue-500" size={24} />,
      title: 'Penggabungan Hutang Otomatis',
      description: 'Tambah piutang ke kontak yang sama otomatis digabung. Tips: Kosongkan aset saat buat hutang agar pembayaran tercatat sebagai Pengeluaran.'
    },
    {
      icon: <LayoutPanelTop className="text-purple-500" size={24} />,
      title: 'Auto-Collapse Transaksi',
      description: 'Tampilan daftar transaksi lebih rapi, otomatis menutup riwayat lama dan hanya membuka hari ini.'
    },
    {
      icon: <Sparkles className="text-amber-500" size={24} />,
      title: 'Split Bill (OCR)',
      description: 'Bagi tagihan belanja ke banyak orang sekaligus langsung dari hasil scan struk.'
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <motion.div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        style={{ padding: '24px', maxWidth: '500px', borderTopLeftRadius: '32px', borderTopRightRadius: '32px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              What's New v14
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Fitur terbaru untuk pengalaman lebih baik</p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ 
                padding: '12px', 
                borderRadius: '16px', 
                background: 'var(--bg-main)', 
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {f.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>{f.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{f.description}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="btn-primary"
          style={{ width: '100%', padding: '16px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <CheckCircle2 size={20} />
          Mantap, Mengerti!
        </button>
      </motion.div>
    </div>
  );
};

export default WhatsNewModal;
