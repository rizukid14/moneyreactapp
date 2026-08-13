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
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-light pb-4 lg:pb-5 ${className}`}>
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {leftAction && (
          <div className="shrink-0 mt-0.5">
            {leftAction}
          </div>
        )}
        <div className="flex flex-col items-start text-left min-w-0 flex-1">
          <h2 className="text-xl lg:text-headline-md text-on-surface font-extrabold leading-tight truncate w-full">{title}</h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1 leading-snug break-words max-w-full">{subtitle}</p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex items-center justify-start sm:justify-end shrink-0 self-start sm:self-center">
          {action}
        </div>
      )}
    </div>
  );
};
