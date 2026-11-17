import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  CheckCheck, 
  Flame, 
  Play, 
  Pause, 
  Eye, 
  Download, 
  CornerUpLeft, 
  Trash2, 
  Smile, 
  Volume2 
} from 'lucide-react';

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export default function MessageBubble({
  message,
  isOwn,
  theme,
  onReply,
  onDelete,
  onReact,
  onBurnNoteView,
  onImageClick,
}) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const audioRef = useRef(null);

  // Burn Note states
  const [revealed, setRevealed] = useState(!message.isBurnNote || message.isBurned);
  const [countdown, setCountdown] = useState(message.burnAfterSeconds || 10);
  const [isIncinerated, setIsIncinerated] = useState(message.isBurned || false);

  const isDark = theme === 'dark';

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
    setAudioProgress(0);
  };

  const handleRevealBurnNote = () => {
    if (isIncinerated || revealed) return;
    setRevealed(true);
    if (onBurnNoteView) onBurnNoteView(message._id);
  };

  useEffect(() => {
    let timer = null;
    if (message.isBurnNote && revealed && !isIncinerated && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsIncinerated(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [message.isBurnNote, revealed, isIncinerated, countdown]);

  useEffect(() => {
    if (message.isBurned) {
      setIsIncinerated(true);
    }
  }, [message.isBurned]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Direct download / save to gallery
  const handleSaveToDevice = async (e, url, defaultName) => {
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = defaultName || `media_${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  if (message.isDeleted) {
    return (
      <div className={`flex flex-col mb-2 ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`text-xs italic py-2 px-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/50 text-slate-500 border-slate-800' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
          This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col mb-3 group relative ${isOwn ? 'items-end' : 'items-start'}`}>
      {/* Floating Action Bar on hover/focus */}
      <div className={`flex items-center gap-1 mb-1 transition-opacity opacity-0 group-hover:opacity-100 ${isOwn ? 'justify-end' : 'justify-start'}`}>
        {/* React Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowReactPicker(!showReactPicker)}
            className={`p-1 rounded-full ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'} transition-colors`}
            title="React"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          {showReactPicker && (
            <div className={`absolute bottom-full mb-1 ${isOwn ? 'right-0' : 'left-0'} flex items-center gap-1 p-1.5 rounded-full ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-md'} border z-30`}>
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact(message._id, emoji);
                    setShowReactPicker(false);
                  }}
                  className="hover:scale-125 transition-transform text-base px-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reply Trigger */}
        <button
          onClick={() => onReply(message)}
          className={`p-1 rounded-full ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'} transition-colors`}
          title="Reply"
        >
          <CornerUpLeft className="w-3.5 h-3.5" />
        </button>

        {/* Delete Individual Message */}
        {isOwn && (
          <button
            onClick={() => onDelete(message._id)}
            className={`p-1 rounded-full ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400' : 'bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-rose-500'} transition-colors`}
            title="Delete message"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bubble Container */}
      <div
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-xs transition-all relative ${
          isOwn
            ? 'bg-indigo-600 text-white rounded-br-xs'
            : (isDark ? 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700/60' : 'bg-white text-slate-900 rounded-bl-xs border border-slate-200 shadow-xs')
        }`}
      >
        {/* Quoted Reply Header */}
        {message.replyTo && (
          <div className={`mb-2 pl-2.5 py-1 text-xs border-l-2 rounded-r-lg ${
            isOwn
              ? 'border-white/70 bg-black/15 text-indigo-100'
              : (isDark ? 'border-indigo-500 bg-slate-900/60 text-slate-300' : 'border-indigo-500 bg-slate-100 text-slate-700')
          }`}>
            <span className="font-semibold block text-[11px] opacity-90">
              {message.replyTo.senderName || 'Reply'}
            </span>
            <span className="line-clamp-1 opacity-80">
              {message.replyTo.text || (message.replyTo.type === 'image' ? '📷 Photo' : 'Voice Note')}
            </span>
          </div>
        )}

        {/* Burn Note */}
        {message.isBurnNote ? (
          <div className="space-y-2 min-w-[190px]">
            <div className="flex items-center justify-between text-xs font-semibold pb-1 border-b border-white/10">
              <span className="flex items-center gap-1 text-amber-300">
                <Flame className={`w-4 h-4 ${isIncinerated ? 'text-slate-400' : 'text-amber-400 animate-pulse'}`} />
                Secret Note
              </span>
              {revealed && !isIncinerated && (
                <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-mono">
                  🔥 {countdown}s
                </span>
              )}
            </div>

            {isIncinerated ? (
              <div className="py-2 text-xs italic opacity-70 flex items-center gap-2">
                This secret note has self-destructed.
              </div>
            ) : !revealed ? (
              <button
                onClick={handleRevealBurnNote}
                className="w-full py-2 px-3 bg-black/30 hover:bg-black/50 border border-amber-500/30 rounded-xl text-xs font-medium text-amber-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> Tap to reveal ({message.burnAfterSeconds || 10}s)
              </button>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium py-1">
                {message.text}
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Image media with save-to-gallery button */}
            {message.type === 'image' && message.mediaUrl && (
              <div className="mb-2 rounded-xl overflow-hidden relative group/img">
                <img
                  src={message.mediaUrl}
                  alt="Shared"
                  onClick={() => onImageClick && onImageClick(message.mediaUrl)}
                  className="max-h-72 w-auto object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={(e) => handleSaveToDevice(e, message.mediaUrl, `photo_${Date.now()}.jpg`)}
                  className="absolute bottom-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-lg backdrop-blur-xs opacity-90 hover:opacity-100 transition-all flex items-center gap-1 text-[11px]"
                  title="Save to Gallery"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save</span>
                </button>
              </div>
            )}

            {/* Video media with save-to-gallery */}
            {message.type === 'video' && message.mediaUrl && (
              <div className="mb-2 rounded-xl overflow-hidden max-h-72 relative">
                <video src={message.mediaUrl} controls className="w-full rounded-xl max-h-72 bg-black" />
                <button
                  type="button"
                  onClick={(e) => handleSaveToDevice(e, message.mediaUrl, `video_${Date.now()}.mp4`)}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-lg text-xs"
                  title="Save video"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Voice Note with waveform & Save to Device */}
            {message.type === 'audio' && message.mediaUrl && (
              <div className="flex items-center gap-2.5 py-1 min-w-[210px]">
                <audio
                  ref={audioRef}
                  src={message.mediaUrl}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onEnded={handleAudioEnded}
                  className="hidden"
                />
                <button
                  onClick={toggleAudio}
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-xs transition-colors ${
                    isOwn ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
                  }`}
                >
                  {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>

                <div className="flex-1">
                  <div className="flex items-center gap-1 h-5">
                    {[10, 20, 12, 24, 16, 22, 10, 24, 14, 18, 8, 20].map((h, i) => (
                      <span
                        key={i}
                        style={{ height: isPlayingAudio ? `${h}px` : '5px' }}
                        className={`w-1 rounded-full transition-all duration-150 ${
                          isPlayingAudio
                            ? 'bg-amber-300'
                            : (isOwn ? 'bg-indigo-200' : (isDark ? 'bg-slate-500' : 'bg-slate-300'))
                        }`}
                      />
                    ))}
                  </div>
                  <div className="w-full bg-black/10 rounded-full h-1 mt-1 overflow-hidden">
                    <div
                      className={`h-full ${isOwn ? 'bg-white' : 'bg-indigo-600'}`}
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={(e) => handleSaveToDevice(e, message.mediaUrl, `voice_${Date.now()}.webm`)}
                  className="p-1 rounded-lg hover:bg-black/15 opacity-70 hover:opacity-100 transition-opacity"
                  title="Save voice note"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {message.text && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.text}
              </p>
            )}
          </>
        )}

        {/* Footer: Time & Status */}
        <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] opacity-75 select-none">
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && (
            <span>
              {message.status === 'sent' && <Check className="w-3.5 h-3.5 opacity-70" />}
              {message.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 opacity-70" />}
              {message.status === 'read' && <CheckCheck className="w-3.5 h-3.5 text-cyan-300 font-bold" />}
            </span>
          )}
        </div>
      </div>

      {/* Reactions Bar Under Bubble */}
      {message.reactions && message.reactions.length > 0 && (
        <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
          {Array.from(new Set(message.reactions.map((r) => r.emoji))).map((emoji) => {
            const count = message.reactions.filter((r) => r.emoji === emoji).length;
            return (
              <span
                key={emoji}
                onClick={() => onReact(message._id, emoji)}
                className={`text-[11px] px-1.5 py-0.5 rounded-full border cursor-pointer select-none ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                }`}
              >
                {emoji} {count > 1 ? count : ''}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
