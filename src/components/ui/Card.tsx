import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'solid' | 'glass' | 'default';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'solid', padding = 'md', interactive = false, children, ...props }, ref) => {
    
    const getPadding = () => {
      switch (padding) {
        case 'none': return '0';
        case 'sm': return '12px';
        case 'md': return '20px';
        case 'lg': return '24px';
        default: return '20px';
      }
    };

    return (
      <div
        ref={ref}
        className={`${variant === 'glass' ? 'glass' : ''} ${interactive ? 'hover-lift' : ''} ${className}`}
        style={{
          background: variant === 'glass' ? undefined : 'var(--bg-card)',
          borderRadius: '18px',
          padding: getPadding(),
          border: `1px solid ${variant === 'glass' ? 'var(--glass-border)' : 'var(--border-color)'}`,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          cursor: interactive || props.onClick ? 'pointer' : 'default',
          ...props.style
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
