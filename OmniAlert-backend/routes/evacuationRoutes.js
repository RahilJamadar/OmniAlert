const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SafeZone = require('../models/SafeZone');

// @route   GET /api/evacuate/:user_id
// @desc    Get evacuation route to the nearest safe zone for a user
// @access  Public (Should be authenticated)
router.get('/:user_id', async (req, res) => {
  try {
    const user = await User.findById(req.params.user_id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { coordinates } = user.location;

    // Use $near to find the closest OPEN SafeZone
    const nearestSafeZone = await SafeZone.findOne({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: coordinates
          }
        }
      },
      status: 'OPEN'
    });

    if (!nearestSafeZone) {
      return res.status(404).json({ 
        success: false, 
        message: 'No open safe zones found nearby' 
      });
    }

    res.status(200).json({
      success: true,
      route: {
        origin: {
          lat: coordinates[1],
          lng: coordinates[0]
        },
        destination: {
          safeZoneId: nearestSafeZone._id,
          name: nearestSafeZone.name,
          lat: nearestSafeZone.location.coordinates[1],
          lng: nearestSafeZone.location.coordinates[0],
          capacity: nearestSafeZone.capacity,
          currentOccupancy: nearestSafeZone.currentOccupancy,
          amenities: nearestSafeZone.amenities
        }
      }
    });

  } catch (error) {
    console.error("Error finding evacuation route:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;
