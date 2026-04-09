import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: 'Jan', pengeluaran: 4000000, pendapatan: 6000000 },
  { name: 'Feb', pengeluaran: 3000000, pendapatan: 5500000 },
  { name: 'Mar', pengeluaran: 5000000, pendapatan: 5000000 },
  { name: 'Apr', pengeluaran: 2780000, pendapatan: 6200000 },
  { name: 'Mei', pengeluaran: 1890000, pendapatan: 6500000 },
];

const Statistics: React.FC = () => {
  return (
    <div className="page">
      <h1 className="title">Statistik</h1>
      
      <div className="card">
        <h2 className="subtitle" style={{ fontSize: '14px' }}>Tren 5 Bulan Terakhir</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{fill: 'var(--bg-color)'}} />
              <Legend wrapperStyle={{ fontSize: '12px' }}/>
              <Bar dataKey="pendapatan" fill="var(--secondary-blue)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pengeluaran" fill="var(--primary-orange)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="card">
        <h2 className="subtitle">Ringkasan Bulan Ini</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Total Pendapatan</span>
          <span style={{ color: 'var(--secondary-blue)', fontWeight: 'bold' }}>Rp6.500.000</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Total Pengeluaran</span>
          <span style={{ color: 'var(--primary-orange)', fontWeight: 'bold' }}>Rp1.890.000</span>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
