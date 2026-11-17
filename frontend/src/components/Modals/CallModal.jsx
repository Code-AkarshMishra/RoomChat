import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  SwitchCamera, 
  Volume2, 
  VolumeX, 
  User 
} from 'lucide-react';
import { sounds } from '../../utils/soundEffects';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function CallModal({
  callState, // null | { mode: 'outgoing' | 'incoming' | 'connected', callType: 'video' | 'audio', callerName, callerAvatar, callerId, offer }
  partner,
  currentUser,
  socket,
  onClose,
}) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const durationTimerRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const isVideo = callState?.callType === 'video';
  const partnerName = callState?.callerName || partner?.displayName || 'Partner';
  const partnerAvatar = callState?.callerAvatar || partner?.avatarUrl;

  // Cleanup helper
  const cleanUpCall = () => {
    sounds.stopAll();
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallDuration(0);
    pendingCandidatesRef.current = [];
  };

  // Sound effects for outgoing & incoming
  useEffect(() => {
    if (!callState) {
      cleanUpCall();
      return;
    }

    if (callState.mode === 'incoming') {
      sounds.startIncomingRingtone();
    } else if (callState.mode === 'outgoing') {
      sounds.startOutgoingTone();
    } else if (callState.mode === 'connected') {
      sounds.stopAll();
      // Start call duration timer
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      sounds.stopAll();
    };
  }, [callState?.mode]);

  // Create PeerConnection & Local Media
  const initPeerConnection = async (type) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Send local ICE candidates to remote partner
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice_candidate', { candidate: event.candidate });
      }
    };

    // When remote track arrives
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      }
    };

    // Get local user media
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video' ? { facingMode: 'user' } : false,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      return { pc, stream };
    } catch (err) {
      console.error('Media access error:', err);
      alert('Could not access microphone/camera. Please grant permissions.');
      handleEndCall();
      return null;
    }
  };

  // Outgoing Call Flow: create offer
  useEffect(() => {
    if (callState?.mode !== 'outgoing') return;

    let isMounted = true;
    const startOutgoing = async () => {
      const res = await initPeerConnection(callState.callType);
      if (!res || !isMounted) return;
      const { pc } = res;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socket) {
        socket.emit('call_user', {
          callType: callState.callType,
          offer,
        });
      }
    };

    startOutgoing();

    return () => {
      isMounted = false;
    };
  }, [callState?.mode === 'outgoing']);

  // Handle Socket Events during Call
  useEffect(() => {
    if (!socket) return;

    // When answer arrives from partner
    const handleAnswer = async ({ answer }) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        // Drain pending candidates
        while (pendingCandidatesRef.current.length > 0) {
          const candidate = pendingCandidatesRef.current.shift();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {}
        }
      }
    };

    // When partner sends ICE candidate
    const handleIceCandidate = async ({ candidate }) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {}
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    };

    // When partner rejects call
    const handleCallRejected = () => {
      sounds.stopAll();
      alert(`${partnerName} declined the call.`);
      cleanUpCall();
      onClose();
    };

    // When call ended
    const handleCallEnded = () => {
      sounds.stopAll();
      cleanUpCall();
      onClose();
    };

    socket.on('call_answered', handleAnswer);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('call_answered', handleAnswer);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
    };
  }, [socket, partnerName, onClose]);

  // Ensure remote streams attach to elements once rendered
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
    }
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [remoteStream, localStream, callState?.mode]);

  // Answer Call Action
  const handleAcceptCall = async () => {
    sounds.stopAll();
    const res = await initPeerConnection(callState.callType);
    if (!res) return;
    const { pc } = res;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(callState.offer));

      // Drain candidates
      while (pendingCandidatesRef.current.length > 0) {
        const candidate = pendingCandidatesRef.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {}
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer_call', { answer });
      callState.mode = 'connected';
    } catch (err) {
      console.error('Answer error:', err);
      handleEndCall();
    }
  };

  // Reject / Decline Action
  const handleRejectCall = () => {
    sounds.stopAll();
    if (socket) {
      socket.emit('reject_call', { reason: 'declined' });
    }
    cleanUpCall();
    onClose();
  };

  // End Call Action
  const handleEndCall = () => {
    sounds.stopAll();
    if (socket) {
      socket.emit('end_call', { reason: 'user_ended' });
    }
    cleanUpCall();
    onClose();
  };

  // Toggle Mute
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Flip Camera on mobile
  const flipCamera = async () => {
    if (!isVideo || !localStream) return;
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextMode },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStream.getVideoTracks()[0];

      if (peerConnectionRef.current && oldVideoTrack) {
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }

      localStream.removeTrack(oldVideoTrack);
      oldVideoTrack.stop();
      localStream.addTrack(newVideoTrack);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    } catch (err) {
      console.error('Camera switch error:', err);
    }
  };

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!callState) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0a1f]/95 backdrop-blur-md flex flex-col justify-between items-center text-white overflow-hidden animate-fade-in p-4 sm:p-6 select-none">
      {/* Remote Audio hidden fallback element */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* TOP BAR */}
      <div className="w-full flex items-center justify-between z-20 pt-2 sm:pt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500 animate-ping" />
          <span className="text-xs font-semibold tracking-wider uppercase text-violet-300">
            {isVideo ? 'WhatsApp Video Call' : 'WhatsApp Voice Call'}
          </span>
        </div>
        {callState.mode === 'connected' && (
          <span className="text-sm font-mono bg-violet-950/70 border border-violet-500/30 px-3 py-1 rounded-full text-violet-200">
            {formatDuration(callDuration)}
          </span>
        )}
      </div>

      {/* CENTER CALL DISPLAY */}
      <div className="flex-1 w-full max-w-lg flex flex-col items-center justify-center relative my-auto">
        {/* If Connected and Video Call: Full Screen Video Stream */}
        {callState.mode === 'connected' && isVideo ? (
          <div className="relative w-full h-[60vh] sm:h-[65vh] rounded-3xl overflow-hidden bg-black/60 border border-violet-500/30 shadow-2xl flex items-center justify-center">
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Local Video Picture-in-Picture (PiP) */}
            <div className="absolute top-4 right-4 w-28 sm:w-36 h-40 sm:h-48 rounded-2xl overflow-hidden border-2 border-violet-400/80 shadow-2xl bg-slate-900 z-10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-xs text-slate-400">
                  Camera Off
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Avatar + Status for Outgoing / Incoming / Voice Calls */
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              {/* Pulsing rings */}
              <div className="absolute -inset-4 rounded-full bg-violet-600/30 animate-pulse blur-md" />
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-violet-500/80 shadow-2xl bg-gradient-to-tr from-indigo-700 via-violet-600 to-purple-600 flex items-center justify-center text-4xl sm:text-5xl font-bold text-white z-10 relative">
                {partnerAvatar ? (
                  <img src={partnerAvatar} alt="Partner" className="w-full h-full object-cover" />
                ) : (
                  partnerName?.charAt(0) || 'P'
                )}
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-white">
              {partnerName}
            </h2>

            <p className="text-sm font-medium text-violet-300">
              {callState.mode === 'outgoing' && 'Calling...'}
              {callState.mode === 'incoming' && `Incoming ${isVideo ? 'Video' : 'Voice'} Call`}
              {callState.mode === 'connected' && 'Call in progress'}
            </p>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS TOOLBAR */}
      <div className="w-full max-w-md pb-4 sm:pb-8 flex items-center justify-center gap-4 sm:gap-6 z-20">
        {/* INCOMING CALL ACTIONS */}
        {callState.mode === 'incoming' ? (
          <div className="flex items-center justify-around w-full px-4">
            {/* Decline Button (Red) */}
            <button
              onClick={handleRejectCall}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-900/50 active:scale-95 transition-all">
                <PhoneOff className="w-7 h-7" />
              </div>
              <span className="text-xs font-semibold text-rose-300">Decline</span>
            </button>

            {/* Accept Button (Green) */}
            <button
              onClick={handleAcceptCall}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/50 active:scale-95 transition-all animate-bounce-short">
                <Phone className="w-7 h-7" />
              </div>
              <span className="text-xs font-semibold text-emerald-300">Accept</span>
            </button>
          </div>
        ) : (
          /* ACTIVE / OUTGOING CALL ACTIONS */
          <div className="flex items-center gap-3 sm:gap-5 bg-violet-950/70 border border-violet-500/30 rounded-3xl p-3 sm:p-4 backdrop-blur-lg shadow-2xl">
            {/* Mute Mic */}
            <button
              onClick={toggleMute}
              className={`p-3.5 rounded-2xl transition-all ${
                isMuted ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Video Toggle (if video call) */}
            {isVideo && (
              <>
                <button
                  onClick={toggleVideo}
                  className={`p-3.5 rounded-2xl transition-all ${
                    isVideoOff ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>

                {/* Flip Camera on mobile */}
                <button
                  onClick={flipCamera}
                  className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all"
                  title="Switch Camera"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
              </>
            )}

            {/* End Call Button (Red) */}
            <button
              onClick={handleEndCall}
              className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/50 active:scale-95 transition-all"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
