import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  leftAction?: React.ReactNode;
  className?: string;
}

/**
 * Standard page header with title, optional subtitle, and optional right-side action.
 * Replaces the legacy `className="title"` + subtitle patterns.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action, leftAction, className = '' }) => {
  return (
    <div className={`flex flex-row items-center justify-between gap-2 lg:gap-4 border-b border-border-light pb-4 lg:pb-5 ${className}`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {leftAction && (
          <div className="shrink-0">
            {leftAction}
          </div>
        )}
        <div className={`flex flex-col items-start text-left ${action ? 'pr-2' : ''}`}>
          <h2 className="text-xl lg:text-headline-md text-on-surface font-extrabold w-full leading-tight truncate">{title}</h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1 w-full leading-snug truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex items-center justify-end shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};
