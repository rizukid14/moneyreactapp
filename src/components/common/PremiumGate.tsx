import React, { type ReactNode } from 'react';
import { usePremium, FREE_QUOTA_LIMITS } from '../../contexts/PremiumContext';
import MaterialIcon from './MaterialIcon';

interface PremiumGateProps {
  feature?: keyof typeof FREE_QUOTA_LIMITS;
  mode?: 'soft' | 'hard';
  children: ReactNode;
  fallback?: ReactNode;
  showOverlay?: boolean;
  wrapperClassName?: string;
}

export const PremiumGate: React.FC<PremiumGateProps> = ({ feature, mode = 'soft', children, fallback, showOverlay = true, wrapperClassName = '' }) => {
  const { premium, checkQuota, setShowUpgradeModal } = usePremium();

  if (premium.isPremium) {
    return <>{children}</>;
  }

  if (feature && mode === 'soft') {
    const { allowed } = checkQuota(feature);
    if (allowed) {
      return <>{children}</>;
    }
  }

  // If hard lock or quota exhausted
  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showOverlay) {
    return null;
  }

  return (
    <div className={`relative rounded-3xl overflow-hidden border border-border-color bg-surface group w-full h-full min-h-[200px] ${wrapperClassName}`}>
      <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 to-yellow-600 flex items-center justify-center text-white mb-3 shadow-lg">
          <MaterialIcon name={feature ? 'bolt' : 'lock'} className="text-2xl" />
        </div>
        <h3 className="text-lg font-bold text-on-surface mb-1">
          {feature ? 'Kuota Habis' : 'Fitur Premium'}
        </h3>
        <p className="text-sm text-on-surface-variant mb-4">
          {feature 
            ? 'Anda telah mencapai batas penggunaan gratis bulan ini.' 
            : 'Upgrade ke Premium untuk membuka fitur eksklusif ini.'}
        </p>
        <button 
          onClick={() => setShowUpgradeModal(true)}
          className="bg-primary text-white font-bold py-2 px-6 rounded-xl shadow-md hover:-translate-y-0.5 transition-all"
        >
          Upgrade Sekarang
        </button>
      </div>
      <div className="opacity-30 pointer-events-none select-none blur-[2px] h-full">
        {children}
      </div>
    </div>
  );
};
