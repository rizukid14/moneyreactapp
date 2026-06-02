import React, { useEffect, useState } from 'react';
import { Trash2, Copy, ExternalLink, Calendar, ShoppingBag, Plane, Loader2, Link2Off, Check } from 'lucide-react';
import { dbGetMySharedSplits, dbDeleteSharedSplit, type SharedSplit } from '../../lib/db';
import ConfirmDialog from '../common/ConfirmDialog';
import { useToast } from '../common/Toast';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Shared Links"
      >
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, margin: '0 0 24px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manage your active shares</p>

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
                      <Card
                        key={split.id}
                        variant="default"
                        style={{ 
                          padding: '16px', 
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
                          <Button
                            variant={copySuccessId === split.id ? 'primary' : 'outline'}
                            onClick={() => handleCopy(split.id)}
                            style={{ flex: 1, height: '40px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}
                          >
                            {copySuccessId === split.id ? <><Check size={14} /> Link Copied</> : <><Copy size={14} /> Copy Link</>}
                          </Button>
                          
                          <Button
                            variant="outline"
                            onClick={() => window.open(`/shared-split/${split.id}`, '_blank')}
                            style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Preview"
                          >
                            <ExternalLink size={16} />
                          </Button>

                          <Button
                            variant="danger"
                            onClick={() => handleRevoke(split.id)}
                            style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Delete Link"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
      </Modal>

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
  );
};

export default SharedBillsManagerModal;
