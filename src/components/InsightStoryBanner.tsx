import React, { useState, useEffect } from 'react';
import MaterialIcon from './common/MaterialIcon';
import { useInsightData } from '../hooks/useInsightData';

interface InsightStoryBannerProps {
  onClick: () => void;
}

export const InsightStoryBanner: React.FC<InsightStoryBannerProps> = ({ onClick }) => {
  const { daysToEOM, startDateStr, monthYearLabel } = useInsightData();
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

  // Render only if daysToEOM <= 3
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
    <div className="w-full mb-4">
      <div 
        onClick={handleClick}
        className="group relative overflow-hidden rounded-3xl p-4 bg-surface-container border border-outline-variant hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md flex items-center justify-between gap-3"
      >
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/20 transition-all" />

        <div className="flex items-center gap-3.5 relative z-10 min-w-0">
          {/* IG Story Ring Avatar */}
          <div className="relative shrink-0 flex items-center justify-center w-12 h-12">
            <div
              className={`absolute -inset-[2px] rounded-full transition-all duration-500 ${
                hasSeen
                  ? 'bg-outline-variant opacity-40'
                  : 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 animate-pulse'
              }`}
              style={{
                padding: '2px',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude'
              }}
            />
            <div className="w-full h-full rounded-full bg-surface-container-high flex items-center justify-center">
              <MaterialIcon name="auto_awesome" filled className={`text-lg ${hasSeen ? 'text-on-surface-variant' : 'text-primary'}`} />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-on-surface truncate">
                Insight AI Akhir Bulan
              </h4>
              {!hasSeen && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-500 text-white tracking-wider shrink-0">
                  Baru
                </span>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant truncate mt-0.5 font-medium">
              Evaluasi keuangan {monthYearLabel} · {daysToEOM === 0 ? 'Hari ini EOM' : `${daysToEOM} hari lagi`}
            </p>
          </div>
        </div>

        {/* Action Button Pill */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="relative z-10 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold shrink-0 flex items-center gap-1 shadow-sm group-hover:scale-105 active:scale-95 transition-all cursor-pointer border-none"
        >
          <span>Lihat Story</span>
          <MaterialIcon name="chevron_right" className="text-sm" />
        </button>
      </div>
    </div>
  );
};

export default InsightStoryBanner;
