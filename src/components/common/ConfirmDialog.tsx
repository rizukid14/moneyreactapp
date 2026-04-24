import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Trash2, HelpCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  type = 'danger',
  confirmText = 'Ya, Hapus',
  cancelText = 'Batal'
}) => {
  const Icon = type === 'danger' ? Trash2 : type === 'warning' ? AlertCircle : HelpCircle;
  const accentColor = type === 'danger' ? 'var(--danger)' : type === 'warning' ? 'var(--secondary)' : 'var(--primary)';
  const glowColor = type === 'danger' ? 'hsla(350, 80%, 58%, 0.15)' : type === 'warning' ? 'hsla(35, 90%, 52%, 0.15)' : 'var(--primary-glow)';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="modal-overlay" 
          style={{ zIndex: 3000, alignItems: 'center' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          <motion.div 
            className="card shadow-soft"
            style={{ 
              width: '90%', 
              maxWidth: '360px', 
              padding: '24px', 
              textAlign: 'center', 
              borderRadius: '24px',
              background: 'var(--bg-card-solid)',
              border: `1.5px solid ${accentColor}44`,
              position: 'relative',
              overflow: 'hidden'
            }}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 600, mass: 0.5 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Background Accent Glow */}
            <div style={{
              position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)',
              width: '100px', height: '100px', background: glowColor, filter: 'blur(30px)', zIndex: 0
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ 
                width: '64px', height: '64px', borderRadius: '20px', background: `${accentColor}11`,
                margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: accentColor, border: `1px solid ${accentColor}22`
              }}>
                <Icon size={32} />
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>{title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>{message}</p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={onClose}
                  style={{ 
                    flex: 1, padding: '14px', borderRadius: '16px', background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)', color: 'var(--text-muted)',
                    fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {cancelText}
                </button>
                <button 
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  style={{ 
                    flex: 1.5, padding: '14px', borderRadius: '16px', background: accentColor,
                    border: 'none', color: 'white', fontWeight: 700, fontSize: '14px',
                    boxShadow: `0 8px 20px ${glowColor}`, cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {confirmText}
                </button>
              </div>
            </div>

            <button 
              onClick={onClose}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.5 }}
            >
              <X size={20} />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
