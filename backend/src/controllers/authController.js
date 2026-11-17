const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

// In-Memory store fallback if MongoDB is not connected or in standalone testing mode
const memoryStore = {
  users: new Map(),
  messages: [],
  coupleMeta: {
    coupleId: 'couple_primary',
    countdownTitle: 'Next Time We Meet ✈️💖',
    countdownTargetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    anniversaryDate: new Date('2024-01-01').toISOString(),
    notes: 'Our private universe 🌌',
  },
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
    vibeStatus: { emoji: '✨', text: 'Counting down seconds', updatedAt: new Date() },
    failedLoginAttempts: 0,
    lockoutUntil: null,
  });
};

initMemoryUsers();

/**
 * Step 1: User ID and Password
 * Output: Temporary JWT token valid for 3 minutes for PIN verification
 */
const loginStep1 = async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Password are required.',
      });
    }

    const cleanUserId = userId.trim().toLowerCase();

    // Check DB or memory
    let user = null;
    try {
      user = await User.findOne({ userId: cleanUserId });
    } catch {
      user = null;
    }

    if (!user) {
      user = memoryStore.users.get(cleanUserId);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Access denied.',
      });
    }

    // Check lockout
    if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.lockoutUntil) - new Date()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Account temporarily locked due to multiple failed attempts. Retry in ${waitMinutes} minute(s).`,
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
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
      }
      if (typeof user.save === 'function') await user.save();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Access denied.',
      });
    }

    // Reset failed counter
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    if (typeof user.save === 'function') await user.save();

    // Issue short-lived partial token for PIN verification
    const partialToken = jwt.sign(
      {
        userId: user.userId,
        stage: 'pin_required',
      },
      JWT_SECRET,
      { expiresIn: '3m' }
    );

    return res.status(200).json({
      success: true,
      message: 'Step 1 verified. Proceed to 4-digit PIN verification.',
      stage: 'pin_required',
      partialToken,
      displayName: user.displayName,
    });
  } catch (error) {
    console.error('Login Step 1 Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication service encountered an unexpected error.',
    });
  }
};

/**
 * Step 2: 4-digit Secret PIN Gate
 * Output: Full zero-trace session token
 */
const loginStep2 = async (req, res) => {
  try {
    const { partialToken, pin } = req.body;

    if (!partialToken || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Partial token and 4-digit PIN are required.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(partialToken, JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Step 1 verification expired. Please re-enter credentials.',
      });
    }

    if (decoded.stage !== 'pin_required') {
      return res.status(403).json({
        success: false,
        message: 'Invalid verification sequence.',
      });
    }

    const cleanUserId = decoded.userId;

    let user = null;
    try {
      user = await User.findOne({ userId: cleanUserId });
    } catch {
      user = null;
    }

    if (!user) {
      user = memoryStore.users.get(cleanUserId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User identity lost.',
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
        message: 'Incorrect 4-digit Secret PIN.',
      });
    }

    // Generate Full Session Token (Zero-trace: only held in volatile client memory)
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
    try {
      partner = await User.findOne({ userId: user.partnerId }).select('userId displayName vibeStatus');
    } catch {
      partner = null;
    }

    if (!partner && memoryStore.users.has(user.partnerId)) {
      const p = memoryStore.users.get(user.partnerId);
      partner = {
        userId: p.userId,
        displayName: p.displayName,
        vibeStatus: p.vibeStatus,
      };
    }

    return res.status(200).json({
      success: true,
      message: 'Access Granted. Entering secure room.',
      token: sessionToken,
      user: {
        userId: user.userId,
        displayName: user.displayName,
        partnerId: user.partnerId,
        vibeStatus: user.vibeStatus,
      },
      partner: partner || {
        userId: user.partnerId,
        displayName: 'My Partner',
        vibeStatus: { emoji: '💖', text: 'Online' },
      },
    });
  } catch (error) {
    console.error('Login Step 2 Error:', error);
    return res.status(500).json({
      success: false,
      message: 'PIN verification service error.',
    });
  }
};

/**
 * Get current user profile and partner details
 */
const getProfile = async (req, res) => {
  try {
    const { userId, partnerId } = req.user;

    let user = null;
    let partner = null;

    try {
      user = await User.findOne({ userId }).select('-passwordHash -pinHash');
      partner = await User.findOne({ userId: partnerId }).select('userId displayName vibeStatus');
    } catch {
      user = memoryStore.users.get(userId);
      partner = memoryStore.users.get(partnerId);
    }

    return res.json({
      success: true,
      user: {
        userId: user?.userId || userId,
        displayName: user?.displayName || req.user.displayName,
        vibeStatus: user?.vibeStatus || { emoji: '💖', text: 'Active' },
      },
      partner: {
        userId: partner?.userId || partnerId,
        displayName: partner?.displayName || 'My Partner',
        vibeStatus: partner?.vibeStatus || { emoji: '💖', text: 'Connected' },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  loginStep1,
  loginStep2,
  getProfile,
  memoryStore,
};

