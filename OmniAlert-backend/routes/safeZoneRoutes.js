const express = require('express');
const router = express.Router();
const SafeZone = require('../models/SafeZone');

// @route   GET /api/safezones
// @desc    Get all safe zones
// @access  Admin/Public
router.get('/', async (req, res) => {
  try {
    const safeZones = await SafeZone.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: safeZones });
  } catch (error) {
    console.error("GET /safezones Error:", error);
    res.status(500).json({ success: false, error: 'Failed to fetch safe zones' });
  }
});

// @route   POST /api/safezones
// @desc    Create a new safe zone
// @access  Admin
router.post('/', async (req, res) => {
  try {
    const { name, capacity, lat, lng, amenities, status } = req.body;

    if (!name || !capacity || !lat || !lng) {
      return res.status(400).json({ success: false, error: 'Name, capacity, lat, and lng are required' });
    }

    const newSafeZone = new SafeZone({
      name,
      capacity,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)]
      },
      amenities: amenities || [],
      status: status || 'OPEN'
    });

    await newSafeZone.save();
    res.status(201).json({ success: true, data: newSafeZone });
  } catch (error) {
    console.error("POST /safezones Error:", error);
    res.status(500).json({ success: false, error: 'Failed to create safe zone' });
  }
});

// @route   DELETE /api/safezones/:id
// @desc    Delete a safe zone
// @access  Admin
router.delete('/:id', async (req, res) => {
  try {
    const safeZone = await SafeZone.findByIdAndDelete(req.params.id);
    if (!safeZone) {
      return res.status(404).json({ success: false, error: 'Safe zone not found' });
    }
    res.status(200).json({ success: true, message: 'Safe zone deleted successfully' });
  } catch (error) {
    console.error("DELETE /safezones/:id Error:", error);
    res.status(500).json({ success: false, error: 'Failed to delete safe zone' });
  }
});

module.exports = router;
