import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewDate: Date;
  onSelectDate: (date: Date) => void;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({ isOpen, onClose, viewDate, onSelectDate }) => {
  const [pickerMode, setPickerMode] = useState<'month' | 'year'>('month');

  const yearList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  }, []);

  if (!isOpen) return null;

  const selectMonth = (idx: number) => {
    const newDate = new Date(viewDate.getFullYear(), idx, 1);
    onSelectDate(newDate);
    onClose();
  };

  const selectYear = (year: number) => {
    const newDate = new Date(year, viewDate.getMonth(), 1);
    onSelectDate(newDate);
    setPickerMode('month');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
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
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
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
  );
};

export default DatePickerModal;
