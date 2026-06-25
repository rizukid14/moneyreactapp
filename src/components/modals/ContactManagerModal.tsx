import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import MaterialIcon from '../common/MaterialIcon';
import ContactModal from './ContactModal';
import { useMoney } from '../../contexts/MoneyContext';
import ConfirmDialog from '../common/ConfirmDialog';

interface ContactManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactManagerModal: React.FC<ContactManagerModalProps> = ({ isOpen, onClose }) => {
  const { contacts, deleteContact } = useMoney();
  
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [editingContact, setEditingContact] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger', confirmText?: string) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm,
      type,
      confirmText
    });
  };
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Daftar Kontak"
        testId="contact-manager-modal"
      >
        <div style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: '20px' }}>
          <div style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>DAFTAR KONTAK</span>
            <button
              onClick={() => {
                setEditingContact(null);
                setIsContactModalOpen(true);
              }}
              style={{
                padding: '8px 12px', background: 'var(--bg-income)', color: 'var(--primary)',
                border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
              }}
            >
              <MaterialIcon name="add" className="text-[14px]" /> Tambah
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ padding: '12px 0' }}>
            <div style={{ position: 'relative' }}>
              <MaterialIcon 
                name="search"
                className="text-outline-variant"
              />
              <input
                type="text"
                placeholder="Cari kontak..."
                value={contactSearchQuery}
                onChange={e => setContactSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  borderRadius: '12px',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  marginBottom: 0
                }}
              />
            </div>
          </div>

          {/* List Section */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(() => {
              const filtered = contacts
                .filter(c => c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                .sort((a, b) => a.name.localeCompare(b.name));

              if (filtered.length === 0) {
                return (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{contactSearchQuery ? 'Tidak ada hasil' : 'Belum ada kontak'}</div>
                    <div style={{ fontSize: '12px' }}>{contactSearchQuery ? 'Coba kata kunci lain' : 'Tambahkan kontak untuk memudahkan mencatat hutang.'}</div>
                  </div>
                );
              }

              return filtered.map(c => (
                <div key={c.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 0',
                  background: editingContact === c.id ? 'var(--bg-income)' : 'transparent',
                  borderBottom: '1px solid var(--border-color)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: 'var(--bg-main)', color: 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, flexShrink: 0
                    }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>{c.name}</div>
                      {c.phone && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                          📞 {c.phone}
                        </div>
                      )}
                      {c.note && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                          {c.note}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => {
                      setEditingContact(c.id);
                      setIsContactModalOpen(true);
                    }} className="btn-icon" style={{ color: 'var(--primary)', padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      <MaterialIcon name="edit" className="text-[18px]" />
                    </button>
                    <button onClick={() => {
                      showConfirm(
                        'Hapus Kontak',
                        `Hapus kontak "${c.name}"? Catatan hutang/piutang yang menggunakan kontak ini tidak akan terhapus.`,
                        () => deleteContact(c.id)
                      );
                    }} className="btn-icon" style={{ color: 'var(--danger)', padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      <MaterialIcon name="delete" className="text-[18px]" />
                    </button>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </Modal>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => {
          setIsContactModalOpen(false);
          setEditingContact(null);
        }}
        editingContact={contacts.find(c => c.id === editingContact) || undefined}
      />
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState(s => ({ ...s, isOpen: false }))}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
      />
    </>
  );
};

export default ContactManagerModal;
