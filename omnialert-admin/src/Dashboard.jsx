import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import * as L from 'leaflet';
import { AlertTriangle, MapPin, Navigation, Map as MapIcon, WifiHigh, CloudRain } from 'lucide-react';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons
const incidentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const safeZoneIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const sosIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [35, 51], // Larger to stand out
  iconAnchor: [17, 51],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to bind map clicks to broadcast state
function MapEvents({ setBroadcastState }) {
  useMapEvents({
    click(e) {
      setBroadcastState(prev => ({
        ...prev,
        lat: e.latlng.lat,
        lng: e.latlng.lng
      }));
    },
  });
  return null;
}

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [safeZones, setSafeZones] = useState([]);
  const [sosSignals, setSosSignals] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [broadcastState, setBroadcastState] = useState({ lat: 19.0760, lng: 72.8777, radius: 10, message: '' });

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchSOSData, 5000); // Poll for new SOS signals every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setSafeZones([
        { id: 1, name: 'City Hall', lat: 19.0800, lng: 72.8800, capacity: 500, occupancy: 120 },
        { id: 2, name: 'Stadium', lat: 19.0600, lng: 72.8500, capacity: 2000, occupancy: 1800 }
      ]);
      await fetchSOSData();
      await fetchPredictiveData(19.0760, 72.8777);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    }
  };

  const fetchSOSData = async () => {
    try {
      const res = await axios.get(`${API_URL}/sos/active`);
      if (res.data.success) {
        setSosSignals(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch SOS signals", error);
    }
  };

  const fetchPredictiveData = async (lat, lng) => {
    try {
      const res = await axios.post(`${API_URL}/ai/predictive`, { lat, lng });
      if (res.data.success) {
        setAiAnalysis(res.data.data);
      }
    } catch (error) {
      setAiAnalysis({ predictive_analysis: "Prediction service offline or no API key." });
    }
  };

  const triggerRedAlert = async (e) => {
    e.preventDefault();
    if (window.confirm("Broadcast RED ALERT Siren to devices in this radius? This overrides silent mode!")) {
      try {
        const payload = {
            lat: broadcastState.lat,
            lng: broadcastState.lng,
            radius_km: broadcastState.radius,
            message: broadcastState.message || "Admin Broadcast: Evacuate immediately.",
            threat_type: "MANUAL_ADMIN_BROADCAST"
        };
        const res = await axios.post(`${API_URL}/admin/broadcast`, payload);
        alert(`🚨 Alert Broadcasted. Attempted to notify ${res.data.users_notified} users.`);
      } catch (error) {
        console.error("Broadcast failed:", error);
        alert("Broadcast failed: Network Error.");
      }
    }
  };

  const triggerDroughtAlert = async () => {
    if (window.confirm("Dispatch Drought/Water Scarcity Alert?")) {
        try {
            await axios.post(`${API_URL}/ai/drought-alert`, { 
                lat: broadcastState.lat, 
                lng: broadcastState.lng, 
                radius_km: 100, 
                severity_score: 85 
            });
            alert("💧 Drought Alert Sent to Radius.");
        } catch (error) {
            console.error(error);
        }
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
      <header className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="text-red-500 w-8 h-8" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            OmniAlert HQ
          </h1>
        </div>
        <div className="flex space-x-4">
            <button onClick={triggerDroughtAlert} className="bg-yellow-900/40 text-yellow-400 px-4 py-2 rounded-full font-semibold outline outline-yellow-500/50 flex flex-row items-center cursor-pointer shadow-lg shadow-yellow-900/20 hover:bg-yellow-800/60 transition-colors">
                <CloudRain className="w-4 h-4 mr-2" />
                Dispatch Drought Alert
            </button>
            <div className="bg-red-900/40 text-red-400 px-4 py-2 rounded-full font-semibold outline outline-red-500/50 flex items-center space-x-2 shadow-lg shadow-red-900/20">
            <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span>SYSTEM ACTIVE</span>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Map */}
        <div className="col-span-1 lg:col-span-2 bg-slate-800/80 rounded-2xl p-5 shadow-2xl border border-slate-700/50 h-[750px] flex flex-col backdrop-blur-sm">
          <div className="flex items-center mb-4 space-x-2">
            <MapIcon className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-slate-100 tracking-wide">Global Incident Tracker</h2>
            <span className="text-sm text-slate-400 ml-4">(Click map to set alert epicenter)</span>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden relative z-0 border border-slate-700 shadow-inner">
             <MapContainer center={[19.0760, 72.8777]} zoom={11} style={{ height: '100%', width: '100%' }}>
              <TileLayer 
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <MapEvents setBroadcastState={setBroadcastState} />

              {/* Broadcast Radius Circle Overlay */}
              {broadcastState.lat && broadcastState.lng && (
                  <Circle
                    center={[broadcastState.lat, broadcastState.lng]}
                    radius={broadcastState.radius * 1000} // Leaflet uses meters
                    pathOptions={{ color: 'red', fillColor: '#ff0000', fillOpacity: 0.2, dashArray: "5, 10" }}
                  />
              )}

              {/* SOS Signals from Citizen App */}
              {sosSignals.map(sos => (
                <Marker key={`sos-${sos._id}`} position={[sos.location.coordinates[1], sos.location.coordinates[0]]} icon={sosIcon}>
                  <Popup className="rounded-lg shadow-xl">
                     <div className="p-1">
                      <strong className="text-orange-600 block text-md mb-1 flex items-center">
                          <WifiHigh className="w-4 h-4 mr-1 animate-pulse" /> SOS S.O.S
                      </strong>
                      <span className="text-slate-600 font-bold block">User: {sos.userId}</span>
                      <span className="text-slate-500 text-xs">Reported: {new Date(sos.timestamp).toLocaleTimeString()}</span>
                     </div>
                  </Popup>
                </Marker>
              ))}

              {safeZones.map(zone => (
                <Marker key={`zone-${zone.id}`} position={[zone.lat, zone.lng]} icon={safeZoneIcon}>
                  <Popup>
                    <div className="p-1">
                      <strong className="text-green-600 block text-sm mb-1">Safe Zone: {zone.name}</strong>
                      <span className="text-slate-600 text-xs">Capacity: {zone.occupancy}/{zone.capacity}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Right Column: Controls & Analytics */}
        <div className="space-y-6">
          {/* AI Analytics View */}
          <div className="bg-slate-800/80 rounded-2xl p-6 shadow-2xl border border-blue-900/50 backdrop-blur-sm group hover:border-blue-700/50 transition-colors">
            <h2 className="text-lg font-bold text-blue-400 flex items-center mb-4">
              <span className="mr-2 text-xl">🌩️</span> AI Weather Prediction
            </h2>
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 shadow-inner group-hover:bg-slate-900 transition-colors min-h-[120px]">
              {aiAnalysis ? (
                  <>
                    <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Threat Level</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${aiAnalysis.alert_level === 'RED' ? 'bg-red-900/80 text-red-400' : 'bg-orange-900/80 text-orange-400'}`}>
                            {aiAnalysis.alert_level || 'ANALYZING'}
                        </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed font-mono mt-3">
                        {aiAnalysis.predictive_analysis}
                    </p>
                  </>
              ) : (
                  <p className="text-sm text-slate-500 font-mono animate-pulse">Running OpenRouter Models...</p>
              )}
            </div>
            <button onClick={() => fetchPredictiveData(broadcastState.lat, broadcastState.lng)} className="w-full mt-4 bg-blue-900/40 hover:bg-blue-800/60 text-blue-400 font-semibold py-2 rounded-xl border border-blue-500/30 transition-all text-sm">
                Analyze Pin Location
            </button>
          </div>

          {/* Broadcast Center */}
          <div className="bg-gradient-to-br from-red-950/60 to-slate-900 rounded-2xl p-6 shadow-2xl border border-red-900/60 relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <h2 className="text-lg font-bold text-red-500 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Siren Broadcast Center
            </h2>
            <form onSubmit={triggerRedAlert} className="space-y-4 relative z-10">
              <div className="space-y-3">
                <div className="flex space-x-2">
                    <div className="relative flex-1">
                    <Navigation className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input 
                        type="number" step="any"
                        placeholder="Latitude" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-2 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder-slate-500"
                        value={broadcastState.lat}
                        onChange={e => setBroadcastState({...broadcastState, lat: parseFloat(e.target.value)})}
                    />
                    </div>
                    <div className="relative flex-1">
                    <Navigation className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input 
                        type="number" step="any"
                        placeholder="Longitude" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-2 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder-slate-500"
                        value={broadcastState.lng}
                        onChange={e => setBroadcastState({...broadcastState, lng: parseFloat(e.target.value)})}
                    />
                    </div>
                </div>
                
                <div className="relative border-t border-slate-700/50 pt-3 flex flex-col space-y-2">
                  <label className="text-xs text-slate-400 font-semibold ml-1">Alert Radius (KM)</label>
                  <input 
                    type="number" 
                    placeholder="Radius (km)" min="1" max="1000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                    value={broadcastState.radius}
                    onChange={e => setBroadcastState({...broadcastState, radius: parseInt(e.target.value) || 10})}
                  />
                  <input type="range" min="1" max="100" value={broadcastState.radius} onChange={e => setBroadcastState({...broadcastState, radius: parseInt(e.target.value)})} className="w-full accent-red-500 mt-2" />
                </div>

                <div className="relative border-t border-slate-700/50 pt-3">
                  <textarea 
                    placeholder="Evacuation Message..." 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500 transition-colors min-h-[80px]"
                    value={broadcastState.message}
                    onChange={e => setBroadcastState({...broadcastState, message: e.target.value})}
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-900/50 active:scale-95 flex justify-center items-center">
                BLAST WARNING SIREN
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
