const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

// In-Memory store fallback if MongoDB is not connected or in standalone testing mode
const memoryStore = {
  users: new Map(),
  messages: [],
};

// Initialize in-memory seed users
const initMemoryUsers = async () => {
  const p1Id = (process.env.PARTNER_ONE_USER_ID || 'alex').toLowerCase();
  const p1Pass = process.env.PARTNER_ONE_PASS || 'SecretPass@123';
  const p1Pin = process.env.PARTNER_ONE_PIN || '1337';
  const p1Name = process.env.PARTNER_ONE_NAME || 'Alex';

  const p2Id = (process.env.PARTNER_TWO_USER_ID || 'sam').toLowerCase();
  const p2Pass = process.env.PARTNER_TWO_PASS || 'SecretPass@456';
  const p2Pin = process.env.PARTNER_TWO_PIN || '7331';
  const p2Name = process.env.PARTNER_TWO_NAME || 'Sam';

  const p1PassHash = await bcrypt.hash(p1Pass, 10);
  const p1PinHash = await bcrypt.hash(p1Pin + (process.env.PIN_PEPPER || ''), 10);

  const p2PassHash = await bcrypt.hash(p2Pass, 10);
  const p2PinHash = await bcrypt.hash(p2Pin + (process.env.PIN_PEPPER || ''), 10);

  memoryStore.users.set(p1Id, {
    userId: p1Id,
    displayName: p1Name,
    passwordHash: p1PassHash,
    pinHash: p1PinHash,
    partnerId: p2Id,
    avatarUrl: null,
    lastSeen: null,
    lastLogin: null,
    vibeStatus: { emoji: '💖', text: 'Thinking of you', updatedAt: new Date() },
    failedLoginAttempts: 0,
    lockoutUntil: null,
  });

  memoryStore.users.set(p2Id, {
    userId: p2Id,
    displayName: p2Name,
    passwordHash: p2PassHash,
    pinHash: p2PinHash,
    partnerId: p1Id,
    avatarUrl: null,
    lastSeen: null,
    lastLogin: null,
    vibeStatus: { emoji: '✨', text: 'Online', updatedAt: new Date() },
    failedLoginAttempts: 0,
    lockoutUntil: null,
  });
};

initMemoryUsers();

/**
 * Step 1: User ID and Password
 */
const loginStep1 = async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Enter both User ID and Password.',
      });
    }

    const cleanUserId = userId.trim().toLowerCase();

    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ userId: cleanUserId });
      } catch {
        user = null;
      }
    }

    if (!user) {
      user = memoryStore.users.get(cleanUserId);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Verify password
    let passwordMatch = false;
    if (typeof user.verifyPassword === 'function') {
      passwordMatch = await user.verifyPassword(password);
    } else {
      passwordMatch = await bcrypt.compare(password, user.passwordHash);
    }

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const partialToken = jwt.sign(
      {
        userId: user.userId,
        stage: 'pin_required',
      },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    return res.status(200).json({
      success: true,
      stage: 'pin_required',
      partialToken,
      displayName: user.displayName,
    });
  } catch (error) {
    console.error('Login Step 1 Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
    });
  }
};

/**
 * Step 2: 4-digit Secret PIN Gate
 */
