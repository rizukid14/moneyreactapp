import React, { useState, useRef, useEffect } from 'react';
import MaterialIcon from './MaterialIcon';

export interface DropdownItem {
  icon?: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface DropdownMenuProps {
  items: DropdownItem[];
  icon?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ items, icon = 'more_vert' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative shrink-0" ref={menuRef} onClick={e => e.stopPropagation()}>
      <button 
        onClick={() => setIsOpen(p => !p)} 
        className="p-1 rounded-full text-on-surface-variant hover:bg-surface-subtle transition-colors flex items-center justify-center border-none bg-transparent cursor-pointer"
      >
        <MaterialIcon name={icon} className="text-base" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-8 bg-surface-container rounded-xl shadow-bento py-1 z-10 min-w-[160px] border border-outline-variant overflow-hidden">
          {items.map((item, idx) => (
            <button
              key={idx}
              className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-none bg-transparent cursor-pointer transition-colors ${
                item.danger 
                  ? 'text-error hover:bg-error/10' 
                  : 'text-on-surface hover:bg-surface-subtle'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                item.onClick();
              }}
            >
              {item.icon && <MaterialIcon name={item.icon} className="text-[14px]" />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
