import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MoneyProvider, useMoney } from './contexts/MoneyContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { PremiumProvider } from './contexts/PremiumContext';
import { FamilyProvider } from './contexts/FamilyContext';
import { SubscriptionModal } from './components/modals/SubscriptionModal';
import Layout from './components/Layout';
import LockScreen from './components/LockScreen';
import SplashScreen from './components/SplashScreen';
import { ToastProvider } from './components/common/Toast';

import Transactions from './pages/Transactions';
import Assets from './pages/Assets';
import Debts from './pages/Debts';
import Settings from './pages/Settings';

// Lazy load heavy or rarely used pages for performance (bundle-dynamic-imports)
const Statistics = lazy(() => import('./pages/Statistics'));
const ReceiptScanner = lazy(() => import('./pages/ReceiptScanner'));
const BulkInput = lazy(() => import('./pages/BulkInput'));
const SocialHub = lazy(() => import('./pages/SocialHub'));
const SharedSplitBill = lazy(() => import('./pages/SharedSplitBill'));
const Trips = lazy(() => import('./pages/Trips'));
const TripDetail = lazy(() => import('./pages/TripDetail'));

// SplashScreen is used as fallback for both initial load and lazy page loading

const AppContent: React.FC = () => {
  const { isAppLocked, theme } = useMoney();

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);

  // Request notification permission and setup FCM on mount
  useEffect(() => {
    import('./lib/notifications').then(({ setupPushNotifications }) => {
      setupPushNotifications();
    });
  }, []);

  if (isAppLocked) {
    return (
      <BrowserRouter>
        <Suspense fallback={<SplashScreen />}>
          <Routes>
            <Route path="/shared-split/:id" element={<SharedSplitBill />} />
            <Route path="/shared-split-bill/:id" element={<SharedSplitBill />} />
            <Route path="*" element={<LockScreen />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    );
  }

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <BrowserRouter>
        <Suspense fallback={<SplashScreen />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Transactions />} />
              <Route path="stats" element={<Statistics />} />
              <Route path="scan" element={<ReceiptScanner />} />
              <Route path="bulk-input" element={<BulkInput />} />
              <Route path="assets" element={<Assets />} />
              <Route path="debts" element={<Debts />} />
              <Route path="social" element={<SocialHub />} />
              <Route path="settings" element={<Settings />} />
              <Route path="trips" element={<Trips />} />
              <Route path="trips/:id" element={<TripDetail />} />
            </Route>
            <Route path="/shared-split/:id" element={<SharedSplitBill />} />
            <Route path="/shared-split-bill/:id" element={<SharedSplitBill />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <FamilyProvider>
        <MoneyProvider>
          <PremiumProvider>
            <OnboardingProvider>
              <AppContent />
              <SubscriptionModal />
            </OnboardingProvider>
          </PremiumProvider>
        </MoneyProvider>
      </FamilyProvider>
    </ToastProvider>
  );
}

export default App;
