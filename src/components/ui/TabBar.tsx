import React from 'react';

export interface Tab {
  id: string;
  label: string;
  'data-testid'?: string;
}

export interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onChange: (id: string) => void;
  className?: string;
  activeStyle?: React.CSSProperties;
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onChange, className = '', activeStyle }) => {
  return (
    <div 
      className={`flex bg-surface-container rounded-lg p-1 overflow-x-auto hide-scrollbar border border-outline-variant ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            data-testid={tab['data-testid']}
            type="button"
            onClick={() => onChange(tab.id)}
            style={isActive && activeStyle ? activeStyle : undefined}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-none outline-none ${
              isActive && !activeStyle
                ? 'bg-primary text-white shadow-sm' 
                : isActive && activeStyle 
                ? 'shadow-sm'
                : 'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-subtle'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export const SegmentedControl = TabBar;
