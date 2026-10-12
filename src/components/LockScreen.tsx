import React, { useState, useEffect } from 'react';
import MaterialIcon from './common/MaterialIcon';
import { useMoney } from '../contexts/MoneyContext';
import { motion } from 'framer-motion';

const LOCKOUT_KEY = 'moneyapp_pin_lockout_until';
const ATTEMPTS_KEY = 'moneyapp_pin_failed_attempts';
const MAX_FREE_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

const LockScreen: React.FC = () => {
  const { unlockApp, user } = useMoney();
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  useEffect(() => {
    const checkCooldown = () => {
      try {
        const untilStr = localStorage.getItem(LOCKOUT_KEY);
        if (untilStr) {
          const until = parseInt(untilStr, 10);
          const diffSec = Math.ceil((until - Date.now()) / 1000);
          if (diffSec > 0) {
            setCooldownRemaining(diffSec);
            return;
          } else {
            localStorage.removeItem(LOCKOUT_KEY);
            setCooldownRemaining(0);
          }
        }
      } catch {}
      setCooldownRemaining(0);
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNumberClick = (num: string) => {
    if (cooldownRemaining > 0) return;
    if (enteredPin.length < 6) {
      setEnteredPin(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    if (cooldownRemaining > 0) return;
    setEnteredPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (enteredPin.length >= 6 && cooldownRemaining === 0) {
      const timer = setTimeout(async () => {
        const success = await unlockApp(enteredPin);
        if (success) {
          try {
            localStorage.removeItem(LOCKOUT_KEY);
            localStorage.removeItem(ATTEMPTS_KEY);
          } catch {}
        } else {
          setError(true);
          setEnteredPin('');
          try {
            const currentAttempts = (parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10) || 0) + 1;
            localStorage.setItem(ATTEMPTS_KEY, String(currentAttempts));
            if (currentAttempts >= MAX_FREE_ATTEMPTS) {
              const until = Date.now() + COOLDOWN_SECONDS * 1000;
              localStorage.setItem(LOCKOUT_KEY, String(until));
              setCooldownRemaining(COOLDOWN_SECONDS);
              localStorage.setItem(ATTEMPTS_KEY, '0');
            }
          } catch {}
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [enteredPin, unlockApp, cooldownRemaining]);

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

      {cooldownRemaining > 0 ? (
        <p style={{ color: 'var(--danger-red)', marginBottom: '20px', fontWeight: 600 }}>
          Terlalu banyak percobaan. Coba lagi dalam {cooldownRemaining}s
        </p>
      ) : error ? (
        <p style={{ color: 'var(--danger-red)', marginBottom: '20px', fontWeight: 600 }}>PIN Salah!</p>
      ) : null}

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
