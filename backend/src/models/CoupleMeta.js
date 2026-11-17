const mongoose = require('mongoose');

const coupleMetaSchema = new mongoose.Schema(
  {
    coupleId: {
      type: String,
      default: 'couple_primary',
      unique: true,
    },
    countdownTitle: {
      type: String,
      default: 'Next Time We Meet ✈️💖',
    },
    countdownTargetDate: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default 14 days ahead
    },
    anniversaryDate: {
      type: Date,
      default: () => new Date('2024-01-01'),
    },
    notes: {
      type: String,
      default: 'Our private universe 🌌',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CoupleMeta', coupleMetaSchema);

