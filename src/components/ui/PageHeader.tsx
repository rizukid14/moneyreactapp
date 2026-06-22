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
    <div className={`flex flex-row items-center justify-between gap-2 lg:gap-4 border-b border-border-light pb-4 lg:pb-5 ${className}`}>
      <div className={`flex flex-col items-start text-left ${action ? 'w-[70%] lg:w-auto lg:flex-1 pr-2' : 'w-full'}`}>
        <h2 className="text-xl lg:text-headline-md text-on-surface font-extrabold w-full leading-tight">{title}</h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1 w-full leading-snug">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex items-center justify-end w-[30%] lg:w-auto shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};
