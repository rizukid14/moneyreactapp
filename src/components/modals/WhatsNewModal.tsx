import React from 'react';
import { motion } from 'framer-motion';
import MaterialIcon from '../common/MaterialIcon';
import { changelogData, changelogTypeMeta } from '../../data/changelog';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const latest = changelogData[0];
  if (!latest) return null;

  const getIconForType = (type: string) => {
    switch (type) {
      case 'new': return 'auto_awesome';
      case 'improve': return 'bolt';
      case 'fix': return 'build';
      default: return 'info';
    }
  };

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
              What's New {latest.version}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Update bulan {latest.date}</p>
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
          {latest.entries.map((f, i) => {
            const [title, ...descParts] = f.text.split(': ');
            const desc = descParts.join(': ');
            const meta = changelogTypeMeta[f.type as keyof typeof changelogTypeMeta];

            return (
              <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ 
                  padding: '12px', 
                  borderRadius: '16px', 
                  background: meta?.bg || 'var(--bg-main)', 
                  color: meta?.color || 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MaterialIcon name={getIconForType(f.type)} className="text-[24px]" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                      {desc ? title : f.text}
                    </h3>
                    {!desc && <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: meta?.bg, color: meta?.color }}>{meta?.label}</span>}
                  </div>
                  {desc && <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{desc}</p>}
                </div>
              </div>
            );
          })}
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
