import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import LiveCameraModal from '../Modals/LiveCameraModal';
import ImageLightboxModal from '../Modals/ImageLightboxModal';
import SettingsModal from '../Modals/SettingsModal';
import CallModal from '../Modals/CallModal';
import MessageInfoModal from '../Modals/MessageInfoModal';
import { 
  apiGetMessages, 
  apiBurnNoteAction, 
  apiDeleteMessage,
  apiReactMessage,
  clearAuthToken 
} from '../../services/api';
import { initSocket, getSocket, disconnectSocket } from '../../services/socket';
import { sounds } from '../../utils/soundEffects';

export default function ChatApp({ sessionUser, initialPartner, onPanicExit, theme, onToggleTheme }) {
  const [currentUser, setCurrentUser] = useState(sessionUser);
  const [partner, setPartner] = useState(initialPartner);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);

  // Multi-theme wallpaper
  const [activeWallpaper, setActiveWallpaper] = useState(() => {
    return localStorage.getItem('roomchat_wallpaper') || 'midnight-violet';
  });

  // Browser Notifications toggle
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('roomchat_notifications') === 'true';
  });

  // WebRTC Call state
  const [callState, setCallState] = useState(null);
  const [activeSocket, setActiveSocket] = useState(null);

  // Modals state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);
  const [infoModalMessage, setInfoModalMessage] = useState(null);

  // Ref to track if media picker, camera, or call is currently open (to prevent accidental panic exit on mobile)
  const isBusyRef = useRef(false);
  isBusyRef.current = cameraOpen || Boolean(callState) || settingsOpen;

  const isDark = theme === 'dark';

  // Wallpaper change handler
  const handleSelectWallpaper = (wpId) => {
    setActiveWallpaper(wpId);
    localStorage.setItem('roomchat_wallpaper', wpId);
  };

  // Toggle browser push notifications
  const handleToggleNotifications = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }

    if (Notification.permission === 'granted') {
      const next = !notificationsEnabled;
      setNotificationsEnabled(next);
      localStorage.setItem('roomchat_notifications', String(next));
    } else {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('roomchat_notifications', 'true');
        new Notification('RoomChat Notifications Enabled', {
          body: 'You will receive instant alerts when your partner messages you.',
          icon: partner?.avatarUrl || '/favicon.svg',
        });
      } else {
        alert('Notification permission was denied in your browser settings.');
      }
    }
  };

  // 🚨 Emergency Stealth & Tab Switch Detection (Safe on mobile during calls/camera)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Don't panic exit if user is actively in a camera modal or WebRTC call!
      if (document.hidden && !isBusyRef.current) {
        // Tab minimize / app backgrounded
        // Clean disconnect
        disconnectSocket();
        clearAuthToken();
        onPanicExit();
      }
    };

    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      if (!isBusyRef.current) {
        disconnectSocket();
        clearAuthToken();
        onPanicExit();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onPanicExit]);

  // Load chat history
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const msgRes = await apiGetMessages(100);
        if (msgRes.success) {
          setMessages(msgRes.messages || []);
        }
      } catch (err) {
        console.error('Error loading chat history:', err);
      }
    };
    fetchInitialData();
  }, []);

  // Socket Connection & Real-Time Listeners
  useEffect(() => {
    const socket = initSocket();
    if (!socket) return;
    setActiveSocket(socket);

    // Presence & Last Seen updates
    socket.on('presence_status', (data) => {
      if (data.userId?.toLowerCase() === partner?.userId?.toLowerCase()) {
        setIsPartnerOnline(Boolean(data.isOnline));
        if (data.lastSeen !== undefined) {
          setPartner((prev) => ({ ...prev, lastSeen: data.lastSeen }));
        }
      }
      if (data.partnerOnline !== undefined) {
        setIsPartnerOnline(Boolean(data.partnerOnline));
      }
      if (data.partnerLastSeen !== undefined) {
        setPartner((prev) => ({ ...prev, lastSeen: data.partnerLastSeen }));
      }
    });

    // Mark messages as read on connect
    socket.emit('mark_all_read');

    // Incoming new message
    socket.on('receive_message', (newMsg) => {
      setMessages((prev) => {
        if (newMsg.clientTempId) {
          const matchIndex = prev.findIndex(
            (m) => m.clientTempId === newMsg.clientTempId || m._id === newMsg.clientTempId
          );
          if (matchIndex !== -1) {
            const next = [...prev];
            next[matchIndex] = newMsg;
            return next;
          }
        }
        if (prev.some((m) => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });

      // If message is received from partner (I am the receiver)
      if (newMsg.sender?.toLowerCase() !== currentUser.userId?.toLowerCase()) {
        socket.emit('message_delivered', { messageId: newMsg._id });
        socket.emit('message_read', { messageId: newMsg._id });

        // Play gentle audio sound ping
        sounds.playMessagePing();

        // Trigger browser notification if enabled
        if (localStorage.getItem('roomchat_notifications') === 'true' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            const previewText = newMsg.text || (newMsg.type === 'image' ? '📷 Photo' : newMsg.type === 'audio' ? '🎵 Voice note' : 'New message');
            new Notification(partner?.displayName || 'Partner', {
              body: previewText,
              icon: partner?.avatarUrl || '/favicon.svg',
              tag: 'roomchat_msg',
            });
          } catch {}
        }
      }
    });

    // WebRTC Incoming Call from Partner
    socket.on('incoming_call', (data) => {
      setCallState({
        mode: 'incoming',
        callType: data.callType || 'video',
        callerName: data.callerName || partner?.displayName || 'Partner',
        callerAvatar: partner?.avatarUrl || null,
        callerId: data.callerId,
        offer: data.offer,
      });
    });

    // Message Deleted for Everyone
    socket.on('message_deleted', ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, isDeleted: true, text: 'This message was deleted', mediaUrl: null }
            : m
        )
      );
    });

    // Entire Chat Cleared
    socket.on('chat_cleared', () => {
      setMessages([]);
    });

    // Message Reaction Updated
    socket.on('message_reaction_updated', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    });

    // Partner Profile Updated
    socket.on('partner_profile_updated', (profile) => {
      setPartner((prev) => ({
        ...prev,
        displayName: profile.displayName || prev.displayName,
        avatarUrl: profile.avatarUrl !== undefined ? profile.avatarUrl : prev.avatarUrl,
      }));
    });

    // Single message status tick update (sent -> delivered -> read)
    socket.on('message_status_updated', ({ messageId, status, readAt, deliveredAt }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === messageId || m.clientTempId === messageId) {
            const updates = { status };
            if (readAt) updates.readAt = readAt;
            if (deliveredAt) updates.deliveredAt = deliveredAt;
            return { ...m, ...updates };
          }
          return m;
        })
      );
    });

    // Bulk status update (e.g. partner comes online -> all delivered; partner reads chat -> all read)
    socket.on('messages_status_bulk_update', ({ receiver, status, readAt, deliveredAt }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.receiver?.toLowerCase() === receiver?.toLowerCase()) {
            const updates = { status };
            if (readAt && (status === 'read' || !m.readAt)) updates.readAt = readAt;
            if (deliveredAt && !m.deliveredAt) updates.deliveredAt = deliveredAt;
            return { ...m, ...updates };
          }
          return m;
        })
      );
    });

    // Typing
    socket.on('partner_typing', ({ isTyping }) => {
      setIsPartnerTyping(isTyping);
    });

    // Burn note incinerated
    socket.on('burn_note_incinerated', ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, isBurned: true, text: '🔥 This secret note has self-destructed.' }
            : m
        )
      );
    });

    return () => {
      disconnectSocket();
    };
  }, [partner?.userId, partner?.displayName, partner?.avatarUrl]);

  // Actions
  const handleSendMessage = (messagePayload) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const optimisticMessage = {
      _id: tempId,
      clientTempId: tempId,
      sender: currentUser.userId,
      receiver: partner?.userId,
      type: messagePayload.type || 'text',
      text: messagePayload.text || '',
      mediaUrl: messagePayload.mediaUrl || null,
      mediaPublicId: messagePayload.mediaPublicId || null,
      mediaDuration: messagePayload.mediaDuration || null,
      replyTo: messagePayload.replyTo || null,
      reactions: [],
      status: isPartnerOnline ? 'delivered' : 'sent',
      isBurnNote: Boolean(messagePayload.isBurnNote),
      burnAfterSeconds: messagePayload.burnAfterSeconds || 10,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    const socket = getSocket();
    if (socket) {
      socket.emit('send_message', {
        ...messagePayload,
        clientTempId: tempId,
      });
    }
  };

  const handleReplyMessage = (message) => {
    const senderName = message.sender === currentUser.userId ? 'You' : (partner?.displayName || 'Partner');
    setReplyingTo({
      _id: message._id,
      text: message.text,
      senderName,
      mediaUrl: message.mediaUrl,
      type: message.type,
    });
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message for everyone?')) return;

    setMessages((prev) =>
      prev.map((m) =>
        m._id === messageId
          ? { ...m, isDeleted: true, text: 'This message was deleted', mediaUrl: null }
          : m
      )
    );

    const socket = getSocket();
    if (socket) {
      socket.emit('delete_message', { messageId });
    }
    try {
      await apiDeleteMessage(messageId);
    } catch {}
  };

  const handleReactMessage = async (messageId, emoji) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('react_message', { messageId, emoji });
    }
    try {
      await apiReactMessage(messageId, emoji);
    } catch {}
  };

  const handleBurnNoteView = async (messageId) => {
    try {
      await apiBurnNoteAction(messageId, 'view');
    } catch {}
  };

  const handleProfileUpdated = (updatedUser) => {
    setCurrentUser((prev) => ({ ...prev, ...updatedUser }));
    const socket = getSocket();
    if (socket) {
      socket.emit('broadcast_profile_updated', updatedUser);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    const socket = getSocket();
    if (socket) {
      socket.emit('clear_chat');
    }
  };

  // Start outgoing call
  const handleStartCall = (callType) => {
    if (!isPartnerOnline) {
      alert(`${partner?.displayName || 'Partner'} is currently offline. Calls can only connect when your partner is online.`);
      return;
    }
    setCallState({
      mode: 'outgoing',
      callType: callType || 'video',
      callerName: partner?.displayName || 'Partner',
      callerAvatar: partner?.avatarUrl || null,
      callerId: partner?.userId,
    });
  };

  return (
    <div className="fixed inset-0 h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-between overflow-hidden bg-[#0a081a] text-white select-none transition-colors">
      {/* Fixed Top Header */}
      <ChatHeader
        partner={partner}
        isPartnerOnline={isPartnerOnline}
        onStartCall={handleStartCall}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleToggleNotifications}
        activeWallpaper={activeWallpaper}
        onSelectWallpaper={handleSelectWallpaper}
        onPanicExit={onPanicExit}
        onOpenSettings={() => setSettingsOpen(true)}
        theme={theme}
      />

      {/* Scrollable Message List with Multi-Theme Wallpaper */}
      <MessageList
        messages={messages}
        currentUser={currentUser}
        partner={partner}
        isPartnerTyping={isPartnerTyping}
        activeWallpaper={activeWallpaper}
        theme={theme}
        onReply={handleReplyMessage}
        onDelete={handleDeleteMessage}
        onReact={handleReactMessage}
        onBurnNoteView={handleBurnNoteView}
        onImageClick={(url) => setLightboxImageUrl(url)}
        onOpenInfo={(msg) => setInfoModalMessage(msg)}
      />

      {/* Fixed Bottom Message Input Toolbar */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTypingStart={() => getSocket()?.emit('typing_start')}
        onTypingStop={() => getSocket()?.emit('typing_stop')}
        onOpenCamera={() => setCameraOpen(true)}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        theme={theme}
      />

      {/* WebRTC Video & Voice Call Modal */}
      <CallModal
        callState={callState}
        partner={partner}
        currentUser={currentUser}
        socket={activeSocket || getSocket()}
        onClose={() => setCallState(null)}
      />

      {/* Camera Modal */}
      <LiveCameraModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onSendCapturedMedia={handleSendMessage}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={handleProfileUpdated}
        onClearChat={handleClearChat}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onPanicExit={onPanicExit}
      />

      {/* Image Lightbox */}
      <ImageLightboxModal
        imageUrl={lightboxImageUrl}
        onClose={() => setLightboxImageUrl(null)}
      />

      {/* WhatsApp-Style Message Info Modal */}
      <MessageInfoModal
        isOpen={Boolean(infoModalMessage)}
        message={infoModalMessage}
        onClose={() => setInfoModalMessage(null)}
      />
    </div>
  );
}
