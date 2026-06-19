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
    <div className={`flex flex-col lg:flex-row items-center lg:items-end justify-center lg:justify-between text-center lg:text-left gap-4 border-b border-border-light pb-5 ${className}`}>
      <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
        <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">{title}</h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex items-center justify-center self-center lg:self-auto">
          {action}
        </div>
      )}
    </div>
  );
};