const loginStep2 = async (req, res) => {
  try {
    const { partialToken, pin } = req.body;

    if (!partialToken || !pin) {
      return res.status(400).json({
        success: false,
        message: 'PIN code is required.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(partialToken, JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
      });
    }

    const cleanUserId = decoded.userId;

    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ userId: cleanUserId });
      } catch {
        user = null;
      }
    }

    if (!user) {
      user = memoryStore.users.get(cleanUserId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Verify PIN
    let pinMatch = false;
    const pepper = process.env.PIN_PEPPER || '';
    if (typeof user.verifyPIN === 'function') {
      pinMatch = await user.verifyPIN(pin);
    } else {
      pinMatch = await bcrypt.compare(pin + pepper, user.pinHash);
    }

    if (!pinMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect PIN.',
      });
    }

    const now = new Date();

    // Update logging-in user's lastLogin and lastActive
    if (mongoose.connection.readyState === 1) {
      try {
        await User.findOneAndUpdate({ userId: user.userId }, { lastLogin: now, lastActive: now });
      } catch {}
    }
    if (memoryStore.users.has(user.userId)) {
      const uMem = memoryStore.users.get(user.userId);
      uMem.lastLogin = now;
      uMem.lastActive = now;
    }

    const sessionToken = jwt.sign(
      {
        userId: user.userId,
        displayName: user.displayName,
        partnerId: user.partnerId,
        stage: 'authenticated',
      },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Get partner info
    let partner = null;
    if (mongoose.connection.readyState === 1) {
      try {
        partner = await User.findOne({ userId: user.partnerId }).select('userId displayName avatarUrl lastSeen lastLogin vibeStatus');
      } catch {
        partner = null;
      }
    }

    if (!partner && memoryStore.users.has(user.partnerId)) {
      const p = memoryStore.users.get(user.partnerId);
      partner = {
        userId: p.userId,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl || null,
        lastSeen: p.lastSeen || null,
        lastLogin: p.lastLogin || null,
        vibeStatus: p.vibeStatus,
      };
    }

    return res.status(200).json({
      success: true,
      token: sessionToken,
      user: {
        userId: user.userId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || null,
        partnerId: user.partnerId,
        lastSeen: user.lastSeen || null,
        lastLogin: now,
        vibeStatus: user.vibeStatus,
      },
      partner: partner || {
        userId: user.partnerId,
        displayName: 'Partner',
        avatarUrl: null,
        lastSeen: null,
        lastLogin: null,
        vibeStatus: { emoji: '💖', text: 'Offline' },
      },
    });
  } catch (error) {
    console.error('Login Step 2 Error:', error);
    return res.status(500).json({
      success: false,
      message: 'PIN verification failed.',
    });
  }
};

/**
 * Get profile
 */
const getProfile = async (req, res) => {
  try {
    const { userId, partnerId } = req.user;

    let user = null;
    let partner = null;

    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ userId }).select('-passwordHash -pinHash');
        partner = await User.findOne({ userId: partnerId }).select('userId displayName avatarUrl lastSeen vibeStatus');
      } catch {
        user = null;
        partner = null;
      }
    }

    if (!user) user = memoryStore.users.get(userId);
    if (!partner) partner = memoryStore.users.get(partnerId);

    return res.json({
      success: true,
      user: {
        userId: user?.userId || userId,
        displayName: user?.displayName || req.user.displayName,
        avatarUrl: user?.avatarUrl || null,
        lastSeen: user?.lastSeen || null,
        lastLogin: user?.lastLogin || null,
        vibeStatus: user?.vibeStatus || { emoji: '💖', text: 'Active' },
      },
      partner: {
        userId: partner?.userId || partnerId,
        displayName: partner?.displayName || 'Partner',
        avatarUrl: partner?.avatarUrl || null,
        lastSeen: partner?.lastSeen || null,
        lastLogin: partner?.lastLogin || null,
        vibeStatus: partner?.vibeStatus || { emoji: '💖', text: 'Offline' },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Profile Settings (Name, Avatar, Password, PIN)
 */
const updateProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const { displayName, avatarUrl, newPassword, newPin } = req.body;

    const updates = {};
    if (displayName && displayName.trim()) {
      updates.displayName = displayName.trim();
    }
    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl;
    }
    if (newPassword && newPassword.length >= 6) {
      updates.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    if (newPin && newPin.length === 4) {
      const pepper = process.env.PIN_PEPPER || '';
      updates.pinHash = await bcrypt.hash(newPin + pepper, 10);
    }

    let updatedUser = null;
    if (mongoose.connection.readyState === 1) {
      try {
        updatedUser = await User.findOneAndUpdate(
          { userId },
          updates,
          { new: true }
        ).select('-passwordHash -pinHash');
      } catch {
        updatedUser = null;
      }
    }

    if (memoryStore.users.has(userId)) {
      const u = memoryStore.users.get(userId);
      Object.assign(u, updates);
      if (!updatedUser) updatedUser = u;
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        userId,
        displayName: updatedUser?.displayName || updates.displayName || req.user.displayName,
        avatarUrl: updatedUser?.avatarUrl || updates.avatarUrl || null,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Could not update profile.' });
  }
};

module.exports = {
  loginStep1,
  loginStep2,
  getProfile,
  updateProfile,
  memoryStore,
};
