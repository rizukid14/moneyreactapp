import React, { useEffect, useState } from 'react';
import { X, Share2, Trash2, Copy, ExternalLink, Calendar, ShoppingBag, Plane, Loader2, Link2Off, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { dbGetMySharedSplits, dbDeleteSharedSplit, type SharedSplit } from '../../lib/db';
import ConfirmDialog from '../common/ConfirmDialog';
import { useToast } from '../common/Toast';

interface SharedBillsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SharedBillsManagerModal: React.FC<SharedBillsManagerModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [sharedSplits, setSharedSplits] = useState<SharedSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [copySuccessId, setCopySuccessId] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger', confirmText?: string) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, type, confirmText });
  };

  const fetchSharedSplits = async () => {
    setLoading(true);
    try {
      const data = await dbGetMySharedSplits();
      setSharedSplits(data);
    } catch (err) {
      console.error('Failed to fetch shared splits:', err);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSharedSplits();
    }
  }, [isOpen]);

  const handleCopy = (id: string) => {
    const url = `${window.location.origin}/shared-split/${id}`;
    navigator.clipboard.writeText(url);
    setCopySuccessId(id);
    setTimeout(() => setCopySuccessId(null), 2000);
  };

  const handleRevoke = async (id: string) => {
    showConfirm(
      'Hapus Link Sharing',
      'Hapus link sharing ini? Orang lain tidak akan bisa melihat rincian lagi.',
      async () => {
        try {
          await dbDeleteSharedSplit(id);
          setSharedSplits(prev => prev.filter(s => s.id !== id));
          showToast('Link sharing berhasil dihapus.', 'success');
        } catch (err) {
          console.error('Failed to revoke:', err);
          showToast('Gagal menghapus link sharing.', 'error');
        }
      },
      'danger',
      'Hapus Link'
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="modal-overlay"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              style={{ 
                maxWidth: 500, 
                background: 'var(--bg-card)', 
                borderRadius: '32px 32px 0 0',
                border: '1px solid var(--border-color)',
                padding: '24px',
                boxShadow: '0 -20px 40px rgba(0,0,0,0.2)'
              }}
            >
              {/* Handle bar for mobile feel */}
              <div style={{ width: '40px', height: '4px', background: 'var(--border-color)', borderRadius: '10px', margin: '0 auto 20px auto' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', background: 'var(--primary-glow)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Share2 size={22} color="var(--primary)" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>Shared Links</h2>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manage your active shares</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-neutral)', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
                {loading ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px auto', color: 'var(--primary)' }} />
                    <p style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Syncing links...</p>
                  </div>
                ) : sharedSplits.length === 0 ? (
                  <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{ width: '80px', height: '80px', background: 'var(--bg-neutral)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', opacity: 0.5 }}>
                      <Link2Off size={40} color="var(--text-muted)" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>No active links</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Any bills or trips you share will appear here for management or revocation.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px', paddingBottom: '20px' }}>
                    {sharedSplits.map((split) => (
                      <motion.div
                        key={split.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ 
                          background: 'var(--bg-neutral)', 
                          borderRadius: '24px', 
                          padding: '16px', 
                          border: '1px solid var(--border-color)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ 
                              width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: split.type === 'trip' ? 'var(--secondary-glow)' : 'var(--primary-glow)',
                              color: split.type === 'trip' ? 'var(--secondary)' : 'var(--primary)'
                            }}>
                              {split.type === 'trip' ? <Plane size={22} /> : <ShoppingBag size={22} />}
                            </div>
                            <div>
                              <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>{split.merchantName}</h4>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                                <Calendar size={12} />
                                {split.date}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--primary)' }}>
                              {split.currencySymbol}{split.totalAmount.toLocaleString('id-ID')}
                            </div>
                            <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                              {split.type === 'trip' ? `${(split.members || []).length} Members` : `${split.splits.length} Items`}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleCopy(split.id)}
                            style={{ 
                              flex: 1, height: '40px', borderRadius: '12px', 
                              background: copySuccessId === split.id ? 'var(--success)' : 'var(--bg-card)',
                              color: copySuccessId === split.id ? 'white' : 'var(--text-main)',
                              fontSize: '11px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                              border: '1px solid var(--border-color)'
                            }}
                          >
                            {copySuccessId === split.id ? <><Check size={14} /> Link Copied</> : <><Copy size={14} /> Copy Link</>}
                          </button>
                          
                          <button
                            onClick={() => window.open(`/shared-split/${split.id}`, '_blank')}
                            style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            title="Preview"
                          >
                            <ExternalLink size={16} />
                          </button>

                          <button
                            onClick={() => handleRevoke(split.id)}
                            style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--danger-glow)', border: '1px solid var(--danger-glow)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            title="Delete Link"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>

          <ConfirmDialog
            isOpen={confirmDialog.isOpen}
            onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
            onConfirm={confirmDialog.onConfirm}
            title={confirmDialog.title}
            message={confirmDialog.message}
            type={confirmDialog.type}
            confirmText={confirmDialog.confirmText}
          />
        </>
      )}
    </AnimatePresence>
  );
};

export default SharedBillsManagerModal;
