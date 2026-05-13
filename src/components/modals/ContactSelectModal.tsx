import React, { useState, useMemo } from 'react';
import { X, Check, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney, type Contact } from '../../contexts/MoneyContext';

interface ContactSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  selectedContactName?: string;
  selectedContactNames?: string[];
  onSelect?: (contactName: string) => void;
  onSelectMultiple?: (contactNames: string[]) => void;
  isMultiple?: boolean;
}

import ContactModal from './ContactModal';

const ContactSelectModal: React.FC<ContactSelectModalProps> = ({
  isOpen,
  onClose,
  contacts,
  selectedContactName = '',
  selectedContactNames = [],
  onSelect,
  onSelectMultiple,
  isMultiple = false,
}) => {
  const { } = useMoney();
  const [searchQuery, setSearchQuery] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>([]);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTempSelected(isMultiple ? selectedContactNames : []);
    }
  }, [isOpen, isMultiple, selectedContactNames]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    return contacts.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contacts, searchQuery]);

  const handleSelect = (contactName: string) => {
    if (isMultiple) {
      setTempSelected(prev => 
        prev.includes(contactName) ? prev.filter(n => n !== contactName) : [...prev, contactName]
      );
    } else {
      onSelect?.(contactName);
      onClose();
      setSearchQuery('');
    }
  };

  const handleConfirmMultiple = () => {
    onSelectMultiple?.(tempSelected);
    onClose();
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
            style={{ padding: 0, height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0,
            }}>
              <h2 className="subtitle" style={{ margin: 0, fontSize: '16px' }}>Pilih Kontak</h2>
              <button className="close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                {/* Search & Add Bar */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', flexShrink: 0, display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
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
                  <button 
                    onClick={() => setIsContactModalOpen(true)}
                    style={{
                      padding: '0 12px',
                      background: 'var(--bg-income)',
                      border: '1px solid var(--primary-glow)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <UserPlus size={20} />
                  </button>
                </div>

                {/* Contacts List */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  background: 'var(--bg-card-solid)',
                  padding: '12px 0',
                }}>
                  {filteredContacts.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: 16 }}>
                        {contacts.length === 0 ? 'Belum ada kontak.' : 'Kontak tidak ditemukan.'}
                      </div>
                      <button 
                        onClick={() => setIsContactModalOpen(true)}
                        className="btn"
                        style={{ padding: '10px 20px', fontSize: 13, background: 'var(--primary)', color: 'white' }}
                      >
                        Tambah Kontak Baru
                      </button>
                    </div>
                  ) : (
                    filteredContacts.map(contact => {
                      const isSelected = isMultiple 
                        ? tempSelected.includes(contact.name)
                        : contact.name === selectedContactName;
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
                            </div>
                          </div>
                          {isSelected && <Check size={18} color="var(--primary)" />}
                        </button>
                      );
                    })
                  )}
                </div>

                {isMultiple && (
                  <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                    <button 
                      onClick={handleConfirmMultiple}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '14px', borderRadius: '12px' }}
                    >
                      Pilih {tempSelected.length} Orang
                    </button>
                  </div>
                )}
              </div>

              <ContactModal 
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                onSuccess={(name) => handleSelect(name)}
              />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ContactSelectModal;
