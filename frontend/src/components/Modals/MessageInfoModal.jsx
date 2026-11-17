import React from 'react';
import { X, Check, CheckCheck, Info, Clock } from 'lucide-react';

export default function MessageInfoModal({ isOpen, message, onClose }) {
  if (!isOpen || !message) return null;

  const formatDetailedDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    const dateFormatted = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    return `${dateFormatted}, ${timeStr}`;
  };

  const sentTime = formatDetailedDate(message.createdAt);
  const deliveredTime = formatDetailedDate(message.deliveredAt);
  const readTime = formatDetailedDate(message.readAt);

  return (
    <div className="fixed inset-0 z-50 bg-[#090717]/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="w-full max-w-sm bg-[#130f2e] border border-violet-500/30 text-white rounded-3xl p-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-violet-500/20">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-violet-100">Message Info</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-violet-800/40 text-violet-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Snippet Card */}
        <div className="my-4 p-3 rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 text-white shadow-md border border-violet-400/20">
          {message.type === 'image' && message.mediaUrl && (
            <img src={message.mediaUrl} alt="Preview" className="h-28 w-auto rounded-xl object-cover mb-2" />
          )}
          {message.text && (
            <p className="text-xs leading-relaxed break-words font-medium">
              {message.text}
            </p>
          )}
          {message.type === 'audio' && (
            <p className="text-xs italic text-violet-200">🎵 Voice Note</p>
          )}
        </div>

        {/* Delivery Timeline / Status Details */}
        <div className="space-y-3.5 text-xs">
          {/* 1. Read / Seen Status */}
          <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-[#19153b]/80 border border-violet-500/20">
            <div className="mt-0.5">
              <CheckCheck className={`w-4 h-4 ${readTime ? 'text-cyan-400 font-bold' : 'text-slate-600'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-violet-200">Read</span>
                <span className="text-[11px] text-cyan-300 font-mono">
                  {readTime ? readTime : '---'}
                </span>
              </div>
              {!readTime && (
                <span className="text-[10px] text-violet-400/60 block mt-0.5">
                  Not read yet
                </span>
              )}
            </div>
          </div>

          {/* 2. Delivered Status */}
          <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-[#19153b]/80 border border-violet-500/20">
            <div className="mt-0.5">
              <CheckCheck className={`w-4 h-4 ${deliveredTime ? 'text-violet-300' : 'text-slate-600'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-violet-200">Delivered</span>
                <span className="text-[11px] text-violet-300 font-mono">
                  {deliveredTime ? deliveredTime : '---'}
                </span>
              </div>
              {!deliveredTime && (
                <span className="text-[10px] text-violet-400/60 block mt-0.5">
                  Not delivered yet
                </span>
              )}
            </div>
          </div>

          {/* 3. Sent Status */}
          <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-[#19153b]/80 border border-violet-500/20">
            <div className="mt-0.5">
              <Check className="w-4 h-4 text-violet-300" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-violet-200">Sent</span>
                <span className="text-[11px] text-violet-300 font-mono">
                  {sentTime || 'Just now'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-2 bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 rounded-xl text-xs font-medium text-violet-200 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
