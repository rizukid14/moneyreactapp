import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Users, Wallet, Calendar, Trash2, Edit2, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMoney } from '../contexts/MoneyContext';
import AddTripExpenseModal from '../components/modals/AddTripExpenseModal';
import SettleUpModal from '../components/modals/SettleUpModal';
import ConfirmDialog from '../components/common/ConfirmDialog';

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
      <div className="page" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <h2>Trip tidak ditemukan</h2>
        <button onClick={() => navigate('/trips')} className="btn btn-primary" style={{ marginTop: '20px' }}>Kembali ke Daftar Trip</button>
      </div>
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
    <div className="page" style={{ paddingBottom: '120px' }}>
      <button onClick={() => navigate('/trips')} className="btn-icon" style={{ marginBottom: '16px' }}>
        <ChevronLeft size={24} />
      </button>

      {/* Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ 
          background: 'var(--primary-gradient)', color: 'white', borderRadius: '32px', padding: '24px',
          boxShadow: '0 16px 32px var(--primary-glow)', marginBottom: '32px'
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 8px 0' }}>{trip.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', opacity: 0.9, marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={14} />
            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={14} />
            {trip.members.length} Orang
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: '20px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Total Biaya Trip</p>
            <p style={{ fontSize: '24px', fontWeight: 900, margin: 0 }}>{currencySymbol}{totalSpent.toLocaleString('id-ID')}</p>
            {trip.members.some(m => m.id === 'me') && (
              <p style={{ fontSize: '12px', opacity: 0.8, margin: '4px 0 0 0', fontWeight: 600 }}>
                Pengeluaran Kamu: {currencySymbol}{Math.round(userConsumption).toLocaleString('id-ID')}
              </p>
            )}
          </div>
          <button 
            data-testid="settle-up-btn"
            onClick={() => setIsSettleModalOpen(true)}
            style={{ 
              background: 'white', color: 'var(--primary)', border: 'none', padding: '10px 20px', 
              borderRadius: '12px', fontWeight: 800, fontSize: '14px', cursor: 'pointer'
            }}
          >
            Settle Up
          </button>
        </div>
      </motion.div>
 
      {/* Expenses List */}
      <div style={{ display: 'grid', gap: '24px' }}>
        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <Receipt size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p style={{ fontSize: '14px', fontWeight: 600 }}>Belum ada pengeluaran dicatat</p>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              style={{ color: 'var(--primary)', border: 'none', background: 'transparent', fontWeight: 800, fontSize: '14px', marginTop: '8px', cursor: 'pointer' }}
            >
              Tambah Pengeluaran Pertama
            </button>
          </div>
        ) : (
          groupExpensesByDate().map(([date, items]) => (
            <div key={date}>
              <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
                {formatDate(date)}
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {items.map((expense, idx) => {
                  const payer = trip.members.find(m => m.id === expense.payerId);
                  return (
                    <motion.div
                      key={expense.id}
                      data-testid={`trip-expense-card-${expense.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => setExpandedExpenseId(expandedExpenseId === expense.id ? null : expense.id)}
                      style={{ 
                        background: 'var(--bg-card)', borderRadius: '20px', padding: '16px',
                        border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px',
                        cursor: 'pointer', minWidth: 0
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
                        <div style={{ 
                          width: '44px', height: '44px', background: 'var(--bg-neutral)', borderRadius: '14px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0
                        }}>
                          <Wallet size={20} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={expense.description}>{expense.description}</h4>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                            Dibayar oleh <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{payer?.name}</span>
                          </p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                            {currencySymbol}{expense.amount.toLocaleString('id-ID')}
                          </p>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingExpense(expense);
                                setIsAddModalOpen(true);
                              }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '4px', cursor: 'pointer' }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(expense.id);
                                setIsDeleteConfirmOpen(true);
                              }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--danger)', padding: '4px', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
 
                      {expandedExpenseId === expense.id && (
                        <div style={{ width: '100%', borderTop: '1px dashed var(--border-color)', paddingTop: '12px', overflow: 'hidden', minWidth: 0 }}>
                          {expense.items && expense.items.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                              <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Rincian Item (Receipt):</p>
                              {expense.items.map((item, i) => {
                                const assignedNames = item.assignments.map(id => trip.members.find(m => m.id === id)?.name || 'Teman').join(', ');
                                return (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', overflow: 'hidden', minWidth: 0 }}>
                                    <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
                                      <span style={{ fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assignedNames}</div>
                                    </div>
                                    <span style={{ fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>{currencySymbol}{item.amount.toLocaleString('id-ID')}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
 
                          <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Ditanggung Oleh:</p>
                          {expense.splits.map(s => {
                            const m = trip.members.find(m => m.id === s.memberId);
                            return (
                              <div key={s.memberId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px', overflow: 'hidden', minWidth: 0 }}>
                                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>{m?.name}</span>
                                <span style={{ fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>{currencySymbol}{s.amount.toLocaleString('id-ID')}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
 
      <button
        data-testid="add-trip-expense-fab"
        className="fab"
        onClick={() => setIsAddModalOpen(true)}
        aria-label="Tambah Pengeluaran"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

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
    </div>
  );
};

export default TripDetail;
