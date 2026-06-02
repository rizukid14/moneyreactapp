import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOnboarding } from '../contexts/OnboardingContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import './OnboardingTutorial.css';

export interface TutorialStep {
  targetSelector: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  onBeforeShow?: () => void;
}

interface OnboardingTutorialProps {
  pageKey: string;
  steps: TutorialStep[];
}

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ pageKey, steps }) => {
  const { shouldShowTutorial, markPageCompleted, setTutorialActive } = useOnboarding();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 300, height: 180 });
  const scrollIntervalRef = useRef<any>(null);
  const lastExecutedIndexRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (isVisible && tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTooltipSize(prev => {
          if (Math.abs(prev.width - rect.width) > 1 || Math.abs(prev.height - rect.height) > 1) {
            return { width: rect.width, height: rect.height };
          }
          return prev;
        });
      }
    }
  });

  const currentStep = steps[currentStepIndex];
  const shouldShow = shouldShowTutorial(pageKey);

  // Auto-start tutorial with a small delay
  useEffect(() => {
    if (shouldShow && steps.length > 0) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        setCurrentStepIndex(0); // Reset to first step when starting
        setTutorialActive(true, pageKey);
      }, 1500); // 1.5s delay to let animations finish
      return () => clearTimeout(timer);
    }
  }, [shouldShow, steps.length, pageKey, setTutorialActive]);

  // Reset step index, target rect, and clear scroll intervals when tutorial is closed/not visible
  useEffect(() => {
    if (!isVisible) {
      setCurrentStepIndex(0);
      setTargetRect(null);
      lastExecutedIndexRef.current = null;
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }
  }, [isVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
      if (isVisible) {
        setTutorialActive(false, null);
      }
    };
  }, [isVisible, setTutorialActive]);

  const measureTarget = useCallback(() => {
    if (!isVisible || !currentStep) return;
    const element = document.querySelector(currentStep.targetSelector) as HTMLElement;
    if (element) {
      setTargetRect(element.getBoundingClientRect());
    }
  }, [currentStep, isVisible]);

  const scrollToAndMeasure = useCallback(() => {
    if (!isVisible || !currentStep) return;
    const element = document.querySelector(currentStep.targetSelector) as HTMLElement;
    
    // Clear any active scroll polling interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    if (element) {
      // Set the rect immediately so the spotlight/tooltip aligns to the new target right away
      const initialRect = element.getBoundingClientRect();
      setTargetRect(initialRect);

      const isOffScreen = 
        initialRect.top < 0 || 
        initialRect.left < 0 || 
        initialRect.bottom > window.innerHeight || 
        initialRect.right > window.innerWidth;

      if (isOffScreen) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        
        // Measure periodically during the smooth scroll to keep spotlight/tooltip synced
        const intervalId = setInterval(() => {
          const el = document.querySelector(currentStep.targetSelector);
          if (el) {
            setTargetRect(el.getBoundingClientRect());
          }
        }, 80);
        scrollIntervalRef.current = intervalId;

        setTimeout(() => {
          clearInterval(intervalId);
          if (scrollIntervalRef.current === intervalId) {
            scrollIntervalRef.current = null;
          }
          measureTarget();
        }, 600); // Stop after 600ms when smooth scroll should be done
      } else {
        measureTarget();
      }
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isVisible, measureTarget]);

  useEffect(() => {
    if (isVisible && currentStep?.onBeforeShow && lastExecutedIndexRef.current !== currentStepIndex) {
      lastExecutedIndexRef.current = currentStepIndex;
      currentStep.onBeforeShow();
    }
    scrollToAndMeasure();
  }, [scrollToAndMeasure, currentStepIndex, isVisible, currentStep]);

  useEffect(() => {
    const handleResizeOrScroll = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      measureTarget();
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [measureTarget]);

  // Poll and observe DOM mutations to detect when elements appear (e.g. modals opening)
  useEffect(() => {
    if (!isVisible || !currentStep) return;

    const checkAndMeasure = () => {
      const element = document.querySelector(currentStep.targetSelector);
      if (element) {
        measureTarget();
        return true;
      }
      return false;
    };

    checkAndMeasure();

    const observer = new MutationObserver(() => {
      checkAndMeasure();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    const interval = setInterval(checkAndMeasure, 250);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [currentStep, isVisible, measureTarget]);



  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    markPageCompleted(pageKey);
    setTutorialActive(false, null);
  };

  if (!isVisible || steps.length === 0) return null;

  // Calculate Tooltip Position
  let tooltipStyle: React.CSSProperties = { 
    top: windowSize.width <= 768 ? 'auto' : '50%', 
    bottom: windowSize.width <= 768 ? '16px' : 'auto',
    left: '50%', 
    transform: windowSize.width <= 768 ? 'translateX(-50%)' : 'translate(-50%, -50%)',
    position: 'fixed',
    width: windowSize.width <= 768 ? 'calc(100% - 32px)' : '300px',
    maxWidth: windowSize.width <= 768 ? '360px' : '90vw',
    zIndex: 10000
  };
  
  if (targetRect) {
    const spacing = 12; // Space between target and tooltip
    const tooltipWidth = tooltipSize.width;
    const tooltipHeight = tooltipSize.height;
    
    // Check if the target is mostly in the upper or lower half of the screen
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const isUpperHalf = targetCenterY < windowSize.height / 2;

    if (windowSize.width <= 768) {
      // Mobile positioning: place fixed at top or bottom depending on target location to never go out of frame
      const targetIsAtBottom = targetCenterY > windowSize.height * 0.5;
      
      if (targetIsAtBottom) {
        // Place fixed at the top of the viewport
        tooltipStyle = {
          top: '16px',
          bottom: 'auto',
          left: '50%',
          transform: 'translateX(-50%)',
          position: 'fixed',
          width: 'calc(100% - 32px)',
          maxWidth: '360px',
          zIndex: 10000
        };
      } else {
        // Place fixed at the bottom of the viewport
        tooltipStyle = {
          top: 'auto',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          position: 'fixed',
          width: 'calc(100% - 32px)',
          maxWidth: '360px',
          zIndex: 10000
        };
      }
    } else {
      // Desktop positioning: place relative to target, clamped to viewport boundaries
      let idealTop: number;
      
      if (isUpperHalf) {
        // Place below the target
        idealTop = targetRect.bottom + spacing;
        // If it overflows the bottom, place above target if there's more room there
        if (idealTop + tooltipHeight > windowSize.height - 10 && targetRect.top > windowSize.height - targetRect.bottom) {
          idealTop = targetRect.top - spacing - tooltipHeight;
        }
      } else {
        // Place above the target
        idealTop = targetRect.top - spacing - tooltipHeight;
        // If it overflows the top, place below target if there's more room there
        if (idealTop < 10 && windowSize.height - targetRect.bottom > targetRect.top) {
          idealTop = targetRect.bottom + spacing;
        }
      }

      // Clamp values to keep tooltip fully inside the viewport with a safety margin
      const clampedTop = Math.max(10, Math.min(windowSize.height - tooltipHeight - 10, idealTop));
      const clampedLeft = Math.max(10, Math.min(windowSize.width - tooltipWidth - 10, targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2)));
      
      tooltipStyle = {
        top: clampedTop,
        bottom: 'auto',
        left: clampedLeft,
        position: 'fixed',
        transform: 'none',
        width: '300px',
        maxWidth: '90vw',
        zIndex: 10000
      };
    }
  }

  return createPortal(
    <div className="onboarding-portal">
      {/* Dark Overlay */}
      <div className="onboarding-overlay" />
      
      {/* Spotlight Cutout (only if target found) */}
      {targetRect && (
        <div className="onboarding-spotlight-container">
          <div 
            className="onboarding-spotlight"
            style={{
              top: targetRect.top - 8, // add some padding
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />
        </div>
      )}

      {/* Tooltip Wrapper */}
      <div 
        className="onboarding-tooltip-wrapper"
        style={tooltipStyle}
      >
        {/* Tooltip Card */}
        <Card 
          ref={tooltipRef as any}
          variant="glass"
          padding="lg"
          key={currentStepIndex} // Force re-render for animation on step change
          className="onboarding-tooltip-animate-in"
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <div className="onboarding-step-indicator">
            Step {currentStepIndex + 1} / {steps.length}
          </div>
          
          <h3 className="onboarding-title">{currentStep.title}</h3>
          <p className="onboarding-desc">{currentStep.description}</p>
          
          <div className="onboarding-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <Button variant="ghost" onClick={handleSkip}>
              Lewati
            </Button>
            <Button variant="primary" onClick={handleNext}>
              {currentStepIndex === steps.length - 1 ? 'Mengerti!' : 'Lanjut'}
            </Button>
          </div>
        </Card>
      </div>
    </div>,
    document.body
  );
};

export default OnboardingTutorial;
