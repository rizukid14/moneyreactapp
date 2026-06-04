import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Standard page header with title, optional subtitle, and optional right-side action.
 * Replaces the legacy `className="title"` + subtitle patterns.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action, className = '' }) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-light pb-4 ${className}`}>
      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
        {subtitle && (
          <p className="text-sm text-on-surface-variant mt-1">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="self-start sm:self-auto">
          {action}
        </div>
      )}
    </div>
  );
};
