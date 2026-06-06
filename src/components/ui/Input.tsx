import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, icon, rightElement, fullWidth = true, ...props }, ref) => {
    
    return (
      <div className={`flex flex-col ${fullWidth ? 'w-full' : 'w-auto'} ${className}`}>
        {label && (
          <label className="text-xs font-bold text-on-surface-variant mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-on-surface-variant flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-surface-container-low border-2 rounded-xl text-sm text-on-surface transition-all focus:outline-none focus:ring-0 ${
              error 
                ? 'border-error focus:border-error bg-error-container/10' 
                : 'border-outline-variant focus:border-primary focus:shadow-sm'
            } ${icon ? 'pl-10' : 'pl-4'} ${rightElement ? 'pr-10' : 'pr-4'} py-3 !m-0`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center justify-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <span className="text-[11px] font-semibold text-error mt-1.5">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
