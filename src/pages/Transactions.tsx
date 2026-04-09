import React, { useState, useMemo } from 'react';
import { Plus, X, ArrowRightLeft, ArrowUpRight, ArrowDownRight, Trash2, ChevronLeft, ChevronRight, CalendarDays, ChevronDown } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

const Transactions: React.FC = () => {
  const { transactions, assets, addTransaction, deleteTransaction } = useMoney();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'month' | 'year'>('month');
  const [viewDate, setViewDate] = useState(new Date());
  
  // Form State
  const [type, setType] = useState<'pengeluaran' | 'pendapatan' | 'transfer'>('pengeluaran');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Makanan');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  
  // Asset selections
  const [assetId, setAssetId] = useState(assets[0]?.id || '');
  const [fromAssetId, setFromAssetId] = useState(assets[0]?.id || '');
  const [toAssetId, setToAssetId] = useState(assets[1]?.id || assets[0]?.id || '');

  // Generate dynamic years for picker
  const yearList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  }, []);

  const openModal = () => {
    setAssetId(assets[0]?.id || '');
    setFromAssetId(assets[0]?.id || '');
    setToAssetId(assets[1]?.id || assets[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (!numericValue) {
      setAmount('');
      return;
    }
    setAmount(Number(numericValue).toLocaleString('id-ID'));
  };

  const saveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    addTransaction({
      type,
      amount: Number(amount.replace(/\./g, '')),
      category: type === 'transfer' ? 'Transfer' : category,
      date,
      note,
      assetId: type !== 'transfer' ? assetId : undefined,
      fromAssetId: type === 'transfer' ? fromAssetId : undefined,
      toAssetId: type === 'transfer' ? toAssetId : undefined,
    });
    setIsModalOpen(false);
    setAmount(''); setNote('');
  };

  const changeMonth = (offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const selectMonth = (idx: number) => {
    setViewDate(new Date(viewDate.getFullYear(), idx, 1));
    setIsDatePickerOpen(false);
  };

  const selectYear = (year: number) => {
    setViewDate(new Date(year, viewDate.getMonth(), 1));
    setPickerMode('month');
  };

  const resetToToday = () => setViewDate(new Date());

  const { filteredTransactions, monthlyIncome, monthlyExpense } = useMemo(() => {
    const vM = viewDate.getMonth();
    const vY = viewDate.getFullYear();
    
    let inc = 0;
    let exp = 0;

    const filtered = transactions.filter(tx => {
      const txD = new Date(tx.date);
      if (txD.getMonth() === vM && txD.getFullYear() === vY) {
        if (tx.type === 'pendapatan') inc += tx.amount;
        if (tx.type === 'pengeluaran') exp += tx.amount;
        return true;
      }
      return false;
    });

    return { filteredTransactions: filtered, monthlyIncome: inc, monthlyExpense: exp };
  }, [transactions, viewDate]);

  const getAssetName = (id?: string) => assets.find(a => a.id === id)?.name || 'Unknown';

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="title" style={{ margin: 0 }}>Transaksi</h1>
        <button onClick={resetToToday} style={{ 
          display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', 
          borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-card)',
          fontSize: '12px', fontWeight: 600, color: 'var(--secondary-blue)', cursor: 'pointer'
        }}>
          <CalendarDays size={14} /> Hari Ini
        </button>
      </div>

      {/* Month Switcher Header */}
      <div className="card" style={{ padding: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <ChevronLeft size={24} />
          </button>
          
          <div 
            onClick={() => { setIsDatePickerOpen(true); setPickerMode('month'); }}
            style={{ textAlign: 'center', cursor: 'pointer', padding: '4px 12px', borderRadius: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
              <ChevronDown size={16} color="var(--text-muted)" />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11px', fontWeight: 600 }}>
              <span style={{ color: 'var(--secondary-blue)' }}>Masuk: Rp{monthlyIncome.toLocaleString('id-ID')}</span>
              <span style={{ color: 'var(--primary-orange)' }}>Keluar: Rp{monthlyExpense.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
      
      {filteredTransactions.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
          Tidak ada transaksi di bulan ini.
        </div>
      ) : (
        filteredTransactions.map(tx => (
          <div className="card" key={tx.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: '20px', 
              backgroundColor: tx.type === 'pengeluaran' ? 'var(--bg-expense)' : tx.type === 'pendapatan' ? 'var(--bg-income)' : 'var(--bg-neutral)',
              display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '16px',
              color: tx.type === 'pengeluaran' ? 'var(--danger-red)' : tx.type === 'pendapatan' ? 'var(--secondary-blue)' : 'var(--text-muted)'
            }}>
              {tx.type === 'pengeluaran' ? <ArrowDownRight size={20} /> : tx.type === 'pendapatan' ? <ArrowUpRight size={20} /> : <ArrowRightLeft size={20} />}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{tx.type === 'transfer' ? `Transfer: ${getAssetName(tx.fromAssetId)} ➔ ${getAssetName(tx.toAssetId)}` : tx.category}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {tx.date} • {tx.type !== 'transfer' ? getAssetName(tx.assetId) : ''} {tx.note && `(${tx.note})`}
              </div>
            </div>
            
            <div style={{ 
              fontWeight: 700, 
              color: tx.type === 'pengeluaran' ? 'var(--text-main)' : tx.type === 'pendapatan' ? 'var(--secondary-blue)' : 'var(--text-muted)' 
            }}>
              {tx.type === 'pengeluaran' ? '-' : tx.type === 'pendapatan' ? '+' : ''}Rp{tx.amount.toLocaleString('id-ID')}
            </div>
            
            <button onClick={() => confirm('Hapus transaksi ini?') && deleteTransaction(tx.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', padding: '0 0 0 12px', cursor: 'pointer' }}>
               <Trash2 size={16} />
            </button>
          </div>
        ))
      )}

      {/* Date Picker Modal */}
      {isDatePickerOpen && (
        <div className="modal-overlay" onClick={() => setIsDatePickerOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ paddingBottom: '30px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setPickerMode('month')}
                  style={{ 
                    padding: '4px 12px', borderRadius: '15px', border: 'none',
                    backgroundColor: pickerMode === 'month' ? 'var(--secondary-blue)' : '#f3f4f6',
                    color: pickerMode === 'month' ? 'white' : 'var(--text-muted)',
                    fontWeight: 600, fontSize: '12px', cursor: 'pointer'
                  }}>Bulan</button>
                <button 
                  onClick={() => setPickerMode('year')}
                  style={{ 
                    padding: '4px 12px', borderRadius: '15px', border: 'none',
                    backgroundColor: pickerMode === 'year' ? 'var(--secondary-blue)' : '#f3f4f6',
                    color: pickerMode === 'year' ? 'white' : 'var(--text-muted)',
                    fontWeight: 600, fontSize: '12px', cursor: 'pointer'
                  }}>Tahun</button>
              </div>
              <button className="close-btn" onClick={() => setIsDatePickerOpen(false)}><X size={24} /></button>
            </div>

            <div style={{ marginTop: '20px' }}>
              {pickerMode === 'month' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {MONTH_SHORT.map((m, i) => (
                    <button 
                      key={m} 
                      onClick={() => selectMonth(i)}
                      style={{ 
                        padding: '16px 8px', borderRadius: '12px', border: '1px solid var(--border-color)',
                        backgroundColor: i === viewDate.getMonth() ? 'var(--bg-income)' : 'var(--bg-card)',
                        borderColor: i === viewDate.getMonth() ? 'var(--secondary-blue)' : 'var(--border-color)',
                        color: i === viewDate.getMonth() ? 'var(--secondary-blue)' : 'var(--text-main)',
                        fontWeight: i === viewDate.getMonth() ? 700 : 500,
                        cursor: 'pointer'
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {yearList.map(y => (
                    <button 
                      key={y} 
                      onClick={() => selectYear(y)}
                      style={{ 
                        padding: '16px 8px', borderRadius: '12px', border: '1px solid var(--border-color)',
                        backgroundColor: y === viewDate.getFullYear() ? 'var(--bg-expense)' : 'var(--bg-card)',
                        borderColor: y === viewDate.getFullYear() ? 'var(--primary-orange)' : 'var(--border-color)',
                        color: y === viewDate.getFullYear() ? 'var(--primary-orange)' : 'var(--text-main)',
                        fontWeight: y === viewDate.getFullYear() ? 700 : 500,
                        cursor: 'pointer'
                      }}>
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button className="fab" onClick={openModal}>
        <Plus size={28} />
      </button>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="subtitle" style={{ margin: 0 }}>Tambah Transaksi</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            
            {assets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--danger-red)' }}>
                Anda belum memiliki Rekening/Dompet! Silakan buka tab <strong>Aset</strong> dan tambahkan akun terlebih dahulu.
              </div>
            ) : (
              <form onSubmit={saveTransaction}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button type="button" onClick={() => setType('pengeluaran')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: type === 'pengeluaran' ? '2px solid var(--primary-orange)' : '1px solid #e5e7eb', background: type === 'pengeluaran' ? '#fff7ed' : 'white', fontWeight: 600, color: type === 'pengeluaran' ? 'var(--primary-orange)' : 'var(--text-muted)' }}>Pengeluaran</button>
                  <button type="button" onClick={() => setType('pendapatan')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: type === 'pendapatan' ? '2px solid var(--secondary-blue)' : '1px solid #e5e7eb', background: type === 'pendapatan' ? '#eff6ff' : 'white', fontWeight: 600, color: type === 'pendapatan' ? 'var(--secondary-blue)' : 'var(--text-muted)' }}>Pendapatan</button>
                  <button type="button" onClick={() => setType('transfer')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: type === 'transfer' ? '2px solid #6b7280' : '1px solid #e5e7eb', background: type === 'transfer' ? '#f3f4f6' : 'white', fontWeight: 600, color: type === 'transfer' ? '#374151' : 'var(--text-muted)' }}>Transfer</button>
                </div>
                
                <input type="text" inputMode="numeric" required placeholder="Nominal (Rp)" value={amount} onChange={handleAmountChange} />
                
                {type !== 'transfer' ? (
                  <>
                    <input type="text" required placeholder="Kategori (Makan, Transport, dll)" value={category} onChange={e => setCategory(e.target.value)} />
                    <select value={assetId} onChange={e => setAssetId(e.target.value)}>
                      <option value="" disabled>-- Pilih Dompet/Rekening --</option>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                     <select style={{ marginBottom: 0 }} value={fromAssetId} onChange={e => setFromAssetId(e.target.value)}>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <ArrowRightLeft color="var(--text-muted)" size={20} />
                     <select style={{ marginBottom: 0 }} value={toAssetId} onChange={e => setToAssetId(e.target.value)}>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )}
                
                <input type="date" required value={date} onChange={e => setDate(e.target.value)} />
                <input type="text" placeholder="Catatan opsional" value={note} onChange={e => setNote(e.target.value)} />
                
                <button type="submit" className="btn btn-orange" style={{
                  backgroundColor: type === 'pendapatan' ? 'var(--secondary-blue)' : type === 'transfer' ? '#374151' : 'var(--primary-orange)'
                }}>
                  Simpan Transaksi
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
