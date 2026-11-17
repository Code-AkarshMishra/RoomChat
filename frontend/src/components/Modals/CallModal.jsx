import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  SwitchCamera, 
  User 
} from 'lucide-react';
import { sounds } from '../../utils/soundEffects';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

export default function CallModal({
  callState, // null | { mode: 'outgoing' | 'incoming' | 'connected', callType: 'video' | 'audio', callerName, callerAvatar, callerId, offer }
  partner,
  currentUser,
  socket,
  onClose,
}) {
  const [callMode, setCallMode] = useState(callState?.mode || 'outgoing');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [callDuration, setCallDuration] = useState(0);
  const [statusText, setStatusText] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const durationTimerRef = useRef(null);
  const timeoutTimerRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const isVideo = callState?.callType === 'video';
  const partnerName = callState?.callerName || partner?.displayName || 'Partner';
  const partnerAvatar = callState?.callerAvatar || partner?.avatarUrl;

  // Sync mode when callState prop changes
  useEffect(() => {
    if (callState?.mode) {
      setCallMode(callState.mode);
    }
  }, [callState?.mode]);

  // Clean up all resources
  const cleanUpCall = () => {
    sounds.stopAll();
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    remoteStreamRef.current = new MediaStream();
    setLocalStream(null);
    setRemoteStream(null);
    setCallDuration(0);
    pendingCandidatesRef.current = [];
  };

  // Sound effects & ringtone management
  useEffect(() => {
    if (callMode === 'incoming') {
      setStatusText(`Incoming ${isVideo ? 'Video' : 'Voice'} Call`);
      sounds.startIncomingRingtone();
    } else if (callMode === 'outgoing') {
      setStatusText('Ringing...');
      sounds.startOutgoingTone();

      // 35s timeout if no answer
      timeoutTimerRef.current = setTimeout(() => {
        sounds.stopAll();
        setStatusText('No answer');
        setTimeout(() => {
          handleEndCall();
        }, 1500);
      }, 35000);
    } else if (callMode === 'connected') {
      sounds.stopAll();
      setStatusText('Connected');
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }
      if (!durationTimerRef.current) {
        durationTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }
    }

    return () => {
      sounds.stopAll();
    };
  }, [callMode, isVideo]);

  // Initialize Peer Connection & Local Stream
  const initPeerConnection = async (type) => {
    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Remote track listener
      pc.ontrack = (event) => {
        if (event.track) {
          remoteStreamRef.current.addTrack(event.track);
          setRemoteStream(remoteStreamRef.current);

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
            remoteVideoRef.current.play().catch(() => {});
          }
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStreamRef.current;
            remoteAudioRef.current.play().catch(() => {});
          }
        }
      };

      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice_candidate', { candidate: event.candidate });
        }
      };

      // Get user media with fallback
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: type === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false,
          audio: true,
        });
      } catch (mediaErr) {
        // If video fails (no camera on device), try audio only
        if (type === 'video') {
          console.warn('Video access failed, falling back to audio only:', mediaErr);
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        } else {
          throw mediaErr;
        }
      }

      setLocalStream(stream);

      if (localVideoRef.current && stream.getVideoTracks().length > 0) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      return { pc, stream };
    } catch (err) {
      console.error('Peer connection init error:', err);
      alert('Could not access microphone or camera. Please check permissions.');
      cleanUpCall();
      onClose();
      return null;
    }
  };

  // Caller: create offer and emit call_user
  useEffect(() => {
    if (callState?.mode !== 'outgoing' || !socket) return;

    let isMounted = true;
    const startCall = async () => {
      const result = await initPeerConnection(callState.callType);
      if (!result || !isMounted) return;
      const { pc } = result;

      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideo,
        });
        await pc.setLocalDescription(offer);

        socket.emit('call_user', {
          callType: callState.callType,
          offer,
        });
      } catch (err) {
        console.error('Offer creation error:', err);
      }
    };

    startCall();

    return () => {
      isMounted = false;
    };
  }, [callState?.mode, socket]);

  // Socket event listeners for WebRTC signaling
  useEffect(() => {
    if (!socket) return;

    // Caller receives answer
    const handleAnswer = async ({ answer }) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          setCallMode('connected');

          // Process queued ICE candidates
          while (pendingCandidatesRef.current.length > 0) {
            const candidate = pendingCandidatesRef.current.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {}
          }
        } catch (err) {
          console.error('Error setting remote description on answer:', err);
        }
      }
    };

    // Receive ICE candidate
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

    // Remote rejected
    const handleCallRejected = () => {
      sounds.stopAll();
      setStatusText('Call Declined');
      setTimeout(() => {
        cleanUpCall();
        onClose();
      }, 1200);
    };

    // Remote ended
    const handleCallEnded = () => {
      sounds.stopAll();
      setStatusText('Call Ended');
      setTimeout(() => {
        cleanUpCall();
        onClose();
      }, 1000);
    };

    // Call failed (e.g. partner is offline)
    const handleCallFailed = ({ reason }) => {
      sounds.stopAll();
      if (reason === 'partner_offline') {
        setStatusText('Partner is currently offline');
      } else {
        setStatusText('Call Failed');
      }
      setTimeout(() => {
        cleanUpCall();
        onClose();
      }, 1500);
    };

    socket.on('call_answered', handleAnswer);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);
    socket.on('call_failed', handleCallFailed);

    return () => {
      socket.off('call_answered', handleAnswer);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
      socket.off('call_failed', handleCallFailed);
    };
  }, [socket, onClose]);

  // Re-attach video/audio streams when DOM updates
  useEffect(() => {
    if (callMode === 'connected') {
      if (remoteVideoRef.current && remoteStreamRef.current.getTracks().length > 0) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (remoteAudioRef.current && remoteStreamRef.current.getTracks().length > 0) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.play().catch(() => {});
      }
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(() => {});
      }
    }
  }, [callMode, remoteStream, localStream]);

  // Receiver: Accept incoming call
  const handleAcceptCall = async () => {
    sounds.stopAll();
    const result = await initPeerConnection(callState.callType);
    if (!result) return;
    const { pc } = result;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(callState.offer));

      // Process queued candidates
      while (pendingCandidatesRef.current.length > 0) {
        const candidate = pendingCandidatesRef.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {}
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socket) {
        socket.emit('answer_call', { answer });
      }

      setCallMode('connected');
    } catch (err) {
      console.error('Accept call error:', err);
      handleEndCall();
    }
  };

  // Decline incoming call
  const handleRejectCall = () => {
    sounds.stopAll();
    if (socket) {
      socket.emit('reject_call', { reason: 'declined' });
    }
    cleanUpCall();
    onClose();
  };

  // Hang up / End active call
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
    <div className="fixed inset-0 z-50 bg-[#090717]/98 backdrop-blur-xl flex flex-col justify-between items-center text-white overflow-hidden animate-fade-in p-4 sm:p-6 select-none">
      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* TOP STATUS BAR */}
      <div className="w-full flex items-center justify-between z-20 pt-2 sm:pt-4 max-w-lg">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping" />
          <span className="text-xs font-semibold tracking-wider uppercase text-violet-300">
            {isVideo ? 'WebRTC Video Call' : 'WebRTC Voice Call'}
          </span>
        </div>
        {callMode === 'connected' ? (
          <span className="text-xs font-mono bg-violet-950/80 border border-violet-500/30 px-3 py-1 rounded-full text-violet-200 shadow-sm">
            {formatDuration(callDuration)}
          </span>
        ) : (
          <span className="text-xs text-violet-400 font-medium animate-pulse">
            {statusText}
          </span>
        )}
      </div>

      {/* CENTER CALL VIEW */}
      <div className="flex-1 w-full max-w-lg flex flex-col items-center justify-center relative my-auto">
        {/* If Connected and Video Call: Full Screen Video View */}
        {callMode === 'connected' && isVideo ? (
          <div className="relative w-full h-[58vh] sm:h-[65vh] rounded-3xl overflow-hidden bg-black/80 border border-violet-500/30 shadow-2xl flex items-center justify-center">
            {/* Remote Partner Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* If remote has no video or camera turned off */}
            {(!remoteStream || remoteStream.getVideoTracks().length === 0) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#130f30]/90">
                <div className="w-24 h-24 rounded-full bg-violet-600/40 border border-violet-400/40 flex items-center justify-center text-3xl font-bold mb-3 shadow-lg">
                  {partnerName?.charAt(0) || 'P'}
                </div>
                <p className="text-sm text-violet-200 font-medium">{partnerName}</p>
                <p className="text-xs text-violet-400/70 mt-1">Audio Connected</p>
              </div>
            )}

            {/* Local Video Picture-in-Picture (PiP) */}
            <div className="absolute top-4 right-4 w-28 sm:w-36 h-36 sm:h-44 rounded-2xl overflow-hidden border-2 border-violet-400/80 shadow-2xl bg-slate-950 z-10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-[#120f2d] flex items-center justify-center text-[11px] text-violet-400 font-medium">
                  Camera Off
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Avatar + Status Display for Outgoing / Incoming / Voice Calls */
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
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
              {statusText}
            </p>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS TOOLBAR */}
      <div className="w-full max-w-md pb-4 sm:pb-8 flex items-center justify-center gap-4 sm:gap-6 z-20">
        {/* INCOMING CALL CONTROLS */}
        {callMode === 'incoming' ? (
          <div className="flex items-center justify-around w-full px-6">
            {/* Decline (Red) */}
            <button
              onClick={handleRejectCall}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-950/60 active:scale-95 transition-all">
                <PhoneOff className="w-7 h-7" />
              </div>
              <span className="text-xs font-semibold text-rose-300">Decline</span>
            </button>

            {/* Accept (Green) */}
            <button
              onClick={handleAcceptCall}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/60 active:scale-95 transition-all animate-bounce">
                <Phone className="w-7 h-7" />
              </div>
              <span className="text-xs font-semibold text-emerald-300">Accept</span>
            </button>
          </div>
        ) : (
          /* ACTIVE OR OUTGOING CONTROLS */
          <div className="flex items-center gap-3 sm:gap-4 bg-[#16123a]/90 border border-violet-500/30 rounded-3xl p-3 sm:p-4 backdrop-blur-xl shadow-2xl">
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
                  title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>

                {/* Flip Camera */}
                <button
                  onClick={flipCamera}
                  className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90"
                  title="Switch Camera"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
              </>
            )}

            {/* End Call Button (Red) */}
            <button
              onClick={handleEndCall}
              className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/60 active:scale-95 transition-all"
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
