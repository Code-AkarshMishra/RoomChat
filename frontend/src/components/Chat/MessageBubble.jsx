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

  // Swipe to reply states
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const isSwipingRef = useRef(false);

  // Burn Note states
  const [revealed, setRevealed] = useState(!message.isBurnNote || message.isBurned);
  const [countdown, setCountdown] = useState(message.burnAfterSeconds || 10);
  const [isIncinerated, setIsIncinerated] = useState(message.isBurned || false);

  const isDark = theme === 'dark';

  // --- SWIPE TO REPLY HANDLERS (Mobile touch swipe) ---
  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartRef.current.x;
    const deltaY = currentY - touchStartRef.current.y;

    // Check if primarily horizontal right-swipe
    if (!isSwipingRef.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return; // normal vertical scroll
      }
      if (deltaX > 8) {
        isSwipingRef.current = true;
      }
    }

    if (isSwipingRef.current && deltaX > 0) {
      // Resistance curve up to 70px
      const damped = Math.min(70, deltaX * 0.45);
      setSwipeOffset(damped);
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset >= 42) {
      if (navigator.vibrate) navigator.vibrate(25);
      onReply(message);
    }
    setSwipeOffset(0);
    isSwipingRef.current = false;
  };

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
        <div className="text-xs italic py-2 px-3.5 rounded-2xl border bg-[#151230]/60 text-violet-300/60 border-violet-500/20">
          This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col mb-2.5 group relative ${isOwn ? 'items-end' : 'items-start'} touch-pan-y`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe Reply indicator behind bubble on swipe right */}
      {swipeOffset > 0 && (
        <div 
          className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10 transition-transform"
          style={{ transform: `translateY(-50%) scale(${Math.min(1.2, swipeOffset / 35)})`, opacity: swipeOffset / 40 }}
        >
          <div className="w-8 h-8 rounded-full bg-violet-600/90 text-white flex items-center justify-center shadow-lg border border-violet-400">
            <CornerUpLeft className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Floating Action Bar on hover/focus */}
      <div className={`flex items-center gap-1 mb-1 transition-opacity opacity-0 group-hover:opacity-100 ${isOwn ? 'justify-end' : 'justify-start'}`}>
        {/* React Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowReactPicker(!showReactPicker)}
            className="p-1 rounded-full bg-[#1e1948]/80 hover:bg-[#28225e] text-violet-300 transition-colors"
            title="React"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          {showReactPicker && (
            <div className={`absolute bottom-full mb-1 ${isOwn ? 'right-0' : 'left-0'} flex items-center gap-1 p-1.5 rounded-full bg-[#17133b] border border-violet-500/30 shadow-xl z-30 animate-fade-in`}>
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
          className="p-1 rounded-full bg-[#1e1948]/80 hover:bg-[#28225e] text-violet-300 transition-colors"
          title="Reply"
        >
          <CornerUpLeft className="w-3.5 h-3.5" />
        </button>

        {/* Delete Message */}
        {isOwn && (
          <button
            onClick={() => onDelete(message._id)}
            className="p-1 rounded-full bg-[#1e1948]/80 hover:bg-rose-900/60 text-violet-300 hover:text-rose-400 transition-colors"
            title="Delete message"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Bubble Container with Swipe Translate */}
      <div
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1)' : 'none',
        }}
        className={`max-w-[85%] sm:max-w-[72%] rounded-2xl p-3 shadow-md transition-shadow relative ${
          isOwn
            ? 'bg-gradient-to-tr from-indigo-700 via-indigo-600 to-violet-600 text-white rounded-br-xs border border-violet-400/25 shadow-indigo-950/40'
            : 'bg-[#181438]/95 text-slate-100 rounded-bl-xs border border-violet-500/25 shadow-violet-950/40 backdrop-blur-sm'
        }`}
      >
        {/* Quoted Reply Header */}
        {message.replyTo && (
          <div className={`mb-2 pl-2.5 py-1 text-xs border-l-2 rounded-r-lg ${
            isOwn
              ? 'border-violet-200 bg-black/25 text-violet-100'
              : 'border-violet-500 bg-[#0e0c24]/80 text-violet-200'
          }`}>
            <span className="font-semibold block text-[11px] text-violet-300">
              {message.replyTo.senderName || 'Reply'}
            </span>
            <span className="line-clamp-1 opacity-80 text-[11px]">
              {message.replyTo.text || (message.replyTo.type === 'image' ? '📷 Photo' : '🎵 Voice Note')}
            </span>
          </div>
        )}

        {/* Burn Note Feature */}
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
                className="w-full py-2 px-3 bg-black/40 hover:bg-black/60 border border-amber-500/30 rounded-xl text-xs font-medium text-amber-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
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
            {/* Image media with save-to-gallery */}
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-transform active:scale-90 ${
                    isOwn ? 'bg-white text-indigo-700' : 'bg-violet-600 text-white'
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
                            : (isOwn ? 'bg-violet-200' : 'bg-violet-400/50')
                        }`}
                      />
                    ))}
                  </div>
                  <div className="w-full bg-black/20 rounded-full h-1 mt-1 overflow-hidden">
                    <div
                      className={`h-full ${isOwn ? 'bg-white' : 'bg-violet-500'}`}
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={(e) => handleSaveToDevice(e, message.mediaUrl, `voice_${Date.now()}.webm`)}
                  className="p-1 rounded-lg hover:bg-black/20 opacity-70 hover:opacity-100 transition-opacity"
                  title="Save voice note"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Message Text */}
            {message.text && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-50">
                {message.text}
              </p>
            )}
          </>
        )}

        {/* Footer: Time & Status Ticks */}
        <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] opacity-80 select-none">
          <span className="text-violet-200/90">{formatTime(message.createdAt)}</span>
          {isOwn && (
            <span>
              {message.status === 'sent' && <Check className="w-3.5 h-3.5 text-violet-200/70" />}
              {message.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 text-violet-200/70" />}
              {message.status === 'read' && <CheckCheck className="w-3.5 h-3.5 text-cyan-300 font-bold" />}
            </span>
          )}
        </div>
      </div>

      {/* Message Reactions Bar Under Bubble */}
      {message.reactions && message.reactions.length > 0 && (
        <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
          {Array.from(new Set(message.reactions.map((r) => r.emoji))).map((emoji) => {
            const count = message.reactions.filter((r) => r.emoji === emoji).length;
            return (
              <span
                key={emoji}
                onClick={() => onReact(message._id, emoji)}
                className="text-[11px] px-1.5 py-0.5 rounded-full border border-violet-500/30 bg-[#16123a] text-slate-100 shadow-sm cursor-pointer select-none active:scale-95"
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
