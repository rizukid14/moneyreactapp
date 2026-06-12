import React, { useEffect, useRef } from 'react';
import MaterialIcon from '../common/MaterialIcon';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  'data-testid'?: string;
  testId?: string;
  headerActions?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, 'data-testid': dataTestId, testId, headerActions, maxWidth }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-200" 
      onClick={handleOverlayClick}
      data-testid={dataTestId || testId}
    >
      <div 
        className={`bg-bg-card rounded-3xl w-full shadow-bento overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 ${!maxWidth ? 'max-w-lg' : ''}`}
        style={maxWidth ? { maxWidth } : undefined}
        ref={contentRef}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-light shrink-0">
          {title ? (
            typeof title === 'string' ? (
              <h2 className="m-0 text-xl font-extrabold text-on-surface tracking-tight">
                {title}
              </h2>
            ) : (
              title
            )
          ) : (
            <div></div> // Spacer if no title
          )}
          <div className="flex items-center gap-2">
            {headerActions}
            <button 
              className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors" 
              onClick={onClose}
              aria-label="Tutup"
              data-testid="modal-close-btn"
            >
              <MaterialIcon name="close" className="text-lg" />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto flex flex-col gap-4">
          {children}
        </div>
      </div>
    </div>
  );
};
