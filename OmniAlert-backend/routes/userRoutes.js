const express = require('express');
const router = express.Router();
const User = require('../models/User');

// @route   POST /api/users/register
// @desc    Register or update a user's location and FCM token
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { userId, fcmToken, lat, lng, name } = req.body;

    if (!fcmToken || !lat || !lng) {
      return res.status(400).json({ success: false, error: 'fcmToken, lat, and lng are required' });
    }

    // Since we don't have proper auth yet, we use fcmToken or userId as a unique identifier for now
    let user = await User.findOne({ fcmToken });
    
    if (user) {
      // Update existing user location
      user.location = {
        type: 'Point',
        coordinates: [lng, lat]
      };
      user.name = name || user.name;
      user.lastUpdated = Date.now();
      await user.save();
      return res.status(200).json({ success: true, message: 'User updated', data: user });
    } else {
      // Create new user
      user = new User({
        name: name || 'Anonymous Citizen',
        fcmToken,
        location: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      });
      await user.save();
      return res.status(201).json({ success: true, message: 'User registered', data: user });
    }
  } catch (error) {
    console.error("Error in user registration:", error);
    res.status(500).json({ success: false, error: 'Failed to register or update user' });
  }
});

// @route   GET /api/users
// @desc    Get all registered users (for admin debugging)
// @access  Admin
router.get('/', async (req, res) => {
    try {
        const users = await User.find().sort({ lastUpdated: -1 });
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
});

module.exports = router;
