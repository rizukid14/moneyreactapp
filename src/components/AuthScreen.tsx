import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { motion } from 'framer-motion';
import { PiggyBank } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (isForgotPassword) {
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg('Tautan reset password telah dikirim ke email Anda. Silakan cek kotak masuk atau folder spam.');
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsForgotPassword(false);
    setError('');
    setSuccessMsg('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '24px', backgroundColor: 'var(--bg-main)' }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', justifyContent: 'center' }}>
            <PiggyBank size={36} strokeWidth={2.5} color="var(--primary)" />
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>MoneyApp</h1>
        </div>
        
        <h2 style={{ fontSize: '18px', marginBottom: '8px', textAlign: 'center' }}>
          {isForgotPassword ? 'Reset Password' : (isLogin ? 'Masuk ke Akun Anda' : 'Buat Akun Baru')}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '24px' }}>
          {isForgotPassword 
            ? 'Masukkan email Anda untuk menerima tautan reset password.' 
            : 'Data kamu akan otomatis tersinkronisasi ke cloud.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ marginTop: '4px', padding: '12px', borderRadius: '12px' }} />
          </div>
          {!isForgotPassword && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Password</label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); }} 
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    Lupa Password?
                  </button>
                )}
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={{ marginTop: '4px', padding: '12px', borderRadius: '12px' }} />
            </div>
          )}
          
          {error && <div style={{ color: 'var(--danger)', fontSize: '13px', textAlign: 'center' }}>{error}</div>}
          {successMsg && <div style={{ color: 'var(--success)', fontSize: '13px', textAlign: 'center' }}>{successMsg}</div>}
          
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '14px', borderRadius: '12px', marginTop: '8px' }}>
            {loading ? 'Memproses...' : (isForgotPassword ? 'Kirim Link Reset' : (isLogin ? 'Masuk' : 'Daftar'))}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isForgotPassword ? (
            <button type="button" onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMsg(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>
              Kembali ke Halaman Masuk
            </button>
          ) : (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>{isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}</span>{' '}
              <button onClick={toggleMode} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>
                {isLogin ? 'Daftar' : 'Masuk'}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
