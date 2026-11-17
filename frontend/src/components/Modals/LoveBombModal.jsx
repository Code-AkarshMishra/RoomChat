import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Heart, Sparkles, X } from 'lucide-react';

export default function LoveBombOverlay({ bombData, onClose }) {
  const [hearts, setHearts] = useState([]);

  useEffect(() => {
    if (!bombData) return;

    // Trigger canvas confetti heart particles
    try {
      // 1. Center burst
      confetti({
        particleCount: 50,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#f43f5e', '#ec4899', '#fb7185', '#fda4af', '#f472b6'],
        shapes: ['circle'],
        scalar: 1.2,
      });

      // 2. Continuous heart showers
      const end = Date.now() + 2500;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#e11d48', '#f43f5e', '#fb7185'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#e11d48', '#f43f5e', '#fb7185'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } catch {
      // fallback
    }

    // Generate floating CSS hearts
    const newHearts = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: Math.random() * 95,
      animationDuration: 2 + Math.random() * 2,
      delay: Math.random() * 1.5,
      size: 20 + Math.random() * 30,
      emoji: ['💖', '❤️', '💕', '🥰', '✨', '🌹'][Math.floor(Math.random() * 6)],
    }));
    setHearts(newHearts);

    const timer = setTimeout(() => {
      onClose();
    }, 4500);

    return () => clearTimeout(timer);
  }, [bombData, onClose]);

  if (!bombData) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center p-4">
      {/* Floating CSS Hearts */}
      {hearts.map((h) => (
        <span
          key={h.id}
          className="floating-heart"
          style={{
            left: `${h.left}%`,
            bottom: '10px',
            fontSize: `${h.size}px`,
            animationDuration: `${h.animationDuration}s`,
            animationDelay: `${h.delay}s`,
          }}
        >
          {h.emoji}
        </span>
      ))}

      {/* Sweet Center Card */}
      <div className="pointer-events-auto bg-slate-900/90 border-2 border-pink-500/50 backdrop-blur-xl rounded-3xl p-6 shadow-2xl shadow-pink-500/40 text-center max-w-sm animate-bounce-short">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/50 animate-pulse">
          <Heart className="w-8 h-8 text-white fill-white" />
        </div>
        <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-amber-300">
          LOVE BOMB EXPLOSION!
        </h2>
        <p className="text-sm text-slate-200 mt-2 font-medium">
          {bombData.message || `${bombData.senderName} sent you endless love!`}
        </p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-xs font-semibold rounded-full border border-pink-500/40 transition-colors"
        >
          Hug Back 🥰
        </button>
      </div>
    </div>
  );
}

