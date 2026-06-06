import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'solid' | 'glass' | 'surface' | 'default';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  glowColor?: 'primary' | 'secondary' | 'error' | 'none';
}

export const BentoCard = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'solid', padding = 'md', interactive = false, glowColor = 'none', children, ...props }, ref) => {
    
    // Fallback default to solid
    const resolvedVariant = variant === 'default' ? 'solid' : variant;

    let bgClass = 'bg-bg-card shadow-bento';
    let borderClass = 'border border-transparent';
    if (resolvedVariant === 'glass') {
      bgClass = 'bg-surface-container/80 backdrop-blur-md shadow-sm';
      borderClass = 'border border-outline-variant';
    } else if (resolvedVariant === 'surface') {
      bgClass = 'bg-surface-container shadow-none';
      borderClass = 'border border-outline-variant';
    }

    let padClass = 'p-5';
    if (padding === 'none') padClass = 'p-0';
    else if (padding === 'sm') padClass = 'p-3';
    else if (padding === 'lg') padClass = 'p-6';

    const glowClassMap = {
      primary: 'bg-primary opacity-10',
      secondary: 'bg-secondary opacity-10',
      error: 'bg-error opacity-10',
      none: ''
    };

    return (
      <div
        ref={ref}
        className={`${bgClass} ${borderClass} ${padClass} rounded-3xl relative overflow-hidden group ${interactive || props.onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200' : ''} ${className}`}
        {...props}
      >
        {glowColor !== 'none' && (
          <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl ${glowClassMap[glowColor]} pointer-events-none transition-opacity group-hover:opacity-20`} />
        )}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }
);

BentoCard.displayName = 'BentoCard';
export const Card = BentoCard; // Alias for backward compatibility
