const mongoose = require('mongoose');
const { verifySocketToken } = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');
const { memoryStore } = require('../controllers/authController');

// Map of online connected sockets: userId (lowercase) -> Set of socket IDs
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

    // Normalize user IDs to lowercase
    socket.user = {
      ...decoded,
      userId: decoded.userId?.toLowerCase(),
      partnerId: decoded.partnerId?.toLowerCase(),
    };
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

    // Dynamic check: is partner online right now?
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

    // 1. Send current partner presence to connecting socket
    socket.emit('presence_status', {
      userId: partnerId,
      isOnline: isPartnerOnline,
      lastSeen: partnerLastSeen,
      lastLogin: partnerLastLogin,
      partnerOnline: isPartnerOnline,
      partnerLastSeen: partnerLastSeen,
    });

    // 2. Broadcast to partner that this user has connected and is now online
    socket.to(roomId).emit('presence_status', {
      userId: userId,
      isOnline: true,
      lastSeen: null,
      partnerOnline: true,
      partnerLastSeen: null,
    });

    // 3. AUTOMATIC DELIVERY: When userId connects, all pending messages sent to userId become 'delivered'
    const now = new Date();
    try {
      if (mongoose.connection.readyState === 1) {
        await Message.updateMany(
          { receiver: userId, sender: partnerId, status: 'sent' },
          { status: 'delivered', deliveredAt: now }
        );
      }
      memoryStore.messages.forEach((m) => {
        if (m.receiver === userId && m.sender === partnerId && m.status === 'sent') {
          m.status = 'delivered';
          m.deliveredAt = now;
        }
      });

      // Notify the room so the sender's UI updates single tick -> double tick
      io.to(roomId).emit('messages_status_bulk_update', {
        receiver: userId,
        status: 'delivered',
        deliveredAt: now,
      });
    } catch (e) {
      console.warn('Auto delivery update error:', e.message);
    }

    // Latency Ping
    socket.on('ping_latency', (clientTimestamp, callback) => {
      if (typeof callback === 'function') {
        callback({
          serverTime: Date.now(),
          clientTime: clientTimestamp,
        });
      }
    });

    // 1. Send Message
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

        // Dynamic online check at the moment message is sent
        const partnerIsOnlineNow = onlineUsers.has(partnerId) && onlineUsers.get(partnerId).size > 0;
        const msgTime = new Date();

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
          status: partnerIsOnlineNow ? 'delivered' : 'sent',
          deliveredAt: partnerIsOnlineNow ? msgTime : null,
          readAt: null,
          isBurnNote: Boolean(isBurnNote),
          burnAfterSeconds: burnAfterSeconds || 10,
          viewedAt: null,
          isBurned: false,
          isDeleted: false,
          createdAt: msgTime,
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

        // Broadcast to couple room
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

    // 2. Mark All Messages as Read (Turns delivered double ticks -> blue ticks)
    socket.on('mark_all_read', async () => {
      const readTime = new Date();
      try {
        if (mongoose.connection.readyState === 1) {
          await Message.updateMany(
            { receiver: userId, sender: partnerId, status: { $ne: 'read' } },
            { status: 'read', readAt: readTime, deliveredAt: readTime }
          );
        }
        memoryStore.messages.forEach((m) => {
          if (m.receiver === userId && m.sender === partnerId && m.status !== 'read') {
            m.status = 'read';
            m.readAt = readTime;
            if (!m.deliveredAt) m.deliveredAt = readTime;
          }
        });

        // Broadcast to sender that messages were read -> turn blue ticks!
        io.to(roomId).emit('messages_status_bulk_update', {
          receiver: userId,
          status: 'read',
          readAt: readTime,
        });
      } catch (e) {
        console.warn('Mark all read error:', e.message);
      }
    });

    // 3. Individual Message Delivery & Read Ticks
    socket.on('message_delivered', async ({ messageId }) => {
      try {
        const dTime = new Date();
        if (mongoose.connection.readyState === 1) {
          try {
            await Message.findByIdAndUpdate(messageId, { status: 'delivered', deliveredAt: dTime });
          } catch {}
        }
        const m = memoryStore.messages.find((item) => item._id?.toString() === messageId);
        if (m && m.status === 'sent') {
          m.status = 'delivered';
          m.deliveredAt = dTime;
        }
        io.to(roomId).emit('message_status_updated', { messageId, status: 'delivered', deliveredAt: dTime });
      } catch (err) {}
    });

    socket.on('message_read', async ({ messageId }) => {
      try {
        const rTime = new Date();
        if (mongoose.connection.readyState === 1) {
          try {
            await Message.findByIdAndUpdate(messageId, { status: 'read', readAt: rTime });
          } catch {}
        }
        const m = memoryStore.messages.find((item) => item._id?.toString() === messageId);
        if (m) {
          m.status = 'read';
          m.readAt = rTime;
        }
        io.to(roomId).emit('message_status_updated', { messageId, status: 'read', readAt: rTime });
      } catch (err) {}
    });

    // 4. Delete Message for Everyone
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

    // 5. Clear Entire Chat
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

    // 6. Message Reactions
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

    // 7. Typing Indicators
    socket.on('typing_start', () => {
      socket.to(roomId).emit('partner_typing', { userId, isTyping: true });
    });

    socket.on('typing_stop', () => {
      socket.to(roomId).emit('partner_typing', { userId, isTyping: false });
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

    // 9. WebRTC Calling Signaling (Voice & Video) with direct socket delivery
    socket.on('call_user', (payload) => {
      const partnerSockets = onlineUsers.get(partnerId);
      const isPartnerInRoom = partnerSockets && partnerSockets.size > 0;
      if (!isPartnerInRoom) {
        socket.emit('call_failed', { reason: 'partner_offline' });
        return;
      }

      console.log(`[WebRTC] ${userId} calling ${partnerId} (${payload.callType || 'video'})`);
      const callData = {
        callerId: userId,
        callerName: displayName,
        callType: payload.callType || 'video',
        offer: payload.offer,
      };

      // Emit to room AND directly to all partner sockets
      socket.to(roomId).emit('incoming_call', callData);
      partnerSockets.forEach((sId) => {
        io.to(sId).emit('incoming_call', callData);
      });
    });

    socket.on('answer_call', (payload) => {
      console.log(`[WebRTC] ${userId} answered call from ${partnerId}`);
      const answerData = {
        responderId: userId,
        answer: payload.answer,
      };

      socket.to(roomId).emit('call_answered', answerData);
      const partnerSockets = onlineUsers.get(partnerId);
      if (partnerSockets) {
        partnerSockets.forEach((sId) => io.to(sId).emit('call_answered', answerData));
      }
    });

    socket.on('ice_candidate', (payload) => {
      const candidateData = {
        senderId: userId,
        candidate: payload.candidate,
      };

      socket.to(roomId).emit('ice_candidate', candidateData);
      const partnerSockets = onlineUsers.get(partnerId);
      if (partnerSockets) {
        partnerSockets.forEach((sId) => io.to(sId).emit('ice_candidate', candidateData));
      }
    });

    socket.on('reject_call', (payload) => {
      console.log(`[WebRTC] ${userId} rejected call from ${partnerId}`);
      const rejectData = {
        by: userId,
        reason: payload?.reason || 'declined',
      };

      socket.to(roomId).emit('call_rejected', rejectData);
      const partnerSockets = onlineUsers.get(partnerId);
      if (partnerSockets) {
        partnerSockets.forEach((sId) => io.to(sId).emit('call_rejected', rejectData));
      }
    });

    socket.on('end_call', (payload) => {
      console.log(`[WebRTC] ${userId} ended call with ${partnerId}`);
      const endData = {
        by: userId,
        reason: payload?.reason || 'ended',
      };

      socket.to(roomId).emit('call_ended', endData);
      const partnerSockets = onlineUsers.get(partnerId);
      if (partnerSockets) {
        partnerSockets.forEach((sId) => io.to(sId).emit('call_ended', endData));
      }
    });

    // 10. Disconnect Handler (Record Last Seen accurately)
    socket.on('disconnect', async () => {
      const disconnectTime = new Date();
      if (onlineUsers.has(userId)) {
        const userSockets = onlineUsers.get(userId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);

          // Update lastSeen in DB / memory
          if (mongoose.connection.readyState === 1) {
            try {
              await User.findOneAndUpdate({ userId }, { lastSeen: disconnectTime, lastActive: disconnectTime });
            } catch {}
          }
          if (memoryStore.users.has(userId)) {
            memoryStore.users.get(userId).lastSeen = disconnectTime;
            memoryStore.users.get(userId).lastActive = disconnectTime;
          }

          // Emit to partner in roomId
          socket.to(roomId).emit('presence_status', {
            userId,
            isOnline: false,
            partnerOnline: false,
            lastSeen: disconnectTime,
            partnerLastSeen: disconnectTime,
          });
        }
      }
    });
  });
};

module.exports = setupSocketHandlers;
