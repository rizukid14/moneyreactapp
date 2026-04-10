import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MoneyProvider, useMoney } from './contexts/MoneyContext';
import Layout from './components/Layout';
import LockScreen from './components/LockScreen';
import { Loader2 } from 'lucide-react';

// Lazy load pages for performance (bundle-dynamic-imports)
const Transactions = lazy(() => import('./pages/Transactions'));
const Statistics = lazy(() => import('./pages/Statistics'));
const ReceiptScanner = lazy(() => import('./pages/ReceiptScanner'));
const Assets = lazy(() => import('./pages/Assets'));
const Settings = lazy(() => import('./pages/Settings'));

const LoadingFallback = () => (
  <div style={{ 
    height: '100vh', width: '100%', display: 'flex', flexWrap: 'wrap', 
    justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-main)' 
  }}>
    <div style={{ textAlign: 'center' }}>
      <Loader2 size={48} className="spin" style={{ color: 'var(--secondary-blue)', marginBottom: '16px' }} />
      <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Memuat...</div>
    </div>
    <style>{`
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { 100% { transform: rotate(360deg); } }
    `}</style>
  </div>
);

const AppContent: React.FC = () => {
  const { isAppLocked, theme } = useMoney();

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);

  if (isAppLocked) {
    return <LockScreen />;
  }

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="app-container">
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Transactions />} />
                <Route path="stats" element={<Statistics />} />
                <Route path="scan" element={<ReceiptScanner />} />
                <Route path="assets" element={<Assets />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </div>
    </div>
  );
};

function App() {
  return (
    <MoneyProvider>
      <AppContent />
    </MoneyProvider>
  );
}

export default App;
