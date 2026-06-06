import React from 'react';
import { motion } from 'framer-motion';
import MaterialIcon from '../common/MaterialIcon';


interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const features = [
    {
      icon: <MaterialIcon name="check_circle"  className="text-primary"  />,
      title: 'Holiday Trip Ecosystem',
      description: 'Manajemen biaya perjalanan premium dengan input nominal besar, scroll pembayar horizontal, integrasi aset riil, dan edit OCR manual.'
    },
    {
      icon: <MaterialIcon name="trending_up"  className="text-emerald-500"  />,
      title: 'Smart Settle-Up Trip',
      description: 'Lakukan pelunasan bagi biaya otomatis dengan dukungan tombol "Buka Link" (Open in App) dan identifikasi warna rekening.'
    },
    {
      icon: <MaterialIcon name="check_circle"  className="text-primary"  />,
      title: 'Grouped Settings Menu',
      description: 'Navigasi pengaturan baru yang terorganisir ke dalam kategori logis (Akun, Keuangan, Sosial, Sistem) untuk akses lebih cepat.'
    },
    {
      icon: <MaterialIcon name="trending_up"  className="text-emerald-500"  />,
      title: 'AI Chatbot Knowledge',
      description: 'MoneyBot asisten pintar sekarang dibekali basis pengetahuan fitur v17, siap membantu menjelaskan cara kerja ekosistem trip dan lainnya.'
    },
    {
      icon: <MaterialIcon name="check_circle"  className="text-primary"  />,
      title: 'Zero-Based Budgeting',
      description: 'Alokasikan setiap rupiah pendapatan ke kategori pilihan hingga sisa Rp 0 untuk perencanaan keuangan yang lebih disiplin.'
    },
    {
      icon: <MaterialIcon name="trending_up"  className="text-emerald-500"  />,
      title: 'Target Tabungan (Goals)',
      description: 'Buat target menabung untuk impianmu dan hubungkan langsung dengan transaksi agar progres tercatat secara otomatis.'
    },
    {
      icon: <MaterialIcon name="check_circle"  className="text-rose-500"  />,
      title: 'Financial Health Score',
      description: 'Dapatkan skor kesehatan finansial (0-100) berdasarkan rasio tabungan, ketaatan anggaran, dan konsistensi pengeluaran.'
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
              What's New v1.0.17
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Fitur terbaru untuk pengalaman lebih baik</p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <MaterialIcon name="close" className="text-[24px]" />
          </button>
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px', 
          marginBottom: '32px',
          maxHeight: '55vh',
          overflowY: 'auto',
          paddingRight: '4px',
          paddingTop: '4px'
        }}>
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
          <MaterialIcon name="check_circle" className="text-[20px]" />
          Mantap, Mengerti!
        </button>
      </motion.div>
    </div>
  );
};

export default WhatsNewModal;
