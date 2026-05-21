import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbGetSetting, dbPutSetting, dbDeleteSetting } from '../lib/db';

interface OnboardingState {
  completedPages: Record<string, boolean>;
  isActive: boolean;
  currentPage: string | null;
}

interface OnboardingContextType {
  state: OnboardingState;
  isPageCompleted: (pageKey: string) => boolean;
  markPageCompleted: (pageKey: string) => void;
  resetAllTutorials: () => void;
  shouldShowTutorial: (pageKey: string) => boolean;
  setTutorialActive: (isActive: boolean, pageKey: string | null) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<OnboardingState>({
    completedPages: {},
    isActive: false,
    currentPage: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadState = async () => {
      // Check localStorage first for instant load
      const localStr = localStorage.getItem('moneyapp_onboarding');
      let initialPages: Record<string, boolean> = {};
      
      if (localStr) {
        try {
          initialPages = JSON.parse(localStr);
        } catch (e) {
          console.error("Failed to parse onboarding local storage", e);
        }
      }

      // Then check DB for synced state
      try {
        const dbState = await dbGetSetting('onboarding_completed');
        if (dbState && typeof dbState === 'object') {
          initialPages = { ...initialPages, ...dbState };
          localStorage.setItem('moneyapp_onboarding', JSON.stringify(initialPages));
        }
      } catch (e) {
        console.error("Failed to load onboarding state from DB", e);
      }

      setState(s => ({ ...s, completedPages: initialPages }));
      setIsLoaded(true);
    };
    loadState();
  }, []);

  const isPageCompleted = (pageKey: string) => {
    return !!state.completedPages[pageKey];
  };

  const shouldShowTutorial = (pageKey: string) => {
    return isLoaded && !isPageCompleted(pageKey) && !state.isActive;
  };

  const markPageCompleted = async (pageKey: string) => {
    const newPages = { ...state.completedPages, [pageKey]: true };
    setState(s => ({ ...s, completedPages: newPages, isActive: false, currentPage: null }));
    
    // Save to local storage for immediate access
    localStorage.setItem('moneyapp_onboarding', JSON.stringify(newPages));
    
    // Sync to DB
    try {
      await dbPutSetting('onboarding_completed', newPages);
    } catch (e) {
      console.error("Failed to save onboarding state to DB", e);
    }
  };

  const resetAllTutorials = async () => {
    setState({ completedPages: {}, isActive: false, currentPage: null });
    localStorage.removeItem('moneyapp_onboarding');
    try {
      await dbDeleteSetting('onboarding_completed');
    } catch (e) {
      console.error("Failed to reset onboarding state in DB", e);
    }
  };

  const setTutorialActive = (isActive: boolean, pageKey: string | null) => {
    setState(s => ({ ...s, isActive, currentPage: pageKey }));
  };

  return (
    <OnboardingContext.Provider
      value={{
        state,
        isPageCompleted,
        markPageCompleted,
        resetAllTutorials,
        shouldShowTutorial,
        setTutorialActive
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
