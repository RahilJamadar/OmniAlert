import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import SOSDashboard from './SOSDashboard';
import Calamities from './Calamities';
import NASAMonitor from './NASAMonitor'; // Adjust path if needed
import Predictions from './Predictions'; // Adjust path if needed
import SafeZonesDashboard from './SafeZonesDashboard'; // Adjust path if needed
import { Toaster } from 'react-hot-toast';
import useGlobalSOS from './hooks/useGlobalSOS';
import Auth from './Auth';
import './App.css';

function NavLinks({ onLogout }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'text-red-400 font-bold' : 'hover:text-red-400 transition-colors';

  return (
    <>
      <Link to="/" className={isActive('/')}>Map Dashboard</Link>
      <Link to="/nasa-monitor" className={isActive('/nasa-monitor')}>NASA Monitor</Link>
      <Link to="/sos" className={isActive('/sos')}>SOS Signals</Link>
      <Link to="/calamities" className={isActive('/calamities')}>Manual Alerts</Link>
      <Link to="/predictions" className={isActive('/predictions')}>Weather Predictions</Link>
      <Link to="/safe-zones" className={isActive('/safe-zones')}>Safe Zones</Link>
      <button 
        onClick={onLogout}
        className="ml-auto text-sm font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-red-600 px-4 py-2 rounded-lg transition-all"
      >
        Sign Out
      </button>
    </>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  const { sosLogs, loading } = useGlobalSOS();

  const handleLogin = (jwt) => {
    localStorage.setItem('adminToken', jwt);
    setToken(jwt);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
  };

  return (
    <Router>
      <Toaster position="top-right" reverseOrder={false} />
      {!token ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-red-500/30">
          <nav className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 shadow-lg shadow-black/20">
            <div className="max-w-7xl mx-auto flex gap-6 items-center">
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mr-4 tracking-tight">OmniAlert Admin</h1>
              <NavLinks onLogout={handleLogout} />
            </div>
          </nav>
          <Routes>
             <Route path="/" element={<Dashboard />} />
             <Route path="/nasa-monitor" element={<NASAMonitor />} />
             <Route path="/sos" element={<SOSDashboard sosLogs={sosLogs} loading={loading} />} />
             <Route path="/calamities" element={<Calamities />} />
             <Route path="/predictions" element={<Predictions />} />
             <Route path="/safe-zones" element={<SafeZonesDashboard />} />
             <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      )}
    </Router>
  );
}

export default App;
