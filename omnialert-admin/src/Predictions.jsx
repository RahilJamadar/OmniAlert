import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CloudRain, Wind, AlertTriangle, CheckCircle2, CloudLightning } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function Predictions() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [broadcastingId, setBroadcastingId] = useState(null);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/weather-predictions`);
      if (res.data.success) {
        setPredictions(res.data.predictions);
      }
    } catch (error) {
      console.error("Failed to fetch predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async (p) => {
    if (!window.confirm(`Broadcast ${p.threatType} RED ALERT for ${p.name}?`)) return;
    
    setBroadcastingId(p.id);
    try {
      const payload = {
        lat: p.lat,
        lng: p.lng,
        radius_km: p.radius,
        message: p.severityDesc,
        threat_type: p.threatType
      };

      const res = await axios.post(`${API_URL}/admin/broadcast`, payload);
      alert(`Broadcast successful! Triggered overlay for ${res.data.users_notified} active devices.`);
    } catch (err) {
      console.error(err);
      alert("Failed to broadcast alert");
    } finally {
      setBroadcastingId(null);
    }
  };

  const getWeatherIcon = (type) => {
    switch (type) {
      case 'FLOOD': return <CloudRain className="w-8 h-8 text-blue-400" />;
      case 'CYCLONE': 
      case 'SEVERE_STORM': return <Wind className="w-8 h-8 text-purple-400" />;
      default: return <CloudLightning className="w-8 h-8 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex justify-center items-center h-64">
        <div className="text-slate-400 text-xl font-semibold animate-pulse">Running Open-Meteo Analysis...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
          <AlertTriangle className="text-amber-500 w-8 h-8" />
          Live Weather Intelligence
        </h2>
        <p className="text-slate-400 mt-2 text-lg">
          Real-time catastrophic weather detection across major Indian cities using Open-Meteo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {predictions.map(p => (
          <div key={p.id} className={`bg-slate-900 border ${p.isCatastrophic ? 'border-red-500/50 shadow-lg shadow-red-500/10' : 'border-slate-800'} p-6 rounded-2xl flex flex-col justify-between transition-all hover:-translate-y-1`}>
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${p.isCatastrophic ? 'bg-red-500/10' : 'bg-slate-800'}`}>
                  {p.isCatastrophic ? getWeatherIcon(p.threatType) : <CheckCircle2 className="w-8 h-8 text-green-400" />}
                </div>
                {p.isCatastrophic && (
                  <span className="bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs border border-red-500/30 font-bold tracking-wider animate-pulse">
                    CATASTROPHIC
                  </span>
                )}
                {!p.isCatastrophic && (
                  <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                    NORMAL
                  </span>
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-slate-100 mb-1">{p.name}</h3>
              <p className="text-slate-400 text-sm mb-4 h-10 line-clamp-2">
                {p.isCatastrophic ? p.severityDesc : 'Weather patterns are currently stable.'}
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/50">
                  <div className="text-slate-500 text-xs font-semibold mb-1">Precipitation</div>
                  <div className={`text-lg font-bold ${p.precipitation > 15 ? 'text-blue-400' : 'text-slate-200'}`}>
                    {p.precipitation} <span className="text-xs text-slate-500">mm/h</span>
                  </div>
                </div>
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/50">
                  <div className="text-slate-500 text-xs font-semibold mb-1">Wind Speed</div>
                  <div className={`text-lg font-bold ${p.windSpeed > 60 ? 'text-purple-400' : 'text-slate-200'}`}>
                    {p.windSpeed} <span className="text-xs text-slate-500">km/h</span>
                  </div>
                </div>
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/50 col-span-2">
                  <div className="text-slate-500 text-xs font-semibold mb-1">Temperature</div>
                  <div className="text-lg font-bold text-orange-200">
                    {p.currentTemp} <span className="text-xs text-slate-500">°C</span>
                  </div>
                </div>
              </div>
            </div>
            
            {p.isCatastrophic ? (
              <button 
                onClick={() => handleBroadcast(p)}
                disabled={broadcastingId === p.id}
                className={`w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 ${broadcastingId === p.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <AlertTriangle className="w-5 h-5" />
                {broadcastingId === p.id ? 'Broadcasting...' : 'Broadcast Emergency Overlay'}
              </button>
            ) : (
              <button disabled className="w-full bg-slate-800 text-slate-500 font-semibold py-3 px-4 rounded-xl cursor-not-allowed border border-slate-700/50">
                Safe - No Action Required
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
