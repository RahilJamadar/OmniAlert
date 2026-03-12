const mongoose = require('mongoose');

const alertLogSchema = new mongoose.Schema({
  threat_type: {
    type: String, // e.g., LANDSLIDE, FLOOD, CYCLONE
    required: true
  },
  risk_level: {
    type: String,
    enum: ['RED', 'ORANGE', 'YELLOW']
  },
  suggested_action: {
    type: String
  },
  confidence: {
    type: Number
  },
  triggeredAt: {
    type: Date,
    default: Date.now
  },
  target_location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number] // The epicenter [longitude, latitude]
    }
  },
  radius_km: {
    type: Number,
    default: 10
  },
  users_notified: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['SENT', 'FAILED', 'PENDING'],
    default: 'PENDING'
  }
}, { timestamps: true });

alertLogSchema.index({ target_location: '2dsphere' });
alertLogSchema.index({ triggeredAt: -1 });

module.exports = mongoose.model('AlertLog', alertLogSchema);
