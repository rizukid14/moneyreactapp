import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpinWheel from '../ui/SpinWheel';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  earnedPoints: number;
  currentStreak: number;
  basePoints: number;
  multiplier: number;
  milestoneBonus: number;
  isWeekend: boolean;
}

export default function StreakRewardModal({ 
  isOpen, 
  onClose, 
  earnedPoints, 
  currentStreak,
  basePoints,
  multiplier,
  milestoneBonus,
  isWeekend
}: Props) {
  const [isSpinning, setIsSpinning] = useState(true);

  // Reset spin state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSpinning(true);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-surface p-6 rounded-3xl max-w-sm w-full text-center relative shadow-2xl overflow-hidden min-h-[420px] flex flex-col justify-center"
          >
            {isSpinning ? (
              <motion.div 
                key="spinning"
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center"
              >
                <h2 className="text-xl font-black text-on-surface mb-2">Lucky Draw!</h2>
                <p className="text-on-surface-variant text-sm mb-4">Mengundi multiplier poin hari ini...</p>
                <SpinWheel 
                  multiplier={multiplier} 
                  isWeekend={isWeekend} 
                  onComplete={() => {
                    // Small delay to let user see the result before switching screen
                    setTimeout(() => setIsSpinning(false), 800);
                  }} 
                />
              </motion.div>
            ) : (
              <motion.div 
                key="reward"
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="flex flex-col w-full"
              >
                <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer border-none text-on-surface">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
            
            <motion.div 
              animate={{ y: [0, -10, 0] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-6xl mb-4"
            >
              🔥
            </motion.div>
            <h2 className="text-2xl font-black text-on-surface mb-2">Login Streak!</h2>
            <p className="text-on-surface-variant font-body-md mb-5">
              Luar biasa! Kamu sudah login <strong>{currentStreak} hari</strong> berturut-turut.
            </p>

            {/* Special Badges */}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {multiplier > 1 && (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  isWeekend 
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-sm' 
                    : 'bg-primary-container text-on-primary-container'
                }`}>
                  🎰 {isWeekend ? 'Weekend Lucky' : 'Lucky Draw'} {multiplier}x
                </span>
              )}
              {milestoneBonus > 0 && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-success-container text-on-success-container flex items-center gap-1">
                  🎯 Milestone +{milestoneBonus}
                </span>
              )}
            </div>
            
            <div className="bg-primary/10 rounded-2xl p-4 mb-6 border border-primary/20">
              <div className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">Total Reward Hari Ini</div>
              <div className="flex items-center justify-center gap-2 text-3xl font-black text-primary">
                <span className="material-symbols-outlined text-4xl">monetization_on</span>
                +{earnedPoints} Poin
              </div>
              
              {/* Detailed Breakdown */}
              {(multiplier > 1 || milestoneBonus > 0) && (
                <p className="text-[9px] text-primary/80 mt-2 font-semibold">
                  Detail: ({basePoints} Poin x {multiplier}x Lucky)
                  {milestoneBonus > 0 && ` + ${milestoneBonus} Poin Milestone`}
                </p>
              )}
              
              <p className="text-[9px] text-on-surface-variant/80 mt-3 font-medium border-t border-primary/10 pt-2">
                Poin dapat ditukarkan dengan AI Premium, Token Scan, & fitur menarik lainnya di Pengaturan!
              </p>
            </div>
            
            <button onClick={onClose} className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary/90 transition-colors cursor-pointer border-none mt-auto">
              Klaim Reward
            </button>
            </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
