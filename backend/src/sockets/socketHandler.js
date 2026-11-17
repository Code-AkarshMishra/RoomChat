const mongoose = require('mongoose');
const { verifySocketToken } = require('../middleware/auth');
const Message = require('../models/Message');
const { memoryStore } = require('../controllers/authController');

// Map of online connected sockets: userId -> Set of socket IDs
const onlineUsers = new Map();

/**
 * Deterministic private room ID for 2 partners
 */
const getCoupleRoomId = (userA, userB) => {
  return [userA.toLowerCase(), userB.toLowerCase()].sort().join('___');
};

const setupSocketHandlers = (io) => {
  // Socket Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication failed: Missing zero-trace session token.'));
    }

    const decoded = verifySocketToken(token);
    if (!decoded) {
      return next(new Error('Authentication failed: Invalid or expired session.'));
    }

    socket.user = decoded;
    next();
  });

  io.on('connection', (socket) => {
    const { userId, displayName, partnerId } = socket.user;
    const roomId = getCoupleRoomId(userId, partnerId);

    // Track online user sockets
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join exclusive 1-on-1 couple room
    socket.join(roomId);

    console.log(`🔌 [Socket Connected] ${displayName} (${userId}) | Room: ${roomId}`);

    // Notify room of presence
    const isPartnerOnline = onlineUsers.has(partnerId) && onlineUsers.get(partnerId).size > 0;
    io.to(roomId).emit('presence_status', {
      userId,
      isOnline: true,
      partnerOnline: isPartnerOnline,
    });

    // Sub-second Latency Heartbeat ping
    socket.on('ping_latency', (clientTimestamp, callback) => {
      if (typeof callback === 'function') {
        callback({
          serverTime: Date.now(),
          clientTime: clientTimestamp,
        });
      }
    });

    // 1. Send Instant Message
    socket.on('send_message', async (messageData, ackCallback) => {
      try {
        const { type, text, mediaUrl, mediaPublicId, mediaDuration, isBurnNote, burnAfterSeconds, clientTempId } = messageData;

        const newMsgPayload = {
          sender: userId,
          receiver: partnerId,
          type: type || 'text',
          text: text || '',
          mediaUrl: mediaUrl || null,
          mediaPublicId: mediaPublicId || null,
          mediaDuration: mediaDuration || null,
          status: isPartnerOnline ? 'delivered' : 'sent',
          deliveredAt: isPartnerOnline ? new Date() : null,
          isBurnNote: Boolean(isBurnNote),
          burnAfterSeconds: burnAfterSeconds || 10,
          viewedAt: null,
          isBurned: false,
          createdAt: new Date(),
        };

        let savedMessage = null;
        if (mongoose.connection.readyState === 1) {
          try {
            const doc = await Message.create(newMsgPayload);
            savedMessage = doc.toObject();
          } catch (dbErr) {
            console.warn('DB write error, using memory fallback:', dbErr.message);
          }
        }

        if (!savedMessage) {
          savedMessage = {
            _id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            ...newMsgPayload,
          };
          memoryStore.messages.push(savedMessage);
          if (memoryStore.messages.length > 300) memoryStore.messages.shift();
        }

        // Attach clientTempId if provided so client maps optimistic update instantly
        if (clientTempId) {
          savedMessage.clientTempId = clientTempId;
        }

        // Broadcast to both partners in the room with sub-second latency (<10ms)
        io.to(roomId).emit('receive_message', savedMessage);

        if (typeof ackCallback === 'function') {
          ackCallback({ success: true, message: savedMessage });
        }
      } catch (err) {
        console.error('Socket send_message error:', err);
        if (typeof ackCallback === 'function') {
          ackCallback({ success: false, error: err.message });
        }
      }
    });

    // 2. Message Delivered Acknowledgment
    socket.on('message_delivered', async ({ messageId }) => {
      try {
        try {
          await Message.findByIdAndUpdate(messageId, {
            status: 'delivered',
            deliveredAt: new Date(),
          });
        } catch {
          const m = memoryStore.messages.find((item) => item._id?.toString() === messageId);
          if (m && m.status === 'sent') m.status = 'delivered';
        }

        io.to(roomId).emit('message_status_updated', {
          messageId,
          status: 'delivered',
        });
      } catch (err) {
        console.error('Error updating delivery status:', err);
      }
    });

    // 3. Message Read Ticks
    socket.on('message_read', async ({ messageId }) => {
      try {
        try {
          await Message.findByIdAndUpdate(messageId, {
            status: 'read',
            readAt: new Date(),
          });
        } catch {
          const m = memoryStore.messages.find((item) => item._id?.toString() === messageId);
          if (m) m.status = 'read';
        }

        io.to(roomId).emit('message_status_updated', {
          messageId,
          status: 'read',
        });
      } catch (err) {
        console.error('Error updating read status:', err);
      }
    });

    // 4. Typing Indicators
    socket.on('typing_start', () => {
      socket.to(roomId).emit('partner_typing', { userId, isTyping: true });
    });

    socket.on('typing_stop', () => {
      socket.to(roomId).emit('partner_typing', { userId, isTyping: false });
    });

    // 5. Love Bomb Trigger Button (Heart / Confetti sync)
    socket.on('trigger_love_bomb', ({ emoji, count, message }) => {
      console.log(`💖 [LOVE BOMB] Triggered by ${displayName}!`);
      io.to(roomId).emit('love_bomb_explode', {
        senderId: userId,
        senderName: displayName,
        emoji: emoji || '💖',
        count: count || 40,
        message: message || `${displayName} sent you a Love Bomb! 💥❤️`,
        timestamp: Date.now(),
      });
    });

    // 6. Vibe Change Broadcast
    socket.on('broadcast_vibe', (vibeData) => {
      socket.to(roomId).emit('partner_vibe_updated', {
        userId,
        vibeStatus: vibeData,
      });
    });

    // 7. Burn-After-Reading Destruct Event
    socket.on('burn_note_expired', async ({ messageId }) => {
      try {
        try {
          await Message.findByIdAndUpdate(messageId, {
            isBurned: true,
            text: '🔥 This secret note has self-destructed.',
          });
        } catch {
          const m = memoryStore.messages.find((item) => item._id?.toString() === messageId);
          if (m) {
            m.isBurned = true;
            m.text = '🔥 This secret note has self-destructed.';
          }
        }

        io.to(roomId).emit('burn_note_incinerated', { messageId });
      } catch (err) {
        console.error('Burn note incinerate error:', err);
      }
    });

    // 8. Disconnect Handler
    socket.on('disconnect', () => {
      if (onlineUsers.has(userId)) {
        const userSockets = onlineUsers.get(userId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.to(roomId).emit('presence_status', {
            userId,
            isOnline: false,
            partnerOnline: false,
          });
        }
      }
      console.log(`🔌 [Socket Disconnected] ${displayName} (${userId})`);
    });
  });
};

module.exports = setupSocketHandlers;

