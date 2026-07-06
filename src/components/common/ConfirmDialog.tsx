import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MaterialIcon from './MaterialIcon';

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
  const cfg = {
    danger: { icon: 'delete', color: 'text-error', bg: 'bg-error', bgLight: 'bg-error/10', border: 'border-error/20', shadow: 'shadow-error/20' },
    warning: { icon: 'error', color: 'text-warning', bg: 'bg-warning', bgLight: 'bg-warning/10', border: 'border-warning/20', shadow: 'shadow-warning/20' },
    info: { icon: 'help', color: 'text-primary', bg: 'bg-primary', bgLight: 'bg-primary/10', border: 'border-primary/20', shadow: 'shadow-primary/20' }
  }[type];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/45 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          onClick={onClose}
          style={{ touchAction: 'none' }}
          data-modal="true"
        >
          <motion.div
            className={`w-[90%] max-w-[360px] p-6 text-center rounded-[24px] bg-bg-card relative overflow-hidden shadow-bento border-2 ${cfg.border}`}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 600, mass: 0.5 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Background Accent Glow */}
            <div className={`absolute -top-[50px] left-1/2 -translate-x-1/2 w-[100px] h-[100px] blur-[30px] z-0 ${cfg.bgLight}`} />

            <div className="relative z-10">
              <div className={`w-16 h-16 rounded-[20px] mx-auto mb-4 flex items-center justify-center border ${cfg.bgLight} ${cfg.color} ${cfg.border}`}>
                <MaterialIcon name={cfg.icon} className="text-[32px]" />
              </div>

              <h3 className="text-xl font-extrabold text-on-surface mb-2">{title}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-6">{message}</p>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 rounded-2xl bg-surface-container-low border border-outline-variant text-on-surface-variant font-bold text-sm cursor-pointer transition-all hover:bg-surface-container"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-[1.5] py-3.5 rounded-2xl border-none text-white font-bold text-sm cursor-pointer transition-all shadow-lg hover:opacity-90 ${cfg.bg} ${cfg.shadow}`}
                >
                  {confirmText}
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-transparent border-none text-on-surface-variant cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
            >
              <MaterialIcon name="close" className="text-xl" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ConfirmDialog;
