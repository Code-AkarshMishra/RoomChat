import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import LiveCameraModal from '../Modals/LiveCameraModal';
import LoveBombOverlay from '../Modals/LoveBombModal';
import CountdownModal from '../Modals/CountdownModal';
import VibeModal from '../Modals/VibeModal';
import ImageLightboxModal from '../Modals/ImageLightboxModal';
import { 
  apiGetMessages, 
  apiBurnNoteAction, 
  apiGetCoupleMeta, 
  clearAuthToken 
} from '../../services/api';
import { initSocket, getSocket, disconnectSocket } from '../../services/socket';

export default function ChatApp({ sessionUser, initialPartner, onPanicExit }) {
  const [currentUser, setCurrentUser] = useState(sessionUser);
  const [partner, setPartner] = useState(initialPartner);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [latency, setLatency] = useState(null);

  const [messages, setMessages] = useState([]);
  const [coupleMeta, setCoupleMeta] = useState(null);

  // Modals state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [countdownOpen, setCountdownOpen] = useState(false);
  const [vibeModalOpen, setVibeModalOpen] = useState(false);
  const [loveBombData, setLoveBombData] = useState(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);

  // Panic button shortcut: double escape press
  const lastEscPressRef = useRef(0);

  const handleEmergencyPanic = useCallback(() => {
    disconnectSocket();
    clearAuthToken();
    onPanicExit();
  }, [onPanicExit]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscPressRef.current < 600) {
          handleEmergencyPanic();
        } else {
          lastEscPressRef.current = now;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEmergencyPanic]);

  // Load message history & couple metadata
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const msgRes = await apiGetMessages(80);
        if (msgRes.success) {
          setMessages(msgRes.messages || []);
        }

        const metaRes = await apiGetCoupleMeta();
        if (metaRes.success && metaRes.data) {
          setCoupleMeta(metaRes.data);
        }
      } catch (err) {
        console.error('Error loading initial chat data:', err);
      }
    };
    fetchInitialData();
  }, []);

  // Socket Connection & Event Listeners
  useEffect(() => {
    const socket = initSocket((measuredLatency) => {
      setLatency(measuredLatency);
    });

    if (!socket) return;

    // Presence update
    socket.on('presence_status', (data) => {
      if (data.userId === partner?.userId) {
        setIsPartnerOnline(data.isOnline);
      }
      if (data.partnerOnline !== undefined) {
        setIsPartnerOnline(data.partnerOnline);
      }
    });

    // Incoming new message
    socket.on('receive_message', (newMsg) => {
      setMessages((prev) => {
        // If this message was sent optimistically by this client, replace the temp bubble
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

        // Prevent duplicate rendering
        if (prev.some((m) => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });

      // If partner sent it, immediately send delivery and read receipts
      if (newMsg.sender === partner?.userId) {
        socket.emit('message_delivered', { messageId: newMsg._id });
        socket.emit('message_read', { messageId: newMsg._id });
      }
    });

    // Status updates (sent -> delivered -> read ticks)
    socket.on('message_status_updated', ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, status } : m))
      );
    });

    // Typing indicators
    socket.on('partner_typing', ({ isTyping }) => {
      setIsPartnerTyping(isTyping);
    });

    // Love Bomb trigger from partner
    socket.on('love_bomb_explode', (bombPayload) => {
      setLoveBombData(bombPayload);
    });

    // Partner Vibe status updated
    socket.on('partner_vibe_updated', ({ vibeStatus }) => {
      setPartner((prev) => ({
        ...prev,
        vibeStatus,
      }));
    });

    // Burn note self-destructed by server/partner
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
    // Generate unique temporary client ID for 0.00-second instant optimistic display
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
      status: isPartnerOnline ? 'delivered' : 'sent',
      isBurnNote: Boolean(messagePayload.isBurnNote),
      burnAfterSeconds: messagePayload.burnAfterSeconds || 10,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    // ⚡ INSTANT RENDER: Appears on your screen in 0 milliseconds!
    setMessages((prev) => [...prev, optimisticMessage]);

    const socket = getSocket();
    if (socket) {
      socket.emit('send_message', {
        ...messagePayload,
        clientTempId: tempId,
      });
    }
  };

  const handleTypingStart = () => {
    const socket = getSocket();
    if (socket) socket.emit('typing_start');
  };

  const handleTypingStop = () => {
    const socket = getSocket();
    if (socket) socket.emit('typing_stop');
  };

  const handleTriggerLoveBomb = () => {
    const socket = getSocket();
    const payload = {
      senderId: currentUser.userId,
      senderName: currentUser.displayName,
      emoji: '💖',
      count: 50,
      message: `${currentUser.displayName} ignited a Love Bomb! 💥❤️`,
    };

    if (socket) {
      socket.emit('trigger_love_bomb', payload);
    } else {
      setLoveBombData(payload);
    }
  };

  const handleBurnNoteView = async (messageId) => {
    try {
      await apiBurnNoteAction(messageId, 'view');
    } catch (err) {
      console.error('Burn note view error:', err);
    }
  };

  const handleVibeChanged = (newVibe) => {
    setCurrentUser((prev) => ({ ...prev, vibeStatus: newVibe }));
    const socket = getSocket();
    if (socket) {
      socket.emit('broadcast_vibe', newVibe);
    }
  };

  return (
    <div className="h-screen max-h-screen bg-slate-950 flex flex-col justify-between overflow-hidden">
      {/* Top Header */}
      <ChatHeader
        partner={partner}
        isPartnerOnline={isPartnerOnline}
        latency={latency}
        onPanicExit={handleEmergencyPanic}
        onOpenCountdown={() => setCountdownOpen(true)}
        onOpenVibeModal={() => setVibeModalOpen(true)}
        onTriggerLoveBomb={handleTriggerLoveBomb}
        coupleMeta={coupleMeta}
      />

      {/* Main Messages View */}
      <MessageList
        messages={messages}
        currentUser={currentUser}
        partner={partner}
        isPartnerTyping={isPartnerTyping}
        onBurnNoteView={handleBurnNoteView}
        onImageClick={(url) => setLightboxImageUrl(url)}
      />

      {/* Bottom Input Toolbar */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        onOpenCamera={() => setCameraOpen(true)}
        onTriggerLoveBomb={handleTriggerLoveBomb}
      />

      {/* Modals & Overlays */}
      <LiveCameraModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onSendCapturedMedia={handleSendMessage}
      />

      <LoveBombOverlay
        bombData={loveBombData}
        onClose={() => setLoveBombData(null)}
      />

      <CountdownModal
        isOpen={countdownOpen}
        onClose={() => setCountdownOpen(false)}
        coupleMeta={coupleMeta}
        onMetaUpdated={(updated) => setCoupleMeta(updated)}
      />

      <VibeModal
        isOpen={vibeModalOpen}
        onClose={() => setVibeModalOpen(false)}
        currentVibe={currentUser?.vibeStatus}
        onVibeChanged={handleVibeChanged}
      />

      <ImageLightboxModal
        imageUrl={lightboxImageUrl}
        onClose={() => setLightboxImageUrl(null)}
      />
    </div>
  );
}

