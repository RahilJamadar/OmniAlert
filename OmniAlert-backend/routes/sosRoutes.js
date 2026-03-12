const express = require('express');
const router = express.Router();
const SOSLog = require('../models/SOSLog');

// @route   POST /api/sos
// @desc    Citizen app sends SOS signal
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { userId, lat, lng, deviceId } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'Latitude and Longitude are required' });
    }

    const newSOS = new SOSLog({
      userId: userId || 'Unknown Citizen',
      deviceId: deviceId,
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    });

    await newSOS.save();

    // In a full production app, we would emit a WebSocket event here so Admin Dashboard updates instantly.
    
    res.status(201).json({ success: true, message: 'SOS signal received', data: newSOS });
  } catch (error) {
    console.error("SOS Error:", error);
    res.status(500).json({ success: false, error: 'Failed to process SOS signal' });
  }
});

// @route   GET /api/sos/active
// @desc    Admin fetches active SOS logs
// @access  Admin
router.get('/active', async (req, res) => {
  try {
    const activeSOS = await SOSLog.find({ status: 'ACTIVE' }).sort({ timestamp: -1 }).limit(100);
    res.status(200).json({ success: true, data: activeSOS });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch SOS logs' });
  }
});

module.exports = router;
