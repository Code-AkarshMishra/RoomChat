const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  getMessages,
  uploadMedia,
  burnNoteAction,
  updateVibe,
  getCoupleMeta,
  updateCoupleMeta,
} = require('../controllers/chatController');

router.use(requireAuth);

router.get('/messages', getMessages);
router.post('/upload', upload.single('media'), uploadMedia);
router.post('/burn-note', burnNoteAction);
router.post('/vibe', updateVibe);
router.get('/couple-meta', getCoupleMeta);
router.put('/couple-meta', updateCoupleMeta);

module.exports = router;

