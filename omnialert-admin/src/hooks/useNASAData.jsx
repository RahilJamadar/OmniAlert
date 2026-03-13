import { useState, useEffect } from 'react';
import axios from 'axios';

export default function useNASAData() {
  const [data, setData] = useState({
    hazards: [],
    highRiskZones: [],
    users: [],
    metrics: { totalUsers: 0, highRiskCount: 0, pushesSent: 0, apiStatus: 'CONNECTING...' }
  });

  useEffect(() => {
    const fetchNASAData = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/admin/nasa-predictions');
        
        if (res.data.success) {
          const zones = res.data.zones || [];
          const highRisk = zones.filter(z => z.riskScore > 70);
          
          const hazardsList = highRisk.map(z => ({
            id: `h-${z.id}-${Date.now()}`,
            timestamp: z.timestamp,
            message: `NASA detects ${z.type} risk (${z.riskScore}%) at ${z.name}. Status: ${z.alertLevel}`,
            lat: z.lat,
            lng: z.lng,
            type: z.type
          }));

          // Keeping activeUsers mockup for plotting visualization
          const activeUsers = [
            { id: 'u1', lat: 19.0800, lng: 72.8800 }, 
            { id: 'u2', lat: 19.1000, lng: 72.9000 },
            { id: 'u3', lat: 28.7100, lng: 77.1100 }, 
            { id: 'u4', lat: 13.0900, lng: 80.2800 }, 
            { id: 'u5', lat: 12.9716, lng: 77.5946 }, 
          ];

          setData({
            hazards: hazardsList,
            highRiskZones: highRisk,
            users: activeUsers,
            metrics: {
              totalUsers: activeUsers.length * 1420,
              highRiskCount: hazardsList.length,
              pushesSent: 15102,
              apiStatus: 'CONNECTED (NASA Earthdata Cloud)'
            }
          });
        }
      } catch (err) {
        console.error('NASA Fetch Error:', err);
        setData(prev => ({ ...prev, metrics: { ...prev.metrics, apiStatus: 'ERROR: NASA API / TOKENS' } }));
      }
    };

    fetchNASAData();
    const interval = setInterval(fetchNASAData, 60000); // Poll NASA every 60s
    return () => clearInterval(interval);
  }, []);

  return data;
}
