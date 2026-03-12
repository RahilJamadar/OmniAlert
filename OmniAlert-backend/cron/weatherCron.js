const cron = require('node-cron');
const axios = require('axios');
const SensorData = require('../models/SensorData');
const AIService = require('../services/AI_Service');
const FCMService = require('../services/FCM_Service');

// @desc Automates fetching weather sensor data and running the AI Risk Assessment Pipeline
// Runs every 15 minutes
const startCron = () => {
  cron.schedule('*/15 * * * *', async () => {
    console.log(`[Cron] Executing Scheduled AI Risk Assessment at ${new Date().toISOString()}`);

    try {
      // 1. Fetch real sensor data (Simulated here)
      // In production, this might call weather APIs or pull from IoT Gateways
      const mockSensors = [
        { type: "RAINFALL", reading: Math.random() * 200, unit: "mm" },
        { type: "RIVER_GAUGE", reading: Math.random() * 15, unit: "m" }
      ];

      // Insert logic here to optionally save this to SensorData DB if coming from external API

      // 2. Run AI Analysis
      const riskAssessment = await AIService.analyzeRisk(mockSensors);

      console.log(`[Cron] AI Analysis Result: ${riskAssessment.risk_level} - ${riskAssessment.threat_type}`);

      // 3. Trigger FCM if RED
      if (riskAssessment.risk_level === 'RED') {
          // Assume a central epicenter for the simulation
          const epicenter = [72.8777, 19.0760]; 
          await FCMService.broadcastAlert(riskAssessment, epicenter, 10);
      }

    } catch (error) {
      console.error("[Cron] Error during scheduled risk assessment:", error);
    }
  });

  console.log('Weather Cron Job Initialized (Every 15 Minutes)');
};

module.exports = startCron;
