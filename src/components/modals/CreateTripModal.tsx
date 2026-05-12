import React, { useState, useEffect } from 'react';
import { X, MapPin, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney, type Trip, type TripMember } from '../../contexts/MoneyContext';
import { generateId } from '../../lib/utils';
import ContactSelectModal from './ContactSelectModal';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTrip?: Trip | null;
}

const CreateTripModal: React.FC<CreateTripModalProps> = ({ isOpen, onClose, editingTrip }) => {
  const { addTrip, updateTrip, contacts } = useMoney();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [members, setMembers] = useState<TripMember[]>([{ id: 'me', name: 'Me' }]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  useEffect(() => {
    if (editingTrip) {
      setName(editingTrip.name);
      setStartDate(editingTrip.startDate);
      setEndDate(editingTrip.endDate);
      setMembers(editingTrip.members);
    } else {
      setName('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
      setMembers([{ id: 'me', name: 'Me' }]);
    }
  }, [editingTrip, isOpen]);

  const handleSelectContact = (contactName: string) => {
    if (members.find(m => m.name === contactName)) return;
    setMembers([...members, { id: generateId(), name: contactName }]);
  };

  const handleRemoveMember = (id: string) => {
    if (id === 'me') return;
    setMembers(members.filter(m => m.id !== id));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const tripData = {
      name: name.trim(),
      startDate,
      endDate,
      members,
      isSettled: false
    };

    if (editingTrip) {
      updateTrip(editingTrip.id, tripData);
    } else {
      addTrip(tripData);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose}>
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="modal-content"
          onClick={e => e.stopPropagation()}
          style={{ paddingBottom: '32px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{editingTrip ? 'Edit Trip' : 'Buat Trip Baru'}</h2>
            <button onClick={onClose} className="btn-icon">
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Trip Name */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                Nama Trip / Destinasi
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Contoh: Liburan Bali 2024"
                  style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-neutral)', fontSize: '15px', fontWeight: 700 }}
                />
              </div>
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Mulai</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-neutral)', fontSize: '14px', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Berakhir</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-neutral)', fontSize: '14px', fontWeight: 700 }}
                />
              </div>
            </div>

            {/* Members */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Anggota Grup ({members.length})
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {members.map(m => (
                  <div 
                    key={m.id} 
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'var(--primary-glow)',
                      color: 'var(--primary)', borderRadius: '12px', fontSize: '13px', fontWeight: 800
                    }}
                  >
                    {m.name}
                    {m.id !== 'me' && (
                      <button onClick={() => handleRemoveMember(m.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => setIsContactModalOpen(true)}
                style={{ 
                  width: '100%', padding: '16px', borderRadius: '16px', border: '2px dashed var(--border-color)',
                  background: 'var(--bg-neutral)', color: 'var(--primary)', fontWeight: 800, fontSize: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer'
                }}
              >
                <Plus size={20} /> Tambah dari Kontak
              </button>
            </div>

            <ContactSelectModal 
              isOpen={isContactModalOpen}
              onClose={() => setIsContactModalOpen(false)}
              contacts={contacts}
              onSelect={handleSelectContact}
            />

            <button 
              onClick={handleSave}
              className="btn btn-primary"
              style={{ width: '100%', padding: '16px', borderRadius: '16px', fontWeight: 800, fontSize: '16px', marginTop: '12px' }}
            >
              {editingTrip ? 'Simpan Perubahan' : 'Buat Trip'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateTripModal;
