import React, { useState } from 'react';
import { Plus, Plane, Calendar, Users, ChevronRight, MapPin, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMoney, type Trip } from '../contexts/MoneyContext';
import { useNavigate } from 'react-router-dom';
import CreateTripModal from '../components/modals/CreateTripModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import OnboardingTutorial from '../components/OnboardingTutorial';

const Trips: React.FC = () => {
  const { trips, tripExpenses, currencySymbol, deleteTrip } = useMoney();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getTripTotal = (tripId: string) => {
    return tripExpenses
      .filter(e => e.tripId === tripId)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 className="title" style={{ margin: 0 }}>Liburan & Perjalanan</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Kelola patungan biaya liburan bareng teman</p>
        </div>
      </div>

      <div data-tour="trip-list" style={{ display: 'grid', gap: '16px' }}>
        {trips.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              background: 'var(--bg-card)', padding: '48px 24px', borderRadius: '24px', textAlign: 'center',
              border: '2px dashed var(--border-color)', marginTop: '20px'
            }}
          >
            <div style={{ 
              width: '80px', height: '80px', background: 'var(--primary-glow)', borderRadius: '30px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto'
            }}>
              <Plane size={40} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Belum ada rencana trip</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' }}>Mulai buat grup liburanmu dan catat pengeluarannya di sini.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '12px 24px', borderRadius: '16px', fontWeight: 800 }}
            >
              Buat Trip Pertama
            </button>
          </motion.div>
        ) : (
          trips.map((trip, idx) => {
            const total = getTripTotal(trip.id);
            return (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => navigate(`/trips/${trip.id}`)}
                style={{ 
                  background: 'var(--bg-card)', borderRadius: '24px', padding: '20px',
                  border: '1px solid var(--border-color)', cursor: 'pointer',
                  position: 'relative', overflow: 'hidden'
                }}
              >
                {trip.isSettled && (
                  <div style={{ 
                    position: 'absolute', top: '12px', right: '12px', background: 'var(--success-glow)',
                    color: 'var(--success)', padding: '4px 10px', borderRadius: '100px', fontSize: '10px', fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>
                    Settled
                  </div>
                )}

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ 
                    width: '52px', height: '52px', background: 'var(--primary-gradient)', borderRadius: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                    boxShadow: '0 8px 16px var(--primary-glow)'
                  }}>
                    <MapPin size={24} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={trip.name}>{trip.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                        <Calendar size={12} />
                        {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                        <Users size={12} />
                        {trip.members.length} Orang
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(trip.id);
                        setIsConfirmOpen(true);
                      }}
                      className="btn-icon"
                      style={{ color: 'var(--danger)', width: '32px', height: '32px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={20} color="var(--text-muted)" />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border-color)', borderTopStyle: 'dashed' }}>
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Total Terpakai</p>
                    <p style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>{currencySymbol}{total.toLocaleString('id-ID')}</p>
                    {trip.members.some(m => m.id === 'me') && (
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: 600 }}>
                        Pengeluaran Kamu: {currencySymbol}{Math.round(tripExpenses.filter(e => e.tripId === trip.id).reduce((sum, e) => {
                          const mySplit = e.splits.find(s => s.memberId === 'me');
                          return sum + (mySplit ? mySplit.amount : 0);
                        }, 0)).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex' }}>
                    {trip.members.slice(0, 3).map((m, i) => (
                      <div 
                        key={m.id} 
                        style={{ 
                          width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-neutral)',
                          border: '2px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 800, marginLeft: i === 0 ? 0 : '-12px', position: 'relative', zIndex: 3 - i
                        }}
                      >
                        {m.name.charAt(0)}
                      </div>
                    ))}
                    {trip.members.length > 3 && (
                      <div style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-neutral)',
                        border: '2px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 800, marginLeft: '-12px', position: 'relative', zIndex: 0
                      }}>
                        +{trip.members.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <button
        data-tour="add-trip"
        className="fab"
        onClick={() => setIsModalOpen(true)}
        aria-label="Tambah Trip"
        style={{ zIndex: 100 }}
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      <CreateTripModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTrip(null);
        }}
        editingTrip={editingTrip}
      />

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          if (deletingId) deleteTrip(deletingId);
          setIsConfirmOpen(false);
        }}
        title="Hapus Trip"
        message="Apakah Anda yakin ingin menghapus data trip ini? Semua catatan pengeluaran di dalamnya juga akan terhapus."
      />

      <OnboardingTutorial 
        pageKey="trips" 
        steps={[
          { targetSelector: '[data-tour="trip-list"]', title: '✈️ Daftar Trip', description: 'Lihat daftar perjalanan dan liburan yang kamu buat. Klik pada trip untuk melihat detail pengeluaran.' },
          { targetSelector: '[data-tour="add-trip"]', title: '➕ Buat Trip Baru', description: 'Tap di sini untuk membuat catatan liburan baru.' }
        ]} 
      />
    </div>
  );
};

export default Trips;
