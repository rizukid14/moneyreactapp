import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { dbGetSetting, dbPutSetting } from '../lib/db';
import { useMoney } from './MoneyContext';
import { isFirebaseConfigured } from '../lib/firebase';

export interface PremiumState {
  isPremium: boolean;
  plan: 'monthly' | 'semi-annual' | 'yearly' | null;
  activatedAt: string | null;
  expiresAt: string | null;
}

/** Generate a short alphanumeric activation code */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export interface QuotaState {
  chat: number;
  scan: number;
  bulk: number;
}

export const FREE_QUOTA_LIMITS = {
  chat: 5,
  scan: 3,
  bulk: 2,
};

interface PremiumContextType {
  premium: PremiumState;
  quota: QuotaState;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  checkQuota: (feature: keyof typeof FREE_QUOTA_LIMITS) => { allowed: boolean; used: number; limit: number };
  incrementQuota: (feature: keyof typeof FREE_QUOTA_LIMITS) => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
  activationCode: string | null;
  regenerateCode: () => Promise<string>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
};

export const PremiumProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isReady, autoCloudSync } = useMoney(); // Wait for MoneyProvider to be ready
  const [premium, setPremium] = useState<PremiumState>({
    isPremium: false,
    plan: null,
    activatedAt: null,
    expiresAt: null,
  });
  
  const [quota, setQuota] = useState<QuotaState>({
    chat: 0,
    scan: 0,
    bulk: 0,
  });

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [activationCode, setActivationCode] = useState<string | null>(null);

  const getQuotaKey = () => {
    const d = new Date();
    return `quota_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const loadPremiumData = useCallback(async () => {
    if (!isFirebaseConfigured || !isReady) return;

    try {
      const savedPremium = await dbGetSetting('premium') as PremiumState | undefined;
      
      if (savedPremium) {
        // Check expiry client-side as well
        if (savedPremium.isPremium && savedPremium.expiresAt) {
          if (new Date(savedPremium.expiresAt) < new Date()) {
            savedPremium.isPremium = false;
            // Optionally update DB
            await dbPutSetting('premium', savedPremium);
          }
        }
        setPremium(savedPremium);
      }

      const quotaKey = getQuotaKey();
      const savedQuota = await dbGetSetting(quotaKey) as QuotaState | undefined;
      
      if (savedQuota) {
        setQuota({
          chat: savedQuota.chat || 0,
          scan: savedQuota.scan || 0,
          bulk: savedQuota.bulk || 0,
        });
      } else {
        // Initialize new month quota
        setQuota({ chat: 0, scan: 0, bulk: 0 });
      }
    } catch (e) {
      console.error('Failed to load premium data:', e);
    }
  }, [isReady]);

  // Load existing activation code (no longer generates automatically here)
  const loadActivationCode = useCallback(async () => {
    if (!isFirebaseConfigured || !isReady) return;
    try {
      const saved = await dbGetSetting('premiumActivationCode') as string | undefined;
      if (saved) {
        setActivationCode(saved);
      }
    } catch (e) {
      console.error('Failed to load activation code:', e);
    }
  }, [isReady]);

  const regenerateCode = async (): Promise<string> => {
    const code = generateCode();
    setActivationCode(code);
    try {
      await dbPutSetting('premiumActivationCode', code);
    } catch (e) {
      console.error('Failed to save activation code:', e);
    }
    return code;
  };

  // Load data when MoneyContext is ready or cloud sync completes
  useEffect(() => {
    if (isReady && autoCloudSync.status !== 'pulling') {
      loadPremiumData();
      loadActivationCode();
    }
  }, [isReady, autoCloudSync.status, loadPremiumData, loadActivationCode]);

  const refreshPremiumStatus = async () => {
    await loadPremiumData();
  };

  const checkQuota = (feature: keyof typeof FREE_QUOTA_LIMITS) => {
    const limit = FREE_QUOTA_LIMITS[feature];
    const used = quota[feature] || 0;
    
    if (premium.isPremium) {
      return { allowed: true, used, limit: Infinity };
    }
    
    return {
      allowed: used < limit,
      used,
      limit,
    };
  };

  const incrementQuota = async (feature: keyof typeof FREE_QUOTA_LIMITS) => {
    if (premium.isPremium) return; // Don't track quota for premium users
    
    const newQuota = {
      ...quota,
      [feature]: (quota[feature] || 0) + 1,
    };
    
    setQuota(newQuota);
    
    try {
      await dbPutSetting(getQuotaKey(), newQuota);
    } catch (e) {
      console.error('Failed to save quota:', e);
    }
  };

  return (
    <PremiumContext.Provider value={{
      premium,
      quota,
      showUpgradeModal,
      setShowUpgradeModal,
      checkQuota,
      incrementQuota,
      refreshPremiumStatus,
      activationCode,
      regenerateCode,
    }}>
      {children}
    </PremiumContext.Provider>
  );
};
