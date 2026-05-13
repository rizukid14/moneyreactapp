import React, { useState, useEffect } from 'react';
import { X, Save, UserPlus, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney, type Contact } from '../../contexts/MoneyContext';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingContact?: Contact | null;
  onSuccess?: (contactName: string) => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, editingContact, onSuccess }) => {
  const { addContact, updateContact } = useMoney();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (editingContact) {
      setName(editingContact.name);
      setPhone(editingContact.phone || '');
      setNote(editingContact.note || '');
    } else {
      setName('');
      setPhone('');
      setNote('');
    }
  }, [editingContact, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingContact) {
      updateContact(editingContact.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        note: note.trim() || undefined,
      });
    } else {
      addContact({
        name: name.trim(),
        phone: phone.trim() || undefined,
        note: note.trim() || undefined,
      });
    }
    
    onSuccess?.(name.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3500 }}>
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="modal-content"
          onClick={e => e.stopPropagation()}
          style={{ paddingBottom: '32px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              {editingContact ? <Edit2 size={22} className="text-primary" /> : <UserPlus size={22} className="text-primary" />}
              {editingContact ? 'Edit Kontak' : 'Tambah Kontak Baru'}
            </h2>
            <button onClick={onClose} className="btn-icon">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                Nama Kontak
              </label>
              <input 
                autoFocus
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Masukkan nama kontak..."
                required
                style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-neutral)', fontSize: '15px', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                Nomor Telepon (Opsional)
              </label>
              <input 
                type="tel" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0812..."
                style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-neutral)', fontSize: '15px', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                Catatan (Opsional)
              </label>
              <textarea 
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Contoh: Teman kantor, keluarga, dll."
                rows={3}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-neutral)', fontSize: '15px', fontWeight: 700, resize: 'none', fontFamily: 'inherit' }}
              />
            </div>

            <button 
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '16px', borderRadius: '16px', fontWeight: 800, fontSize: '16px', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            >
              <Save size={20} />
              {editingContact ? 'Simpan Perubahan' : 'Tambah Kontak'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ContactModal;
