import React, { useMemo, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import DatePickerModal from '../components/modals/DatePickerModal';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_NAMES_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const formatRupiah = (value: number) => `Rp${value.toLocaleString('id-ID')}`;

const Statistics: React.FC = () => {
  const { transactions } = useMoney();
  const [viewDate, setViewDate] = useState(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const { chartData, currentMonthIncome, currentMonthExpense } = useMemo(() => {
    const vM = viewDate.getMonth();
    const vY = viewDate.getFullYear();

    const last5Months: { name: string, month: number, year: number, pengeluaran: number, pendapatan: number }[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(vY, vM - i, 1);
      last5Months.push({
        name: MONTH_NAMES[d.getMonth()],
        month: d.getMonth(),
        year: d.getFullYear(),
        pengeluaran: 0,
        pendapatan: 0
      });
    }

    let thisMonthInc = 0;
    let thisMonthExp = 0;

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const txM = txDate.getMonth();
      const txY = txDate.getFullYear();

      if (txM === vM && txY === vY) {
        if (tx.type === 'pendapatan') thisMonthInc += tx.amount;
        if (tx.type === 'pengeluaran') thisMonthExp += tx.amount;
      }

      const chartItem = last5Months.find(m => m.month === txM && m.year === txY);
      if (chartItem) {
        if (tx.type === 'pendapatan') chartItem.pendapatan += tx.amount;
        if (tx.type === 'pengeluaran') chartItem.pengeluaran += tx.amount;
      }
    });

    return { 
      chartData: last5Months, 
      currentMonthIncome: thisMonthInc, 
      currentMonthExpense: thisMonthExp 
    };
  }, [transactions, viewDate]);

  const changeMonth = useCallback((offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }, []);

  const resetToToday = useCallback(() => setViewDate(new Date()), []);

  return (
    <div className="page" style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="title" style={{ margin: 0 }}>Statistik</h1>
        <button onClick={resetToToday} style={{ 
          display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', 
          borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-card)',
          fontSize: '12px', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer'
        }}>
          <CalendarDays size={14} /> Hari Ini
        </button>
      </div>

      {/* Month Switcher Header */}
      <div className="card" style={{ padding: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <ChevronLeft size={24} />
          </button>
          
          <div 
            onClick={() => setIsDatePickerOpen(true)}
            style={{ textAlign: 'center', cursor: 'pointer', padding: '4px 12px', borderRadius: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              {MONTH_NAMES_FULL[viewDate.getMonth()]} {viewDate.getFullYear()}
              <ChevronDown size={16} color="var(--text-muted)" />
            </div>
          </div>

          <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
      
      <div className="card glass">
        <h2 className="subtitle" style={{ fontSize: '14px', marginBottom: '16px' }}>Tren 5 Bulan Terakhir</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis hide domain={[0, 'dataMax + 10000']} />
              <Tooltip 
                cursor={{fill: 'var(--bg-main)'}} 
                contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}
                formatter={(val: any) => formatRupiah(Number(val))}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
              <Bar dataKey="pendapatan" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Pendapatan" />
              <Bar dataKey="pengeluaran" fill="var(--secondary)" radius={[4, 4, 0, 0]} name="Pengeluaran" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="card glass">
        <h2 className="subtitle" style={{ marginBottom: '16px' }}>Ringkasan {MONTH_NAMES_FULL[viewDate.getMonth()]}</h2>
        <div className="flex-between" style={{ marginBottom: '12px' }}>
          <span className="text-muted">Total Pendapatan</span>
          <span style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '18px' }}>{formatRupiah(currentMonthIncome)}</span>
        </div>
        <div className="flex-between">
          <span className="text-muted">Total Pengeluaran</span>
          <span style={{ color: 'var(--secondary)', fontWeight: '800', fontSize: '18px' }}>{formatRupiah(currentMonthExpense)}</span>
        </div>
      </div>

      <DatePickerModal 
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        viewDate={viewDate}
        onSelectDate={setViewDate}
      />
    </div>
  );
};

export default Statistics;
