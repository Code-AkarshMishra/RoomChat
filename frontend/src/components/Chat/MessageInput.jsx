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

  const isDark = theme === 'dark';

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
    <div className={`p-2.5 sm:p-3 border-t ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} z-10 sticky bottom-0 transition-colors`}>
      {/* Replying Banner */}
      {replyingTo && (
        <div className={`mb-2 p-2 rounded-xl border flex items-center justify-between text-xs ${
          isDark ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <CornerUpLeft className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            <div className="truncate">
              <span className="font-semibold">{replyingTo.senderName}: </span>
              <span className="opacity-80">
                {replyingTo.text || (replyingTo.type === 'image' ? 'Photo' : 'Voice')}
              </span>
            </div>
          </div>
          <button onClick={onCancelReply} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Burn-After-Reading Banner */}
      {isBurnNote && (
        <div className="mb-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-500">
          <div className="flex items-center gap-1.5 font-medium">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Burn Note Timer:</span>
            <select
              value={burnSeconds}
              onChange={(e) => setBurnSeconds(Number(e.target.value))}
              className={`rounded px-1.5 py-0.5 text-xs ${isDark ? 'bg-slate-950 text-amber-300' : 'bg-white text-slate-900'} border border-amber-500/40`}
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </div>
          <button onClick={() => setIsBurnNote(false)} className="p-1">
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
          <div className="flex-1 flex items-center justify-between bg-rose-500/10 border border-rose-500/30 rounded-2xl px-4 py-2.5 text-xs text-rose-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-semibold">Recording...</span>
              <span className="font-mono ml-1">{formatAudioTime(recordingDuration)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecordingVoice}
                className="p-1.5 rounded-full hover:bg-rose-500/20"
                title="Cancel"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopRecordingVoice}
                className="px-3 py-1 bg-indigo-600 text-white rounded-xl flex items-center gap-1 font-medium"
              >
                <Square className="w-3 h-3 fill-white" /> Send
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onOpenCamera}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Camera"
            >
              <Camera className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Photos/Videos"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setIsBurnNote(!isBurnNote)}
              className={`p-2 rounded-xl transition-all ${
                isBurnNote
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                  : (isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:text-amber-500 hover:bg-slate-100')
              }`}
              title="Burn Note"
            >
              <Flame className="w-5 h-5" />
            </button>

            <form onSubmit={handleSubmit} className="flex-1 flex items-center">
              <input
                type="text"
                value={text}
                onChange={handleTextChange}
                className={`w-full ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'} border rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors`}
              />
            </form>

            {text.trim() ? (
              <button
                onClick={handleSubmit}
                disabled={isUploading}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs active:scale-95 transition-all"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecordingVoice}
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-500 hover:text-rose-500 hover:bg-slate-100'
                }`}
                title="Voice Note"
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
