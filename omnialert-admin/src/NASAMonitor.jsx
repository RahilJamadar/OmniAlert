import React, { useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import * as L from 'leaflet';
import axios from 'axios';
import { ShieldAlert, Users, Radio, Activity, Globe } from 'lucide-react';
import useNASAData from './hooks/useNASAData';

const API_URL = 'http://localhost:5000/api';

// Small blue dot for safe users
const userIconSafe = new L.DivIcon({
  className: 'bg-blue-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.8)] w-3 h-3',
  iconSize: [12, 12]
});

// Yellow dot for users in danger
const userIconDanger = new L.DivIcon({
  className: 'bg-yellow-400 rounded-full border-2 border-white shadow-[0_0_15px_rgba(250,204,21,1)] w-4 h-4 animate-pulse',
  iconSize: [16, 16]
});

// Helper distance calculator
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function NASAMonitor() {
  const { hazards, highRiskZones, users, metrics } = useNASAData();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedHazard, setSelectedHazard] = useState(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");

  const handleOpenModal = (hazard) => {
    setSelectedHazard(hazard);
    setBroadcastMsg(`NASA Earthdata Warning: Critical ${hazard.type} risk detected in your immediate area. Seek high ground or nearest safe zone immediately.`);
    setModalOpen(true);
  };

  const handleBroadcast = async () => {
    if (!selectedHazard) return;
    try {
      const payload = {
        lat: selectedHazard.lat,
        lng: selectedHazard.lng,
        radius_km: 20,
        message: broadcastMsg,
        threat_type: `NASA_${selectedHazard.type.toUpperCase()}`
      };
      await axios.post(`${API_URL}/admin/broadcast`, payload);
      alert("Emergency Broadcast Sent successfully.");
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to send broadcast");
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-[#020617] text-slate-200">
      {/* Header & Live Indicator */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Globe className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent tracking-tight">
            NASA Earthdata Monitor
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800 backdrop-blur-md">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm font-bold text-green-400">LIVE FEED</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Active Users', value: metrics.totalUsers.toLocaleString(), icon: Users, color: 'text-blue-400' },
          { label: 'High Risk Zones', value: metrics.highRiskCount, icon: ShieldAlert, color: 'text-red-400' },
          { label: 'Pushes Sent (24h)', value: metrics.pushesSent.toLocaleString(), icon: Radio, color: 'text-purple-400' },
          { label: 'NASA API Status', value: metrics.apiStatus, icon: Activity, color: 'text-green-400' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-[#0f172a]/80 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-black text-slate-100">{kpi.value}</h3>
            </div>
            <div className={`p-3 bg-slate-900 rounded-xl ${kpi.color}`}>
              <kpi.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Container */}
        <div className="col-span-1 lg:col-span-2 bg-[#0f172a]/80 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden h-[600px] shadow-2xl relative z-0">
          <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%', backgroundColor: '#020617' }}>
            <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            
            {/* High Risk Zones */}
            {highRiskZones.map((zone) => (
              <Circle
                key={zone.id}
                center={[zone.lat, zone.lng]}
                radius={20000} // 20km
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.3,
                  className: 'animate-pulse'
                }}
              >
                <Popup className="bg-slate-900 text-white border-0">
                  <strong className="text-red-500">{zone.name} - {zone.type}</strong><br/>
                  Risk Score: {zone.riskScore}%
                </Popup>
              </Circle>
            ))}

            {/* Users */}
            {users.map(u => {
              // Check if in danger
              const inDanger = highRiskZones.some(z => distanceKm(u.lat, u.lng, z.lat, z.lng) <= 20);
              return (
                <Marker key={u.id} position={[u.lat, u.lng]} icon={inDanger ? userIconDanger : userIconSafe} />
              )
            })}
          </MapContainer>
        </div>

        {/* Hazard Feed */}
        <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col h-[600px]">
          <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center">
            <Radio className="w-5 h-5 mr-2 text-indigo-400" />
            Live Hazard Feed
          </h2>
          <div className="overflow-y-auto flex-1 pr-2 space-y-4">
            {hazards.length === 0 ? (
               <p className="text-slate-500 text-center mt-10">No active hazards detected.</p>
            ) : hazards.map(h => (
              <div key={h.id} className="bg-slate-900 border border-red-900/30 p-4 rounded-2xl relative group hover:border-red-500/50 transition-colors">
                <span className="absolute top-3 right-3 text-xs text-slate-500">
                  {new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                </span>
                <div className="flex items-start gap-3 mb-3">
                  <ShieldAlert className="w-5 h-5 text-red-500 mt-1" />
                  <p className="text-slate-300 text-sm leading-relaxed pr-8">{h.message}</p>
                </div>
                <button 
                  onClick={() => handleOpenModal(h)}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-2 rounded-xl text-sm transition-colors border border-red-500/20"
                >
                  Prepare Broadcast
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Broadcast Modal Glassmorphism */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/80 backdrop-blur-md p-4">
          <div className="bg-[#0f172a] border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.15)] relative overflow-hidden">
             {/* decorative glow */}
             <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/20 blur-3xl rounded-full pointer-events-none"></div>

             <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
               <Broadcast className="w-6 h-6 text-red-500" />
               Confirm Alert
             </h3>
             <p className="text-slate-400 text-sm mb-6">You are about to override silent mode on all devices within 20km of {selectedHazard?.lat.toFixed(2)}, {selectedHazard?.lng.toFixed(2)}.</p>
             
             <textarea 
               className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-white text-sm mb-6 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all min-h-[120px]"
               value={broadcastMsg}
               onChange={(e) => setBroadcastMsg(e.target.value)}
             />

             <div className="flex gap-4 relative z-10">
               <button 
                 onClick={() => setModalOpen(false)}
                 className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleBroadcast}
                 className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl transition-colors shadow-lg shadow-red-900/50"
               >
                 SEND NOW
               </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
