const express = require('express');
const router = express.Router();

const startTime = Date.now();

/**
 * Health check & anti-sleep endpoint
 * Target this URL (e.g., https://your-backend.onrender.com/ping) via UptimeRobot every 5-10 minutes
 */
router.get('/ping', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  return res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: `${uptimeSeconds}s`,
    service: 'RoomChat Ultra-Secure Socket Gateway',
    antiSleep: 'Active. Keep-alive acknowledged.',
  });
});

router.get('/health', (req, res) => {
  return res.status(200).json({
    ok: true,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
  });
});

module.exports = router;

