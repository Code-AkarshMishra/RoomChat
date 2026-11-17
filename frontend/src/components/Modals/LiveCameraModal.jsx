import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { apiUploadMedia } from '../../services/api';

export default function LiveCameraModal({ isOpen, onClose, onSendCapturedMedia }) {
  const [stream, setStream] = useState(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPhotoUrl(null);
      setCameraError('');
      return;
    }

    startCamera(facingMode);

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode) => {
    stopCamera();
    setCameraError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setCameraError('Camera access denied or unavailable on this device.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const snapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhotoUrl(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedPhotoUrl(null);
    startCamera(facingMode);
  };

  const handleSendPhoto = async () => {
    if (!capturedPhotoUrl) return;
    setIsUploading(true);

    try {
      // Convert DataURL to Blob File
      const res = await fetch(capturedPhotoUrl);
      const blob = await res.blob();
      const file = new File([blob], `live_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });

      const uploadRes = await apiUploadMedia(file, 'image');
      if (uploadRes.success && uploadRes.mediaUrl) {
        onSendCapturedMedia({
          type: 'image',
          mediaUrl: uploadRes.mediaUrl,
          mediaPublicId: uploadRes.publicId,
        });
        onClose();
      }
    } catch (err) {
      alert(`Failed to send photo: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Live Snap Camera</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview */}
        <div className="relative bg-black aspect-4/3 flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-xs text-rose-400 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
              <p>{cameraError}</p>
            </div>
          ) : capturedPhotoUrl ? (
            <img
              src={capturedPhotoUrl}
              alt="Live snap preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls Footer */}
        <div className="p-4 bg-slate-950 flex items-center justify-around border-t border-slate-800">
          {capturedPhotoUrl ? (
            <>
              <button
                type="button"
                onClick={retakePhoto}
                disabled={isUploading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retake
              </button>
              <button
                type="button"
                onClick={handleSendPhoto}
                disabled={isUploading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all"
              >
                {isUploading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Send Snap
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Flip Camera */}
              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
                className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 transition-colors"
                title="Switch Camera (Front/Back)"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={snapPhoto}
                disabled={Boolean(cameraError)}
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-90 transition-transform shadow-xl"
              >
                <div className="w-full h-full bg-white rounded-full hover:bg-slate-200 transition-colors" />
              </button>

              <div className="w-10" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

