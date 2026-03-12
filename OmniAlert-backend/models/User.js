const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  fcmToken: {
    type: String, // Firebase Cloud Messaging token for push notifications
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create a geospatial 2dsphere index for location queries
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
