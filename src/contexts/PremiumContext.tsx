import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { dbGetSetting, dbPutSetting, localDbPutSetting } from '../lib/db';
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
  updatePremiumDataFromServer: (feature: keyof typeof FREE_QUOTA_LIMITS, newValue: number, newIsPremium?: boolean) => Promise<void>;
  refreshPremiumStatus: () => Promise<{ wasClaimed: boolean, statusChanged: boolean }>;
  activationCode: string | null;
  regenerateCode: () => Promise<string>;
  redeemReward: (type: 'premium_1d' | 'premium_3d' | 'premium_7d' | 'premium_30d' | 'scan_3' | 'chat_5' | 'bulk_1', pointCost: number) => Promise<{ success: boolean; error?: string }>;
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
  const { isReady, autoCloudSync, user, updateUser } = useMoney(); // Wait for MoneyProvider to be ready
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

  const refreshPremiumStatus = async (): Promise<{ wasClaimed: boolean, statusChanged: boolean }> => {
    let wasClaimed = false;
    let statusChanged = false;
    
    try {
      if (isFirebaseConfigured) {
        const { auth, db: firestore } = await import('../lib/firebase');
        if (auth.currentUser) {
          const { doc, getDoc } = await import('firebase/firestore');
          const uid = auth.currentUser.uid;
          
          // Check if activation code still exists on cloud
          const codeRef = doc(firestore, 'users', uid, 'settings', 'premiumActivationCode');
          const codeSnap = await getDoc(codeRef);
          if (!codeSnap.exists()) {
            // Consumed by Lynk.id webhook! Clear local ghost code.
            const localCode = await dbGetSetting('premiumActivationCode');
            if (localCode) {
              await dbPutSetting('premiumActivationCode', '');
              setActivationCode(null);
              wasClaimed = true;
            }
          }

          // Check latest premium status on cloud
          const premiumRef = doc(firestore, 'users', uid, 'settings', 'premium');
          const premiumSnap = await getDoc(premiumRef);
          if (premiumSnap.exists()) {
            const freshPremium = premiumSnap.data().value as PremiumState;
            // Compare with existing to know if it changed
            const existingPremium = await dbGetSetting('premium') as PremiumState | undefined;
            if (!existingPremium || existingPremium.expiresAt !== freshPremium.expiresAt || existingPremium.isPremium !== freshPremium.isPremium) {
              await dbPutSetting('premium', freshPremium);
              setPremium(freshPremium);
              statusChanged = true;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch live premium status from cloud:', e);
    }
    await loadPremiumData();
    await loadActivationCode();
    
    return { wasClaimed, statusChanged };
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

  const updatePremiumDataFromServer = async (feature: keyof typeof FREE_QUOTA_LIMITS, newValue: number, newIsPremium?: boolean) => {
    // 1. Update quota state
    const newQuota = {
      ...quota,
      [feature]: newValue,
    };
    setQuota(newQuota);
    
    try {
      // 2. Save quota to IndexedDB purely locally (NO SYNC to Firestore)
      await localDbPutSetting(getQuotaKey(), newQuota);
    } catch (e) {
      console.error('Failed to save quota locally:', e);
    }

    // 3. Update premium state if it was downgraded by server
    if (newIsPremium === false && premium.isPremium === true) {
      const updatedPremium = { ...premium, isPremium: false, plan: null as any };
      setPremium(updatedPremium);
      try {
        await localDbPutSetting('premium', updatedPremium);
      } catch (e) {
        console.error('Failed to save premium locally:', e);
      }
    }
  };

  const redeemReward = useCallback(async (
    type: 'premium_1d' | 'premium_3d' | 'premium_7d' | 'premium_30d' | 'scan_3' | 'chat_5' | 'bulk_1',
    pointCost: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User tidak ditemukan' };
    const currentPoints = user.rewardPoints || 0;
    if (currentPoints < pointCost) {
      return { success: false, error: 'Poin tidak cukup' };
    }

    // Deduct points
    const updatedUser = {
      ...user,
      rewardPoints: currentPoints - pointCost,
    };

    // Apply the reward
    if (type.startsWith('premium_')) {
      const days = parseInt(type.split('_')[1], 10);
      const now = new Date();
      let currentExpiry = premium.expiresAt ? new Date(premium.expiresAt) : null;
      
      // If already premium and not expired, extend from existing expiry date
      let newExpiryDate = new Date();
      if (premium.isPremium && currentExpiry && currentExpiry > now) {
        newExpiryDate = new Date(currentExpiry.getTime());
      }
      newExpiryDate.setDate(newExpiryDate.getDate() + days);

      const newPremiumState: PremiumState = {
        isPremium: true,
        plan: 'monthly', // compatibility with existing UI
        activatedAt: now.toISOString(),
        expiresAt: newExpiryDate.toISOString(),
      };

      setPremium(newPremiumState);
      await dbPutSetting('premium', newPremiumState);
    } else if (type.startsWith('scan_') || type.startsWith('chat_') || type.startsWith('bulk_')) {
      const parts = type.split('_');
      const limitKey = parts[0] as keyof QuotaState;
      const amount = parseInt(parts[1], 10);
      
      const newQuota = {
        ...quota,
        [limitKey]: Math.max(0, (quota[limitKey] || 0) - amount),
      };
      
      setQuota(newQuota);
      await localDbPutSetting(getQuotaKey(), newQuota);
    }

    updateUser(updatedUser);
    return { success: true };
  }, [user, updateUser, premium, quota]);

  return (
    <PremiumContext.Provider value={{
      premium,
      quota,
      showUpgradeModal,
      setShowUpgradeModal,
      checkQuota,
      updatePremiumDataFromServer,
      refreshPremiumStatus,
      activationCode,
      regenerateCode,
      redeemReward,
    }}>
      {children}
    </PremiumContext.Provider>
  );
};
