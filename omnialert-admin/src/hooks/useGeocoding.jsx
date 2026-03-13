import { useState, useEffect } from 'react';
import axios from 'axios';

// Simple in-memory cache to prevent spamming the free Nominatim API
// for recurring coordinates over the session.
const cache = new Map();

export default function useGeocoding(lat, lng) {
  const [address, setAddress] = useState("Resolving location...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lat || !lng) {
      setAddress("Unknown Location");
      setLoading(false);
      return;
    }

    const fetchAddress = async () => {
      const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      
      if (cache.has(cacheKey)) {
        setAddress(cache.get(cacheKey));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Using Nominatim OpenStreetMap Free Tier
        const res = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
        );

        if (res.data && res.data.address) {
          const { city, town, village, state, country, suburb } = res.data.address;
          // Prefer city/town over broad states
          const place = city || town || village || suburb || state || "Unknown Area";
          const formatted = `${place}, ${country || ''}`.replace(/,\s*$/, '');
          
          cache.set(cacheKey, formatted);
          setAddress(formatted);
        } else {
          setAddress("Remote/Unmapped Area");
        }
      } catch (err) {
        console.warn("Geocoding failed for", lat, lng, err.message);
        setAddress("Location Unavailable");
      } finally {
        setLoading(false);
      }
    };

    // Slight debounce for fetching to respect API limits if rapidly mounting
    const timeout = setTimeout(() => {
      fetchAddress();
    }, 300);

    return () => clearTimeout(timeout);
  }, [lat, lng]);

  return { address, loading };
}
