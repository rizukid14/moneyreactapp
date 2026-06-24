import React from 'react';
import MaterialIcon from '../common/MaterialIcon';

export type StatusBadgeType = 'positive' | 'negative' | 'neutral' | 'success' | 'danger' | 'warning' | 'info';

export interface StatusBadgeProps {
  type: StatusBadgeType;
  label: string;
  icon?: string;
  className?: string;
}

const TYPE_CLASSES: Record<StatusBadgeType, string> = {
  positive: 'bg-primary-container/20 text-primary-color',
  negative: 'bg-error-container/20 text-error',
  neutral:  'bg-surface-container text-on-surface-variant',
  success:  'bg-primary-container/20 text-primary-color',
  danger:   'bg-error-container/20 text-error',
  warning:  'bg-surface-container text-on-surface-variant',
  info:     'bg-primary-container/20 text-primary',
};

const DEFAULT_ICONS: Partial<Record<StatusBadgeType, string>> = {
  positive: 'arrow_upward',
  negative: 'arrow_downward',
  success:  'check_circle',
  danger:   'error',
};

/**
 * Compact status badge for percentage changes, status labels, etc.
 * Used extensively in metric cards for "vs bulan lalu" comparison.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  type, 
  label, 
  icon,
  className = '' 
}) => {
  const resolvedIcon = icon ?? DEFAULT_ICONS[type];
  const typeClasses = TYPE_CLASSES[type];

  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${typeClasses} ${className}`}>
      {resolvedIcon && (
        <MaterialIcon name={resolvedIcon} className="text-[10px] font-bold" />
      )}
      {label}
    </span>
  );
};
