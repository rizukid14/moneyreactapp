import React, { useState, useEffect } from 'react';

import { useMoney, type Contact } from '../../contexts/MoneyContext';
import MaterialIcon from '../common/MaterialIcon';
import { Modal } from '../ui/Modal';

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
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingContact ? 'Edit Kontak' : 'Tambah Kontak Baru'}
    >
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
          <MaterialIcon name="save" className="text-[20px]" />
          {editingContact ? 'Simpan Perubahan' : 'Tambah Kontak'}
        </button>
      </form>
    </Modal>
  );
};

export default ContactModal;
