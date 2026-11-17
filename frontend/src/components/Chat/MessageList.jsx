import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { WALLPAPERS } from '../../utils/wallpapers';

export default function MessageList({
  messages,
  currentUser,
  partner,
  isPartnerTyping,
  activeWallpaper,
  theme,
  onReply,
  onDelete,
  onReact,
  onBurnNoteView,
  onImageClick,
}) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  const selectedWp = WALLPAPERS.find((w) => w.id === activeWallpaper) || WALLPAPERS[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  return (
    <div
      ref={containerRef}
      style={selectedWp.patternStyle}
      className={`flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-4 space-y-1 relative transition-colors ${selectedWp.className}`}
    >
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-3 text-violet-300 text-2xl shadow-lg">
            💬
          </div>
          <p className="text-sm font-medium text-violet-200">
            End-to-end encrypted 1-on-1 Room
          </p>
          <p className="text-xs text-violet-400/60 max-w-xs mt-1">
            Messages, voice notes, and live WebRTC calls are secure. Swipe right on any message to reply.
          </p>
        </div>
      )}

      {messages.map((msg, index) => {
        const isOwn = msg.sender === currentUser?.userId;
        return (
          <MessageBubble
            key={msg._id || index}
            message={msg}
            isOwn={isOwn}
            theme={theme}
            onReply={onReply}
            onDelete={onDelete}
            onReact={onReact}
            onBurnNoteView={onBurnNoteView}
            onImageClick={onImageClick}
          />
        );
      })}

      {/* Partner Typing Indicator */}
      {isPartnerTyping && (
        <div className="flex items-center gap-2 mb-2 animate-fade-in">
          <div className="rounded-2xl rounded-bl-xs px-3.5 py-2 text-xs flex items-center gap-2 shadow-md border border-violet-500/30 bg-[#181438]/90 text-violet-200 backdrop-blur-xs">
            <span className="font-medium">{partner?.displayName || 'Partner'} is typing</span>
            <div className="flex gap-1 items-center ml-0.5">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
