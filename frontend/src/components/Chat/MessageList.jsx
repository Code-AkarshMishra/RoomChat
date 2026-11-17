import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function MessageList({
  messages,
  currentUser,
  partner,
  isPartnerTyping,
  onBurnNoteView,
  onImageClick,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
      {/* Welcome / Encryption Banner */}
      <div className="text-center my-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Exclusive 1-on-1 private channel • Zero server cache logs</span>
        </div>
      </div>

      {/* Message List */}
      {messages.map((msg, index) => {
        const isOwn = msg.sender === currentUser?.userId;
        return (
          <MessageBubble
            key={msg._id || index}
            message={msg}
            isOwn={isOwn}
            onBurnNoteView={onBurnNoteView}
            onImageClick={onImageClick}
          />
        );
      })}

      {/* Partner Typing Indicator */}
      {isPartnerTyping && (
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl rounded-bl-xs px-3.5 py-2 text-xs text-slate-300 flex items-center gap-1.5 shadow-sm">
            <span>{partner?.displayName || 'Partner'} is typing</span>
            <div className="flex gap-1 items-center ml-1">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

