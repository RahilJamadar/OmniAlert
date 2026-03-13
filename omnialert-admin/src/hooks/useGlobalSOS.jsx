import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:5000/api';

export default function useGlobalSOS() {
  const [sosLogs, setSosLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const previousSOSCount = useRef(0);

  const fetchSOS = async () => {
    try {
      const res = await axios.get(`${API_URL}/sos/active`);
      if (res.data.success) {
        const newLogs = res.data.data;
        
        // If we have more logs than before, trigger a toast
        if (newLogs.length > previousSOSCount.current && previousSOSCount.current !== 0) {
          toast.error("🚨 New Emergency SOS Alert Received!", {
            duration: 5000,
            style: {
              background: '#7f1d1d',
              color: '#fff',
              fontWeight: 'bold',
              border: '1px solid #ef4444'
            },
          });
        }
        
        previousSOSCount.current = newLogs.length;
        setSosLogs(newLogs);
      }
    } catch (err) {
      console.error("Failed to fetch SOS signals", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSOS(); // initial fetch
    const interval = setInterval(fetchSOS, 5000); // Poll every 5 seconds globally
    return () => clearInterval(interval);
  }, []);

  return { sosLogs, loading, fetchSOS };
}
