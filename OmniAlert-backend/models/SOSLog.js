const mongoose = require('mongoose');

const SOSLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  deviceId: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['ACTIVE', 'RESOLVED'], default: 'ACTIVE' }
});

SOSLogSchema.index({ location: '2dsphere' }); // Supports geospatial queries

module.exports = mongoose.model('SOSLog', SOSLogSchema);
