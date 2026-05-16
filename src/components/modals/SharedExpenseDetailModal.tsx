import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt } from 'lucide-react';

interface SharedExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: any;
  members: any[];
  currencySymbol: string;
}

const SharedExpenseDetailModal: React.FC<SharedExpenseDetailModalProps> = ({
  isOpen,
  onClose,
  expense,
  members,
  currencySymbol
}) => {
  if (!isOpen || !expense) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1400 }}>
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="modal-content"
          onClick={e => e.stopPropagation()}
          style={{ maxHeight: '90vh', overflowY: 'auto', paddingBottom: '32px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Rincian Pengeluaran</h2>
            <button onClick={onClose} className="btn-icon">
              <X size={20} />
            </button>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '24px', border: '1px solid var(--border-color)', marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--primary-glow)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <Receipt size={24} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>{expense.description}</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Dibayar oleh {expense.payer} • {expense.date}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--primary)' }}>
              {currencySymbol}{expense.amount.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Items if available */}
          {expense.items && expense.items.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                Rincian Item (Struk)
              </h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {expense.items.map((item: any, i: number) => {
                  const assignedNames = item.assignments.map((id: string) => members.find(m => m.id === id)?.name || 'Teman').join(', ');
                  return (
                    <div key={i} style={{ padding: '12px 16px', background: 'var(--bg-neutral)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{assignedNames}</div>
                      </div>
                      <div style={{ fontWeight: 800 }}>{currencySymbol}{item.amount.toLocaleString('id-ID')}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Splits Detail */}
          {expense.splits && expense.splits.length > 0 && (
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                Ditanggung Oleh (Pakai)
              </h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {expense.splits.map((s: any) => {
                  const m = members.find(m => m.id === s.memberId);
                  return (
                    <div key={s.memberId} style={{ padding: '12px 16px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>{m?.name || 'Unknown'}</span>
                      <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{currencySymbol}{s.amount.toLocaleString('id-ID')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SharedExpenseDetailModal;
