import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, MapPin, Clock } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Assuming backend runs on 5000 in dev
const API_URL = 'http://localhost:5000/api';

export default function SOSDashboard() {
  const [sosLogs, setSosLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSOS = async () => {
    try {
      const res = await axios.get(`${API_URL}/sos/active`);
      if (res.data.success) {
        setSosLogs(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch SOS signals", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSOS();
    const interval = setInterval(fetchSOS, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const defaultCenter = [19.0760, 72.8777]; // Mumbai

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
      {/* Sidebar List */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-red-500">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
          Active SOS Signals
        </h2>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-1 overflow-y-auto min-h-[400px]">
          {loading && sosLogs.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Loading signals...</p>
          ) : sosLogs.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-slate-300 font-semibold">No Active Signals</p>
              <p className="text-sm text-slate-500">The area is currently safe.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sosLogs.map(log => (
                <div key={log._id} className="bg-slate-800/50 hover:bg-slate-800 border border-red-500/30 p-4 rounded-xl transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-slate-200">User: {log.userId}</span>
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full border border-red-500/30">
                      High Priority
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                    <MapPin className="w-4 h-4" />
                    {log.location.coordinates[1].toFixed(4)}, {log.location.coordinates[0].toFixed(4)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map View */}
      <div className="w-full lg:w-2/3 h-[600px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative">
        <MapContainer center={sosLogs.length > 0 ? [sosLogs[0].location.coordinates[1], sosLogs[0].location.coordinates[0]] : defaultCenter} zoom={11} className="w-full h-full">
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {sosLogs.map(log => (
                <Marker 
                    key={log._id} 
                    position={[log.location.coordinates[1], log.location.coordinates[0]]}
                    icon={redIcon}
                >
                    <Popup className="custom-popup">
                        <div className="text-slate-800 p-1">
                            <h3 className="font-bold text-red-600 border-b border-red-100 pb-1 mb-2">SOS ALERT</h3>
                            <p className="text-sm mb-1"><strong>User:</strong> {log.userId}</p>
                            <p className="text-xs text-slate-500 mt-2">{new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
