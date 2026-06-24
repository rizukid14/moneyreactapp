import React from 'react';
import { usePremium, FREE_QUOTA_LIMITS } from '../../contexts/PremiumContext';
import MaterialIcon from './MaterialIcon';

export const PremiumBadge: React.FC<{ feature?: keyof typeof FREE_QUOTA_LIMITS }> = ({ feature }) => {
  const { premium, checkQuota } = usePremium();

  if (premium.isPremium) {
    return (
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
        <MaterialIcon name="stars" className="text-[12px]" />
        PRO
      </div>
    );
  }

  if (feature) {
    const { limit, used } = checkQuota(feature);
    const remaining = Math.max(0, limit - used);
    return (
      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm ${remaining > 0 ? 'bg-primary-container text-primary-color' : 'bg-error-container text-error'}`}>
        <MaterialIcon name="bolt" className="text-[12px]" />
        {remaining}/{limit}
      </div>
    );
  }

  return (
    <div className="bg-surface-variant text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
      <MaterialIcon name="lock" className="text-[12px]" />
      PRO
    </div>
  );
};
