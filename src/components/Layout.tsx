import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useMoney } from '../contexts/MoneyContext';
import ChatBot from './chatbot/ChatBot';

const Layout: React.FC = () => {
  const { theme, toggleTheme } = useMoney();
  const isDark = theme === 'dark';

  const desktopNavItems = [
    { path: '/', icon: 'dashboard', label: 'Dashboard', end: true, testId: 'nav-transactions' },
    { path: '/assets', icon: 'account_balance_wallet', label: 'Aset & Rekening', testId: 'nav-assets' },
    { path: '/debts', icon: 'credit_card', label: 'Hutang & Piutang', testId: 'nav-debts' },
    { path: '/stats', icon: 'analytics', label: 'Laporan & Analitik', testId: 'nav-statistics' },
    { path: '/settings', icon: 'settings', label: 'Pengaturan', testId: 'nav-settings' },
  ];

  const mobileNavItems = [
    { path: '/', icon: 'dashboard', label: 'Home', end: true, testId: 'nav-transactions' },
    { path: '/assets', icon: 'account_balance_wallet', label: 'Aset', testId: 'nav-assets' },
    { path: '/scan', icon: 'document_scanner', label: 'Scan', center: true, testId: 'nav-scan' }, // Assuming scan page exists, adding center logic later if needed
    { path: '/debts', icon: 'credit_card', label: 'Hutang', testId: 'nav-debts' },
    { path: '/stats', icon: 'analytics', label: 'Laporan', testId: 'nav-statistics' },
  ];

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface">
      {/* Top App Bar (Mobile & Desktop) */}
      <header className="fixed top-0 inset-x-0 lg:left-64 h-16 bg-surface-container-lowest/80 backdrop-blur-md border-b border-border-light flex items-center justify-between px-4 lg:px-8 z-40">
        <div className="flex items-center gap-3">
          <img src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="Profile" className="w-8 h-8 rounded-full border border-border-light lg:hidden" />
          <div className="lg:hidden">
            <p className="text-[10px] text-on-surface-variant">Selamat datang,</p>
            <h1 className="font-label-md text-label-md text-on-surface">Alex Nova</h1>
          </div>
        </div>

        {/* Portal Target for Page-Specific Center Content (Like Date Selector) */}
        <div id="top-bar-center" className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"></div>

        <div className="flex items-center gap-4 ml-auto">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
          </button>
          
          <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-border-light cursor-pointer hover:bg-surface-container p-2 rounded-xl transition-colors">
            <div className="flex flex-col items-end">
              <span className="font-label-md text-label-sm text-on-surface">Alex Nova</span>
              <span className="text-[10px] text-on-surface-variant">Pro Plan</span>
            </div>
            <img src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="Profile" className="w-8 h-8 rounded-full border border-border-light" />
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside 
        data-testid="sidebar-nav" 
        className="fixed inset-y-0 left-0 w-64 bg-surface-container-lowest border-r border-border-light flex-col hidden lg:flex z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
      >
        <div className="h-16 flex items-center px-6 border-b border-border-light">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary font-bold mr-3">
            M
          </div>
          <span className="font-headline-lg-mobile text-lg text-on-surface">MoneyApp</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 hide-scrollbar">
          {desktopNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              data-testid={item.testId}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-label-md transition-colors ${
                  isActive 
                    ? 'bg-primary-container text-on-primary-container' 
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span 
                    className="material-symbols-outlined text-xl" 
                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Mode Toggle */}
        <div className="p-4 border-t border-border-light space-y-2">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl">dark_mode</span>
              <span className="font-label-md text-label-md">Tema Gelap</span>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${isDark ? 'bg-primary' : 'bg-surface-variant border border-outline-variant'}`}>
              <div 
                className={`w-4 h-4 rounded-full absolute top-1 transition-transform ${
                  isDark ? 'bg-on-primary translate-x-5' : 'bg-on-surface-variant translate-x-1'
                }`}
              ></div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="lg:pl-64 pt-16 min-h-screen pb-24 lg:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav data-testid="bottom-nav" className="fixed bottom-0 inset-x-0 bg-surface-container-lowest border-t border-border-light flex lg:hidden z-50 px-2 py-2 items-center justify-between pb-safe">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            data-testid={item.testId}
            className={({ isActive }) => 
              `flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors ${
                isActive ? 'text-primary font-medium' : 'text-on-surface-variant hover:text-on-surface'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`w-12 h-8 rounded-full flex items-center justify-center mb-1 ${isActive ? 'bg-primary-container' : ''}`}>
                  <span 
                    className={`material-symbols-outlined text-xl ${isActive ? 'text-on-primary-container' : ''}`}
                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {item.icon}
                  </span>
                </div>
                <span className="text-[10px] text-on-surface">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <ChatBot />
    </div>
  );
};

export default Layout;
