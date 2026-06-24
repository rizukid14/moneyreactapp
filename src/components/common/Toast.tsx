import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MaterialIcon from './MaterialIcon';

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
  iconName: string;
  bgClass: string;
  borderClass: string;
  colorClass: string;
}> = {
  success: {
    iconName: 'check_circle',
    bgClass: 'bg-success/15',
    borderClass: 'border-success/30',
    colorClass: 'text-success',
  },
  error: {
    iconName: 'cancel',
    bgClass: 'bg-error/15',
    borderClass: 'border-error/30',
    colorClass: 'text-error',
  },
  warning: {
    iconName: 'warning',
    bgClass: 'bg-warning/15',
    borderClass: 'border-warning/30',
    colorClass: 'text-warning',
  },
  info: {
    iconName: 'info',
    bgClass: 'bg-primary/15',
    borderClass: 'border-primary/30',
    colorClass: 'text-primary',
  },
};

// ─── Single Toast Item ────────────────────────────────────────────────────────

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const cfg = TOAST_CONFIG[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      transition={{ type: 'spring', damping: 28, stiffness: 500, mass: 0.5 }}
      className={`flex items-center gap-3 py-3.5 px-4 rounded-2xl border-2 backdrop-blur-md shadow-lg max-w-[360px] w-[calc(100vw-32px)] pointer-events-auto ${cfg.bgClass} ${cfg.borderClass}`}
    >
      <span className={`shrink-0 flex ${cfg.colorClass}`}>
        <MaterialIcon name={cfg.iconName} className="text-xl" />
      </span>
      <span className="flex-1 text-sm font-bold text-on-surface leading-snug">
        {toast.message}
      </span>
      {toast.action && (
        <button
          onClick={() => {
            if (toast.action) toast.action.onClick();
            onDismiss(toast.id);
          }}
          className="shrink-0 mr-2 px-3 py-1.5 rounded-md bg-primary text-white border-none text-xs font-bold cursor-pointer"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-0.5 bg-transparent border-none text-on-surface-variant cursor-pointer opacity-60 hover:opacity-100 leading-none"
      >
        <MaterialIcon name="close" className="text-base" />
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
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center gap-2 pointer-events-none">
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
