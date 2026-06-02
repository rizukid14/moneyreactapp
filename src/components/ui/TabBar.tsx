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
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onChange, className = '' }) => {
  return (
    <div 
      className={className}
      style={{ 
        display: 'flex', 
        background: 'var(--bg-card)', 
        padding: '4px', 
        borderRadius: '16px',
        border: '1px solid var(--border-color)'
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            data-testid={tab['data-testid']}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '12px',
              border: 'none',
              background: isActive ? 'var(--primary)' : 'transparent',
              color: isActive ? 'white' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '13px',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              cursor: 'pointer',
              boxShadow: isActive ? '0 4px 15px var(--primary-glow)' : 'none'
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
