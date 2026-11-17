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
    replyTo: {
      messageId: { type: String, default: null },
      text: { type: String, default: null },
      senderName: { type: String, default: null },
      mediaUrl: { type: String, default: null },
      type: { type: String, default: null },
    },
    reactions: [
      {
        userId: { type: String, required: true },
        emoji: { type: String, required: true },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
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

messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
