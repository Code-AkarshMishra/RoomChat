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

router.use(requireAuth);

router.get('/messages', getMessages);
router.delete('/messages', clearChatHistory);
router.delete('/messages/:messageId', deleteMessage);
router.post('/messages/:messageId/react', reactMessage);
router.post('/upload', upload.single('media'), uploadMedia);
router.post('/burn-note', burnNoteAction);
router.post('/vibe', updateVibe);

module.exports = router;
