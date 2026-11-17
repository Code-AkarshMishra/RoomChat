import React, { useState, useEffect } from 'react';
import { CalendarHeart, X, Clock, Edit2, Check, Sparkles } from 'lucide-react';
import { apiUpdateCoupleMeta } from '../../services/api';

export default function CountdownModal({ isOpen, onClose, coupleMeta, onMetaUpdated }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(coupleMeta?.countdownTitle || 'Next Time We Meet ✈️💖');
  const [targetDateStr, setTargetDateStr] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (coupleMeta?.countdownTargetDate) {
      const d = new Date(coupleMeta.countdownTargetDate);
      setTargetDateStr(d.toISOString().slice(0, 16));
    }
  }, [coupleMeta]);

  // Live countdown ticker
  useEffect(() => {
    if (!isOpen || !coupleMeta?.countdownTargetDate) return;

    const calculate = () => {
      const target = new Date(coupleMeta.countdownTargetDate).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [isOpen, coupleMeta]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!targetDateStr) return;

    setIsSaving(true);
    try {
      const res = await apiUpdateCoupleMeta({
        countdownTitle: title,
        countdownTargetDate: new Date(targetDateStr).toISOString(),
      });
      if (res.success) {
        if (onMetaUpdated) onMetaUpdated(res.data);
        setIsEditing(false);
      }
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsSaving(false);
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

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-2 shadow-inner">
            <CalendarHeart className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            {coupleMeta?.countdownTitle || 'Special Moment'}
          </h2>
          <p className="text-xs text-slate-400">Live synchronized countdown</p>
        </div>

        {/* Live Counters */}
        {!isEditing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'DAYS', val: timeLeft.days },
                { label: 'HOURS', val: timeLeft.hours },
                { label: 'MINUTES', val: timeLeft.minutes },
                { label: 'SECONDS', val: timeLeft.seconds },
              ].map((item, i) => (
                <div key={i} className="bg-slate-950 border border-slate-800 rounded-2xl p-3 shadow-inner">
                  <span className="text-2xl font-black text-rose-400 font-mono block">
                    {String(item.val).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] font-semibold tracking-wider text-slate-500">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Target Date
              </button>
            </div>
          </div>
        ) : (
          /* Edit Form */
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Occasion / Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Date & Time</label>
              <input
                type="datetime-local"
                value={targetDateStr}
                onChange={(e) => setTargetDateStr(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

