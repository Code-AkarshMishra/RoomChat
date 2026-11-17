const mongoose = require('mongoose');
const { verifySocketToken } = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');
const { memoryStore } = require('../controllers/authController');

// Map of online connected sockets: userId -> Set of socket IDs
const onlineUsers = new Map();

const getCoupleRoomId = (userA, userB) => {
  return [userA.toLowerCase(), userB.toLowerCase()].sort().join('___');
};

const setupSocketHandlers = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication failed: Missing token.'));
    }

    const decoded = verifySocketToken(token);
    if (!decoded) {
      return next(new Error('Authentication failed: Invalid session.'));
    }

    socket.user = decoded;
    next();
  });

  io.on('connection', async (socket) => {
    const { userId, displayName, partnerId } = socket.user;
    const roomId = getCoupleRoomId(userId, partnerId);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    socket.join(roomId);

    // Update lastSeen and notify room
    const isPartnerOnline = onlineUsers.has(partnerId) && onlineUsers.get(partnerId).size > 0;

    // Fetch partner's actual last seen and last login
    let partnerLastSeen = null;
    let partnerLastLogin = null;
    if (mongoose.connection.readyState === 1) {
      try {
        const pDoc = await User.findOne({ userId: partnerId }).select('lastSeen lastLogin');
        if (pDoc?.lastSeen) partnerLastSeen = pDoc.lastSeen;
        if (pDoc?.lastLogin) partnerLastLogin = pDoc.lastLogin;
      } catch {}
    } else if (memoryStore.users.has(partnerId)) {
      const p = memoryStore.users.get(partnerId);
      partnerLastSeen = p.lastSeen || null;
      partnerLastLogin = p.lastLogin || null;
    }

    // 1. Send to newly connected socket their partner's presence
    socket.emit('presence_status', {
      userId: partnerId,
      isOnline: isPartnerOnline,
      lastSeen: partnerLastSeen,
      lastLogin: partnerLastLogin,
      partnerOnline: isPartnerOnline,
      partnerLastSeen: partnerLastSeen,
    });

    // 2. Notify partner that this user is now online
    socket.to(roomId).emit('presence_status', {
      userId: userId,
      isOnline: true,
      lastSeen: null,
      partnerOnline: true,
      partnerLastSeen: null,
    });

    // Latency Ping
    socket.on('ping_latency', (clientTimestamp, callback) => {
      if (typeof callback === 'function') {
        callback({
          serverTime: Date.now(),
          clientTime: clientTimestamp,
        });
      }
    });

    // 1. Send Message (with replyTo support)
    socket.on('send_message', async (messageData, ackCallback) => {
      try {
        const {
          type,
          text,
          mediaUrl,
          mediaPublicId,
          mediaDuration,
          replyTo,
          isBurnNote,
          burnAfterSeconds,
          clientTempId,
        } = messageData;

        const newMsgPayload = {
          sender: userId,
          receiver: partnerId,
          type: type || 'text',
          text: text || '',
          mediaUrl: mediaUrl || null,
          mediaPublicId: mediaPublicId || null,
          mediaDuration: mediaDuration || null,
          replyTo: replyTo || null,
          reactions: [],
          status: isPartnerOnline ? 'delivered' : 'sent',
          deliveredAt: isPartnerOnline ? new Date() : null,
          isBurnNote: Boolean(isBurnNote),
          burnAfterSeconds: burnAfterSeconds || 10,
          viewedAt: null,
          isBurned: false,
          isDeleted: false,
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

        if (clientTempId) {
          savedMessage.clientTempId = clientTempId;
        }

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

    // 2. Delete Message for Everyone
    socket.on('delete_message', async ({ messageId }) => {
      try {
        if (mongoose.connection.readyState === 1) {
          try {
            await Message.findByIdAndUpdate(messageId, {
              isDeleted: true,
              text: 'This message was deleted',
              mediaUrl: null,
            });
          } catch {}
        }

        const m = memoryStore.messages.find((item) => item._id?.toString() === messageId);
        if (m) {
          m.isDeleted = true;
          m.text = 'This message was deleted';
          m.mediaUrl = null;
        }

        io.to(roomId).emit('message_deleted', { messageId });
      } catch (err) {
        console.error('Socket delete_message error:', err);
      }
    });

    // 3. Clear Entire Chat
    socket.on('clear_chat', async () => {
      try {
        if (mongoose.connection.readyState === 1) {
          try {
            await Message.deleteMany({
              $or: [
                { sender: userId, receiver: partnerId },
                { sender: partnerId, receiver: userId },
              ],
            });
          } catch {}
        }
        memoryStore.messages = [];
        io.to(roomId).emit('chat_cleared');
      } catch (err) {
        console.error('Socket clear_chat error:', err);
      }
    });

    // 4. Message Reaction
    socket.on('react_message', async ({ messageId, emoji }) => {
      try {
        let reactions = [];
        if (mongoose.connection.readyState === 1) {
          try {
            const msg = await Message.findById(messageId);
            if (msg) {
              const existingIdx = msg.reactions.findIndex((r) => r.userId === userId);
              if (existingIdx !== -1) {
                if (msg.reactions[existingIdx].emoji === emoji) {
                  msg.reactions.splice(existingIdx, 1);
                } else {
                  msg.reactions[existingIdx].emoji = emoji;
                }
              } else {
                msg.reactions.push({ userId, emoji });
              }
              await msg.save();
              reactions = msg.reactions;
            }
          } catch {}
        }

        const memMsg = memoryStore.messages.find((item) => item._id?.toString() === messageId);
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
          reactions = memMsg.reactions;
        }

        io.to(roomId).emit('message_reaction_updated', { messageId, reactions });
      } catch (err) {
        console.error('Socket react_message error:', err);
      }
    });

    // 5. Message Delivery & Read Ticks
    socket.on('message_delivered', async ({ messageId }) => {
      try {
        if (mongoose.connection.readyState === 1) {
          try {
            await Message.findByIdAndUpdate(messageId, { status: 'delivered', deliveredAt: new Date() });
          } catch {}
        }
        const m = memoryStore.messages.find((item) => item._id?.toString() === messageId);
        if (m && m.status === 'sent') m.status = 'delivered';
        io.to(roomId).emit('message_status_updated', { messageId, status: 'delivered' });
      } catch (err) {}
    });

    socket.on('message_read', async ({ messageId }) => {
      try {
        if (mongoose.connection.readyState === 1) {
          try {
            await Message.findByIdAndUpdate(messageId, { status: 'read', readAt: new Date() });
          } catch {}
        }
        const m = memoryStore.messages.find((item) => item._id?.toString() === messageId);
        if (m) m.status = 'read';
        io.to(roomId).emit('message_status_updated', { messageId, status: 'read' });
      } catch (err) {}
    });

    // 6. Typing Indicators
    socket.on('typing_start', () => {
      socket.to(roomId).emit('partner_typing', { userId, isTyping: true });
    });

    socket.on('typing_stop', () => {
      socket.to(roomId).emit('partner_typing', { userId, isTyping: false });
    });

    // 7. Vibe & Profile Broadcast
    socket.on('broadcast_vibe', (vibeData) => {
      socket.to(roomId).emit('partner_vibe_updated', { userId, vibeStatus: vibeData });
    });

    socket.on('broadcast_profile_updated', (profileData) => {
      socket.to(roomId).emit('partner_profile_updated', profileData);
    });

    // 8. Burn note expired
    socket.on('burn_note_expired', async ({ messageId }) => {
      try {
        if (mongoose.connection.readyState === 1) {
          try {
            await Message.findByIdAndUpdate(messageId, {
              isBurned: true,
              text: '🔥 This secret note has self-destructed.',
            });
          } catch {}
        }
        const m = memoryStore.messages.find((item) => item._id?.toString() === messageId);
        if (m) {
          m.isBurned = true;
          m.text = '🔥 This secret note has self-destructed.';
        }
        io.to(roomId).emit('burn_note_incinerated', { messageId });
      } catch (err) {}
    });

    // 9. WebRTC Calling Signaling (Voice & Video)
    socket.on('call_user', (payload) => {
      socket.to(roomId).emit('incoming_call', {
        callerId: userId,
        callerName: displayName,
        callType: payload.callType || 'video', // 'video' | 'audio'
        offer: payload.offer,
      });
    });

    socket.on('answer_call', (payload) => {
      socket.to(roomId).emit('call_answered', {
        responderId: userId,
        answer: payload.answer,
      });
    });

    socket.on('ice_candidate', (payload) => {
      socket.to(roomId).emit('ice_candidate', {
        senderId: userId,
        candidate: payload.candidate,
      });
    });

    socket.on('reject_call', (payload) => {
      socket.to(roomId).emit('call_rejected', {
        by: userId,
        reason: payload?.reason || 'declined',
      });
    });

    socket.on('end_call', (payload) => {
      socket.to(roomId).emit('call_ended', {
        by: userId,
        reason: payload?.reason || 'ended',
      });
    });

    // 10. Disconnect Handler (Record Last Seen accurately)
    socket.on('disconnect', async () => {
      const now = new Date();
      if (onlineUsers.has(userId)) {
        const userSockets = onlineUsers.get(userId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);

          // Update lastSeen in DB / memory
          if (mongoose.connection.readyState === 1) {
            try {
              await User.findOneAndUpdate({ userId }, { lastSeen: now, lastActive: now });
            } catch {}
          }
          if (memoryStore.users.has(userId)) {
            memoryStore.users.get(userId).lastSeen = now;
            memoryStore.users.get(userId).lastActive = now;
          }

          // Emit to partner in roomId
          socket.to(roomId).emit('presence_status', {
            userId,
            isOnline: false,
            partnerOnline: false,
            lastSeen: now,
            partnerLastSeen: now,
          });
        }
      }
    });
  });
};

module.exports = setupSocketHandlers;
