import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import LiveCameraModal from '../Modals/LiveCameraModal';
import ImageLightboxModal from '../Modals/ImageLightboxModal';
import SettingsModal from '../Modals/SettingsModal';
import { 
  apiGetMessages, 
  apiBurnNoteAction, 
  apiDeleteMessage,
  apiReactMessage,
  clearAuthToken 
} from '../../services/api';
import { initSocket, getSocket, disconnectSocket } from '../../services/socket';

export default function ChatApp({ sessionUser, initialPartner, onPanicExit, theme, onToggleTheme }) {
  const [currentUser, setCurrentUser] = useState(sessionUser);
  const [partner, setPartner] = useState(initialPartner);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);

  // Modals state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);

  const isDark = theme === 'dark';

  // 🚨 CRITICAL PARANOIA SECURITY:
  // If user switches tab or presses browser back button, immediately wipe session & exit to cover!
  useEffect(() => {
    // 1. Tab switch / screen minimize detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        disconnectSocket();
        clearAuthToken();
        onPanicExit();
      }
    };

    // 2. Browser back button detection
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      disconnectSocket();
      clearAuthToken();
      onPanicExit();
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

    // Presence & Last Seen
    socket.on('presence_status', (data) => {
      if (data.userId === partner?.userId) {
        setIsPartnerOnline(data.isOnline);
        if (data.lastSeen) {
          setPartner((prev) => ({ ...prev, lastSeen: data.lastSeen }));
        }
      }
      if (data.partnerOnline !== undefined) {
        setIsPartnerOnline(data.partnerOnline);
      }
      if (data.partnerLastSeen) {
        setPartner((prev) => ({ ...prev, lastSeen: data.partnerLastSeen }));
      }
    });

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

      if (newMsg.sender === partner?.userId) {
        socket.emit('message_delivered', { messageId: newMsg._id });
        socket.emit('message_read', { messageId: newMsg._id });
      }
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

    // Status ticks (sent -> delivered -> read)
    socket.on('message_status_updated', ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, status } : m))
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
  }, [partner?.userId]);

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

    // Optimistic delete
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

  return (
    <div className={`h-[100dvh] max-h-[100dvh] flex flex-col justify-between overflow-hidden ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} transition-colors`}>
      {/* Top Header */}
      <ChatHeader
        partner={partner}
        isPartnerOnline={isPartnerOnline}
        onPanicExit={onPanicExit}
        onOpenSettings={() => setSettingsOpen(true)}
        theme={theme}
      />

      {/* Message List */}
      <MessageList
        messages={messages}
        currentUser={currentUser}
        partner={partner}
        isPartnerTyping={isPartnerTyping}
        theme={theme}
        onReply={handleReplyMessage}
        onDelete={handleDeleteMessage}
        onReact={handleReactMessage}
        onBurnNoteView={handleBurnNoteView}
        onImageClick={(url) => setLightboxImageUrl(url)}
      />

      {/* Message Input Toolbar */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTypingStart={() => getSocket()?.emit('typing_start')}
        onTypingStop={() => getSocket()?.emit('typing_stop')}
        onOpenCamera={() => setCameraOpen(true)}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        theme={theme}
      />

      {/* Modals */}
      <LiveCameraModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onSendCapturedMedia={handleSendMessage}
      />

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

      <ImageLightboxModal
        imageUrl={lightboxImageUrl}
        onClose={() => setLightboxImageUrl(null)}
      />
    </div>
  );
}
