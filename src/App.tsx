import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MoneyProvider } from './contexts/MoneyContext';
import Layout from './components/Layout';
import Transactions from './pages/Transactions';
import Statistics from './pages/Statistics';
import ReceiptScanner from './pages/ReceiptScanner';
import Assets from './pages/Assets';
import Settings from './pages/Settings';

function App() {
  return (
    <MoneyProvider>
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
    </MoneyProvider>
  );
}

export default App;
