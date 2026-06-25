import { useAnimation, type PanInfo } from 'framer-motion';
import { useState } from 'react';
import { triggerHapticFeedback } from '../lib/utils';

interface UseSwipeGestureProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftThreshold?: number;  // default -80
  rightThreshold?: number; // default 80
}

export const useSwipeGesture = ({
  onSwipeLeft,
  onSwipeRight,
  leftThreshold = -80,
  rightThreshold = 80,
}: UseSwipeGestureProps = {}) => {
  const controls = useAnimation();
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handleDrag = (_event: any, info: PanInfo) => {
    setSwipeOffset(info.offset.x);
    // Trigger haptic feedback when crossing thresholds
    if (
      (info.offset.x <= leftThreshold && swipeOffset > leftThreshold) ||
      (info.offset.x >= rightThreshold && swipeOffset < rightThreshold)
    ) {
      triggerHapticFeedback('light');
    }
  };

  const handleDragEnd = async (_event: any, info: PanInfo) => {
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;

    if (offsetX <= leftThreshold || velocityX < -500) {
      // Swiped left
      triggerHapticFeedback('medium');
      if (onSwipeLeft) {
        await controls.start({ x: '-100%', opacity: 0, transition: { duration: 0.2 } });
        onSwipeLeft();
      } else {
        controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
      }
    } else if (offsetX >= rightThreshold || velocityX > 500) {
      // Swiped right
      triggerHapticFeedback('medium');
      if (onSwipeRight) {
        await controls.start({ x: '100%', opacity: 0, transition: { duration: 0.2 } });
        onSwipeRight();
      } else {
        controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
      }
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
    setSwipeOffset(0);
  };

  const reset = () => {
    controls.start({ x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    setSwipeOffset(0);
  };

  return {
    dragProps: {
      drag: 'x' as const,
      dragDirectionLock: true,
      dragConstraints: { left: onSwipeLeft ? -150 : 0, right: onSwipeRight ? 150 : 0 },
      dragElastic: 0.1,
      onDrag: handleDrag,
      onDragEnd: handleDragEnd,
      animate: controls,
    },
    swipeOffset,
    reset,
  };
};
