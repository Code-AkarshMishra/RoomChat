const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  getMessages,
  clearChatHistory,
  deleteMessage,
  reactMessage,
  uploadMedia,
  burnNoteAction,
  updateVibe,
} = require('../controllers/chatController');
const { saveSubscription, removeSubscription, getVapidPublicKey } = require('../utils/webPush');

router.use(requireAuth);

router.get('/messages', getMessages);
router.delete('/messages', clearChatHistory);
router.delete('/messages/:messageId', deleteMessage);
router.post('/messages/:messageId/react', reactMessage);
router.post('/upload', upload.single('media'), uploadMedia);
router.post('/burn-note', burnNoteAction);
router.post('/vibe', updateVibe);

// Web Push: get VAPID public key
router.get('/push-key', (req, res) => {
  const key = getVapidPublicKey();
  if (!key) return res.status(503).json({ success: false, error: 'Push not configured' });
  res.json({ success: true, publicKey: key });
});

// Web Push: save/update subscription for logged-in user
router.post('/push-subscribe', (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, error: 'Invalid subscription' });
  }
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  saveSubscription(userId, subscription);
  console.log(`[WebPush] Subscription saved for ${userId}`);
  res.json({ success: true, message: 'Subscribed to push notifications' });
});

// Web Push: unsubscribe
router.post('/push-unsubscribe', (req, res) => {
  const userId = req.user?.userId;
  if (userId) removeSubscription(userId);
  res.json({ success: true });
});

module.exports = router;
