const express = require('express');
const router = express.Router();
const AIService = require('../services/AI_Service');
const FCMService = require('../services/FCM_Service');
const SensorData = require('../models/SensorData');
const AlertLog = require('../models/AlertLog');

// @route   POST /api/ai/analyze
// @desc    Trigger AI risk analysis on latest sensor data and fire alerts if RED
// @access  Public (Should be protected by API key in production)
router.post('/analyze', async (req, res) => {
  try {
    // 1. Fetch recent sensor data
    // In a real scenario, this might come from the request body or the DB.
    // We'll fetch the last 10 readings from the DB for context.
    const recentSensors = await SensorData.find().sort({ timestamp: -1 }).limit(10);
    
    // Fallback if DB is empty
    const sensorPayload = recentSensors.length > 0 
      ? recentSensors 
      : [{ type: "MOCK", reading: 120, unit: "mm" }];

    // 2. Call OpenRouter AI
    const riskAssessment = await AIService.analyzeRisk(sensorPayload);

    // 3. Process Result
    if (riskAssessment.risk_level === 'RED') {
      // Determine an epicenter based on sensor data.
      // If we had real sensors, we'd average their locations or pick the most extreme one.
      // For this implementation, we use a placeholder epicenter or the first sensor's location.
      const epicenter = recentSensors[0]?.location?.coordinates || [72.8777, 19.0760]; // Default to Mumbai coords

      // 4. Create Audit Log
      const newAlert = new AlertLog({
        threat_type: riskAssessment.threat_type,
        risk_level: riskAssessment.risk_level,
        suggested_action: riskAssessment.suggested_action,
        confidence: riskAssessment.confidence,
        target_location: {
          type: 'Point',
          coordinates: epicenter
        },
        radius_km: 10
      });
      await newAlert.save();

      // 5. Broadcast Push Notifications
      const usersNotified = await FCMService.broadcastAlert(riskAssessment, epicenter, 10);
      
      // Update Log
      newAlert.users_notified = usersNotified;
      newAlert.status = 'SENT';
      await newAlert.save();

      return res.status(200).json({
        success: true,
        message: "CRITICAL ALERT SENT",
        assessment: riskAssessment,
        users_notified: usersNotified,
        alert_id: newAlert._id
      });
    }

    // If not RED, just return the assessment
    res.status(200).json({
      success: true,
      message: "Analysis complete. No critical alert triggered.",
      assessment: riskAssessment
    });

  } catch (error) {
    console.error("Error in AI analysis route:", error);
    res.status(500).json({ success: false, error: 'Failed to analyze data.' });
  }
});

// @route   POST /api/ai/predictive
// @desc    Trigger AI predictive analysis for Cyclone/Monsoon based on Lat/Lng
// @access  Public (Should be protected)
router.post('/predictive', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
        return res.status(400).json({ success: false, error: 'Lat and Lng are required' });
    }

    const prediction = await AIService.fetchWeatherPredictiveRisk(lat, lng);

    res.status(200).json({
        success: true,
        data: prediction
    });

  } catch (error) {
    console.error("Error in predictive route:", error);
    res.status(500).json({ success: false, error: 'Failed to predict data.' });
  }
});

// @route   POST /api/ai/drought-alert
// @desc    Trigger Drought alert
// @access  Admin
router.post('/drought-alert', async (req, res) => {
    try {
        const { lat, lng, radius_km, severity_score } = req.body;
        
        const mockRiskAssessment = {
            threat_type: "DROUGHT",
            risk_level: severity_score > 80 ? 'RED' : 'ORANGE',
            suggested_action: "Conserve water. Water scarcity alert issued.",
            confidence: 0.90
        };
    
        const epicenter = [lng, lat];
        const usersNotified = await FCMService.broadcastAlert(mockRiskAssessment, epicenter, radius_km || 50);
    
        res.status(200).json({
            success: true,
            message: "Drought Alert Sent Successfully",
            users_notified: usersNotified
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
});

module.exports = router;
