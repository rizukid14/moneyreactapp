import React from 'react';

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton with pulse animation.
 * Respects prefers-reduced-motion by disabling animation.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`bg-surface-variant/40 rounded-md animate-pulse motion-reduce:animate-none ${className}`}
    aria-hidden="true"
  />
);

/**
 * Skeleton text line. Width can be overridden via className (e.g. w-3/4).
 */
export const SkeletonLine: React.FC<SkeletonProps & { width?: string }> = ({
  width = 'w-full',
  className = '',
}) => <Skeleton className={`h-4 rounded ${width} ${className}`} />;

/**
 * Skeleton for a full metric card (label + value + badge).
 */
export const SkeletonMetricCard: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`bg-bg-card p-5 rounded-3xl shadow-bento flex flex-col justify-between gap-4 ${className}`}
    aria-hidden="true"
  >
    {/* Header: label + icon */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-3 w-24 rounded" />
      <Skeleton className="h-8 w-8 rounded-xl" />
    </div>
    {/* Value */}
    <div className="space-y-2.5">
      <Skeleton className="h-7 w-40 rounded" />
      <Skeleton className="h-4 w-20 rounded-full" />
    </div>
  </div>
);

/**
 * Skeleton for a transaction list item.
 */
export const SkeletonListItem: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`flex items-center gap-3 px-4 py-3 ${className}`}
    aria-hidden="true"
  >
    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-4 w-32 rounded" />
      <Skeleton className="h-3 w-20 rounded" />
    </div>
    <Skeleton className="h-5 w-16 rounded" />
  </div>
);

/**
 * Skeleton for a stats/dashboard section with 2-3 metric cards.
 */
export const SkeletonDashboard: React.FC<{ cardCount?: number; className?: string }> = ({
  cardCount = 3,
  className = '',
}) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
    {Array.from({ length: cardCount }).map((_, i) => (
      <SkeletonMetricCard key={i} />
    ))}
  </div>
);
