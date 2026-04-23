import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, LineChart, Wallet, Settings, PanelLeftClose, PanelLeftOpen, BadgeDollarSign } from 'lucide-react';

const Layout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const NavItems = ({ includeDebts = false }: { includeDebts?: boolean }) => (
    <>
      <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Home size={24} />
        <span>Transaksi</span>
      </NavLink>
      <NavLink to="/stats" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <LineChart size={24} />
        <span>Statistik</span>
      </NavLink>
      <NavLink to="/assets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Wallet size={24} />
        <span>Aset</span>
      </NavLink>
      {includeDebts && (
        <NavLink to="/debts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BadgeDollarSign size={24} />
          <span>Hutang</span>
        </NavLink>
      )}
      <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Settings size={24} />
        <span>Lainnya</span>
      </NavLink>
    </>
  );

  return (
    <div className="app-container">
      {/* Sidebar for Desktop */}
      <aside className={`sidebar-nav desktop-only ${isCollapsed ? 'collapsed' : ''}`}>
        <button 
          className="sidebar-toggle desktop-only" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>

        <div className="sidebar-logo">
          <Wallet size={36} strokeWidth={2.5} color="var(--primary)" />
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
      <nav className="bottom-nav mobile-only">
        <NavItems includeDebts={true} />
      </nav>
    </div>
  );
};

export default Layout;
