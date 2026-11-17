const Message = require('../models/Message');
const User = require('../models/User');
const CoupleMeta = require('../models/CoupleMeta');
const { uploadToCloudinary } = require('../config/cloudinary');
const { memoryStore } = require('./authController');

/**
 * Fetch chat history between the 2 partners
 */
const getMessages = async (req, res) => {
  try {
    const { userId, partnerId } = req.user;
    const limit = parseInt(req.query.limit, 10) || 50;

    let messages = [];
    try {
      messages = await Message.find({
        $or: [
          { sender: userId, receiver: partnerId },
          { sender: partnerId, receiver: userId },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      messages = messages.reverse();
    } catch {
      // Memory store fallback
      messages = memoryStore.messages.slice(-limit);
    }

    // Clean up burned notes so content is never leaked
    const safeMessages = messages.map((m) => {
      if (m.isBurnNote && m.isBurned) {
        return {
          ...m,
          text: '🔥 This secret note has self-destructed.',
        };
      }
      return m;
    });

    return res.json({
      success: true,
      messages: safeMessages,
    });
  } catch (error) {
    console.error('getMessages error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Upload Rich Media (Live Camera, Gallery Photo/Video, Voice Note) to Cloudinary
 */
const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No media file provided.',
      });
    }

    const { type } = req.body; // 'image', 'video', 'audio'
    let resourceType = 'auto';
    if (type === 'image') resourceType = 'image';
    if (type === 'video') resourceType = 'video';
    if (type === 'audio') resourceType = 'video'; // Cloudinary handles audio under video resource_type

    const uploadResult = await uploadToCloudinary(
      req.file.buffer,
      'roomchat_media',
      resourceType
    );

    return res.json({
      success: true,
      mediaUrl: uploadResult.url,
      publicId: uploadResult.public_id,
      resourceType: uploadResult.resource_type,
      duration: uploadResult.duration,
    });
  } catch (error) {
    console.error('uploadMedia error:', error);
    return res.status(500).json({
      success: false,
      message: 'Media upload failed.',
      error: error.message,
    });
  }
};

/**
 * Handle Burn-After-Reading note open/destruct
 */
const burnNoteAction = async (req, res) => {
  try {
    const { messageId, action } = req.body; // action: 'view' | 'destruct'
    const { userId } = req.user;

    let message = null;
    try {
      message = await Message.findById(messageId);
    } catch {
      message = memoryStore.messages.find((m) => m._id?.toString() === messageId);
    }

    if (!message) {
      return res.status(404).json({ success: false, message: 'Note not found or already gone.' });
    }

    if (action === 'view') {
      if (!message.viewedAt) {
        message.viewedAt = new Date();
        if (typeof message.save === 'function') await message.save();
      }
      return res.json({
        success: true,
        viewedAt: message.viewedAt,
        burnAfterSeconds: message.burnAfterSeconds || 10,
        text: message.isBurned ? '🔥 This secret note has self-destructed.' : message.text,
      });
    }

    if (action === 'destruct') {
      message.isBurned = true;
      message.text = '🔥 This secret note has self-destructed.';
      if (typeof message.save === 'function') await message.save();

      return res.json({
        success: true,
        message: 'Note incinerated completely.',
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid action' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update personal Vibe Status
 */
const updateVibe = async (req, res) => {
  try {
    const { emoji, text } = req.body;
    const { userId } = req.user;

    const newVibe = {
      emoji: emoji || '💖',
      text: text || 'Thinking of you',
      updatedAt: new Date(),
    };

    try {
      await User.findOneAndUpdate(
        { userId },
        { vibeStatus: newVibe },
        { new: true }
      );
    } catch {
      if (memoryStore.users.has(userId)) {
        const u = memoryStore.users.get(userId);
        u.vibeStatus = newVibe;
      }
    }

    return res.json({
      success: true,
      vibeStatus: newVibe,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Couple Countdown & Romantic Meta
 */
const getCoupleMeta = async (req, res) => {
  try {
    let meta = null;
    try {
      meta = await CoupleMeta.findOne({ coupleId: 'couple_primary' });
    } catch {
      meta = memoryStore.coupleMeta;
    }

    if (!meta) {
      meta = memoryStore.coupleMeta;
    }

    return res.json({
      success: true,
      data: meta,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Couple Countdown
 */
const updateCoupleMeta = async (req, res) => {
  try {
    const { countdownTitle, countdownTargetDate, anniversaryDate, notes } = req.body;

    const updateData = {
      ...(countdownTitle && { countdownTitle }),
      ...(countdownTargetDate && { countdownTargetDate: new Date(countdownTargetDate) }),
      ...(anniversaryDate && { anniversaryDate: new Date(anniversaryDate) }),
      ...(notes && { notes }),
    };

    let meta = null;
    try {
      meta = await CoupleMeta.findOneAndUpdate(
        { coupleId: 'couple_primary' },
        updateData,
        { upsert: true, new: true }
      );
    } catch {
      Object.assign(memoryStore.coupleMeta, updateData);
      meta = memoryStore.coupleMeta;
    }

    return res.json({
      success: true,
      data: meta,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMessages,
  uploadMedia,
  burnNoteAction,
  updateVibe,
  getCoupleMeta,
  updateCoupleMeta,
};

