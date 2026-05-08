import React from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, LayoutPanelTop, CheckCircle2 } from 'lucide-react';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const features = [
    {
      icon: <Sparkles className="text-amber-500" size={24} />,
      title: 'UI/UX Pro Max & Dark Mode',
      description: 'Warna Bento Card (AI Scanner & MoneyBot) kini otomatis adaptasi di Dark Mode. Ditambah perbaikan aksesibilitas (WCAG).'
    },
    {
      icon: <CheckCircle2 className="text-green-500" size={24} />,
      title: 'Undo Hapus Transaksi',
      description: 'Tidak sengaja menghapus transaksi? Sekarang ada tombol "Undo" di notifikasi untuk mengembalikannya dalam 6 detik.'
    },
    {
      icon: <LayoutPanelTop className="text-purple-500" size={24} />,
      title: 'Statistik Lebih Rapi',
      description: 'Pie chart kategori pengeluaran/pendapatan kini dibatasi maksimal 5 potongan agar lebih mudah dibaca, sisanya digabung di "Lainnya".'
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
              What's New v15
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
