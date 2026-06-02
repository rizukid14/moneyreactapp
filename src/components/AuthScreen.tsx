import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { motion } from 'framer-motion';
import { PiggyBank, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

export const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    setShowPassword(false);
    setError('');
    setSuccessMsg('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '24px', backgroundColor: 'var(--bg-main)' }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <Card padding="lg" variant="solid">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', justifyContent: 'center' }}>
              <PiggyBank size={36} strokeWidth={2.5} color="var(--primary)" />
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>MoneyApp</h1>
          </div>
          
          <h2 style={{ fontSize: '20px', marginBottom: '8px', textAlign: 'center', fontWeight: 700 }}>
            {isForgotPassword ? 'Reset Password' : (isLogin ? 'Masuk ke Akun Anda' : 'Buat Akun Baru')}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '28px', lineHeight: 1.5 }}>
            {isForgotPassword 
              ? 'Masukkan email Anda untuk menerima tautan reset password.' 
              : 'Data kamu akan otomatis tersinkronisasi ke cloud dengan aman.'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            
            <Input
              data-testid="auth-email"
              type="email"
              label="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              icon={<Mail size={18} />}
              placeholder="nama@email.com"
            />

            {!isForgotPassword && (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-24px', position: 'relative', zIndex: 10 }}>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); }} 
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      Lupa Password?
                    </button>
                  )}
                </div>
                
                <div style={{ position: 'relative' }}>
                  <Input
                    data-testid="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    label="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    icon={<Lock size={18} />}
                    placeholder="Minimal 6 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    style={{
                      position: 'absolute',
                      right: '16px',
                      top: '38px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}
            
            {error && <div data-testid="auth-error" style={{ color: 'var(--danger)', fontSize: '13px', textAlign: 'center', marginBottom: '16px', fontWeight: 600, padding: '8px', background: 'var(--bg-expense)', borderRadius: '8px' }}>{error}</div>}
            {successMsg && <div data-testid="auth-success" style={{ color: 'var(--success)', fontSize: '13px', textAlign: 'center', marginBottom: '16px', fontWeight: 600, padding: '8px', background: 'var(--bg-income)', borderRadius: '8px' }}>{successMsg}</div>}
            
            <Button 
              data-testid={isForgotPassword ? "auth-reset-btn" : (isLogin ? "auth-signin-btn" : "auth-signup-btn")} 
              type="submit" 
              variant="primary" 
              size="lg"
              fullWidth
              isLoading={loading}
              style={{ marginTop: '12px' }}
            >
              {isForgotPassword ? 'Kirim Link Reset' : (isLogin ? 'Masuk' : 'Daftar')}
            </Button>
          </form>
  
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {isForgotPassword ? (
              <button type="button" onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMsg(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>
                Kembali ke Halaman Masuk
              </button>
            ) : (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>{isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}</span>{' '}
                <button data-testid="auth-toggle-mode" onClick={toggleMode} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>
                  {isLogin ? 'Daftar Sekarang' : 'Masuk Disini'}
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
};
