const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ultra_secure_ninja_secret_key_change_me_in_prod_9876543210';

/**
 * Middleware to verify full authenticated session token
 */
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied: Zero-trace session expired or missing token.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.stage !== 'authenticated') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: PIN authentication stage incomplete.',
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Session invalidated or expired.',
      error: error.message,
    });
  }
};

/**
 * Verify socket authentication handshake
 */
const verifySocketToken = (token) => {
  try {
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.stage !== 'authenticated') return null;
    return decoded;
  } catch {
    return null;
  }
};

module.exports = {
  requireAuth,
  verifySocketToken,
  JWT_SECRET,
};

