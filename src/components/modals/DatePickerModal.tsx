import React, { useState, useMemo } from 'react';
import { X, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewDate: Date;
  onSelectDate: (date: Date) => void;
  onToday?: () => void;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({ isOpen, onClose, viewDate, onSelectDate, onToday }) => {
  const [pickerMode, setPickerMode] = useState<'month' | 'year'>('month');

  const yearList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  }, []);

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
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="modal-overlay" 
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          <motion.div 
            className="modal-content" 
            onClick={e => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 600, mass: 0.5 }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-main)', padding: '4px', borderRadius: '20px' }}>
                <button
                  onClick={() => setPickerMode('month')}
                  style={{
                    padding: '6px 16px', borderRadius: '16px', border: 'none',
                    backgroundColor: pickerMode === 'month' ? 'var(--primary)' : 'transparent',
                    color: pickerMode === 'month' ? 'white' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
                  }}>Bulan</button>
                <button
                  onClick={() => setPickerMode('year')}
                  style={{
                    padding: '6px 16px', borderRadius: '16px', border: 'none',
                    backgroundColor: pickerMode === 'year' ? 'var(--primary)' : 'transparent',
                    color: pickerMode === 'year' ? 'white' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
                  }}>Tahun</button>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {onToday && (
                  <button
                    onClick={() => { onToday(); onClose(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 12px', borderRadius: '20px', border: 'none',
                      background: 'var(--primary-glow)', color: 'var(--primary)',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    <CalendarDays size={14} /> Hari Ini
                  </button>
                )}
                <button className="close-btn" onClick={onClose}><X size={20} /></button>
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              {pickerMode === 'month' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {MONTH_SHORT.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => selectMonth(i)}
                      style={{
                        padding: '18px 8px', borderRadius: '14px', border: '1px solid var(--border-color)',
                        backgroundColor: i === viewDate.getMonth() ? 'var(--bg-income)' : 'var(--bg-card)',
                        borderColor: i === viewDate.getMonth() ? 'var(--primary)' : 'var(--border-color)',
                        color: i === viewDate.getMonth() ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: i === viewDate.getMonth() ? 800 : 600,
                        cursor: 'pointer', transition: 'all 0.2s'
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
                        padding: '18px 8px', borderRadius: '14px', border: '1px solid var(--border-color)',
                        backgroundColor: y === viewDate.getFullYear() ? 'var(--bg-expense)' : 'var(--bg-card)',
                        borderColor: y === viewDate.getFullYear() ? 'var(--secondary)' : 'var(--border-color)',
                        color: y === viewDate.getFullYear() ? 'var(--secondary)' : 'var(--text-main)',
                        fontWeight: y === viewDate.getFullYear() ? 800 : 600,
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}>
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DatePickerModal;
