import React, { useState, useEffect } from 'react';
import MaterialIcon from './common/MaterialIcon';
import { useMoney } from '../contexts/MoneyContext';
import { motion } from 'framer-motion';

const LockScreen: React.FC = () => {
  const { unlockApp, user } = useMoney();
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState(false);

  const handleNumberClick = (num: string) => {
    if (enteredPin.length < 6) {
      setEnteredPin(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    setEnteredPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (enteredPin.length >= 6) {
      const timer = setTimeout(async () => {
        const success = await unlockApp(enteredPin);
        if (!success && enteredPin.length >= 6) {
           setError(true);
           setEnteredPin('');
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [enteredPin, unlockApp]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'var(--bg-main)', zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div className="text-center mb-10">
        <div className="w-20 h-20 rounded-[40px] bg-orange-50 text-primary-orange flex justify-center items-center mx-auto mb-5 shadow-sm">
          <MaterialIcon name="lock" className="text-[40px]" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-on-surface">Aplikasi Terkunci</h2>
        <p className="text-on-surface-variant">Halo, {user.name}. Masukkan PIN Anda.</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '40px' }}>
        {[1, 2, 3, 4, 5, 6].map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-lg transition-colors ${error ? 'border-2 border-danger-red' : ''}`} style={{
            backgroundColor: i < enteredPin.length ? 'var(--primary-orange)' : '#e5e7eb',
          }} />
        ))}
      </div>

      {error && <p style={{ color: 'var(--danger-red)', marginBottom: '20px', fontWeight: 600 }}>PIN Salah!</p>}

      <div className="grid grid-cols-3 gap-5 w-full max-w-[300px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <button key={num} onClick={() => handleNumberClick(num)} className="w-full aspect-square rounded-full border border-gray-200 bg-bg-card shadow-sm text-2xl font-semibold cursor-pointer hover:bg-surface-container transition-colors text-on-surface">
            {num}
          </button>
        ))}
        <div />
        <button onClick={() => handleNumberClick('0')} className="w-full aspect-square rounded-full border border-gray-200 bg-bg-card shadow-sm text-2xl font-semibold cursor-pointer hover:bg-surface-container transition-colors text-on-surface">
          0
        </button>
        <button onClick={handleDelete} className="w-full aspect-square rounded-full border-none bg-transparent flex justify-center items-center cursor-pointer text-on-surface-variant hover:bg-surface-container transition-colors">
          <MaterialIcon name="backspace" className="text-[28px]" />
        </button>
      </div>
    </motion.div>
  );
};

export default LockScreen;
