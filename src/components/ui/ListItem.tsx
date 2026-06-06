import React from 'react';

export interface ListItemProps {
  left?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  'data-testid'?: string;
}

/**
 * Floating list item with hover effect.
 * Follows the design-MII-Naufal.md "Daftar Item" pattern.
 * Each item is separated (floating) with a subtle border and hover color change.
 */
export const ListItem: React.FC<ListItemProps> = ({ 
  left, 
  title, 
  subtitle, 
  right, 
  onClick,
  className = '',
  'data-testid': testId,
}) => {
  return (
    <div 
      className={`flex justify-between items-center bg-surface-container-lowest p-2 rounded-xl border border-outline-variant hover:bg-surface-container transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      data-testid={testId}
    >
      <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
        {left && <div className="shrink-0">{left}</div>}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-on-surface truncate">{title}</div>
          {subtitle && (
            <div className="text-[11px] text-on-surface-variant mt-0.5 truncate">{subtitle}</div>
          )}
        </div>
      </div>
      {right && (
        <div className="ml-3 shrink-0 flex items-center">
          {right}
        </div>
      )}
    </div>
  );
};
