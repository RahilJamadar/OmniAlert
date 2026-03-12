import React, { useState } from 'react';
import axios from 'axios';
import { CloudRain, Droplets, MountainSnow, Wind, ExternalLink } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function Calamities() {
  const [broadcastLog, setBroadcastLog] = useState([]);
  const [loading, setLoading] = useState(false);

  // Hardcoded epicenters for demonstration
  const calamities = [
    {
      id: 'cyclone',
      type: 'CYCLONE',
      title: 'Cyclone Approaching',
      description: 'Severe cyclonic storm projected to hit coastal areas within 48 hours.',
      icon: <Wind className="w-8 h-8 text-blue-400" />,
      color: 'blue',
      lat: 18.9220,
      lng: 72.8347,
      radius: 50,
      message: 'Cyclone warning: Seek sturdy shelter immediately. Stay away from coasts.'
    },
    {
      id: 'flood',
      type: 'FLOOD',
      title: 'Flash Floods',
      description: 'Heavy rainfall causing rapid water rise in low-lying urban areas.',
      icon: <CloudRain className="w-8 h-8 text-cyan-400" />,
      color: 'cyan',
      lat: 19.0760,
      lng: 72.8777,
      radius: 20,
      message: 'Flash flood warning: Move to local safe zones or higher ground. Avoid driving.'
    },
    {
      id: 'drought',
      type: 'DROUGHT',
      title: 'Severe Drought',
      description: 'Prolonged dry spell causing critical municipal water shortage.',
      icon: <Droplets className="w-8 h-8 text-orange-400" />,
      color: 'orange',
      lat: 19.2183,
      lng: 72.9781,
      radius: 100,
      message: 'Severe water scarcity: Strict water rationing in effect. Conserve immediately.'
    },
    {
      id: 'landslide',
      type: 'LANDSLIDE',
      title: 'Landslide Risk',
      description: 'Unstable terrain detected in hilly regions following heavy monsoon rains.',
      icon: <MountainSnow className="w-8 h-8 text-amber-500" />,
      color: 'amber',
      lat: 19.1726,
      lng: 72.9425, // Powai/Hilly area roughly
      radius: 15,
      message: 'Critical Landslide Risk: Evacuate hillside areas immediately. Soil instability detected.'
    }
  ];

  const handleBroadcast = async (calamity) => {
    if (!window.confirm(`Broadcast ${calamity.type} RED ALERT to ${calamity.radius}km area?`)) return;
    
    setLoading(true);
    try {
      const payload = {
        lat: calamity.lat,
        lng: calamity.lng,
        radius_km: calamity.radius,
        message: calamity.message,
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
        {calamities.map(c => (
          <div key={c.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-${c.color}-500/10`}>
                  {c.icon}
                </div>
                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs border border-red-500/30 font-semibold tracking-wide">
                  HIGH RISK ZONE
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-200 mb-2">{c.title}</h3>
              <p className="text-slate-400 text-sm mb-4 leading-relaxed">{c.description}</p>
              
              <div className="bg-slate-950 rounded-lg p-3 text-sm text-slate-500 mb-6 font-mono">
                <p>Lat: {c.lat} | Lng: {c.lng}</p>
                <p>Impact Radius: {c.radius} km</p>
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
        ))}
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
