import React from 'react';
import MaterialIcon from '../common/MaterialIcon';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxWidth?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * Compact search input with icon, matching the Bento search pattern.
 * Automatically handles the !p-0 !mb-0 overrides for the inner input.
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Cari...',
  maxWidth = '220px',
  className = '',
  'data-testid': testId,
}) => {
  return (
    <div
      className={`flex items-center gap-2 bg-surface-container-low rounded-lg px-3 py-1.5 border border-outline-variant w-full ${className}`}
      style={{ maxWidth }}
    >
      <MaterialIcon name="search" className="text-on-surface-variant text-sm shrink-0" />
      <input
        className="bg-transparent border-none focus:ring-0 text-sm w-full font-body-md outline-none text-on-surface !p-0 !mb-0"
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        data-testid={testId}
      />
      {value && (
        <MaterialIcon
          name="close"
          className="text-on-surface-variant text-sm cursor-pointer shrink-0"
          onClick={() => onChange('')}
        />
      )}
    </div>
  );
};
