import React, { useState } from 'react';
import { useFamily } from '../contexts/FamilyContext';
import { usePremium } from '../contexts/PremiumContext';
import MaterialIcon from './common/MaterialIcon';
import { useNavigate } from 'react-router-dom';

const WorkspaceSwitcher: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const { activeWorkspaceId, families, currentFamily, switchWorkspace } = useFamily();
  const { premium, setShowUpgradeModal } = usePremium();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleSwitch = (id: string | null) => {
    switchWorkspace(id);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!premium.isPremium) {
      setShowUpgradeModal(true);
      return;
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative ${isMobile ? 'w-full' : 'px-4 py-2 border-b border-border-light'}`}>
      <button 
        onClick={handleToggle}
        className={`flex items-center justify-between w-full p-3 rounded-xl border border-border-light bg-surface hover:bg-surface-container transition-colors cursor-pointer ${isMobile ? '' : 'shadow-sm'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeWorkspaceId ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary'}`}>
            <MaterialIcon name={activeWorkspaceId ? 'diversity_3' : 'person'} className="text-sm" />
          </div>
          <div className="flex flex-col items-start min-w-0 text-left">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Workspace</span>
            <span className="font-label-md text-label-md text-on-surface truncate max-w-[120px]">
              {activeWorkspaceId ? currentFamily?.name || 'Keluarga' : 'Personal'}
            </span>
          </div>
        </div>
        {!premium.isPremium ? (
          <MaterialIcon name="lock" className="text-warning text-sm" />
        ) : (
          <MaterialIcon name={isOpen ? "expand_less" : "expand_more"} className="text-on-surface-variant" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border-light rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            <button
              onClick={() => handleSwitch(null)}
              className={`w-full flex items-center gap-3 p-3 text-left transition-colors border-none cursor-pointer ${!activeWorkspaceId ? 'bg-primary-container text-on-primary-container' : 'hover:bg-surface-container text-on-surface bg-transparent'}`}
            >
              <MaterialIcon name="person" className="text-lg" />
              <span className="font-label-md text-sm">Personal</span>
              {!activeWorkspaceId && <MaterialIcon name="check" className="ml-auto text-sm" />}
            </button>
            
            {families.map(family => (
              <button
                key={family.id}
                onClick={() => handleSwitch(family.id)}
                className={`w-full flex items-center gap-3 p-3 text-left transition-colors border-none cursor-pointer ${activeWorkspaceId === family.id ? 'bg-primary-container text-on-primary-container' : 'hover:bg-surface-container text-on-surface bg-transparent'}`}
              >
                <MaterialIcon name="diversity_3" className="text-lg" />
                <span className="font-label-md text-sm truncate">{family.name}</span>
                {activeWorkspaceId === family.id && <MaterialIcon name="check" className="ml-auto text-sm" />}
              </button>
            ))}
          </div>

          <div className="border-t border-border-light p-2 bg-surface-container-lowest">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/settings?tab=family');
              }}
              className="w-full flex items-center justify-center gap-2 p-2 text-primary font-bold text-sm hover:bg-surface-container rounded-lg transition-colors border-none bg-transparent cursor-pointer"
            >
              <MaterialIcon name="settings" className="text-sm" />
              Kelola Keluarga
            </button>
          </div>
        </div>
      )}
      
      {/* Backdrop for mobile or desktop to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
