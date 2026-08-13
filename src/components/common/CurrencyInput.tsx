import React, { useRef, useImperativeHandle, forwardRef } from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
  allowDecimals?: boolean;
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, allowDecimals = false, placeholder, style, className, required, autoFocus, disabled, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const strVal = value !== undefined && value !== null ? value.toString() : '';
    const isNegative = strVal.startsWith('-');
    const hasDigits = /\d/.test(strVal);
    
    let displayValue = '';
    if (strVal !== '' && hasDigits) {
      if (allowDecimals) {
        const parts = strVal.replace(/,/g, '.').split('.');
        const whole = (isNegative ? '-' : '') + parseInt((parts[0] || '0').replace(/\D/g, '') || '0').toLocaleString('id-ID');
        const decimal = parts.length > 1 ? ',' + parts[1].replace(/\D/g, '').slice(0, 2) : (strVal.includes(',') || strVal.includes('.') ? ',' : '');
        displayValue = whole + decimal;
      } else {
        displayValue = (isNegative ? '-' : '') + parseInt(strVal.replace(/\D/g, '') || '0').toLocaleString('id-ID');
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const el = e.target;
      let cursor = el.selectionStart || 0;
      const oldLength = el.value.length;

      const isNeg = el.value.startsWith('-');
      let raw = '';
      if (allowDecimals) {
        const clean = el.value.replace(/,/g, '.').replace(/[^\d.]/g, '');
        raw = (isNeg ? '-' : '') + clean;
      } else {
        raw = (isNeg ? '-' : '') + el.value.replace(/\D/g, '');
      }
      onChange(raw);

      setTimeout(() => {
        if (inputRef.current) {
          const newLength = inputRef.current.value.length;
          cursor = cursor + (newLength - oldLength);
          inputRef.current.setSelectionRange(cursor, cursor);
        }
      }, 0);
    };

    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        style={style}
        className={className}
        required={required}
        autoFocus={autoFocus}
        disabled={disabled}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export default CurrencyInput;
