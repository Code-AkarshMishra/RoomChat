const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true,
      index: true,
    },
    receiver: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'burn_note'],
      default: 'text',
    },
    text: {
      type: String,
      default: '',
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    mediaPublicId: {
      type: String,
      default: null,
    },
    mediaDuration: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
      index: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isBurnNote: {
      type: Boolean,
      default: false,
    },
    burnAfterSeconds: {
      type: Number,
      default: 10,
    },
    viewedAt: {
      type: Date,
      default: null,
    },
    isBurned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for high-performance chronological queries
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);

