const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    pinHash: {
      type: String,
      required: true,
    },
    partnerId: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    vibeStatus: {
      emoji: { type: String, default: '💖' },
      text: { type: String, default: 'Thinking of you' },
      updatedAt: { type: Date, default: Date.now },
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockoutUntil: {
      type: Date,
      default: null,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.verifyPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.passwordHash);
};

userSchema.methods.verifyPIN = async function (enteredPIN) {
  const pepper = process.env.PIN_PEPPER || '';
  return bcrypt.compare(enteredPIN + pepper, this.pinHash);
};

userSchema.statics.hashPIN = async function (pin) {
  const pepper = process.env.PIN_PEPPER || '';
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin + pepper, salt);
};

userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

module.exports = mongoose.model('User', userSchema);
