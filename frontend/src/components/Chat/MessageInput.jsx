import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Camera, 
  Image as ImageIcon, 
  Mic, 
  Square, 
  Flame, 
  Trash2, 
  Paperclip,
  Heart,
  Smile,
  X
} from 'lucide-react';
import { apiUploadMedia } from '../../services/api';

export default function MessageInput({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  onOpenCamera,
  onTriggerLoveBomb,
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

  // Typing event debouncer
  const handleTextChange = (e) => {
    setText(e.target.value);

    if (onTypingStart) {
      onTypingStart();
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (onTypingStop) onTypingStop();
    }, 1500);
  };

  // Submit Text / Burn Note
  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!text.trim() || isUploading) return;

    onSendMessage({
      type: isBurnNote ? 'burn_note' : 'text',
      text: text.trim(),
      isBurnNote,
      burnAfterSeconds: burnSeconds,
    });

    setText('');
    setIsBurnNote(false);
    if (onTypingStop) onTypingStop();
  };

  // Handle Gallery Media Upload
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
        });
        setText('');
      }
    } catch (err) {
      alert(`Media upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Start Voice Note Recording via MediaRecorder
  const startRecordingVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 500) return; // Too short

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
            });
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

  // Stop & Send Voice Note
  const stopRecordingVoice = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // Cancel Voice Note
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
    <div className="p-3 bg-slate-900 border-t border-slate-800 z-10 sticky bottom-0">
      {/* Burn-After-Reading Active Banner */}
      {isBurnNote && (
        <div className="mb-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 animate-fade-in">
          <div className="flex items-center gap-1.5 font-medium">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Burn Note Mode Active: Destructs in</span>
            <select
              value={burnSeconds}
              onChange={(e) => setBurnSeconds(Number(e.target.value))}
              className="bg-slate-950 border border-amber-500/40 rounded px-1.5 py-0.5 text-xs text-amber-200 focus:outline-none"
            >
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
            </select>
          </div>
          <button
            onClick={() => setIsBurnNote(false)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Input Row */}
      <div className="flex items-center gap-2">
        {/* Hidden File Picker */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/*"
          className="hidden"
        />

        {/* Live Voice Recording Bar */}
        {isRecordingAudio ? (
          <div className="flex-1 flex items-center justify-between bg-slate-950 border border-rose-500/40 rounded-2xl px-4 py-2.5 text-xs text-rose-400 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-semibold">Recording Voice Note...</span>
              <span className="font-mono text-slate-300 ml-1">
                {formatAudioTime(recordingDuration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecordingVoice}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                title="Cancel"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopRecordingVoice}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1 shadow-md"
              >
                <Square className="w-3.5 h-3.5 fill-white" /> Send
              </button>
            </div>
          </div>
        ) : (
          /* Normal Message Input Box */
          <>
            {/* Live Camera Button */}
            <button
              type="button"
              onClick={onOpenCamera}
              className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-colors flex-shrink-0"
              title="Open Live Camera (Snap & Send instantly)"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Gallery Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-colors flex-shrink-0"
              title="Share photo or video from gallery"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Burn Note Toggle */}
            <button
              type="button"
              onClick={() => setIsBurnNote(!isBurnNote)}
              className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                isBurnNote
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
              }`}
              title="Toggle Self-Destructing Burn Note"
            >
              <Flame className="w-5 h-5" />
            </button>

            {/* Text Input Form */}
            <form onSubmit={handleSubmit} className="flex-1 flex items-center">
              <input
                type="text"
                value={text}
                onChange={handleTextChange}
                placeholder={isBurnNote ? 'Type a self-destructing secret...' : 'Message partner privately...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </form>

            {/* If there is text, show Send button; otherwise show Mic button */}
            {text.trim() ? (
              <button
                onClick={handleSubmit}
                disabled={isUploading}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 active:scale-95 transition-all flex-shrink-0"
                title="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecordingVoice}
                className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors flex-shrink-0"
                title="Click to record Voice Note"
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

