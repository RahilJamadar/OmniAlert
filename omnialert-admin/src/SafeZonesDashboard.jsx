import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import { ShieldCheck, Plus, MapPin, Trash2, Users } from 'lucide-react';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_URL = 'http://localhost:5000/api';

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

export default function SafeZonesDashboard() {
  const [safeZones, setSafeZones] = useState([]);
  const [position, setPosition] = useState(null); // {lat, lng} from map click
  const [formData, setFormData] = useState({ name: '', capacity: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSafeZones();
  }, []);

  const fetchSafeZones = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/safezones`);
      if (res.data.success) {
        setSafeZones(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch safe zones", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!position || !formData.name || !formData.capacity) {
      alert("Please fill all details and click on the map to set a location.");
      return;
    }

    try {
      const payload = {
        name: formData.name,
        capacity: Number(formData.capacity),
        lat: position.lat,
        lng: position.lng
      };
      
      const res = await axios.post(`${API_URL}/safezones`, payload);
      if (res.data.success) {
        setFormData({ name: '', capacity: '' });
        setPosition(null);
        fetchSafeZones(); // refresh list
      }
    } catch (err) {
      console.error("Failed to create safe zone", err);
      alert("Failed to create safe zone.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this safe zone?")) return;
    try {
      const res = await axios.delete(`${API_URL}/safezones/${id}`);
      if (res.data.success) {
        fetchSafeZones();
      }
    } catch (err) {
      console.error("Failed to delete safe zone", err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen">
      <div className="mb-8">
        <h2 className="text-3xl font-bold flex items-center gap-3 text-slate-100">
          <ShieldCheck className="w-8 h-8 text-green-500" />
          Manage Safe Zones
        </h2>
        <p className="text-slate-400 mt-2">Add new secure locations for citizens to evacuate to.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creation Form & Map */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-slate-200 mb-4">Add New Safe Zone</h3>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm font-bold mb-2">Location Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., City Hall Base" 
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-bold mb-2">Maximum Capacity</label>
                  <input 
                    type="number" 
                    placeholder="e.g., 500" 
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                    value={formData.capacity}
                    onChange={e => setFormData({...formData, capacity: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-sm font-bold mb-2 flex justify-between">
                  <span>Pin Location on Map</span>
                  {position && <span className="text-green-400 font-mono text-xs">Lat: {position.lat.toFixed(4)}, Lng: {position.lng.toFixed(4)}</span>}
                </label>
                <div className="h-64 rounded-xl overflow-hidden border border-slate-700 z-0">
                  <MapContainer 
                    center={[19.0760, 72.8777]} // default Mumbai
                    zoom={10} 
                    style={{ height: '100%', width: '100%', backgroundColor: '#020617' }}
                  >
                    <TileLayer 
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    <LocationMarker position={position} setPosition={setPosition} />
                  </MapContainer>
                </div>
                {!position && <p className="text-xs text-amber-500 mt-2">* Click anywhere on the map to drop a pin.</p>}
              </div>

              <button 
                type="submit"
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 mt-4"
              >
                <Plus className="w-5 h-5" />
                Create Safe Zone
              </button>
            </form>
          </div>
        </div>

        {/* Existing Safe Zones List */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-[600px]">
          <h3 className="text-xl font-bold text-slate-200 mb-4">Active Locations</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {loading && safeZones.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Loading...</p>
            ) : safeZones.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No Safe Zones added yet.</p>
            ) : (
              safeZones.map(zone => (
                <div key={zone._id} className="bg-slate-800/50 hover:bg-slate-800 p-4 rounded-xl border border-slate-700/50 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-green-400">{zone.name}</h4>
                    <button 
                      onClick={() => handleDelete(zone._id)}
                      className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                    <MapPin className="w-3 h-3" />
                    {zone.location.coordinates[1].toFixed(4)}, {zone.location.coordinates[0].toFixed(4)}
                  </div>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Users className="w-3 h-3" /> Cap: {zone.capacity}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border ${zone.status === 'OPEN' ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-amber-500/30 text-amber-500 bg-amber-500/10'}`}>
                      {zone.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
