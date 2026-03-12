const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  sensorType: {
    type: String,
    enum: ['RAINFALL', 'RIVER_GAUGE', 'RESERVOIR_LEVEL'],
    required: true
  },
  sensorId: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  reading: {
    type: Number,
    required: true // Rainfall in mm, river level in meters, etc.
  },
  unit: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 604800 // Automatically delete old data after 7 days (optional)
  }
}, { timestamps: true });

// Time-series optimization - compound index on sensorId and timestamp
sensorDataSchema.index({ sensorId: 1, timestamp: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
