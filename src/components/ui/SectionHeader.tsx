import React from 'react';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Section header within a page. Used for sub-sections like "Input Cepat", "Daftar Rekening".
 * Replaces the legacy `className="subtitle"` pattern.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action, className = '' }) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface">{title}</h3>
        {subtitle && (
          <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
};
