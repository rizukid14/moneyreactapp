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
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Auto-generate code when modal opens if one doesn't exist
  useEffect(() => {
    if (showUpgradeModal && !activationCode) {
      regenerateCode();
    }
  }, [showUpgradeModal, activationCode, regenerateCode]);

  // Always refresh premium status from cloud when modal opens
  useEffect(() => {
    if (showUpgradeModal) {
      refreshPremiumStatus().catch(e => console.error(e));
    }
  }, [showUpgradeModal]);

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
    const result = await refreshPremiumStatus();
    if (result.wasClaimed || result.statusChanged) {
      setIsUpgrading(false);
      // Optional: you could add a toast here
    }
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
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-yellow-400 to-yellow-600 z-0" />
        
        <div className="relative z-10 flex justify-between items-start pt-4 px-4 pb-4 text-white">
          <div className="flex items-center gap-2 mt-2">
            <MaterialIcon name="stars" className="text-3xl drop-shadow-sm" />
            <h2 className="text-xl font-extrabold tracking-tight drop-shadow-sm">Monetiq Premium</h2>
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
            <h3 className="font-bold text-on-surface mb-3">Perbandingan Fitur</h3>
            <div className="overflow-hidden rounded-xl border border-outline-variant">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="p-2.5 font-semibold text-on-surface-variant">Fitur</th>
                    <th className="p-2.5 font-semibold text-on-surface-variant text-center border-l border-outline-variant w-16">Free</th>
                    <th className="p-2.5 font-bold text-primary text-center border-l border-outline-variant bg-primary/10 w-20">PRO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  <tr>
                    <td className="p-2.5 text-on-surface flex items-center gap-2">
                      <MaterialIcon name="forum" className="text-[14px] text-on-surface-variant" /> AI Chatbot
                    </td>
                    <td className="p-2.5 text-center text-on-surface-variant border-l border-outline-variant font-medium">10x/bln</td>
                    <td className="p-2.5 text-center text-primary font-bold border-l border-outline-variant bg-primary/5">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-on-surface flex items-center gap-2">
                      <MaterialIcon name="document_scanner" className="text-[14px] text-on-surface-variant" /> Scan Struk
                    </td>
                    <td className="p-2.5 text-center text-on-surface-variant border-l border-outline-variant font-medium">3x/bln</td>
                    <td className="p-2.5 text-center text-primary font-bold border-l border-outline-variant bg-primary/5">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-on-surface flex items-center gap-2">
                      <MaterialIcon name="analytics" className="text-[14px] text-on-surface-variant" /> Heatmap & Analisis
                    </td>
                    <td className="p-2.5 text-center text-on-surface-variant border-l border-outline-variant">
                      <MaterialIcon name="close" className="text-error text-[14px] mx-auto" />
                    </td>
                    <td className="p-2.5 text-center text-primary font-bold border-l border-outline-variant bg-primary/5">
                      <MaterialIcon name="check" className="text-[16px] mx-auto" />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-on-surface flex items-center gap-2">
                      <MaterialIcon name="file_download" className="text-[14px] text-on-surface-variant" /> Export Data Json
                    </td>
                    <td className="p-2.5 text-center text-on-surface-variant border-l border-outline-variant">
                      <MaterialIcon name="close" className="text-error text-[14px] mx-auto" />
                    </td>
                    <td className="p-2.5 text-center text-primary font-bold border-l border-outline-variant bg-primary/5">
                      <MaterialIcon name="check" className="text-[16px] mx-auto" />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-on-surface flex items-center gap-2">
                      <MaterialIcon name="ads_click" className="text-[14px] text-on-surface-variant" /> Bebas Iklan
                    </td>
                    <td className="p-2.5 text-center text-on-surface-variant border-l border-outline-variant">
                      <MaterialIcon name="close" className="text-error text-[14px] mx-auto" />
                    </td>
                    <td className="p-2.5 text-center text-primary font-bold border-l border-outline-variant bg-primary/5">
                      <MaterialIcon name="check" className="text-[16px] mx-auto" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {!premium.isPremium || isUpgrading ? (
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
                  <button
                    onClick={() => regenerateCode()}
                    className="p-3 rounded-xl bg-surface-container-highest text-on-surface border border-outline-variant cursor-pointer hover:bg-surface-container transition-colors flex-shrink-0"
                    title="Buat kode baru"
                  >
                    <MaterialIcon name="refresh" />
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
                {premium.isPremium && isUpgrading && (
                  <button
                    onClick={() => setIsUpgrading(false)}
                    className="w-full py-3 bg-surface text-on-surface-variant border border-outline-variant rounded-xl font-bold text-sm hover:bg-surface-container transition-colors"
                  >
                    Batal Upgrade
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border border-yellow-500/30 p-6 rounded-2xl flex flex-col items-center text-center gap-3 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-yellow-500/10">
                <MaterialIcon name="stars" className="text-8xl" />
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 text-white rounded-full flex items-center justify-center mb-1 shadow-lg shadow-yellow-500/30 z-10">
                <MaterialIcon name="workspace_premium" className="text-4xl" />
              </div>
              <h3 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-amber-600 dark:from-yellow-400 dark:to-amber-400 text-2xl z-10">
                Premium Aktif!
              </h3>
              <p className="text-sm text-on-surface font-medium z-10">
                Terima kasih telah berlangganan. Semua fitur eksklusif Anda telah terbuka.
              </p>
              
              <div className="w-full bg-white/60 dark:bg-black/30 rounded-xl p-3 mt-2 z-10 flex flex-col gap-2 border border-yellow-500/20">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-medium">Paket Langganan</span>
                  <span className="font-bold text-on-surface uppercase">{premium.plan}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-medium">Masa Berlaku</span>
                  <span className="font-bold text-on-surface">
                    {premium.expiresAt ? new Date(premium.expiresAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                  </span>
                </div>
              </div>
              <div className="w-full mt-3 z-10 relative">
                <button
                  onClick={async () => {
                    setIsUpgrading(true);
                    setIsRefreshing(true);
                    const res = await refreshPremiumStatus();
                    if (res.wasClaimed || res.statusChanged) {
                       setIsUpgrading(false);
                    }
                    setIsRefreshing(false);
                  }}
                  className="w-full py-3 bg-white/50 hover:bg-white/70 dark:bg-black/30 dark:hover:bg-black/50 text-yellow-800 dark:text-yellow-200 border border-yellow-500/30 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <MaterialIcon name="upgrade" />
                  Perpanjang / Upgrade Paket
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
