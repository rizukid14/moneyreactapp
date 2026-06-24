import React, { useState, useEffect } from 'react';
import MaterialIcon from '../common/MaterialIcon';
import { auth } from '../../lib/firebase';
import { usePremium } from '../../contexts/PremiumContext';
import { motion } from 'framer-motion';

export const SubscriptionModal: React.FC = () => {
  const { premium, showUpgradeModal, setShowUpgradeModal, refreshPremiumStatus, activationCode, regenerateCode } = usePremium();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'semi-annual' | 'yearly'>('monthly');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-generate code when modal opens if one doesn't exist
  useEffect(() => {
    if (showUpgradeModal && !activationCode) {
      regenerateCode();
    }
  }, [showUpgradeModal, activationCode, regenerateCode]);

  if (!showUpgradeModal) return null;

  const userEmail = auth.currentUser?.email || '';

  const handleCopyCode = async () => {
    if (!activationCode) return;
    try {
      await navigator.clipboard.writeText(activationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = activationCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCheckout = () => {
    let baseUrl = '';
    if (selectedPlan === 'monthly') baseUrl = import.meta.env.VITE_LYNKID_URL_MONTHLY;
    if (selectedPlan === 'semi-annual') baseUrl = import.meta.env.VITE_LYNKID_URL_SEMI_ANNUAL;
    if (selectedPlan === 'yearly') baseUrl = import.meta.env.VITE_LYNKID_URL_YEARLY;

    if (!baseUrl) {
      alert("URL Lynk.id untuk paket ini belum dikonfigurasi.");
      return;
    }

    // Auto-copy activation code before opening checkout
    if (activationCode) {
      handleCopyCode();
    }

    window.open(baseUrl, '_blank');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPremiumStatus();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="modal-overlay z-[2000]" onClick={() => setShowUpgradeModal(false)}>
      <motion.div 
        className="modal-content relative overflow-hidden"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-yellow-400 to-yellow-600 -z-10" />
        
        <div className="flex justify-between items-start pt-2 px-4 pb-4 text-white">
          <div className="flex items-center gap-2 mt-2">
            <MaterialIcon name="stars" className="text-3xl" />
            <h2 className="text-xl font-extrabold tracking-tight">MoneyApp Premium</h2>
          </div>
          <button 
            onClick={() => setShowUpgradeModal(false)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm"
          >
            <MaterialIcon name="close" className="text-white" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div className="bg-surface rounded-2xl p-4 shadow-bento border border-border-color -mt-8 relative z-10">
            <h3 className="font-bold text-on-surface mb-3">Buka Semua Fitur Eksklusif</h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3">
                <MaterialIcon name="forum" className="text-primary mt-0.5" />
                <div>
                  <div className="font-semibold text-sm text-on-surface">AI Chatbot Tanpa Batas</div>
                  <div className="text-xs text-on-surface-variant">Tanya sepuasnya tentang keuanganmu</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MaterialIcon name="document_scanner" className="text-primary mt-0.5" />
                <div>
                  <div className="font-semibold text-sm text-on-surface">Smart Receipt Scanner</div>
                  <div className="text-xs text-on-surface-variant">Scan struk belanja tanpa batasan bulanan</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MaterialIcon name="analytics" className="text-primary mt-0.5" />
                <div>
                  <div className="font-semibold text-sm text-on-surface">Analitik Mendalam</div>
                  <div className="text-xs text-on-surface-variant">Akses heatmap dan laporan keuangan lanjutan</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MaterialIcon name="file_download" className="text-primary mt-0.5" />
                <div>
                  <div className="font-semibold text-sm text-on-surface">Export Data & Zero-Based Budgeting</div>
                  <div className="text-xs text-on-surface-variant">Fitur profesional untuk mengatur uangmu</div>
                </div>
              </li>
            </ul>
          </div>

          {!premium.isPremium ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                    selectedPlan === 'monthly' 
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' 
                      : 'border-border-color bg-surface'
                  }`}
                >
                  <div className="text-xs font-bold text-on-surface">1 Bulan</div>
                  <div className="text-sm font-extrabold text-primary">Rp 20K</div>
                </button>

                <button
                  onClick={() => setSelectedPlan('semi-annual')}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 relative ${
                    selectedPlan === 'semi-annual' 
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' 
                      : 'border-border-color bg-surface'
                  }`}
                >
                  <div className="absolute -top-3 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    HEMAT 17%
                  </div>
                  <div className="text-xs font-bold text-on-surface">6 Bulan</div>
                  <div className="text-sm font-extrabold text-primary">Rp 99K</div>
                </button>
                
                <button
                  onClick={() => setSelectedPlan('yearly')}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 relative ${
                    selectedPlan === 'yearly' 
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' 
                      : 'border-border-color bg-surface'
                  }`}
                >
                  <div className="absolute -top-3 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    HEMAT 17%
                  </div>
                  <div className="text-xs font-bold text-on-surface">1 Tahun</div>
                  <div className="text-sm font-extrabold text-primary">Rp 199K</div>
                </button>
              </div>

              {/* Activation Code Card */}
              <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="key" className="text-primary" />
                  <span className="font-bold text-sm text-on-surface">Kode Aktivasi</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Gunakan email <strong className="text-on-surface">{userEmail || '(belum login)'}</strong> saat checkout. 
                  Masukkan kode berikut di kolom <strong className="text-on-surface">OTP</strong> pada halaman Lynk.id:
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-bg-card border-2 border-dashed border-primary/40 rounded-xl px-4 py-3 text-center">
                    <span className="font-mono font-extrabold text-xl tracking-[0.3em] text-primary select-all">
                      {activationCode || '------'}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="p-3 rounded-xl bg-primary text-white border-none cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
                    title="Salin kode"
                  >
                    <MaterialIcon name={copied ? 'check' : 'content_copy'} />
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-primary font-bold text-center">✓ Kode disalin ke clipboard!</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCheckout}
                  className="w-full py-3.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-xl font-bold text-sm shadow-md hover:-translate-y-0.5 transition-transform flex items-center justify-center gap-2"
                >
                  <MaterialIcon name="payment" />
                  Bayar via Lynk.id
                </button>
                
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="w-full py-3 bg-surface text-primary border border-primary rounded-xl font-bold text-sm hover:bg-primary-container transition-colors flex items-center justify-center gap-2"
                >
                  <MaterialIcon name="refresh" className={isRefreshing ? 'animate-spin' : ''} />
                  Cek Status Premium
                </button>
              </div>
            </>
          ) : (
            <div className="bg-success-container border border-success p-4 rounded-2xl flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 bg-success text-white rounded-full flex items-center justify-center mb-1">
                <MaterialIcon name="check" className="text-2xl" />
              </div>
              <h3 className="font-bold text-success text-lg">Premium Aktif</h3>
              <p className="text-sm text-success font-medium">
                Paket: <span className="uppercase">{premium.plan}</span><br/>
                Berlaku hingga: {premium.expiresAt ? new Date(premium.expiresAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
