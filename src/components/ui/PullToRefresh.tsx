import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import MaterialIcon from '../common/MaterialIcon';
import { triggerHapticFeedback } from '../../lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const supportsTouch = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshState, setRefreshState] = useState<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle');
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 70; // Distance required to trigger refresh

  useEffect(() => {
    setIsTouchDevice(supportsTouch());
  }, []);

  useEffect(() => {
    if (!isTouchDevice) return;

    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest('[data-modal="true"]')) return;
      if (document.body.style.overflow === 'hidden') return;
      
      const appContainer = document.querySelector('.app-container');
      const scrollPos = appContainer ? appContainer.scrollTop : (window.scrollY || document.documentElement.scrollTop);
      if (scrollPos <= 0 && refreshState === 'idle') {
        startY.current = e.touches[0].clientY;
        setRefreshState('pulling');
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (refreshState !== 'pulling' && refreshState !== 'ready') return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      if (distance > 0) {
        if (e.cancelable) e.preventDefault();

        // Apply log-like resistance to pull
        const cappedDistance = Math.min(distance * 0.4, 120);
        setPullDistance(cappedDistance);

        if (cappedDistance >= PULL_THRESHOLD) {
          if (refreshState !== 'ready') {
            setRefreshState('ready');
            triggerHapticFeedback('light');
          }
        } else {
          setRefreshState('pulling');
        }
      }
    };

    const handleTouchEnd = async () => {
      if (refreshState === 'ready') {
        setRefreshState('refreshing');
        setPullDistance(PULL_THRESHOLD);
        triggerHapticFeedback('medium');
        try {
          await onRefresh();
        } catch (err) {
          console.error(err);
        } finally {
          setRefreshState('idle');
          setPullDistance(0);
        }
      } else {
        setRefreshState('idle');
        setPullDistance(0);
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [refreshState, onRefresh, isTouchDevice]);

  // Desktop: just render children without pull-to-refresh
  if (!isTouchDevice) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="relative w-full min-h-screen">
      {/* PTR Loading Indicator Banner */}
      <motion.div
        style={{ height: pullDistance }}
        className="absolute top-0 left-0 right-0 overflow-hidden flex items-center justify-center bg-transparent pointer-events-none z-40"
        animate={{ height: pullDistance }}
        transition={refreshState === 'idle' ? { type: 'spring', damping: 20, stiffness: 300 } : { duration: 0.1 }}
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container/90 border border-outline-variant shadow-bento text-primary text-xs font-bold backdrop-blur-md">
          {refreshState === 'refreshing' ? (
            <>
              <MaterialIcon name="sync" className="animate-spin text-sm" />
              <span>Memperbarui data...</span>
            </>
          ) : (
            <>
              <motion.div
                animate={{ rotate: refreshState === 'ready' ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <MaterialIcon name="arrow_downward" className="text-sm" />
              </motion.div>
              <span>{refreshState === 'ready' ? 'Lepaskan untuk memperbarui' : 'Tarik untuk memperbarui'}</span>
            </>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        animate={{ y: refreshState === 'refreshing' ? PULL_THRESHOLD - 20 : pullDistance * 0.5 }}
        transition={refreshState === 'idle' ? { type: 'spring', damping: 20, stiffness: 300 } : { duration: 0.1 }}
      >
        {children}
      </motion.div>
    </div>
  );
};