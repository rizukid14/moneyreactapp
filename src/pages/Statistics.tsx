import React, { useMemo, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import DatePickerModal from '../components/modals/DatePickerModal';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_NAMES_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];

const formatRupiah = (value: number) => `Rp${value.toLocaleString('id-ID')}`;

const Statistics: React.FC = () => {
  const { transactions } = useMoney();
  const [viewDate, setViewDate] = useState(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const { chartData, currentMonthIncome, currentMonthExpense, expenseCategoryData, incomeCategoryData, topCategories } = useMemo(() => {
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
    const expByCategory: Record<string, number> = {};
    const incByCategory: Record<string, number> = {};
    const currentMonthTxs: typeof transactions = [];

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const txM = txDate.getMonth();
      const txY = txDate.getFullYear();

      if (txM === vM && txY === vY) {
        currentMonthTxs.push(tx);
        if (tx.type === 'pendapatan') {
          thisMonthInc += tx.amount;
          incByCategory[tx.category] = (incByCategory[tx.category] || 0) + tx.amount;
        }
        if (tx.type === 'pengeluaran') {
          thisMonthExp += tx.amount;
          expByCategory[tx.category] = (expByCategory[tx.category] || 0) + tx.amount;
        }
      }

      const chartItem = last5Months.find(m => m.month === txM && m.year === txY);
      if (chartItem) {
        if (tx.type === 'pendapatan') chartItem.pendapatan += tx.amount;
        if (tx.type === 'pengeluaran') chartItem.pengeluaran += tx.amount;
      }
    });

    // Sort logic for pie chart slices
    const expenseData = Object.keys(expByCategory).map(key => ({ name: key, value: expByCategory[key] })).sort((a,b) => b.value - a.value);
    const incomeData = Object.keys(incByCategory).map(key => ({ name: key, value: incByCategory[key] })).sort((a,b) => b.value - a.value);
    
    // Total by categories
    const allCategories = [
      ...expenseData.map(d => ({ id: `exp-${d.name}`, category: d.name, amount: d.value, type: 'pengeluaran' as const })),
      ...incomeData.map(d => ({ id: `inc-${d.name}`, category: d.name, amount: d.value, type: 'pendapatan' as const }))
    ];
    const topCats = allCategories.sort((a, b) => b.amount - a.amount).slice(0, 5);

    return { 
      chartData: last5Months, 
      currentMonthIncome: thisMonthInc, 
      currentMonthExpense: thisMonthExp,
      expenseCategoryData: expenseData,
      incomeCategoryData: incomeData,
      topCategories: topCats
    };
  }, [transactions, viewDate]);

  const changeMonth = useCallback((offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }, []);

  const resetToToday = useCallback(() => setViewDate(new Date()), []);

  return (
    <div className="page">
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {expenseCategoryData.length > 0 && (
          <div className="card glass">
            <h2 className="subtitle" style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>Pengeluaran per Kategori</h2>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={expenseCategoryData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: number) => formatRupiah(val)}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {incomeCategoryData.length > 0 && (
          <div className="card glass">
            <h2 className="subtitle" style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>Pendapatan per Kategori</h2>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={incomeCategoryData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {incomeCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: number) => formatRupiah(val)}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {topCategories.length > 0 && (
        <div className="card glass" style={{ marginBottom: '80px' }}>
          <h2 className="subtitle" style={{ fontSize: '14px', marginBottom: '16px' }}>Total Terbesar per Kategori</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topCategories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: cat.type === 'pendapatan' ? '#10b98120' : '#ef444420',
                    color: cat.type === 'pendapatan' ? '#10b981' : '#ef4444'
                  }}>
                    {cat.type === 'pendapatan' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{cat.category}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cat.type === 'pendapatan' ? 'Total Pendapatan' : 'Total Pengeluaran'}</div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: cat.type === 'pendapatan' ? 'var(--primary)' : 'var(--secondary)' }}>
                  {cat.type === 'pendapatan' ? '+' : '-'}{formatRupiah(cat.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
