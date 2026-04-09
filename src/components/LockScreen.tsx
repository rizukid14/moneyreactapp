import React, { useState, useEffect } from 'react';
import { Lock, Delete } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';

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
      // Small delay for UX so user sees the last bubble filled
      const timer = setTimeout(() => {
        const success = unlockApp(enteredPin);
        if (!success && enteredPin.length >= 6) {
           setError(true);
           setEnteredPin('');
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [enteredPin, unlockApp]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'white', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ 
          width: 80, height: 80, borderRadius: '40px', 
          backgroundColor: '#fff7ed', color: 'var(--primary-orange)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          margin: '0 auto 20px auto'
        }}>
          <Lock size={40} />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Aplikasi Terkunci</h2>
        <p style={{ color: 'var(--text-muted)' }}>Halo, {user.name}. Masukkan PIN Anda.</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '40px' }}>
        {[1, 2, 3, 4, 5, 6].map((_, i) => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: '8px',
            backgroundColor: i < enteredPin.length ? 'var(--primary-orange)' : '#e5e7eb',
            border: error ? '2px solid var(--danger-red)' : 'none',
            transition: 'background-color 0.2s'
          }} />
        ))}
      </div>

      {error && <p style={{ color: 'var(--danger-red)', marginBottom: '20px', fontWeight: 600 }}>PIN Salah!</p>}

      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px',
        width: '100%', maxWidth: '300px'
      }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <button key={num} onClick={() => handleNumberClick(num)} style={{
            width: '100%', aspectRatio: '1/1', borderRadius: '50%',
            border: '1px solid #e5e7eb', background: 'white',
            fontSize: '24px', fontWeight: 600, cursor: 'pointer'
          }}>
            {num}
          </button>
        ))}
        <div />
        <button onClick={() => handleNumberClick('0')} style={{
          width: '100%', aspectRatio: '1/1', borderRadius: '50%',
          border: '1px solid #e5e7eb', background: 'white',
          fontSize: '24px', fontWeight: 600, cursor: 'pointer'
        }}>
          0
        </button>
        <button onClick={handleDelete} style={{
          width: '100%', aspectRatio: '1/1', borderRadius: '50%',
          border: 'none', background: 'transparent',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          cursor: 'pointer', color: 'var(--text-muted)'
        }}>
          <Delete size={28} />
        </button>
      </div>
    </div>
  );
};

export default LockScreen;
