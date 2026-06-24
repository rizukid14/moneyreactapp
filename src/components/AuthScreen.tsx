import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { motion } from 'framer-motion';

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

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || 'Gagal masuk dengan Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background p-4 sm:p-6 lg:p-8">
      {/* Decorative background glow circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-primary-glow/10 blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-[400px] z-10"
      >
        <div className="backdrop-blur-xl bg-surface-container-lowest/80 border border-border-light shadow-[0_24px_64px_rgba(0,0,0,0.06)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.3)] rounded-3xl p-6 sm:p-8 flex flex-col gap-6">
          {/* Logo Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-on-primary shadow-lg shadow-primary-glow/40 hover:scale-105 transition-transform duration-300">
              <span className="material-symbols-outlined text-[28px] font-bold">savings</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight bg-gradient-to-r from-on-surface to-on-surface-variant bg-clip-text">MoneyApp</h1>
              <p className="text-xs text-on-surface-variant font-medium mt-1">Cerdas mengelola, bijak menginvestasikan</p>
            </div>
          </div>

          <div className="h-px bg-border-light/60 my-1" />

          <div className="space-y-1 text-center">
            <h2 className="text-lg font-bold text-on-surface">
              {isForgotPassword ? 'Reset Kata Sandi' : (isLogin ? 'Masuk ke Akun Anda' : 'Buat Akun Baru')}
            </h2>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed max-w-[280px] mx-auto">
              {isForgotPassword 
                ? 'Masukkan email Anda untuk menerima tautan reset kata sandi.' 
                : 'Data Anda akan otomatis tersinkronisasi ke cloud dengan aman.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block pl-1">Email</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined text-on-surface-variant text-lg absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">mail</span>
                <input
                  data-testid="auth-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            {!isForgotPassword && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Password</label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); }} 
                      className="border-none bg-transparent text-primary text-[10px] font-extrabold cursor-pointer hover:underline p-0"
                    >
                      Lupa Password?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-lg absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">lock</span>
                  <input
                    data-testid="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    className="absolute right-3 border-none bg-transparent text-on-surface-variant hover:text-on-surface cursor-pointer p-1 flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid="auth-error" 
                className="text-error text-xs font-semibold text-center p-3 bg-error-container/30 border border-error/20 rounded-xl"
              >
                {error}
              </motion.div>
            )}
            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid="auth-success" 
                className="text-primary text-xs font-semibold text-center p-3 bg-primary-glow/20 border border-primary/20 rounded-xl"
              >
                {successMsg}
              </motion.div>
            )}

            {/* Submit Button */}
            <button 
              data-testid={isForgotPassword ? "auth-reset-btn" : (isLogin ? "auth-signin-btn" : "auth-signup-btn")} 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 py-3 bg-primary hover:bg-primary-container text-white font-bold rounded-xl text-sm border-none shadow-md shadow-primary-glow/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">{isForgotPassword ? 'mail_outline' : (isLogin ? 'login' : 'person_add')}</span>
                  {isForgotPassword ? 'Kirim Link Reset' : (isLogin ? 'Masuk' : 'Daftar')}
                </>
              )}
            </button>

            {/* Google Sign-In Divider */}
            {!isForgotPassword && (
              <>
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-border-light/60" />
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">atau</span>
                  <div className="flex-1 h-px bg-border-light/60" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-sm flex items-center justify-center gap-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                  </svg>
                  {isLogin ? 'Masuk dengan Google' : 'Daftar dengan Google'}
                </button>
              </>
            )}
          </form>

          {/* Footer Toggle Mode */}
          <div className="text-center text-xs flex flex-col gap-2 mt-2">
            {isForgotPassword ? (
              <button 
                type="button" 
                onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMsg(''); }} 
                className="bg-transparent border-none text-on-surface-variant hover:text-primary font-bold cursor-pointer transition-colors"
              >
                Kembali ke Halaman Masuk
              </button>
            ) : (
              <div className="text-on-surface-variant font-medium">
                {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'} {' '}
                <button 
                  data-testid="auth-toggle-mode" 
                  onClick={toggleMode} 
                  className="bg-transparent border-none text-primary hover:text-primary-container font-extrabold cursor-pointer transition-colors"
                >
                  {isLogin ? 'Daftar Sekarang' : 'Masuk Disini'}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
