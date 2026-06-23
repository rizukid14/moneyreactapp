import React from 'react';
import { IconBlock, type IconBlockColor } from './IconBlock';
import { StatusBadge, type StatusBadgeType } from './StatusBadge';

export interface MetricCardDetail {
  label: string;
  value: string;
  dotColor?: string; // Tailwind bg class like 'bg-primary'
}

export interface MetricCardProps {
  label: string;
  value: string;
  icon: string;
  iconColor?: IconBlockColor;
  badge?: {
    type: StatusBadgeType;
    label: string;
  };
  details?: MetricCardDetail[];
  progressBar?: React.ReactNode;
  colSpan?: number;
  glowColor?: string; // 'primary' | 'secondary' | 'error'
  valueColor?: string; // Tailwind text color class
  /** When true, flips positive↔negative — use for expense-type metrics where "up" is bad */
  trendInverted?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/** Flip badge type for inverted-trend cards (e.g. expense increase = bad) */
function flipBadgeType(type: StatusBadgeType): StatusBadgeType {
  if (type === 'positive') return 'negative';
  if (type === 'negative') return 'positive';
  return type;
}

/**
 * Composite metric card combining BentoCard + IconBlock + StatusBadge.
 * Used for financial summary cards (Total Saldo, Pemasukan, Pengeluaran, etc.)
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  iconColor = 'primary',
  badge,
  details,
  progressBar,
  colSpan,
  glowColor,
  valueColor = 'text-on-surface',
  trendInverted = false,
  onClick,
  className = '',
  children,
}) => {
  const colSpanClass = colSpan ? `col-span-1 md:col-span-${colSpan}` : 'col-span-1';

  const resolvedBadge = badge && trendInverted
    ? { ...badge, type: flipBadgeType(badge.type) }
    : badge;

  return (
    <div
      className={`${colSpanClass} bg-bg-card p-5 rounded-3xl shadow-bento flex flex-col justify-between relative overflow-hidden group ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''} transition-all ${className}`}
      onClick={onClick}
    >
      {/* Optional glow blob */}
      {glowColor && (
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${glowColor} opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4`}></div>
      )}

      {/* Header: Label + Icon */}
      <div className="flex justify-between items-center relative z-10">
        <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
          {label}
        </span>
        <IconBlock icon={icon} color={iconColor} size="sm" />
      </div>

      {/* Body */}
      <div className="mt-2.5 relative z-10 space-y-3">
        {/* Value + Badge */}
        <div>
          <h2 className={`text-2xl font-bold ${valueColor} truncate`}>{value}</h2>
          {resolvedBadge && (
            <div className="mt-0.5">
              <StatusBadge type={resolvedBadge.type} label={resolvedBadge.label} />
            </div>
          )}
        </div>

        {/* Optional progress bar */}
        {progressBar}

        {/* Optional details list */}
        {details && details.length > 0 && (
          <div className="pt-2.5 border-t border-border-light flex flex-col gap-1 text-[11px] text-on-surface-variant">
            {details.map((detail, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="flex items-center gap-1 font-medium">
                  {detail.dotColor && (
                    <span className={`w-1.5 h-1.5 rounded-full ${detail.dotColor} shrink-0`}></span>
                  )}
                  <span>{detail.label}</span>
                </span>
                <span className="font-semibold text-on-surface">{detail.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Extra children slot */}
        {children}
      </div>
    </div>
  );
};