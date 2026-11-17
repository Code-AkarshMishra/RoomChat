import React, { useState } from 'react';
import { Sparkles, X, Check } from 'lucide-react';
import { apiUpdateVibe } from '../../services/api';

const PRESET_VIBES = [
  { emoji: '💖', text: 'Thinking of you' },
  { emoji: '🥰', text: 'Missing you so much' },
  { emoji: '✈️', text: 'Counting down the days' },
  { emoji: '☕', text: 'Coffee & studying' },
  { emoji: '💼', text: 'Deep work mode' },
  { emoji: '😴', text: 'Sleepy cuddle time' },
  { emoji: '🎮', text: 'Taking a chill break' },
  { emoji: '✨', text: 'Excited for later' },
];

export default function VibeModal({ isOpen, onClose, currentVibe, onVibeChanged }) {
  const [selectedEmoji, setSelectedEmoji] = useState(currentVibe?.emoji || '💖');
  const [vibeText, setVibeText] = useState(currentVibe?.text || 'Thinking of you');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSelectPreset = (preset) => {
    setSelectedEmoji(preset.emoji);
    setVibeText(preset.text);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!vibeText.trim()) return;

    setIsUpdating(true);
    try {
      const res = await apiUpdateVibe(selectedEmoji, vibeText.trim());
      if (res.success && res.vibeStatus) {
        if (onVibeChanged) onVibeChanged(res.vibeStatus);
        onClose();
      }
    } catch (err) {
      alert(`Could not update vibe: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-2 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Set Your Vibe Status</h2>
          <p className="text-xs text-slate-400">Broadcast your real-time mood</p>
        </div>

        {/* Quick Presets Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {PRESET_VIBES.map((preset, index) => {
            const isSelected = selectedEmoji === preset.emoji && vibeText === preset.text;
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`p-2 rounded-xl text-xs font-medium text-left flex items-center gap-2 border transition-all ${
                  isSelected
                    ? 'bg-pink-500/20 border-pink-500/50 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="text-base">{preset.emoji}</span>
                <span className="truncate">{preset.text}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Edit Form */}
        <form onSubmit={handleSave} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={selectedEmoji}
              onChange={(e) => setSelectedEmoji(e.target.value)}
              maxLength={4}
              className="w-14 text-center bg-slate-950 border border-slate-800 rounded-xl py-2 text-lg focus:outline-none focus:border-pink-500"
            />
            <input
              type="text"
              value={vibeText}
              onChange={(e) => setVibeText(e.target.value)}
              placeholder="Custom vibe note..."
              maxLength={40}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-pink-500"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdating}
            className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20"
          >
            <Check className="w-4 h-4" /> Update Vibe
          </button>
        </form>
      </div>
    </div>
  );
}

