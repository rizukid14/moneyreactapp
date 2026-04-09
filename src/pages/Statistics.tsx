import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useMoney } from '../contexts/MoneyContext';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

const Statistics: React.FC = () => {
  const { transactions } = useMoney();

  const { chartData, currentMonthIncome, currentMonthExpense } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Prepare structure for last 5 months
    const last5Months: { name: string, month: number, year: number, pengeluaran: number, pendapatan: number }[] = [];
    for (let i = 4; i >= 0; i--) {
      // Create a date corresponding to (currentMonth - i) avoiding manual wrap logic
      const d = new Date(currentYear, currentMonth - i, 1);
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

      // Check if current month
      if (txM === currentMonth && txY === currentYear) {
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
  }, [transactions]);

  // Custom tooltips to show currency nicely
  const formatRupiah = (value: number) => `Rp${value.toLocaleString('id-ID')}`;

  return (
    <div className="page" style={{ paddingBottom: '80px' }}>
      <h1 className="title">Statistik</h1>
      
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
        <h2 className="subtitle">Ringkasan Bulan Ini ({MONTH_NAMES[new Date().getMonth()]})</h2>
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
