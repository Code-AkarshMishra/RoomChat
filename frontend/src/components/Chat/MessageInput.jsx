import React, { useState, useRef } from 'react';
import { 
  Send, 
  Camera, 
  Image as ImageIcon, 
  Mic, 
  Square, 
  Flame, 
  Trash2, 
  X,
  CornerUpLeft
} from 'lucide-react';
import { apiUploadMedia } from '../../services/api';

export default function MessageInput({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  onOpenCamera,
  replyingTo,
  onCancelReply,
  theme,
}) {
  const [text, setText] = useState('');
  const [isBurnNote, setIsBurnNote] = useState(false);
  const [burnSeconds, setBurnSeconds] = useState(10);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const typingTimerRef = useRef(null);

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (onTypingStart) onTypingStart();

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (onTypingStop) onTypingStop();
    }, 1500);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!text.trim() || isUploading) return;

    onSendMessage({
      type: isBurnNote ? 'burn_note' : 'text',
      text: text.trim(),
      isBurnNote,
      burnAfterSeconds: burnSeconds,
      ...(replyingTo ? {
        replyTo: {
          messageId: replyingTo._id,
          text: replyingTo.text,
          senderName: replyingTo.senderName,
          mediaUrl: replyingTo.mediaUrl,
          type: replyingTo.type,
        }
      } : {}),
    });

    setText('');
    setIsBurnNote(false);
    if (onCancelReply) onCancelReply();
    if (onTypingStop) onTypingStop();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type.startsWith('video') ? 'video' : 'image';
    setIsUploading(true);

    try {
      const uploadRes = await apiUploadMedia(file, fileType);
      if (uploadRes.success && uploadRes.mediaUrl) {
        onSendMessage({
          type: fileType,
          mediaUrl: uploadRes.mediaUrl,
          mediaPublicId: uploadRes.publicId,
          text: text.trim() || '',
          ...(replyingTo ? {
            replyTo: {
              messageId: replyingTo._id,
              text: replyingTo.text,
              senderName: replyingTo.senderName,
              mediaUrl: replyingTo.mediaUrl,
              type: replyingTo.type,
            }
          } : {}),
        });
        setText('');
        if (onCancelReply) onCancelReply();
      }
    } catch (err) {
      alert(`Media upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Start Voice Recording
  const startRecordingVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 500) return;

        setIsUploading(true);
        try {
          const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
          const uploadRes = await apiUploadMedia(audioFile, 'audio');
          if (uploadRes.success && uploadRes.mediaUrl) {
            onSendMessage({
              type: 'audio',
              mediaUrl: uploadRes.mediaUrl,
              mediaPublicId: uploadRes.publicId,
              mediaDuration: recordingDuration,
              ...(replyingTo ? {
                replyTo: {
                  messageId: replyingTo._id,
                  text: replyingTo.text,
                  senderName: replyingTo.senderName,
                  mediaUrl: replyingTo.mediaUrl,
                  type: replyingTo.type,
                }
              } : {}),
            });
            if (onCancelReply) onCancelReply();
          }
        } catch (err) {
          alert(`Voice upload failed: ${err.message}`);
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert(`Could not access microphone: ${err.message}`);
    }
  };

  const stopRecordingVoice = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecordingVoice = () => {
    if (mediaRecorderRef.current) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecordingAudio(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const formatAudioTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="p-2 sm:p-3 bg-[#110e2d]/95 border-t border-violet-500/20 z-20 sticky bottom-0 backdrop-blur-md transition-colors select-none">
      {/* Replying Banner (WhatsApp style floating reply bar) */}
      {replyingTo && (
        <div className="mb-2 p-2.5 rounded-2xl border border-violet-500/30 bg-[#19153b] flex items-center justify-between text-xs text-violet-100 shadow-md animate-slide-up">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-violet-600/40 text-violet-300 flex items-center justify-center flex-shrink-0">
              <CornerUpLeft className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <span className="font-semibold text-violet-300 block text-[11px]">
                Replying to {replyingTo.senderName}
              </span>
              <span className="opacity-80 text-xs truncate block">
                {replyingTo.text || (replyingTo.type === 'image' ? '📷 Photo' : '🎵 Voice Note')}
              </span>
            </div>
          </div>
          <button 
            onClick={onCancelReply} 
            className="p-1 rounded-full hover:bg-violet-800/40 text-violet-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Burn-After-Reading Banner */}
      {isBurnNote && (
        <div className="mb-2 p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Self-destruct timer:</span>
            <select
              value={burnSeconds}
              onChange={(e) => setBurnSeconds(Number(e.target.value))}
              className="rounded-lg px-2 py-0.5 text-xs bg-[#19153b] text-amber-300 border border-amber-500/40 focus:outline-none"
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </div>
          <button onClick={() => setIsBurnNote(false)} className="p-1 text-amber-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Input Row */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/*"
          className="hidden"
        />

        {isRecordingAudio ? (
          <div className="flex-1 flex items-center justify-between bg-rose-500/15 border border-rose-500/30 rounded-2xl px-4 py-2.5 text-xs text-rose-400 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-semibold">Recording Voice Note...</span>
              <span className="font-mono ml-1 font-bold">{formatAudioTime(recordingDuration)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecordingVoice}
                className="p-1.5 rounded-full hover:bg-rose-500/20 text-rose-400 hover:text-rose-200"
                title="Cancel"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopRecordingVoice}
                className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-xl flex items-center gap-1 font-medium shadow-md active:scale-95"
              >
                <Square className="w-3 h-3 fill-white" /> Send
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Camera */}
            <button
              type="button"
              onClick={onOpenCamera}
              className="p-2 sm:p-2.5 rounded-xl text-violet-300 hover:text-white hover:bg-violet-800/30 active:scale-95 transition-all"
              title="Camera"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Media Upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 sm:p-2.5 rounded-xl text-violet-300 hover:text-white hover:bg-violet-800/30 active:scale-95 transition-all"
              title="Photos / Videos"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Burn Note */}
            <button
              type="button"
              onClick={() => setIsBurnNote(!isBurnNote)}
              className={`p-2 sm:p-2.5 rounded-xl transition-all ${
                isBurnNote
                  ? 'bg-amber-500/25 text-amber-400 border border-amber-500/50 shadow-sm'
                  : 'text-violet-300 hover:text-amber-400 hover:bg-violet-800/30'
              }`}
              title="Self-Destruct Burn Note"
            >
              <Flame className="w-5 h-5" />
            </button>

            {/* Text Input */}
            <form onSubmit={handleSubmit} className="flex-1 flex items-center">
              <input
                type="text"
                value={text}
                onChange={handleTextChange}
                placeholder="Type a message..."
                className="w-full bg-[#181438] border border-violet-500/30 text-white placeholder-violet-300/40 rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-400 shadow-inner transition-colors"
              />
            </form>

            {/* Send or Mic Button */}
            {text.trim() ? (
              <button
                onClick={handleSubmit}
                disabled={isUploading}
                className="p-2.5 sm:p-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl shadow-md shadow-violet-950/50 active:scale-95 transition-all disabled:opacity-50"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecordingVoice}
                className="p-2 sm:p-2.5 rounded-xl text-violet-300 hover:text-rose-400 hover:bg-violet-800/30 active:scale-95 transition-all"
                title="Record Voice Note"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
