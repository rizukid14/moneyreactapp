import React, { useMemo, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import DatePickerModal from '../components/modals/DatePickerModal';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_NAMES_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];

const Statistics: React.FC = () => {
  const { transactions, currencySymbol, startOfMonthDay } = useMoney();
  const [viewDate, setViewDate] = useState(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [drillDownCategory, setDrillDownCategory] = useState<{name: string, type: 'pendapatan'|'pengeluaran'} | null>(null);

  const formatCurrency = useCallback((value: number) => `${currencySymbol}${value.toLocaleString('id-ID')}`, [currencySymbol]);

  const { chartData, currentMonthIncome, currentMonthExpense, expenseCategoryData, incomeCategoryData, topCategories } = useMemo(() => {
    const vM = viewDate.getMonth();
    const vY = viewDate.getFullYear();

    // ─── Phase 1: 5-Month Trend Data ───
    const last5Months: { name: string, month: number, year: number, pengeluaran: number, pendapatan: number, periodStart: Date, periodEnd: Date }[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(vY, vM - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const pS = new Date(y, m - (startOfMonthDay > 1 ? 1 : 0), startOfMonthDay);
      const pE = new Date(y, m + (startOfMonthDay > 1 ? 0 : 1), startOfMonthDay);

      last5Months.push({
        name: MONTH_NAMES[m],
        month: m,
        year: y,
        pengeluaran: 0,
        pendapatan: 0,
        periodStart: pS,
        periodEnd: pE
      });
    }

    const currentPeriod = last5Months[last5Months.length - 1];
    const { periodStart: vPeriodStart, periodEnd: vPeriodEnd } = currentPeriod;

    let thisMonthInc = 0;
    let thisMonthExp = 0;
    const expByCategory: Record<string, number> = {};
    const incByCategory: Record<string, number> = {};
    const expBySubCategory: Record<string, number> = {};
    const incBySubCategory: Record<string, number> = {};

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);

      // 1. Current Period Stats
      if (txDate >= vPeriodStart && txDate < vPeriodEnd) {
        const subKey = tx.subCategory || 'Lainnya';

        if (tx.type === 'pendapatan') {
          thisMonthInc += tx.amount;
          if (drillDownCategory?.type === 'pendapatan' && drillDownCategory?.name === tx.category) {
            incBySubCategory[subKey] = (incBySubCategory[subKey] || 0) + tx.amount;
          }
          incByCategory[tx.category] = (incByCategory[tx.category] || 0) + tx.amount;
        }
        if (tx.type === 'pengeluaran') {
          thisMonthExp += tx.amount;
          if (drillDownCategory?.type === 'pengeluaran' && drillDownCategory?.name === tx.category) {
            expBySubCategory[subKey] = (expBySubCategory[subKey] || 0) + tx.amount;
          }
          expByCategory[tx.category] = (expByCategory[tx.category] || 0) + tx.amount;
        }
      }

      // 2. Trend Data (Last 5 Periods)
      last5Months.forEach(m => {
        if (txDate >= m.periodStart && txDate < m.periodEnd) {
          if (tx.type === 'pendapatan') m.pendapatan += tx.amount;
          if (tx.type === 'pengeluaran') m.pengeluaran += tx.amount;
        }
      });
    });

    // Sort logic for pie chart slices
    const expenseData = drillDownCategory?.type === 'pengeluaran' 
      ? Object.keys(expBySubCategory).map(key => ({ name: key, value: expBySubCategory[key] })).sort((a,b) => b.value - a.value)
      : Object.keys(expByCategory).map(key => ({ name: key, value: expByCategory[key] })).sort((a,b) => b.value - a.value);
      
    const incomeData = drillDownCategory?.type === 'pendapatan'
      ? Object.keys(incBySubCategory).map(key => ({ name: key, value: incBySubCategory[key] })).sort((a,b) => b.value - a.value)
      : Object.keys(incByCategory).map(key => ({ name: key, value: incByCategory[key] })).sort((a,b) => b.value - a.value);
    
    // Prepare the list for the bottom section
    let allCategories: { id: string, category: string, amount: number, type: 'pengeluaran' | 'pendapatan' }[] = [];
    
    if (drillDownCategory) {
      // In drill-down mode, only show sub-categories for the selected category/type
      if (drillDownCategory.type === 'pengeluaran') {
        allCategories = Object.keys(expBySubCategory).map(key => ({
          id: `exp-sub-${key}`, category: key, amount: expBySubCategory[key], type: 'pengeluaran' as const
        }));
      } else {
        allCategories = Object.keys(incBySubCategory).map(key => ({
          id: `inc-sub-${key}`, category: key, amount: incBySubCategory[key], type: 'pendapatan' as const
        }));
      }
    } else {
      // In summary mode, show all top-level categories
      allCategories = [
        ...Object.keys(expByCategory).map(key => ({ id: `exp-${key}`, category: key, amount: expByCategory[key], type: 'pengeluaran' as const })),
        ...Object.keys(incByCategory).map(key => ({ id: `inc-${key}`, category: key, amount: incByCategory[key], type: 'pendapatan' as const }))
      ];
    }

    const topCats = allCategories.sort((a, b) => b.amount - a.amount).slice(0, 10);

    return { 
      chartData: last5Months, 
      currentMonthIncome: thisMonthInc, 
      currentMonthExpense: thisMonthExp,
      expenseCategoryData: expenseData,
      incomeCategoryData: incomeData,
      topCategories: topCats
    };
  }, [transactions, viewDate, drillDownCategory]);

  const changeMonth = useCallback((offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setDrillDownCategory(null);
  }, []);

  const resetToToday = useCallback(() => {
    setViewDate(new Date());
    setDrillDownCategory(null);
  }, []);

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="title" style={{ margin: 0 }}>Statistik</h1>
        <button onClick={resetToToday} style={{ 
          display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', 
          borderRadius: '24px', border: 'none', background: 'var(--primary-glow)',
          fontSize: '13px', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer',
          boxShadow: '0 2px 10px var(--primary-glow)'
        }}>
          <CalendarDays size={16} /> Hari Ini
        </button>
      </div>

      {/* Month Switcher Header */}
      <div className="card shadow-soft" style={{ padding: '4px', marginBottom: '24px', border: 'none', background: 'var(--bg-card-solid)', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => changeMonth(-1)} className="btn-icon">
            <ChevronLeft size={24} />
          </button>
          
          <div 
            onClick={() => setIsDatePickerOpen(true)}
            style={{ 
              textAlign: 'center', cursor: 'pointer', padding: '10px 20px', borderRadius: '14px',
              background: 'var(--bg-main)', flex: 1, margin: '0 8px'
            }}>
            <div style={{ fontWeight: 800, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: 'var(--text-main)' }}>
              {MONTH_NAMES_FULL[viewDate.getMonth()]} {viewDate.getFullYear()}
              <ChevronDown size={18} color="var(--primary)" />
            </div>
          </div>

          <button onClick={() => changeMonth(1)} className="btn-icon">
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
                formatter={(val: any) => formatCurrency(Number(val))}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
              <Bar dataKey="pendapatan" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Pendapatan" />
              <Bar dataKey="pengeluaran" fill="var(--secondary)" radius={[4, 4, 0, 0]} name="Pengeluaran" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
        <div className="card" style={{ 
          flex: 1, minWidth: 0, marginBottom: 0, background: 'var(--primary-gradient)', 
          color: 'white', border: 'none', padding: '16px',
          boxShadow: '0 10px 25px var(--primary-glow)' 
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>Pendapatan</div>
          <div style={{ fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCurrency(currentMonthIncome)}</div>
        </div>

        <div className="card" style={{ 
          flex: 1, minWidth: 0, marginBottom: 0, background: 'var(--secondary-gradient)', 
          color: 'white', border: 'none', padding: '16px',
          boxShadow: '0 10px 25px var(--secondary-glow)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>Pengeluaran</div>
          <div style={{ fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCurrency(currentMonthExpense)}</div>
        </div>
      </div>

      {drillDownCategory && (
        <div className="card glass" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setDrillDownCategory(null)} className="btn" style={{ padding: '4px 12px', background: 'var(--bg-main)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ChevronLeft size={16} /> Kembali
          </button>
          <span style={{ fontWeight: 600 }}>Rincian Sub-kategori: {drillDownCategory.name}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {expenseCategoryData.length > 0 && (!drillDownCategory || drillDownCategory.type === 'pengeluaran') && (
          <div className="card glass">
            <h2 className="subtitle" style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>Pengeluaran {drillDownCategory ? `(${drillDownCategory.name})` : 'per Kategori'}</h2>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={expenseCategoryData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    onClick={(data) => {
                      if (!drillDownCategory) setDrillDownCategory({ name: data.name ?? '', type: 'pengeluaran' });
                    }}
                    style={{ cursor: drillDownCategory ? 'default' : 'pointer' }}
                  >
                    {expenseCategoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => formatCurrency(Number(val))}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {incomeCategoryData.length > 0 && (!drillDownCategory || drillDownCategory.type === 'pendapatan') && (
          <div className="card glass">
            <h2 className="subtitle" style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>Pendapatan {drillDownCategory ? `(${drillDownCategory.name})` : 'per Kategori'}</h2>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={incomeCategoryData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    onClick={(data) => {
                      if (!drillDownCategory) setDrillDownCategory({ name: data.name ?? '', type: 'pendapatan' });
                    }}
                    style={{ cursor: drillDownCategory ? 'default' : 'pointer' }}
                  >
                    {incomeCategoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => formatCurrency(Number(val))}
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
          <h2 className="subtitle" style={{ fontSize: '14px', marginBottom: '16px' }}>
            {drillDownCategory ? `Rincian Sub-kategori: ${drillDownCategory.name}` : 'Total Terbesar per Kategori'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topCategories.map(cat => (
              <div 
                key={cat.id} 
                onClick={() => {
                  if (!drillDownCategory) setDrillDownCategory({ name: cat.category, type: cat.type });
                }}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '12px', background: 'var(--bg-main)', borderRadius: '12px',
                  cursor: drillDownCategory ? 'default' : 'pointer'
                }}
              >
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
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {drillDownCategory ? 'Sub-kategori' : (cat.type === 'pendapatan' ? 'Total Pendapatan' : 'Total Pengeluaran')}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: cat.type === 'pendapatan' ? 'var(--primary)' : 'var(--secondary)' }}>
                  {cat.type === 'pendapatan' ? '+' : '-'}{formatCurrency(cat.amount)}
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
