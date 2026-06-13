import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useMoney } from '../contexts/MoneyContext';
import AddTripExpenseModal from '../components/modals/AddTripExpenseModal';
import SettleUpModal from '../components/modals/SettleUpModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { PageWrapper } from '../components/ui/PageWrapper';
import MaterialIcon from '../components/common/MaterialIcon';

const TripDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trips, tripExpenses, currencySymbol, deleteTripExpense } = useMoney();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  const trip = trips.find(t => t.id === id);
  const expenses = useMemo(() => 
    tripExpenses
      .filter(e => e.tripId === id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [tripExpenses, id]
  );

  const totalSpent = useMemo(() => 
    expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );
  
  const userConsumption = useMemo(() => {
    let sum = 0;
    expenses.forEach(e => {
      e.splits.forEach(s => {
        if (s.memberId === 'me') sum += s.amount;
      });
    });
    return sum;
  }, [expenses]);

  if (!trip) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center pt-32 text-center">
          <MaterialIcon name="error_outline" className="text-6xl text-on-surface-variant mb-4" />
          <h2 className="font-headline-lg font-bold text-on-surface mb-6">Trip tidak ditemukan</h2>
          <button onClick={() => navigate('/trips')} className="btn-primary">Kembali ke Daftar Trip</button>
        </div>
      </PageWrapper>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const groupExpensesByDate = () => {
    const groups: Record<string, typeof expenses> = {};
    expenses.forEach(e => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  };

  return (
    <PageWrapper className="pb-[120px] bg-bg-main min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/trips')} className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm hover:scale-105 transition-transform shrink-0">
          <MaterialIcon name="arrow_back" className="text-xl text-on-surface" />
        </button>
        <h1 className="font-headline-md font-black text-on-surface m-0 tracking-tight">Trip Board</h1>
      </div>

      {/* BENTO GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-min mb-8">
        
        {/* 1. Header Card (Spans 2 cols, 2 rows on Desktop) */}
        <div className="col-span-2 md:col-span-2 md:row-span-2 bg-white rounded-[32px] p-6 relative overflow-hidden flex flex-col justify-between shadow-sm border border-outline-variant/50 min-h-[200px]">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="relative z-10 flex justify-between items-start mb-4">
            <div className="w-14 h-14 bg-primary-container rounded-2xl flex items-center justify-center shrink-0">
              <MaterialIcon name="flight_takeoff" className="text-3xl text-primary" />
            </div>
            {/* Members Stack */}
            <div className="flex -space-x-3 shrink-0">
              {trip.members.slice(0, 4).map((m, i) => (
                <div 
                  key={m.id} 
                  className={`w-10 h-10 rounded-full border-[3px] border-white flex items-center justify-center text-xs font-bold relative shadow-sm ${m.id === 'me' ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface'}`}
                  style={{ zIndex: 4 - i }}
                >
                  {m.name.charAt(0)}
                </div>
              ))}
              {trip.members.length > 4 && (
                <div className="w-10 h-10 rounded-full bg-surface-container border-[3px] border-white flex items-center justify-center text-[10px] font-bold text-on-surface-variant z-0">
                  +{trip.members.length - 4}
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 mt-auto">
            <h2 className="font-headline-lg text-[28px] md:text-[32px] font-black text-on-surface leading-tight tracking-tight mb-1">{trip.name}</h2>
            <div className="inline-flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-full">
              <MaterialIcon name="date_range" className="text-[14px] text-on-surface-variant" />
              <span className="text-[12px] font-bold text-on-surface-variant tracking-wide">{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
            </div>
          </div>
        </div>

        {/* 2. Total Trip (Spans 1 col, 1 row) */}
        <div className="col-span-1 md:col-span-1 md:row-span-1 bg-white rounded-[28px] p-5 flex flex-col justify-center shadow-sm border border-outline-variant/50 hover:shadow-md transition-all">
          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center mb-3">
            <MaterialIcon name="public" className="text-[16px] text-on-surface-variant" />
          </div>
          <p className="text-[10px] text-on-surface-variant mb-0.5 font-bold uppercase tracking-wider">Total Biaya</p>
          <p className="font-headline-md text-[18px] md:text-[22px] font-black text-on-surface truncate">{currencySymbol}{totalSpent.toLocaleString('id-ID')}</p>
        </div>
        
        {/* 3. Bagianmu (Spans 1 col, 1 row) */}
        <div className="col-span-1 md:col-span-1 md:row-span-1 bg-white rounded-[28px] p-5 flex flex-col justify-center shadow-sm border border-outline-variant/50 hover:shadow-md transition-all">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center mb-3">
            <MaterialIcon name="person" className="text-[16px] text-primary" />
          </div>
          <p className="text-[10px] text-on-surface-variant mb-0.5 font-bold uppercase tracking-wider">Bagian Kamu</p>
          <p className="font-headline-md text-[18px] md:text-[22px] font-black text-primary truncate">{currencySymbol}{Math.round(userConsumption).toLocaleString('id-ID')}</p>
        </div>

        {/* 4. Settle Up (Spans 2 cols, 1 row) */}
        <button 
          onClick={() => setIsSettleModalOpen(true)}
          className="col-span-2 md:col-span-2 md:row-span-1 bg-primary rounded-[28px] p-5 flex flex-row items-center gap-4 text-white hover:-translate-y-1 hover:shadow-lg transition-all text-left shadow-md"
        >
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shrink-0">
            <MaterialIcon name="payments" className="text-2xl text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-headline-md text-[16px] font-black mb-0.5 text-white">Settle Up</h3>
            <p className="text-[11px] font-medium text-white/80 leading-tight">Hitung hutang piutang otomatis</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white text-primary flex items-center justify-center shrink-0">
            <MaterialIcon name="arrow_forward" className="text-[16px]" />
          </div>
        </button>

      </div>

      {/* Expenses List Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-headline-md text-[20px] font-black text-on-surface">
            Catatan Pengeluaran
          </h3>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
          >
            <MaterialIcon name="add" className="text-[20px]" />
          </button>
        </div>
        
        <div className="flex flex-col gap-4">
          {expenses.length === 0 ? (
            <div className="bg-white rounded-[32px] p-10 text-center flex flex-col items-center gap-3 border border-outline-variant/50 shadow-sm">
              <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">
                <MaterialIcon name="receipt_long" className="text-4xl text-on-surface-variant opacity-50" />
              </div>
              <div>
                <p className="font-headline-md text-lg font-black text-on-surface">Belum ada pengeluaran</p>
                <p className="text-sm text-on-surface-variant mt-1">Tekan tombol + untuk mencatat pengeluaran pertama.</p>
              </div>
            </div>
          ) : (
            groupExpensesByDate().map(([date, items]) => (
              <div key={date} className="mb-2">
                <p className="text-[11px] font-black text-on-surface-variant tracking-widest uppercase mb-4 ml-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  {formatDate(date)}
                </p>
                <div className="grid gap-3">
                  {items.map(expense => {
                    const payer = trip.members.find(m => m.id === expense.payerId);
                    const isExpanded = expandedExpenseId === expense.id;
                    return (
                      <div 
                        key={expense.id}
                        onClick={() => setExpandedExpenseId(isExpanded ? null : expense.id)}
                        className="bg-white rounded-[24px] p-4 cursor-pointer hover:shadow-md transition-shadow border border-transparent hover:border-outline-variant/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-surface-container-high text-on-surface flex items-center justify-center shrink-0">
                              <MaterialIcon name="local_mall" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-on-surface text-[15px] truncate mb-0.5" title={expense.description}>{expense.description}</h4>
                              <p className="text-xs text-on-surface-variant truncate font-medium">Oleh <span className="font-bold">{payer?.name}</span></p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4 flex flex-col items-end justify-center">
                            <p className="font-black text-[16px] text-on-surface">{currencySymbol}{expense.amount.toLocaleString('id-ID')}</p>
                            <div className="flex gap-2 mt-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingExpense(expense); setIsAddModalOpen(true); }}
                                className="text-on-surface-variant hover:text-primary transition-colors"
                              >
                                <MaterialIcon name="edit" className="text-[16px]" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setDeletingId(expense.id); setIsDeleteConfirmOpen(true); }}
                                className="text-on-surface-variant hover:text-error transition-colors"
                              >
                                <MaterialIcon name="delete" className="text-[16px]" />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-dashed border-outline-variant">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-3 tracking-wider">Ditanggung Oleh</p>
                            <div className="grid gap-2">
                              {expense.splits.map(s => {
                                const m = trip.members.find(m => m.id === s.memberId);
                                return (
                                  <div key={s.memberId} className="flex justify-between items-center bg-surface-container-lowest px-4 py-2.5 rounded-xl border border-outline-variant/30">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${m?.id === 'me' ? 'bg-primary' : 'bg-primary-container'}`}>
                                        {m?.name.charAt(0)}
                                      </div>
                                      <span className="text-[13px] font-bold text-on-surface">{m?.name}</span>
                                    </div>
                                    <span className="font-bold text-[13px] text-on-surface">{currencySymbol}{s.amount.toLocaleString('id-ID')}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AddTripExpenseModal 
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingExpense(null);
        }}
        trip={trip}
        editingExpense={editingExpense}
      />

      <SettleUpModal 
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        trip={trip}
        expenses={expenses}
      />

      <ConfirmDialog 
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => {
          if (deletingId) deleteTripExpense(deletingId);
          setIsDeleteConfirmOpen(false);
        }}
        title="Hapus Pengeluaran"
        message="Apakah Anda yakin ingin menghapus catatan pengeluaran ini?"
      />
    </PageWrapper>
  );
};

export default TripDetail;
