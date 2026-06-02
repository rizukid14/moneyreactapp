import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading = false, icon, fullWidth = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={`btn ${variant !== 'ghost' && variant !== 'outline' ? `btn-${variant}` : ''} ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: size === 'sm' ? '6px' : size === 'lg' ? '10px' : '8px',
          width: fullWidth ? '100%' : undefined,
          padding: size === 'sm' ? '8px 12px' : size === 'lg' ? '16px 24px' : '12px 20px',
          fontSize: size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px',
          borderRadius: size === 'sm' ? '10px' : size === 'lg' ? '18px' : '14px',
          border: variant === 'outline' ? '2px solid var(--border-color)' : 'none',
          background: variant === 'outline' || variant === 'ghost' ? 'transparent' : undefined,
          color: variant === 'outline' ? 'var(--text-main)' : variant === 'ghost' ? 'var(--text-muted)' : 'white',
          boxShadow: variant === 'ghost' || variant === 'outline' ? 'none' : undefined,
          ...props.style
        }}
        {...props}
      >
        {isLoading && <Loader2 className="spin" size={16} />}
        {!isLoading && icon && <span>{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
