import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, action?: { label: string; onClick: () => void }) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};

// ─── Theme Map ───────────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<ToastType, {
  icon: React.FC<{ size: number }>;
  bg: string;
  border: string;
  color: string;
}> = {
  success: {
    icon: CheckCircle2,
    bg: 'hsla(152,70%,42%,0.12)',
    border: 'hsla(152,70%,42%,0.35)',
    color: 'var(--success)',
  },
  error: {
    icon: XCircle,
    bg: 'hsla(350,80%,58%,0.12)',
    border: 'hsla(350,80%,58%,0.35)',
    color: 'var(--danger)',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'hsla(35,90%,52%,0.12)',
    border: 'hsla(35,90%,52%,0.35)',
    color: '#f59e0b',
  },
  info: {
    icon: Info,
    bg: 'hsla(220,90%,60%,0.12)',
    border: 'hsla(220,90%,60%,0.35)',
    color: 'var(--primary)',
  },
};

// ─── Single Toast Item ────────────────────────────────────────────────────────

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const cfg = TOAST_CONFIG[toast.type];
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      transition={{ type: 'spring', damping: 28, stiffness: 500, mass: 0.5 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '16px',
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        maxWidth: '360px',
        width: 'calc(100vw - 32px)',
        pointerEvents: 'auto',
      }}
    >
      <span style={{ color: cfg.color, flexShrink: 0, display: 'flex' }}>
        <Icon size={20} />
      </span>
      <span style={{
        flex: 1,
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--text-main)',
        lineHeight: 1.4,
      }}>
        {toast.message}
      </span>
      {toast.action && (
        <button
          onClick={() => {
            if (toast.action) toast.action.onClick();
            onDismiss(toast.id);
          }}
          style={{
             background: 'var(--primary)',
             color: 'white',
             border: 'none',
             borderRadius: '6px',
             padding: '6px 12px',
             fontSize: '12px',
             fontWeight: 700,
             cursor: 'pointer',
             flexShrink: 0,
             marginRight: '8px'
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '2px',
          flexShrink: 0,
          opacity: 0.6,
          lineHeight: 1,
        }}
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};

// ─── Provider ────────────────────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', action?: { label: string; onClick: () => void }) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type, action }]);
    // Longer timeout if there's an action so the user can click it
    timers.current[id] = setTimeout(() => dismiss(id), action ? 6000 : 3500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Stack — fixed top-center */}
      <div style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        pointerEvents: 'none',
      }}>
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
