import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MoneyProvider, useMoney } from './contexts/MoneyContext';
import Layout from './components/Layout';
import Transactions from './pages/Transactions';
import Statistics from './pages/Statistics';
import ReceiptScanner from './pages/ReceiptScanner';
import Assets from './pages/Assets';
import Settings from './pages/Settings';
import LockScreen from './components/LockScreen';

const AppContent: React.FC = () => {
  const { isAppLocked, theme } = useMoney();

  if (isAppLocked) {
    return <LockScreen />;
  }

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="app-container">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Transactions />} />
              <Route path="stats" element={<Statistics />} />
              <Route path="scan" element={<ReceiptScanner />} />
              <Route path="assets" element={<Assets />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
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
