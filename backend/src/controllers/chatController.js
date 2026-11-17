const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const { uploadToCloudinary } = require('../config/cloudinary');
const { memoryStore } = require('./authController');

/**
 * Fetch chat history between the 2 partners
 */
const getMessages = async (req, res) => {
  try {
    const { userId, partnerId } = req.user;
    const limit = parseInt(req.query.limit, 10) || 100;

    let messages = [];
    if (mongoose.connection.readyState === 1) {
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
      } catch (err) {
        messages = [];
      }
    }

    if (!messages || messages.length === 0) {
      messages = memoryStore.messages.slice(-limit);
    }

    // Auto mark received messages as delivered/read
    const fetchNow = new Date();
    if (mongoose.connection.readyState === 1) {
      try {
        await Message.updateMany(
          { receiver: userId, sender: partnerId, status: 'sent' },
          { status: 'delivered', deliveredAt: fetchNow }
        );
      } catch {}
    }
    memoryStore.messages.forEach((m) => {
      if (m.receiver === userId && m.sender === partnerId && m.status === 'sent') {
        m.status = 'delivered';
        m.deliveredAt = fetchNow;
      }
    });

    const safeMessages = messages.map((m) => {
      if (m.receiver === userId && m.sender === partnerId && m.status === 'sent') {
        m.status = 'delivered';
        m.deliveredAt = fetchNow;
      }
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
 * Clear Chat History (Deletes all messages from both sides and database)
 */
const clearChatHistory = async (req, res) => {
  try {
    const { userId, partnerId } = req.user;

    if (mongoose.connection.readyState === 1) {
      try {
        await Message.deleteMany({
          $or: [
            { sender: userId, receiver: partnerId },
            { sender: partnerId, receiver: userId },
          ],
        });
      } catch (dbErr) {
        console.warn('DB clear error:', dbErr.message);
      }
    }

    // Clear memory store messages
    memoryStore.messages = [];

    return res.json({
      success: true,
      message: 'Chat history cleared completely from both sides.',
    });
  } catch (error) {
    console.error('Clear chat error:', error);
    return res.status(500).json({ success: false, message: 'Could not clear chat history.' });
  }
};

/**
 * Delete Individual Message
 */
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (mongoose.connection.readyState === 1) {
      try {
        await Message.findByIdAndUpdate(messageId, {
          isDeleted: true,
          text: 'This message was deleted',
          mediaUrl: null,
        });
      } catch (dbErr) {
        console.warn('DB delete message error:', dbErr.message);
      }
    }

    // Update memoryStore
    const msg = memoryStore.messages.find((m) => m._id?.toString() === messageId);
    if (msg) {
      msg.isDeleted = true;
      msg.text = 'This message was deleted';
      msg.mediaUrl = null;
    }

    return res.json({
      success: true,
      message: 'Message deleted.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * React to a message
 */
const reactMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const { userId } = req.user;

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji required.' });
    }

    let updatedMsg = null;
    if (mongoose.connection.readyState === 1) {
      try {
        const msg = await Message.findById(messageId);
        if (msg) {
          const existingIdx = msg.reactions.findIndex((r) => r.userId === userId);
          if (existingIdx !== -1) {
            if (msg.reactions[existingIdx].emoji === emoji) {
              msg.reactions.splice(existingIdx, 1); // Toggle off if clicked same emoji
            } else {
              msg.reactions[existingIdx].emoji = emoji;
            }
          } else {
            msg.reactions.push({ userId, emoji });
          }
          await msg.save();
          updatedMsg = msg.toObject();
        }
      } catch (dbErr) {
        console.warn('DB react error:', dbErr.message);
      }
    }

    const memMsg = memoryStore.messages.find((m) => m._id?.toString() === messageId);
    if (memMsg) {
      if (!memMsg.reactions) memMsg.reactions = [];
      const existingIdx = memMsg.reactions.findIndex((r) => r.userId === userId);
      if (existingIdx !== -1) {
        if (memMsg.reactions[existingIdx].emoji === emoji) {
          memMsg.reactions.splice(existingIdx, 1);
        } else {
          memMsg.reactions[existingIdx].emoji = emoji;
        }
      } else {
        memMsg.reactions.push({ userId, emoji });
      }
      if (!updatedMsg) updatedMsg = memMsg;
    }

    return res.json({
      success: true,
      reactions: updatedMsg?.reactions || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Upload Rich Media (Live Camera, Gallery, Audio Voice Notes)
 */
const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No media file provided.',
      });
    }

    const { type } = req.body;
    let resourceType = 'auto';
    if (type === 'image') resourceType = 'image';
    if (type === 'video') resourceType = 'video';
    if (type === 'audio') resourceType = 'video';

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
 * Burn-after-reading note
 */
const burnNoteAction = async (req, res) => {
  try {
    const { messageId, action } = req.body;

    let message = null;
    if (mongoose.connection.readyState === 1) {
      try {
        message = await Message.findById(messageId);
      } catch {
        message = null;
      }
    }
    if (!message) {
      message = memoryStore.messages.find((m) => m._id?.toString() === messageId);
    }

    if (!message) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
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
      return res.json({ success: true });
    }

    return res.status(400).json({ success: false, message: 'Invalid action' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Vibe Status
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

    if (mongoose.connection.readyState === 1) {
      try {
        await User.findOneAndUpdate(
          { userId },
          { vibeStatus: newVibe },
          { new: true }
        );
      } catch (err) {
        console.warn('DB update vibe error:', err.message);
      }
    }

    if (memoryStore.users.has(userId)) {
      const u = memoryStore.users.get(userId);
      u.vibeStatus = newVibe;
    }

    return res.json({
      success: true,
      vibeStatus: newVibe,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMessages,
  clearChatHistory,
  deleteMessage,
  reactMessage,
  uploadMedia,
  burnNoteAction,
  updateVibe,
};
