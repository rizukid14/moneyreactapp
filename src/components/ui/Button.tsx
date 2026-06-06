import React from 'react';
import MaterialIcon from '../common/MaterialIcon';

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
    
    // Base layout classes
    let baseClass = 'flex items-center justify-center font-bold transition-all focus:outline-none';
    
    // Size classes
    if (size === 'sm') baseClass += ' px-3 py-2 text-xs rounded-lg gap-1.5';
    else if (size === 'lg') baseClass += ' px-6 py-4 text-base rounded-2xl gap-2.5';
    else baseClass += ' px-5 py-3 text-sm rounded-xl gap-2';

    // Width class
    if (fullWidth) baseClass += ' w-full';

    // Variant classes
    let variantClass = '';
    switch (variant) {
      case 'primary':
        variantClass = 'bg-primary text-white shadow-sm hover:opacity-90 active:scale-95';
        break;
      case 'secondary':
        variantClass = 'bg-secondary-container text-secondary shadow-sm hover:opacity-90 active:scale-95';
        break;
      case 'outline':
        variantClass = 'bg-transparent border-2 border-outline-variant text-on-surface hover:bg-surface-container active:scale-95';
        break;
      case 'ghost':
        variantClass = 'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-subtle active:scale-95';
        break;
      case 'danger':
        variantClass = 'bg-error text-white shadow-sm hover:opacity-90 active:scale-95';
        break;
      case 'success':
        variantClass = 'bg-primary-container text-primary-color shadow-sm hover:opacity-90 active:scale-95';
        break;
    }

    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={`${baseClass} ${variantClass} ${props.disabled ? 'opacity-50 cursor-not-allowed active:scale-100' : ''} ${className}`}
        {...props}
      >
        {isLoading && <MaterialIcon name="progress_activity" className="animate-spin" />}
        {!isLoading && icon && <span>{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
