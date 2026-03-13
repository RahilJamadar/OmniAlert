import React, { useState } from 'react';
import axios from 'axios';
import { CloudRain, Droplets, MountainSnow, Wind, ExternalLink } from 'lucide-react';

import useNASAData from './hooks/useNASAData';
import useGeocoding from './hooks/useGeocoding';

const API_URL = 'http://localhost:5000/api';

function CalamityCard({ c, handleBroadcast, loading }) {
  const { address, loading: geoLoading } = useGeocoding(c.lat, c.lng);

  // Determine icon based on type loosely
  let Icon = ShieldAlert;
  let color = 'red';
  const t = (c.type || '').toUpperCase();
  if (t.includes('CYCLONE') || t.includes('WIND')) { Icon = Wind; color = 'blue'; }
  else if (t.includes('FLOOD') || t.includes('STORM') || t.includes('RAIN')) { Icon = CloudRain; color = 'cyan'; }
  else if (t.includes('DROUGHT') || t.includes('FIRE')) { Icon = Droplets; color = 'orange'; }
  else if (t.includes('LANDSLIDE') || t.includes('EARTHQUAKE')) { Icon = MountainSnow; color = 'amber'; }

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl bg-${color}-500/10`}>
            <Icon className={`w-8 h-8 text-${color}-400`} />
          </div>
          <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs border border-red-500/30 font-semibold tracking-wide">
            {c.alertLevel || "HIGH RISK"}
          </span>
        </div>
        <h3 className="text-xl font-bold text-slate-200 mb-2">{c.name || 'Unknown Alert'}</h3>
        <p className="text-slate-400 text-sm mb-4 leading-relaxed">
           NASA Risk Score: {c.riskScore}%. {c.type} threat detected.
        </p>
        
        <div className="bg-slate-950 rounded-lg p-3 text-sm text-slate-500 mb-6 font-mono">
          <p className="text-indigo-400 font-bold mb-1">{geoLoading ? 'Resolving Address...' : address}</p>
          <p>Lat: {c.lat?.toFixed(4)} | Lng: {c.lng?.toFixed(4)}</p>
          <p>Impact Radius: 20 km (Default)</p>
        </div>
      </div>
      
      <button 
        onClick={() => handleBroadcast(c)}
        disabled={loading}
        className={`w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <ExternalLink className="w-5 h-5" />
        Broadcast Emergency Overlay
      </button>
    </div>
  );
}

export default function Calamities() {
  const [broadcastLog, setBroadcastLog] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Use real data from NASA EONET
  const { highRiskZones } = useNASAData();

  const handleBroadcast = async (calamity) => {
    if (!window.confirm(`Broadcast ${calamity.type} RED ALERT to the surrounding area?`)) return;
    
    setLoading(true);
    try {
      const payload = {
        lat: calamity.lat,
        lng: calamity.lng,
        radius_km: 20,
        message: `High impact ${calamity.type} detected. Take immediate shelter.`,
        threat_type: calamity.type
      };

      const res = await axios.post(`${API_URL}/admin/broadcast`, payload);
      
      const logEntry = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        type: calamity.type,
        usersified: res.data.users_notified
      };
      setBroadcastLog(prev => [logEntry, ...prev]);
      alert(`Broadcast successful! Triggered overlay for ${res.data.users_notified} active devices.`);

    } catch (err) {
      console.error(err);
      alert("Failed to broadcast alert");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-100">Calamity Assessment</h2>
          <p className="text-slate-400 mt-2">Monitor AI-predicted events and issue regional overlays</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {highRiskZones.length === 0 ? (
          <div className="col-span-1 md:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center">
             <p className="text-slate-400">No AI-predicted critical hazards at this time. Network clear.</p>
          </div>
        ) : (
          highRiskZones.map((c, index) => (
            <CalamityCard key={c.id || index} c={c} handleBroadcast={handleBroadcast} loading={loading} />
          ))
        )}
      </div>

      {broadcastLog.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-slate-200 mb-4">Recent Automated Broadcasts</h3>
          <div className="space-y-3">
            {broadcastLog.map(log => (
              <div key={log.id} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 font-mono text-sm">{log.time}</span>
                  <span className="font-semibold text-slate-200">{log.type}</span>
                </div>
                <span className="text-green-400 text-sm bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                  {log.usersified} users notified
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
