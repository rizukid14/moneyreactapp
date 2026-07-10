import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney } from '../../contexts/MoneyContext';
import { usePremium } from '../../contexts/PremiumContext';
import MaterialIcon from '../common/MaterialIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface RewardItem {
  id: 'scan_3' | 'chat_5' | 'bulk_1' | 'premium_1d' | 'premium_3d' | 'premium_7d' | 'premium_30d';
  title: string;
  cost: number;
  description: string;
  icon: string;
}

const REWARDS: RewardItem[] = [
  { id: 'scan_3', title: '3 Token Scan', cost: 50, description: 'Scan 3 struk belanja tambahan', icon: 'document_scanner' },
  { id: 'chat_5', title: '5 AI Chat', cost: 75, description: '5 sesi tanya AI asisten keuangan', icon: 'chat' },
  { id: 'bulk_1', title: '1 Bulk Input', cost: 100, description: '1 sesi input transaksi massal', icon: 'grid_on' },
  { id: 'premium_1d', title: '1 Hari Premium', cost: 150, description: 'Akses semua fitur PRO selama 1 hari', icon: 'stars' },
  { id: 'premium_3d', title: '3 Hari Premium', cost: 400, description: 'Akses semua fitur PRO selama 3 hari', icon: 'bolt' },
  { id: 'premium_7d', title: '1 Minggu Premium', cost: 700, description: 'Akses semua fitur PRO selama 7 hari', icon: 'workspace_premium' },
  { id: 'premium_30d', title: '1 Bulan Premium', cost: 2500, description: 'Akses semua fitur PRO selama 30 hari', icon: 'diamond' },
];

export default function RewardsStoreModal({ isOpen, onClose }: Props) {
  const { user } = useMoney();
  const { redeemReward } = usePremium();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRedeem = async (item: RewardItem) => {
    setLoadingId(item.id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await redeemReward(item.id, item.cost);
      if (res.success) {
        setSuccessMsg(`Berhasil menukar ${item.title}!`);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(res.error || 'Terjadi kesalahan');
      }
    } catch (e) {
      setErrorMsg('Gagal memproses penukaran');
    } finally {
      setLoadingId(null);
    }
  };

  const userPoints = user?.rewardPoints || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
          <motion.div 
            initial={{ y: '50%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '50%', opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="bg-surface max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-yellow-500 to-amber-600 text-white flex justify-between items-center relative">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <MaterialIcon name="storefront" className="text-2xl" />
                  Toko Penukaran Poin
                </h2>
                <p className="text-xs opacity-90 mt-0.5 font-medium">Tukarkan poin streak kamu dengan berbagai fitur</p>
              </div>
              <button onClick={onClose} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors border-none text-white cursor-pointer flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Point Balance */}
            <div className="bg-surface-container-low px-6 py-4 border-b border-border-light flex justify-between items-center">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Saldo Poin Kamu</span>
              <div className="flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
                <span className="material-symbols-outlined text-yellow-500 font-bold text-[20px]">monetization_on</span>
                <span className="font-black text-on-surface text-lg">{userPoints} Poin</span>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {errorMsg && (
                <div className="p-3.5 bg-error/10 text-error rounded-xl border border-error/20 text-xs font-bold text-center">
                  ⚠️ {errorMsg}
                </div>
              )}
              {successMsg && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-3.5 bg-success/10 text-success rounded-xl border border-success/20 text-xs font-bold text-center"
                >
                  🎉 {successMsg}
                </motion.div>
              )}

              {REWARDS.map((item) => {
                const canAfford = userPoints >= item.cost;
                const isLoading = loadingId === item.id;
                
                return (
                  <div 
                    key={item.id}
                    className={`flex items-center justify-between p-4 bg-surface-container rounded-2xl border transition-all ${
                      canAfford ? 'border-border-light' : 'border-border-light/40 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="w-11 h-11 bg-surface-container-high rounded-xl flex items-center justify-center text-primary shrink-0">
                        <MaterialIcon name={item.icon} className="text-2xl" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-on-surface">{item.title}</h4>
                        <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5 truncate">{item.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <div className="text-right">
                        <div className="text-xs font-black text-on-surface flex items-center justify-end gap-1">
                          <span className="material-symbols-outlined text-[14px] text-yellow-500 font-bold">monetization_on</span>
                          {item.cost}
                        </div>
                        <span className="text-[9px] text-on-surface-variant">Poin</span>
                      </div>
                      
                      <button
                        disabled={!canAfford || isLoading}
                        onClick={() => handleRedeem(item)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center ${
                          isLoading
                            ? 'bg-surface-container-high text-on-surface-variant'
                            : canAfford
                              ? 'bg-primary text-on-primary hover:bg-primary/90'
                              : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                        }`}
                      >
                        {isLoading ? '...' : 'Tukar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
