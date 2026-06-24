import React from 'react';
import MaterialIcon from '../common/MaterialIcon';

export type IconBlockColor = 'primary' | 'secondary' | 'income' | 'expense' | 'error' | 'success' | 'neutral';
export type IconBlockSize = 'xs' | 'sm' | 'md' | 'lg';

export interface IconBlockProps {
  icon: string;
  color?: IconBlockColor;
  size?: IconBlockSize;
  filled?: boolean;
  className?: string;
}

const SIZE_MAP: Record<IconBlockSize, { block: string; icon: string }> = {
  xs: { block: 'w-6 h-6 rounded-md', icon: 'text-xs' },
  sm: { block: 'w-8 h-8 rounded-lg', icon: 'text-base' },
  md: { block: 'w-10 h-10 rounded-xl', icon: 'text-lg' },
  lg: { block: 'w-12 h-12 rounded-2xl', icon: 'text-2xl' },
};

const COLOR_MAP: Record<IconBlockColor, { bg: string; text: string }> = {
  primary:   { bg: 'bg-primary-container', text: 'text-primary' },
  secondary: { bg: 'bg-secondary-container', text: 'text-secondary' },
  income:    { bg: 'bg-income', text: 'text-primary-color' },
  expense:   { bg: 'bg-expense', text: 'text-error' },
  error:     { bg: 'bg-error-container', text: 'text-error' },
  success:   { bg: 'bg-primary-container', text: 'text-primary-color' },
  neutral:   { bg: 'bg-surface-container', text: 'text-on-surface-variant' },
};

/**
 * Icon inside a pastel-colored squircle block.
 * Follows the design-MII-Naufal.md "Kotak Ikon Besar" pattern.
 */
export const IconBlock: React.FC<IconBlockProps> = ({ 
  icon, 
  color = 'primary', 
  size = 'sm', 
  filled,
  className = '' 
}) => {
  const sizeClasses = SIZE_MAP[size];
  const colorClasses = COLOR_MAP[color];

  return (
    <div className={`${sizeClasses.block} ${colorClasses.bg} flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm shrink-0 ${className}`}>
      <MaterialIcon 
        name={icon} 
        filled={filled}
        className={`${colorClasses.text} ${sizeClasses.icon}`} 
      />
    </div>
  );
};
