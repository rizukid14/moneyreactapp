import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, LineChart, Camera, Wallet, Settings } from 'lucide-react';

const Layout: React.FC = () => {
  return (
    <div className="app-container">
      <Outlet />
      
      <nav className="bottom-nav glass">
        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={24} />
          <span>Transaksi</span>
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LineChart size={24} />
          <span>Statistik</span>
        </NavLink>
        <NavLink to="/scan" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Camera size={24} />
          <span>OCR</span>
        </NavLink>
        <NavLink to="/assets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Wallet size={24} />
          <span>Aset</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={24} />
          <span>Lainnya</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default Layout;
