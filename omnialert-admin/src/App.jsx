import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './Dashboard';
import SOSDashboard from './SOSDashboard';
import Calamities from './Calamities';
import Predictions from './Predictions';
import './App.css';

function NavLinks() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'text-red-400 font-bold' : 'hover:text-red-400 transition-colors';

  return (
    <>
      <Link to="/" className={isActive('/')}>Map Dashboard</Link>
      <Link to="/sos" className={isActive('/sos')}>SOS Signals</Link>
      <Link to="/calamities" className={isActive('/calamities')}>Manual Alerts</Link>
      <Link to="/predictions" className={isActive('/predictions')}>Weather Predictions</Link>
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-red-500/30">
        <nav className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 shadow-lg shadow-black/20">
          <div className="max-w-7xl mx-auto flex gap-6 items-center">
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mr-4 tracking-tight">OmniAlert Admin</h1>
            <NavLinks />
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sos" element={<SOSDashboard />} />
          <Route path="/calamities" element={<Calamities />} />
          <Route path="/predictions" element={<Predictions />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
