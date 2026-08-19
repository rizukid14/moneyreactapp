import React, { useState, useEffect } from 'react';
import MaterialIcon from './common/MaterialIcon';
import { useInsightData } from '../hooks/useInsightData';

interface InsightStoryButtonProps {
  onClick: () => void;
}

export const InsightStoryButton: React.FC<InsightStoryButtonProps> = ({ onClick }) => {
  const { daysToEOM, startDateStr } = useInsightData();
  const [hasSeen, setHasSeen] = useState(false);

  useEffect(() => {
    try {
      const monthKey = `has_seen_insight_stories_${startDateStr}`;
      const seen = localStorage.getItem(monthKey);
      if (seen === 'true') {
        setHasSeen(true);
      }
    } catch { }
  }, [startDateStr]);

  // Show button only when daysToEOM <= 3
  if (daysToEOM > 3) {
    return null;
  }

  const handleClick = () => {
    try {
      const monthKey = `has_seen_insight_stories_${startDateStr}`;
      localStorage.setItem(monthKey, 'true');
      setHasSeen(true);
    } catch { }
    onClick();
  };

  return (
    <div className="fixed bottom-36 right-5 z-40 flex flex-col items-center">
      <button
        onClick={handleClick}
        aria-label="Buka Insight Stories"
        className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-surface-container border-0 shadow-2xl transition-transform active:scale-95 cursor-pointer hover:scale-105"
        style={{
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Animated Gradient Ring (IG Story Style) */}
        <div
          className={`absolute -inset-[3px] rounded-full transition-all duration-500 ${
            hasSeen
              ? 'bg-outline-variant opacity-50'
              : 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 animate-pulse'
          }`}
          style={{
            padding: '3px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude'
          }}
        />

        {/* Inner Button Circle */}
        <div className="w-full h-full rounded-full bg-surface-container-high flex flex-col items-center justify-center p-1 relative z-10 overflow-hidden">
          <MaterialIcon name="auto_awesome" filled className={`text-xl ${hasSeen ? 'text-on-surface-variant' : 'text-primary'}`} />
          <span className="text-[9px] font-extrabold uppercase tracking-tighter text-on-surface leading-none mt-0.5">
            Insight
          </span>
        </div>

        {/* Unseen Badge */}
        {!hasSeen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] font-bold text-white items-center justify-center">
              EOM
            </span>
          </span>
        )}
      </button>
    </div>
  );
};

export default InsightStoryButton;
