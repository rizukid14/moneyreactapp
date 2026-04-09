import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_NAMES_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const Statistics: React.FC = () => {
  const { transactions } = useMoney();
  const [viewDate, setViewDate] = useState(new Date());

  const { chartData, currentMonthIncome, currentMonthExpense } = useMemo(() => {
    const vM = viewDate.getMonth();
    const vY = viewDate.getFullYear();

    // Prepare structure for last 5 months relative to viewDate
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

      // Check if viewing month
      if (txM === vM && txY === vY) {
        if (tx.type === 'pendapatan') thisMonthInc += tx.amount;
        if (tx.type === 'pengeluaran') thisMonthExp += tx.amount;
      }

      // Populate chart data
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

  const changeMonth = (offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const resetToToday = () => setViewDate(new Date());

  const formatRupiah = (value: number) => `Rp${value.toLocaleString('id-ID')}`;

  return (
    <div className="page" style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="title" style={{ margin: 0 }}>Statistik</h1>
        <button onClick={resetToToday} style={{ 
          display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', 
          borderRadius: '20px', border: '1px solid #e5e7eb', background: 'white',
          fontSize: '12px', fontWeight: 600, color: 'var(--secondary-blue)', cursor: 'pointer'
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
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '16px' }}>
              {MONTH_NAMES_FULL[viewDate.getMonth()]} {viewDate.getFullYear()}
            </div>
          </div>

          <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
      
      <div className="card">
        <h2 className="subtitle" style={{ fontSize: '14px' }}>Tren 5 Bulan Terakhir</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis hide domain={[0, 'dataMax + 10000']} />
              <Tooltip 
                cursor={{fill: 'var(--bg-color)'}} 
                formatter={(val: any) => formatRupiah(Number(val))}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }}/>
              <Bar dataKey="pendapatan" fill="var(--secondary-blue)" radius={[4, 4, 0, 0]} name="Pendapatan" />
              <Bar dataKey="pengeluaran" fill="var(--primary-orange)" radius={[4, 4, 0, 0]} name="Pengeluaran" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="card">
        <h2 className="subtitle">Ringkasan {MONTH_NAMES_FULL[viewDate.getMonth()]}</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Total Pendapatan</span>
          <span style={{ color: 'var(--secondary-blue)', fontWeight: 'bold' }}>{formatRupiah(currentMonthIncome)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Total Pengeluaran</span>
          <span style={{ color: 'var(--primary-orange)', fontWeight: 'bold' }}>{formatRupiah(currentMonthExpense)}</span>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
