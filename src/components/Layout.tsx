import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, LineChart, Wallet, Settings, PanelLeftClose, PanelLeftOpen, BadgeDollarSign, PiggyBank } from 'lucide-react';
import ChatBot from './chatbot/ChatBot';

const Layout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const NavItems = ({ includeDebts = false }: { includeDebts?: boolean }) => (
    <>
      <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Halaman Transaksi" {...(window.location.pathname === '/' ? {'aria-current': 'page'} : {})}>
        <Home size={24} />
        <span>Transaksi</span>
      </NavLink>
      <NavLink to="/stats" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Halaman Statistik" {...(window.location.pathname === '/stats' ? {'aria-current': 'page'} : {})}>
        <LineChart size={24} />
        <span>Statistik</span>
      </NavLink>
      <NavLink to="/assets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Halaman Aset" {...(window.location.pathname === '/assets' ? {'aria-current': 'page'} : {})}>
        <Wallet size={24} />
        <span>Aset</span>
      </NavLink>
      {includeDebts && (
        <NavLink to="/debts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Halaman Hutang" {...(window.location.pathname === '/debts' ? {'aria-current': 'page'} : {})}>
          <BadgeDollarSign size={24} />
          <span>Hutang</span>
        </NavLink>
      )}
      <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Halaman Pengaturan" {...(window.location.pathname === '/settings' ? {'aria-current': 'page'} : {})}>
        <Settings size={24} />
        <span>Settings</span>
      </NavLink>
    </>
  );

  return (
    <div className="app-container">
      {/* Sidebar for Desktop */}
      <aside className={`sidebar-nav desktop-only ${isCollapsed ? 'collapsed' : ''}`} role="navigation" aria-label="Navigasi Utama Desktop">
        <button 
          className="sidebar-toggle desktop-only" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={isCollapsed ? "Tampilkan Sidebar" : "Sembunyikan Sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>

        <div className="sidebar-logo">
          <PiggyBank size={36} strokeWidth={2.5} color="var(--primary)" />
          <span>MoneyApp</span>
        </div>
        <NavItems includeDebts={true} />
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="page-wrapper">
          <Outlet />
        </div>
      </main>
      
      {/* Bottom Nav for Mobile — includes all 6 items */}
      <nav className="bottom-nav mobile-only" aria-label="Navigasi Utama Mobile">
        <NavItems includeDebts={true} />
      </nav>

      <ChatBot />
    </div>
  );
};

export default Layout;
