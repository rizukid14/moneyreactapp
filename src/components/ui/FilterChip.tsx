import React from 'react';

export interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Filter chip / pill button for inline filters.
 * Active state uses primary color, inactive is transparent with hover.
 */
export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  isActive,
  onClick,
  icon,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border-none cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
        isActive
          ? 'bg-primary text-white font-bold'
          : 'bg-transparent text-on-surface-variant hover:bg-surface-container'
      } ${className}`}
    >
      {icon}
      {label}
    </button>
  );
};
