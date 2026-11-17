import React from 'react';
import { 
  ShieldAlert, 
  Wifi, 
  WifiOff, 
  Sparkles, 
  CalendarHeart, 
  Heart,
  Zap
} from 'lucide-react';

export default function ChatHeader({
  partner,
  isPartnerOnline,
  latency,
  onPanicExit,
  onOpenCountdown,
  onOpenVibeModal,
  onTriggerLoveBomb,
  coupleMeta,
}) {
  // Format countdown preview string
  const getCountdownPreview = () => {
    if (!coupleMeta || !coupleMeta.countdownTargetDate) return 'Countdown';
    const diff = new Date(coupleMeta.countdownTargetDate) - new Date();
    if (diff <= 0) return '🎉 Today!';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${days}d ${hours}h`;
  };

  return (
    <header className="h-16 px-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-20 sticky top-0">
      {/* Partner Info & Presence */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 flex items-center justify-center text-white font-bold shadow-md shadow-pink-500/20 text-base">
            {partner?.displayName?.charAt(0) || 'P'}
          </div>
          {/* Live Online Badge */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
              isPartnerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
            }`}
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-tight">
              {partner?.displayName || 'My Partner'}
            </h2>
            {/* Sub-second latency badge */}
            <span 
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5 ${
                latency !== null && latency < 150
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
              title="Real-Time WebSocket Latency"
            >
              <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              {latency !== null ? `${latency}ms` : '<0.1s'}
            </span>
          </div>

          {/* Vibe Status Pill */}
          <button
            onClick={onOpenVibeModal}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-pink-300 transition-colors text-left"
            title="Click to view & change vibes"
          >
            <span>{partner?.vibeStatus?.emoji || '💖'}</span>
            <span className="truncate max-w-[130px] sm:max-w-[200px]">
              {partner?.vibeStatus?.text || (isPartnerOnline ? 'Connected' : 'Offline')}
            </span>
          </button>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {/* Countdown Pill */}
        <button
          onClick={onOpenCountdown}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs text-rose-300 hover:text-white transition-all shadow-sm"
          title="Countdown to special moment"
        >
          <CalendarHeart className="w-3.5 h-3.5 text-rose-400" />
          <span className="font-semibold">{getCountdownPreview()}</span>
        </button>

        {/* Love Bomb Trigger Button */}
        <button
          onClick={onTriggerLoveBomb}
          className="p-2 sm:px-3 sm:py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-pink-500/30 active:scale-95 transition-all"
          title="Send Love Bomb! (Erupts synchronized hearts on both screens)"
        >
          <Heart className="w-4 h-4 fill-white" />
          <span className="hidden sm:inline">Love Bomb</span>
        </button>

        {/* Ninja Panic / Stealth Mode Button */}
        <button
          onClick={onPanicExit}
          className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-400 hover:text-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
          title="Instant Panic Exit: Wipes credentials from memory and returns to deceptive To-Do cover (Esc)"
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span className="hidden md:inline">Stealth Exit</span>
        </button>
      </div>
    </header>
  );
}

