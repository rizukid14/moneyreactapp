import React, { useState, useMemo } from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Contact } from '../../contexts/MoneyContext';

interface ContactSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  selectedContactName?: string;
  onSelect: (contactName: string) => void;
}

const ContactSelectModal: React.FC<ContactSelectModalProps> = ({
  isOpen,
  onClose,
  contacts,
  selectedContactName = '',
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    return contacts.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contacts, searchQuery]);

  const handleSelect = (contactName: string) => {
    onSelect(contactName);
    onClose();
    setSearchQuery('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ zIndex: 3000 }}
        >
          <motion.div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400, mass: 0.5 }}
            style={{ padding: 0, height: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0,
            }}>
              <h2 className="subtitle" style={{ margin: 0, fontSize: '16px' }}>Pilih Kontak</h2>
              <button className="close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            {/* Search */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
              <input
                type="text"
                placeholder="Cari kontak..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  marginBottom: 0,
                }}
              />
            </div>

            {/* Contacts List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              background: 'var(--bg-card-solid)',
              padding: '12px 0',
            }}>
              {filteredContacts.length === 0 ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  {contacts.length === 0 ? 'Tidak ada kontak. Buat kontak di Settings terlebih dahulu.' : 'Kontak tidak ditemukan.'}
                </div>
              ) : (
                filteredContacts.map(contact => {
                  const isSelected = contact.name === selectedContactName;
                  return (
                    <button
                      key={contact.id}
                      onClick={() => handleSelect(contact.name)}
                      style={{
                        width: '100%', padding: '14px 16px',
                        background: isSelected ? 'var(--bg-income)' : 'transparent',
                        border: 'none', borderBottom: '1px solid var(--border-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: isSelected ? 'var(--primary)' : 'var(--bg-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontWeight: 700,
                            fontSize: 14,
                            color: isSelected ? 'white' : 'var(--text-muted)',
                          }}
                        >
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary)' : 'var(--text-main)', marginBottom: 2 }}>
                            {contact.name}
                          </div>
                          {contact.phone && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {contact.phone}
                            </div>
                          )}
                          {contact.note && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                              {contact.note}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check size={18} color="var(--primary)" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ContactSelectModal;
