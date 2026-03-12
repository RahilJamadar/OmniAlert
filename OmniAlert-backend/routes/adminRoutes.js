const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const AIService = require('../services/AI_Service');
const FCMService = require('../services/FCM_Service');
const axios = require('axios');

// @route   GET /api/admin/system-health
// @desc    Check health of DB, AI Service API, and Cron Jobs
// @access  Admin
router.get('/system-health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: new Date(),
    status: 'OK',
    services: {
      database: 'UNKNOWN',
      openrouter_api: 'UNKNOWN',
      fcm: 'OK' // Mocked as OK for this
    }
  };

  try {
    // Check DB
    health.services.database = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED';
    if (mongoose.connection.readyState !== 1) health.status = 'DEGRADED';

    // Simple ping to check external internet connection (Google) or OpenRouter base url
    try {
        await axios.get('https://openrouter.ai/api/v1', { timeout: 3000 });
        health.services.openrouter_api = 'REACHABLE';
    } catch(e) {
        // OpenRouter root api might 404, but we just check network or 401 instead of timeout
        if (e.code === 'ECONNABORTED' || e.code === 'ENOTFOUND') {
            health.services.openrouter_api = 'UNREACHABLE';
            health.status = 'DEGRADED';
        } else {
            health.services.openrouter_api = 'REACHABLE'; // Responded with HTTP error, meaning network is fine
        }
    }

    res.status(200).json(health);

  } catch (error) {
    health.status = 'ERROR';
    health.error = error.message;
    res.status(500).json(health);
  }
});


// @route   POST /api/admin/manual-trigger
// @desc    Manually force a risk assessment pipeline execution (bypass cron)
// @access  Admin
router.post('/manual-trigger', async (req, res) => {
  try {
    // We can simulate an internal POST request to the AI route using Axios
    // Or just invoke the logic, but for simplicity we'll replicate a mock payload directly.

    // A mock dangerous payload for manual testing
    const overridePayload = req.body || [
      { type: "RAINFALL", reading: 250, unit: "mm" },
      { type: "RIVER_GAUGE", reading: 12, unit: "m" }
    ];

    const riskAssessment = await AIService.analyzeRisk(overridePayload);
    
    // We assume an epicenter for the manual trigger
    const overrideEpicenter = [72.8777, 19.0760];

    let usersNotified = 0;
    if (riskAssessment.risk_level === 'RED') {
        usersNotified = await FCMService.broadcastAlert(riskAssessment, overrideEpicenter, 10);
    }

    res.status(200).json({
        success: true,
        message: "Manual trigger executed",
        assessment: riskAssessment,
        users_notified: usersNotified
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   POST /api/admin/broadcast
// @desc    Admin manually broadcasts siren warning to devices inside a specific radius
// @access  Admin
router.post('/broadcast', async (req, res) => {
  try {
    const { lat, lng, radius_km, message, threat_type } = req.body;
    
    if (!lat || !lng || !radius_km) {
        return res.status(400).json({ success: false, error: "Latitude, longitude, and radius_km are required." });
    }

    const mockRiskAssessment = {
        threat_type: threat_type || "MANUAL_BROADCAST",
        risk_level: "RED",
        suggested_action: message || "Immediate evacuation or shelter instructed by admin.",
        confidence: 1.00
    };

    const epicenter = [lng, lat];

    // Using existing Firebase Cloud Messaging Mock/Real service
    const usersNotified = await FCMService.broadcastAlert(mockRiskAssessment, epicenter, radius_km);

    res.status(200).json({
        success: true,
        message: "Broadcast Sent Successfully",
        radius_km,
        users_notified: usersNotified
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   GET /api/admin/weather-predictions
// @desc    Polls open-meteo for major Indian cities and returns those exceeding catastrophic thresholds
// @access  Admin
router.get('/weather-predictions', async (req, res) => {
  try {
    const locations = [
      { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
      { name: "Delhi", lat: 28.7041, lng: 77.1025 },
      { name: "Chennai", lat: 13.0827, lng: 80.2707 },
      { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
      { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
      { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
      { name: "Pune", lat: 18.5204, lng: 73.8567 },
      { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
      { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
      { name: "Kochi", lat: 9.9312, lng: 76.2673 },
      { name: "Guwahati", lat: 26.1158, lng: 91.7026 },
      { name: "Srinagar", lat: 34.0837, lng: 74.7973 }
    ];

    const predictions = [];

    // Parallel fetch for speed
    const requests = locations.map(loc => 
      axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current=temperature_2m,precipitation,wind_speed_10m&hourly=temperature_2m,precipitation,windspeed_10m`)
        .then(response => ({ loc, data: response.data }))
        .catch(err => {
          console.error(`Failed to fetch weather for ${loc.name}:`, err.message);
          return null;
        })
    );

    const results = await Promise.all(requests);

    for (const result of results) {
      if (!result) continue;
      const { loc, data } = result;
      
      const currentPrec = data.current.precipitation || 0;
      const currentWind = data.current.wind_speed_10m || 0;
      
      let isCatastrophic = false;
      let threatType = "UNKNOWN";
      let severityDesc = "";

      // Thresholds: Precipitation > 15mm/h -> Flash Flood Risk
      // Wind speed > 60km/h -> Cyclonic/Severe Storm Risk
      if (currentPrec > 15) {
        isCatastrophic = true;
        threatType = "FLOOD";
        severityDesc = `Extreme rainfall detected (${currentPrec} mm/h). High risk of flash floods and waterlogging.`;
      } 
      
      if (currentWind > 60) {
        if (isCatastrophic) {
           threatType = "CYCLONE"; // Both high rain and wind usually implies cyclone/severe storm
           severityDesc += ` Also severe winds (${currentWind} km/h).`;
        } else {
           isCatastrophic = true;
           threatType = "SEVERE_STORM";
           severityDesc = `Severe wind speeds detected (${currentWind} km/h). Risk of uprooted trees and structural damage.`;
        }
      }

      // For demonstration, artificially trigger a location if nothing is catastrophic just to show the UI works,
      // Or we only return real catastrophic ones. We'll return all, but flag the catastrophic ones.
      
      predictions.push({
        id: loc.name.toLowerCase(),
        name: loc.name,
        lat: loc.lat,
        lng: loc.lng,
        currentTemp: data.current.temperature_2m,
        precipitation: currentPrec,
        windSpeed: currentWind,
        isCatastrophic,
        threatType,
        severityDesc,
        radius: 30 // Approx impact radius
      });
    }

    // Sort so catastrophic are at the top
    predictions.sort((a, b) => (b.isCatastrophic === a.isCatastrophic) ? 0 : b.isCatastrophic ? 1 : -1);

    res.status(200).json({ success: true, predictions });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
