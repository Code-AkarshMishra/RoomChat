import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  CheckCheck, 
  Flame, 
  Play, 
  Pause, 
  Eye, 
  Clock, 
  Lock,
  Volume2
} from 'lucide-react';

export default function MessageBubble({
  message,
  isOwn,
  onBurnNoteView,
  onImageClick,
}) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef(null);

  // Burn Note local countdown state
  const [revealed, setRevealed] = useState(!message.isBurnNote || message.isBurned);
  const [countdown, setCountdown] = useState(message.burnAfterSeconds || 10);
  const [isIncinerated, setIsIncinerated] = useState(message.isBurned || false);

  // Audio playback handler
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

  // Burn Note reveal & countdown logic
  const handleRevealBurnNote = () => {
    if (isIncinerated || revealed) return;
    setRevealed(true);
    if (typeof onBurnNoteView === 'function') {
      onBurnNoteView(message._id);
    }
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

  // Sync if socket event marked burned
  useEffect(() => {
    if (message.isBurned) {
      setIsIncinerated(true);
    }
  }, [message.isBurned]);

  // Format timestamp
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col mb-3 ${isOwn ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-md transition-all ${
          isOwn
            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-xs'
            : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700/60'
        }`}
      >
        {/* 1. BURN-AFTER-READING SECRET CARD */}
        {message.isBurnNote ? (
          <div className="space-y-2 min-w-[200px]">
            <div className="flex items-center justify-between text-xs font-semibold pb-1 border-b border-white/10">
              <span className="flex items-center gap-1 text-amber-300">
                <Flame className={`w-4 h-4 ${isIncinerated ? 'text-slate-500' : 'text-amber-400 animate-pulse'}`} />
                Secret Burn Note
              </span>
              {revealed && !isIncinerated && (
                <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-[11px] font-mono animate-pulse">
                  🔥 {countdown}s
                </span>
              )}
            </div>

            {isIncinerated ? (
              <div className="py-2 text-xs italic text-slate-400 flex items-center gap-2">
                <Flame className="w-4 h-4 text-slate-500" />
                This message has incinerated completely.
              </div>
            ) : !revealed ? (
              <button
                onClick={handleRevealBurnNote}
                className="w-full py-2.5 px-3 bg-black/30 hover:bg-black/50 border border-amber-500/30 rounded-xl text-xs font-medium text-amber-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4 text-amber-300" /> Tap to reveal ({message.burnAfterSeconds || 10}s destruct)
              </button>
            ) : (
              <p className="text-sm leading-relaxed text-amber-100 whitespace-pre-wrap break-words font-medium py-1">
                {message.text}
              </p>
            )}
          </div>
        ) : (
          /* 2. STANDARD CONTENT */
          <>
            {/* Image media */}
            {message.type === 'image' && message.mediaUrl && (
              <div className="mb-2 rounded-xl overflow-hidden cursor-pointer group relative">
                <img
                  src={message.mediaUrl}
                  alt="Shared media"
                  onClick={() => onImageClick && onImageClick(message.mediaUrl)}
                  className="max-h-72 w-auto object-cover rounded-xl hover:scale-101 transition-transform"
                  loading="lazy"
                />
              </div>
            )}

            {/* Video media */}
            {message.type === 'video' && message.mediaUrl && (
              <div className="mb-2 rounded-xl overflow-hidden max-h-72">
                <video
                  src={message.mediaUrl}
                  controls
                  className="w-full rounded-xl max-h-72 object-contain bg-black"
                />
              </div>
            )}

            {/* Audio Voice Note */}
            {message.type === 'audio' && message.mediaUrl && (
              <div className="flex items-center gap-3 py-1 min-w-[210px]">
                <audio
                  ref={audioRef}
                  src={message.mediaUrl}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onEnded={handleAudioEnded}
                  className="hidden"
                />
                <button
                  onClick={toggleAudio}
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow transition-all ${
                    isOwn
                      ? 'bg-white text-indigo-700 hover:bg-slate-100'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <div className="flex-1">
                  <div className="flex items-center gap-1 h-5">
                    {[12, 22, 14, 28, 18, 24, 10, 26, 16, 20, 8, 22].map((height, i) => (
                      <span
                        key={i}
                        style={{ height: isPlayingAudio ? `${height}px` : '6px' }}
                        className={`w-1 rounded-full transition-all duration-150 ${
                          isPlayingAudio ? 'bg-amber-300' : (isOwn ? 'bg-indigo-300' : 'bg-slate-500')
                        }`}
                      />
                    ))}
                  </div>
                  <div className="w-full bg-black/20 rounded-full h-1 mt-1.5 overflow-hidden">
                    <div
                      className="bg-white h-full transition-all duration-100"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                </div>

                <Volume2 className="w-4 h-4 opacity-70 flex-shrink-0" />
              </div>
            )}

            {/* Text message */}
            {message.text && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.text}
              </p>
            )}
          </>
        )}

        {/* Footer: Time & Status Ticks */}
        <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-slate-300/80 select-none">
          <span>{formatTime(message.createdAt)}</span>

          {isOwn && (
            <span>
              {message.status === 'sent' && (
                <Check className="w-3.5 h-3.5 text-slate-300" title="Sent" />
              )}
              {message.status === 'delivered' && (
                <CheckCheck className="w-3.5 h-3.5 text-slate-300" title="Delivered" />
              )}
              {message.status === 'read' && (
                <CheckCheck className="w-3.5 h-3.5 text-cyan-300" title="Read" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

