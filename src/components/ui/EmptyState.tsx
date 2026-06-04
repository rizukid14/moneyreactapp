import React from 'react';
import MaterialIcon from '../common/MaterialIcon';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Empty state placeholder with icon, title, description, and optional CTA button.
 * Used when lists/pages have no data.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`p-12 text-center text-on-surface-variant ${className}`}>
      <MaterialIcon name={icon} className="text-4xl opacity-50 mb-3" />
      <p className="font-bold text-on-surface text-base mb-1">{title}</p>
      {description && (
        <p className="text-sm text-on-surface-variant mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
