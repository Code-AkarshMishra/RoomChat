const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { loginStep1, loginStep2, getProfile } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// Rate limiting for Step 1 credentials: max 10 requests per 5 minutes per IP
const step1Limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 5 minutes before retrying.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for Step 2 PIN: max 6 attempts per 3 minutes
const pinLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 6,
  message: {
    success: false,
    message: 'Too many incorrect PIN attempts. Security lockout active.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login-step1', step1Limiter, loginStep1);
router.post('/login-step2', pinLimiter, loginStep2);
router.get('/profile', requireAuth, getProfile);

module.exports = router;

