const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { loginStep1, loginStep2, getProfile, updateProfile } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const step1Limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many login attempts. Please wait.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const pinLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    message: 'Too many incorrect PIN attempts.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login-step1', step1Limiter, loginStep1);
router.post('/login-step2', pinLimiter, loginStep2);
router.get('/profile', requireAuth, getProfile);
router.put('/profile', requireAuth, updateProfile);

module.exports = router;
