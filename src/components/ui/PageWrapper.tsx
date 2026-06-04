import React from 'react';

export interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard page container with max-width, padding, and spacing.
 * Replaces the legacy `className="page"` pattern.
 */
export const PageWrapper: React.FC<PageWrapperProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-4 lg:px-6 space-y-6 max-w-container-max mx-auto pb-safe pt-6 ${className}`}>
      <div className="max-w-container-max mx-auto px-4 md:px-gutter space-y-8">
        {children}
      </div>
    </div>
  );
};
