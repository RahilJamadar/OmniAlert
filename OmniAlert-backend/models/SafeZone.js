const mongoose = require('mongoose');

const safeZoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  currentOccupancy: {
    type: Number,
    default: 0
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
  amenities: [{
    type: String // e.g., 'Medical', 'Food', 'Water', 'Power'
  }],
  status: {
    type: String,
    enum: ['OPEN', 'AT_CAPACITY', 'CLOSED'],
    default: 'OPEN'
  }
}, { timestamps: true });

safeZoneSchema.index({ location: '2dsphere' });

// Virtual to check if it's full
safeZoneSchema.virtual('isFull').get(function() {
  return this.currentOccupancy >= this.capacity;
});

module.exports = mongoose.model('SafeZone', safeZoneSchema);
