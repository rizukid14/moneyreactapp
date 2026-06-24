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
      icon: <MaterialIcon name="auto_awesome"  className="text-primary"  />,
      title: 'Desain UI Lebih Modern',
      description: 'Antarmuka aplikasi dirombak total dengan gaya Bento Grid yang lebih bersih, segar, dan profesional.'
    },
    {
      icon: <MaterialIcon name="receipt_long"  className="text-success"  />,
      title: 'Smart Receipt Scanner',
      description: 'Pindai struk kini jauh lebih mudah dengan desain baru, panduan interaktif, dan dukungan tarik-dan-lepas (Drag & Drop).'
    },
    {
      icon: <MaterialIcon name="account_balance_wallet"  className="text-primary"  />,
      title: 'Rekening Penerima Split Bill',
      description: 'Saat menalangi biaya, Anda kini bisa menentukan rekening khusus (seperti BCA/Mandiri) untuk menerima transfer pengganti dari teman.'
    },
    {
      icon: <MaterialIcon name="flight_takeoff"  className="text-success"  />,
      title: 'Bento Grid Trip Detail',
      description: 'Halaman detail perjalanan kini jauh lebih estetik dengan informasi yang dikelompokkan secara visual untuk keterbacaan maksimal.'
    },
    {
      icon: <MaterialIcon name="pie_chart"  className="text-primary"  />,
      title: 'Penyempurnaan Statistik',
      description: 'Grafik dan ringkasan keuangan bulanan Anda kini hadir dalam balutan desain yang lebih interaktif dan mudah dipahami.'
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10500 }}>
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
              What's New v2.0.0
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Ekosistem desain baru yang revolusioner</p>
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
