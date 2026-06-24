import React, { useState, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { useMoney, type Trip } from '../contexts/MoneyContext';
import { useNavigate } from 'react-router-dom';
import CreateTripModal from '../components/modals/CreateTripModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import OnboardingTutorial from '../components/OnboardingTutorial';
import { PageWrapper } from '../components/ui/PageWrapper';
import MaterialIcon from '../components/common/MaterialIcon';

type TripFilter = 'all' | 'active' | 'settled';

const FILTER_LABELS: Record<TripFilter, string> = {
  all: 'Semua',
  active: 'Aktif',
  settled: 'Lunas',
};

const Trips: React.FC = () => {
  const { trips, tripExpenses, currencySymbol, deleteTrip } = useMoney();
  const navigate = useNavigate();
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tripFilter, setTripFilter] = useState<TripFilter>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredTrips = useMemo(() => {
    if (tripFilter === 'all') return trips;
    return trips.filter(t => tripFilter === 'settled' ? t.isSettled : !t.isSettled);
  }, [trips, tripFilter]);

  const getTripTotal = (tripId: string) => {
    return tripExpenses
      .filter(e => e.tripId === tripId)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <PageWrapper className="pb-[100px] lg:pb-0 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter max-w-container-max mx-auto w-full h-full">
        {/* Left Panel: List (Always visible on mobile because we navigate away on click) */}
        <div className="lg:col-span-4 flex flex-col gap-stack-md flex">
          <div className="flex items-center gap-3 mb-2 mt-4 lg:mt-0">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white border-none shadow-sm cursor-pointer hover:bg-primary/90 transition-colors shrink-0"
            >
              <MaterialIcon name="chevron_left" className="text-xl" />
            </button>
            <h1 className="font-headline-md text-headline-md text-on-surface">Daftar Perjalanan</h1>
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(prev => !prev)}
                className={`p-2 rounded-full transition-colors ${tripFilter !== 'all' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-primary-fixed'}`}
                title="Filter"
              >
                <MaterialIcon name="filter_list" />
              </button>
              <AnimatePresence>
                {isFilterOpen && (
                  <motion.div 
                    className="absolute right-0 top-10 z-50 bg-bg-card shadow-lg rounded-xl overflow-hidden border border-border-light min-w-[120px]"
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.1 }}
                  >
                    {(Object.keys(FILTER_LABELS) as TripFilter[]).map(key => (
                      <button
                        key={key}
                        onClick={() => { setTripFilter(key); setIsFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-container ${tripFilter === key ? 'text-primary font-bold' : 'text-on-surface'}`}
                      >
                        {FILTER_LABELS[key]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        <div data-tour="trip-list" className="flex flex-col gap-4">
          {filteredTrips.length === 0 ? (
            <div className="bg-bg-card p-5 rounded-xl border-2 border-dashed border-outline-variant text-center my-4">
              <div className="w-20 h-20 bg-primary-fixed rounded-[30px] flex items-center justify-center mx-auto mb-6">
                <MaterialIcon name="flight" className="text-[40px] text-primary" />
              </div>
              <h3 className="font-headline-md text-body-lg font-bold mb-2">{trips.length === 0 ? 'Belum ada rencana trip' : 'Tidak ada trip'}</h3>
              <p className="text-on-surface-variant text-sm mb-8">{trips.length === 0 ? 'Mulai buat grup liburanmu dan catat pengeluarannya di sini.' : `Tidak ada trip dengan status "${FILTER_LABELS[tripFilter]}".`}</p>
              {trips.length === 0 && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-primary text-white px-6 py-3 rounded-xl font-label-md font-bold shadow-md hover:bg-opacity-90 transition-all active:scale-95"
                >
                  Buat Trip Pertama
                </button>
              )}
            </div>
          ) : (
            filteredTrips.map((trip, idx) => {
              const total = getTripTotal(trip.id);
              return (
                <motion.div
                  key={trip.id}
                  data-testid={`trip-card-${trip.id}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => {
                    if (window.innerWidth >= 1024) {
                      setSelectedPreviewId(trip.id);
                    } else {
                      navigate(`/trips/${trip.id}`);
                    }
                  }}
                  className={`bg-bg-card p-5 rounded-xl border ${trip.isSettled ? 'border-outline-variant opacity-80 hover:opacity-100' : selectedPreviewId === trip.id ? 'border-2 border-primary ring-4 ring-primary-fixed' : 'border-2 border-transparent hover:border-primary'} card-lift cursor-pointer relative overflow-hidden transition-all duration-200`}
                >
                  {!trip.isSettled && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary-fixed opacity-10 rounded-bl-full pointer-events-none"></div>
                  )}
                  
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      {trip.isSettled ? (
                        <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">Lunas</span>
                      ) : (
                        <span className="bg-success-container text-on-success-container text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">Aktif</span>
                      )}
                      <h3 className="font-headline-md text-body-lg font-bold text-on-surface truncate" title={trip.name}>{trip.name}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(trip.id);
                          setIsConfirmOpen(true);
                        }}
                        className="text-error hover:bg-error-container p-1 rounded-full transition-colors"
                      >
                        <MaterialIcon name="delete" className="text-xl" />
                      </button>
                      <MaterialIcon name="chevron_right" className={trip.isSettled ? "text-on-surface-variant" : "text-primary"} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-on-surface-variant mb-4">
                    <MaterialIcon name="calendar_today" className="text-sm" />
                    <span className="font-label-md text-xs">{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-1 text-on-surface-variant">
                      <MaterialIcon name="group" className="text-sm" />
                      <span className="text-xs font-bold">{trip.members.length} Anggota</span>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs text-on-surface-variant mb-1">Total Pengeluaran</p>
                      <p className={`font-headline-md ${trip.isSettled ? 'text-on-surface' : 'text-primary'}`}>
                        {currencySymbol}{total.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}

          {trips.length > 0 && (
            <button 
              data-tour="add-trip"
              data-testid="add-trip-btn"
              onClick={() => setIsModalOpen(true)}
              className="mt-4 flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant hover:border-primary hover:text-primary transition-all group"
            >
              <MaterialIcon name="add_circle" className="group-hover:scale-110 transition-transform" />
              <span className="font-label-md font-bold">Buat Perjalanan Baru</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Right Panel: Preview (Hide on mobile completely) */}
      <div className="lg:col-span-8 h-full hidden lg:flex flex-col">
        {selectedPreviewId ? (() => {
          const selectedTrip = trips.find(t => t.id === selectedPreviewId);
          if (!selectedTrip) return null;
          const tripAllExpenses = tripExpenses.filter(e => e.tripId === selectedPreviewId);
          const recentExpenses = [...tripAllExpenses]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 3);
            
          let myPaid = 0;
          let myConsumed = 0;
          tripAllExpenses.forEach(e => {
            if (e.payerId === 'me') myPaid += e.amount;
            const mySplit = e.splits.find(s => s.memberId === 'me');
            if (mySplit) myConsumed += mySplit.amount;
          });
          const myBalance = myPaid - myConsumed;
          
          return (
            <div className="bg-bg-card rounded-2xl border border-outline-variant h-full flex flex-col overflow-hidden relative shadow-sm">
              <div className="h-32 bg-gradient-to-r from-primary to-primary-container absolute top-0 left-0 right-0 opacity-10"></div>
              
              <div className="p-8 flex-1 flex flex-col relative z-10 overflow-y-auto hide-scrollbar">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                    <MaterialIcon name="beach_access" className="text-4xl text-white" />
                  </div>
                  
                  {/* Members Stack */}
                  <div className="flex -space-x-3">
                    {selectedTrip.members.slice(0, 4).map((m, i) => (
                      <div 
                        key={m.id} 
                        className={`w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white relative ${m.id === 'me' ? 'bg-primary ring-2 ring-primary ring-offset-1' : 'bg-primary-container'}`}
                        style={{ zIndex: 4 - i }}
                      >
                        {m.name.charAt(0)}
                      </div>
                    ))}
                    {selectedTrip.members.length > 4 && (
                      <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-white flex items-center justify-center text-[10px] font-bold text-on-surface-variant z-0">
                        +{selectedTrip.members.length - 4}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <h2 className="font-headline-lg text-[28px] font-bold text-on-surface">
                    {selectedTrip.name}
                  </h2>
                  {selectedTrip.isSettled ? (
                    <span className="bg-secondary-container text-on-secondary-container text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Lunas</span>
                  ) : (
                    <span className="bg-success-container text-on-success-container text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Aktif</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant mb-8">
                  <MaterialIcon name="event" className="text-sm" />
                  <span className="text-sm font-label-md">
                    {formatDate(selectedTrip.startDate)} - {formatDate(selectedTrip.endDate)}
                  </span>
                </div>
                
                <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant mb-4">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Status Keuanganmu</p>
                    <MaterialIcon name="account_balance_wallet" className="text-primary text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    {myBalance > 0 ? (
                      <>
                        <p className="text-sm text-on-surface-variant">Kamu menalangi sebesar</p>
                        <p className="font-headline-md text-[24px] font-bold text-success">+{currencySymbol}{myBalance.toLocaleString('id-ID')}</p>
                      </>
                    ) : myBalance < 0 ? (
                      <>
                        <p className="text-sm text-on-surface-variant">Kamu berhutang sebesar</p>
                        <p className="font-headline-md text-[24px] font-bold text-error">-{currencySymbol}{Math.abs(myBalance).toLocaleString('id-ID')}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-on-surface-variant">Status tagihanmu</p>
                        <p className="font-headline-md text-[24px] font-bold text-on-surface-variant">Seimbang (Rp0)</p>
                      </>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-outline-variant">
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Total Dibayar</p>
                      <p className="text-sm font-bold text-on-surface">{currencySymbol}{myPaid.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Total Konsumsi</p>
                      <p className="text-sm font-bold text-on-surface">{currencySymbol}{myConsumed.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant">
                    <p className="text-[10px] text-on-surface-variant mb-1 font-bold uppercase tracking-wider">Total Anggota</p>
                    <p className="font-headline-md text-xl font-bold text-on-surface">
                      {selectedTrip.members.length} <span className="text-xs text-on-surface-variant font-normal">Orang</span>
                    </p>
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant">
                    <p className="text-[10px] text-on-surface-variant mb-1 font-bold uppercase tracking-wider">Total Pengeluaran</p>
                    <p className="font-headline-md text-xl font-bold text-primary truncate">
                      {currencySymbol}{getTripTotal(selectedPreviewId).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* Recent Expenses Preview */}
                {recentExpenses.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-label-md font-bold text-on-surface mb-3 flex items-center gap-2">
                      <MaterialIcon name="history" className="text-sm" />
                      Pengeluaran Terakhir
                    </h3>
                    <div className="flex flex-col gap-2">
                      {recentExpenses.map(expense => (
                        <div key={expense.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-surface-container-low transition-colors border border-transparent hover:border-outline-variant">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center text-error">
                              <MaterialIcon name="receipt_long" className="text-sm" />
                            </div>
                            <div>
                              <p className="font-label-md font-bold text-on-surface">{expense.description}</p>
                              <p className="text-xs text-on-surface-variant">Oleh {selectedTrip.members.find(m => m.id === expense.payerId)?.name}</p>
                            </div>
                          </div>
                          <p className="font-label-md font-bold text-on-surface">
                            {currencySymbol}{expense.amount.toLocaleString('id-ID')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-outline-variant bg-surface-container-lowest">
                <button 
                  onClick={() => navigate(`/trips/${selectedPreviewId}`)}
                  className="w-full py-4 bg-primary text-white rounded-xl font-headline-md text-body-md flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:bg-opacity-90 hover:-translate-y-0.5 transition-all active:scale-95"
                >
                  Lihat Detail Penuh
                  <MaterialIcon name="arrow_forward" />
                </button>
              </div>
            </div>
          );
        })() : (
          <div className="bg-surface-container-low rounded-xl border border-outline-variant h-full min-h-[500px] flex flex-col items-center justify-center mt-14">
            <div className="w-24 h-24 bg-primary-fixed rounded-[30px] flex items-center justify-center mb-6">
              <MaterialIcon name="flight_takeoff" className="text-[50px] text-primary" />
            </div>
            <h3 className="font-headline-md text-body-lg font-bold mb-2 text-on-surface">Pilih Perjalanan</h3>
            <p className="text-on-surface-variant text-sm text-center max-w-[250px]">Pilih salah satu perjalanan di samping untuk melihat pratinjau.</p>
          </div>
        )}
      </div>
    </div>

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
    </PageWrapper>
  );
};

export default Trips;
