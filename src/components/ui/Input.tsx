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
      <div style={{ width: fullWidth ? '100%' : 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column' }} className={className}>
        {label && (
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
            {label}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {icon && (
            <div style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', display: 'flex' }}>
              {icon}
            </div>
          )}
          <input
            ref={ref}
            {...props}
            style={{
              width: '100%',
              padding: '12px 16px',
              paddingLeft: icon ? '40px' : '16px',
              paddingRight: rightElement ? '40px' : '16px',
              background: 'var(--bg-card-solid)',
              border: `2px solid ${error ? 'var(--danger)' : 'var(--border-color)'}`,
              borderRadius: '14px',
              color: 'var(--text-main)',
              fontSize: '14px',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              margin: 0,
              ...props.style
            }}
          />
          {rightElement && (
            <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center' }}>
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <span style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '4px', fontWeight: 600 }}>
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
