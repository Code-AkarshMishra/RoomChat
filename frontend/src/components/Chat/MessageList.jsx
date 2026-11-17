import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function MessageList({
  messages,
  currentUser,
  partner,
  isPartnerTyping,
  theme,
  onReply,
  onDelete,
  onReact,
  onBurnNoteView,
  onImageClick,
}) {
  const bottomRef = useRef(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  return (
    <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-1 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center py-12">
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            No messages yet. Say hello!
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
        <div className="flex items-center gap-2 mb-2">
          <div className={`rounded-2xl rounded-bl-xs px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-xs border ${
            isDark ? 'bg-slate-800 text-slate-300 border-slate-700/60' : 'bg-white text-slate-600 border-slate-200'
          }`}>
            <span>{partner?.displayName || 'Partner'} is typing</span>
            <div className="flex gap-1 items-center ml-1">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
