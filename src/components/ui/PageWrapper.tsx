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
    <div className={`px-4 sm:px-6 lg:px-12 xl:px-16 space-y-6 max-w-container-max mx-auto pb-safe pt-6 ${className}`}>
      {children}
    </div>
  );
};
