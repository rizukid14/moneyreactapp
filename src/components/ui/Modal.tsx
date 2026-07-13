import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  zIndex?: number;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, 'data-testid': dataTestId, testId, headerActions, maxWidth, zIndex }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };

    const toggleScrollLock = (lock: boolean) => {
      const elements = [
        document.body,
        document.querySelector('.app-container') as HTMLElement,
        document.querySelector('.main-content') as HTMLElement
      ];

      elements.forEach(el => {
        if (el) {
          el.style.overflow = lock ? 'hidden' : '';
          el.style.overscrollBehavior = lock ? 'none' : '';
        }
      });
    };

    if (isOpen) {
      const currentCount = parseInt(document.body.getAttribute('data-modal-count') || '0', 10);
      document.body.setAttribute('data-modal-count', String(currentCount + 1));
      toggleScrollLock(true);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      if (isOpen) {
        const currentCount = parseInt(document.body.getAttribute('data-modal-count') || '0', 10);
        const newCount = Math.max(0, currentCount - 1);
        document.body.setAttribute('data-modal-count', String(newCount));
        
        if (newCount === 0) {
          toggleScrollLock(false);
        }
      }
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center px-0 pb-0 pt-10 sm:p-6 lg:p-8 bg-black/45 backdrop-blur-sm transition-opacity duration-200"
      onClick={handleOverlayClick}
      style={{ touchAction: 'none', zIndex: zIndex !== undefined ? zIndex : 2000 }}
      data-testid={dataTestId || testId}
      data-modal="true"
    >
      <div
        className={`relative bg-bg-card rounded-t-[32px] rounded-b-none sm:rounded-3xl w-full shadow-bento overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[90vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 sm:duration-200 ${!maxWidth ? 'sm:max-w-lg' : ''}`}
        style={{ touchAction: 'auto', ...(maxWidth ? { maxWidth } : {}) }}
        ref={contentRef}
      >
        {/* Mobile Pull Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-12 h-1 rounded-full bg-outline-variant/60"></div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 sm:py-5 border-b border-border-light shrink-0">
          {title ? (
            typeof title === 'string' ? (
              <h2 className="m-0 text-lg font-bold text-on-surface tracking-tight">
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
        <div className="p-6 overflow-y-auto overscroll-contain flex flex-col gap-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
