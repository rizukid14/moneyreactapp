import React from 'react';

export interface ProgressSegment {
  percent: number;
  color: string;  // Tailwind color class like 'primary', 'secondary', 'outline', 'error'
  label?: string;
}

export interface ProgressBarProps {
  segments: ProgressSegment[];
  height?: 'xs' | 'sm' | 'md';
  className?: string;
}

const HEIGHT_MAP: Record<string, string> = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
};

/**
 * Multi-segment progress bar with Bento styling.
 * Used for balance distribution, savings ratios, health scores, etc.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  segments, 
  height = 'md', 
  className = '' 
}) => {
  const heightClass = HEIGHT_MAP[height];
  const total = segments.reduce((sum, s) => sum + s.percent, 0);

  return (
    <div className={`w-full ${heightClass} bg-surface-container-highest rounded-full overflow-hidden flex gap-0.5 shadow-inner ${className}`}>
      {total === 0 ? (
        <div className="w-full bg-surface-container h-full"></div>
      ) : (
        segments.filter(s => s.percent > 0).map((segment, idx) => (
          <div
            key={idx}
            style={{ width: `${segment.percent}%` }}
            className={`bg-${segment.color} h-full transition-all duration-500 ${idx === 0 ? 'rounded-l' : ''} ${idx === segments.length - 1 ? 'rounded-r' : ''}`}
            title={segment.label ? `${segment.label}: ${segment.percent}%` : `${segment.percent}%`}
          />
        ))
      )}
    </div>
  );
};
