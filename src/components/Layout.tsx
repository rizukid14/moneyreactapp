import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useMoney } from '../contexts/MoneyContext';
import { usePremium } from '../contexts/PremiumContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { changelogData } from '../data/changelog';
import ChatBot from './chatbot/ChatBot';
import MaterialIcon from './common/MaterialIcon';
import AddActionMenu from './modals/AddActionMenu';
import NotificationModal from './modals/NotificationModal';
import ProfileMenuModal from './modals/ProfileMenuModal';
import WhatsNewModal from './modals/WhatsNewModal';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { useLoginStreak } from '../hooks/useLoginStreak';
import StreakRewardModal from './modals/StreakRewardModal';
import { getLocalDate } from '../lib/utils';

const Layout: React.FC = () => {
  const { user, theme, toggleTheme, setIsChatOpen, unreadNotifCount } = useMoney();
  const { premium } = usePremium();
  const { setTutorialActive } = useOnboarding();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  const { 
    showRewardModal, 
    setShowRewardModal, 
    earnedPoints, 
    basePoints, 
    multiplier, 
    milestoneBonus, 
    isWeekend, 
    currentStreak 
  } = useLoginStreak();

  const [showWeekendBanner, setShowWeekendBanner] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const isFridayEvening = day === 5 && hour >= 17;
    const isWeekend = day === 6 || day === 0;
    
    if (isFridayEvening || isWeekend) {
      const dismissed = localStorage.getItem('dismissedWeekendBanner');
      const fridayDate = new Date(now.getTime() - ((day === 0 ? 2 : day === 6 ? 1 : 0) * 24 * 60 * 60 * 1000));
      const fridayStr = getLocalDate(fridayDate);
      if (dismissed === fridayStr) return false;
      return true;
    }
    return false;
  });

  const handleDismissWeekendBanner = () => {
    setShowWeekendBanner(false);
    const now = new Date();
    const day = now.getDay();
    const fridayDate = new Date(now.getTime() - ((day === 0 ? 2 : day === 6 ? 1 : 0) * 24 * 60 * 60 * 1000));
    const fridayStr = getLocalDate(fridayDate);
    localStorage.setItem('dismissedWeekendBanner', fridayStr);
  };

  // Compute User Plan
  const planLabel = premium.isPremium ? 'Pro Plan' : 'Free Plan';

  // Show WhatsNewModal on version update; block onboarding until dismissed
  useEffect(() => {
    const currentVersion = changelogData[0]?.version;
    if (!currentVersion) return;
    try {
      const lastSeenVersion = localStorage.getItem('moneyapp-last-seen-version');
      if (lastSeenVersion !== currentVersion) {
        setShowWhatsNew(true);
        setTutorialActive(true, null);
      }
    } catch (e) {}
  }, [setTutorialActive]);

  const handleCloseWhatsNew = () => {
    setShowWhatsNew(false);
    try {
      localStorage.setItem('moneyapp-last-seen-version', changelogData[0]?.version || '');
    } catch (e) {}
    setTutorialActive(false, null);
  };

  const openNotifications = () => {
    setIsNotifOpen(true);
  };

  const location = useLocation();

  const isSocialActive = ['/social', '/trips', '/debts'].some(p => 
    location.pathname === p || location.pathname.startsWith(p + '/')
  );

  const desktopNavItems = [
    { path: '/', icon: 'dashboard', label: 'Dashboard', end: true, testId: 'nav-transactions' },
    { path: '/assets', icon: 'account_balance_wallet', label: 'Aset & Rekening', testId: 'nav-assets' },
    { path: '/goals', icon: 'flag', label: 'Anggaran & Target', testId: 'nav-goals' },
    { path: '/social', icon: 'groups', label: 'Sosial & Berbagi', testId: 'nav-social', isSocial: true },
    { path: '/stats', icon: 'analytics', label: 'Laporan & Analitik', testId: 'nav-statistics' },
    { path: '/settings', icon: 'settings', label: 'Pengaturan', testId: 'nav-settings' },
  ];

  const mobileNavItems = [
    { path: '/', icon: 'dashboard', label: 'Home', end: true, testId: 'nav-transactions' },
    { path: '/assets', icon: 'account_balance_wallet', label: 'Aset', testId: 'nav-assets' },
    { path: '#add', icon: 'add', label: 'Tambah', isAddButton: true, testId: 'nav-add' },
    { path: '/social', icon: 'groups', label: 'Sosial', testId: 'nav-social', isSocial: true },
    { path: '/stats', icon: 'analytics', label: 'Laporan', testId: 'nav-statistics' },
  ];

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface overflow-x-hidden w-full max-w-[100vw]">
      {/* Top App Bar (Mobile & Desktop) */}
      <header className="fixed top-0 inset-x-0 lg:left-64 h-16 bg-surface-container-lowest/80 backdrop-blur-md border-b border-border-light flex items-center justify-between px-4 lg:px-8 z-40 gap-2">
        <div 
          className="flex items-center gap-2 lg:cursor-default flex-1 min-w-0 cursor-pointer"
          onClick={() => setIsProfileMenuOpen(true)}
        >
          {user.avatar ? (
            <img src={user.avatar} alt="Profile" className="w-8 h-8 rounded-full border border-border-light lg:hidden shrink-0 object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full border border-border-light lg:hidden shrink-0 bg-primary text-on-primary flex items-center justify-center font-bold text-xs uppercase">
              {user.name ? user.name.charAt(0) : 'U'}
            </div>
          )}
          <div className="lg:hidden min-w-0">
            <p className="text-[10px] text-on-surface-variant truncate">Selamat datang,</p>
            <h1 className="font-label-md text-label-md text-on-surface truncate">{user.name}</h1>
          </div>
        </div>

        {/* Portal Target for Page-Specific Center Content (Like Date Selector) */}
        <div id="top-bar-center" className="flex items-center justify-center shrink-0"></div>

        {/* Right Side */}
        <div className="flex items-center gap-2 sm:gap-4 justify-end flex-1 min-w-0">
          {/* Settings Icon for Mobile */}
          <button 
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors border-none bg-transparent cursor-pointer shrink-0 lg:hidden"
            onClick={() => navigate('/settings')}
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          
          <button 
            onClick={openNotifications}
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors relative border-none bg-transparent cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-surface">
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </span>
            )}
          </button>
          
          <div 
            className="hidden lg:flex items-center gap-3 pl-4 border-l border-border-light cursor-pointer hover:bg-surface-container p-2 rounded-xl transition-colors shrink-0"
            onClick={() => setIsProfileMenuOpen(true)}
          >
            <div className="flex flex-col items-end min-w-0">
              <span className="font-label-md text-label-sm text-on-surface truncate">{user.name}</span>
              <span className="text-[10px] text-on-surface-variant truncate">{planLabel}</span>
            </div>
            {user.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-8 h-8 rounded-full border border-border-light shrink-0 object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full border border-border-light shrink-0 bg-primary text-on-primary flex items-center justify-center font-bold text-xs uppercase">
                {user.name ? user.name.charAt(0) : 'U'}
              </div>
            )}
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
          <span className="font-headline-lg-mobile text-lg text-on-surface">Monetiq</span>
        </div>
        
        <WorkspaceSwitcher />
        
        <div className="px-4 py-4 border-b border-border-light">
          <button 
            onClick={() => setIsAddMenuOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity border-none cursor-pointer shadow-sm"
          >
            <MaterialIcon name="add" className="text-xl" />
            Tambah Transaksi
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-2 hide-scrollbar">
          {desktopNavItems.map((item) => (
            item.isSocial ? (
              <NavLink
                key={item.path}
                to={item.path}
                end
                data-testid={item.testId}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-label-md transition-colors ${
                  isSocialActive
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ fontVariationSettings: isSocialActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ) : (
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
            )
          ))}

          <div className="h-px bg-border-light my-2"></div>

          <button 
            onClick={() => setIsChatOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-label-md transition-colors text-on-surface-variant hover:bg-surface-container hover:text-on-surface border-none cursor-pointer bg-transparent"
          >
            <span className="material-symbols-outlined text-xl text-primary">smart_toy</span>
            MoneyBot AI
          </button>
        </nav>

        {/* Mode Toggle */}
        <div className="p-4 border-t border-border-light space-y-2">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors border-none bg-transparent cursor-pointer"
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
        {showWeekendBanner && (
          <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-4 py-3 text-xs md:text-sm font-bold flex justify-between items-center z-30 relative shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌟</span>
              <span><strong>Weekend Lucky Boost!</strong> Hari Sabtu & Minggu peluang bonus multiplier 2x-10x lebih tinggi!</span>
            </div>
            <button onClick={handleDismissWeekendBanner} className="p-1 bg-white/20 hover:bg-white/30 rounded-full border-none text-white cursor-pointer flex items-center justify-center shrink-0 ml-4">
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        )}
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav data-testid="bottom-nav" className="fixed bottom-0 inset-x-0 bg-surface-container-lowest border-t border-border-light flex lg:hidden z-50 px-2 py-2 items-center justify-between pb-safe">
        {mobileNavItems.map((item) => {
          if (item.isAddButton) {
            return (
              <button
                key={item.path}
                onClick={() => setIsAddMenuOpen(true)}
                data-testid={item.testId}
                className="flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors text-on-surface-variant hover:text-on-surface border-none bg-transparent cursor-pointer"
              >
                <div className="w-12 h-10 rounded-full flex items-center justify-center bg-primary text-white shadow-md transform hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl">
                    {item.icon}
                  </span>
                </div>
              </button>
            );
          }

          if ((item as any).isChatbotButton) {
            return (
              <button
                key={item.path}
                onClick={() => setIsChatOpen(true)}
                data-testid={item.testId}
                className="flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-colors text-on-surface-variant hover:text-on-surface border-none bg-transparent cursor-pointer group"
              >
                <div className="w-10 h-8 rounded-full flex items-center justify-center mb-1 group-hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-xl text-primary">
                    {item.icon}
                  </span>
                </div>
                <span className="text-[9px] text-on-surface">{item.label}</span>
              </button>
            );
          }



          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              data-testid={item.testId}
              className={({ isActive }) => 
                `flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors ${
                  (isActive || (item.isSocial && isSocialActive)) ? 'text-primary font-medium' : 'text-on-surface-variant hover:text-on-surface'
                }`
              }
            >
              {({ isActive }) => {
                const active = isActive || (item.isSocial && isSocialActive);
                return (
                  <>
                    <div className={`w-12 h-8 rounded-full flex items-center justify-center mb-1 ${active ? 'bg-primary-container' : ''}`}>
                      <span 
                        className={`material-symbols-outlined text-xl ${active ? 'text-on-primary-container' : ''}`}
                        style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {item.icon}
                      </span>
                    </div>
                    <span className="text-[10px] text-on-surface">{item.label}</span>
                  </>
                );
              }}
            </NavLink>
          );
        })}
      </nav>

      <ChatBot />
      
      <AddActionMenu 
        isOpen={isAddMenuOpen} 
        onClose={() => setIsAddMenuOpen(false)} 
        onOpenChat={() => setIsChatOpen(true)}
      />

      <NotificationModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />

      <ProfileMenuModal
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
      />

      <WhatsNewModal
        isOpen={showWhatsNew}
        onClose={handleCloseWhatsNew}
      />

      <StreakRewardModal 
        isOpen={showRewardModal} 
        onClose={() => setShowRewardModal(false)}
        earnedPoints={earnedPoints}
        currentStreak={currentStreak}
        basePoints={basePoints}
        multiplier={multiplier}
        milestoneBonus={milestoneBonus}
        isWeekend={isWeekend}
      />
    </div>
  );
};

export default Layout;

