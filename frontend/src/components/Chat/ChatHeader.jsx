import React, { useState } from 'react';
import { 
  Settings, 
  ShieldAlert, 
  Phone, 
  Video, 
  Bell, 
  BellOff, 
  Palette, 
  Maximize, 
  Minimize, 
  Check 
} from 'lucide-react';
import { WALLPAPERS } from '../../utils/wallpapers';

export default function ChatHeader({
  partner,
  isPartnerOnline,
  onStartCall, // (callType: 'video' | 'audio') => void
  notificationsEnabled,
  onToggleNotifications,
  activeWallpaper,
  onSelectWallpaper,
  onPanicExit,
  onOpenSettings,
  theme,
}) {
  const [showWallpaperMenu, setShowWallpaperMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  const isDark = theme === 'dark';

  // Toggle true Fullscreen on mobile & desktop
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Format last seen timestamp with accurate precision
  const formatLastSeen = (dateStr) => {
    if (!dateStr) return 'Offline';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Offline';

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    // Yesterday check
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `last seen today at ${timeStr}`;
    }
    if (isYesterday) {
      return `last seen yesterday at ${timeStr}`;
    }
    const dateFormatted = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `last seen ${dateFormatted} at ${timeStr}`;
  };

  return (
    <header className="h-16 px-3 sm:px-4 bg-[#110e2d]/95 border-b border-violet-500/20 flex items-center justify-between z-30 sticky top-0 backdrop-blur-md shadow-sm transition-colors text-white select-none">
      {/* LEFT: Partner Avatar & Presence Status */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-violet-500/50 flex items-center justify-center bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-600 text-white font-bold text-sm shadow-md">
            {partner?.avatarUrl ? (
              <img src={partner.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              partner?.displayName?.charAt(0) || 'P'
            )}
          </div>
          {/* Live Online Badge */}
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#110e2d] ${
              isPartnerOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-500'
            }`}
          />
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-white truncate">
            {partner?.displayName || 'Partner'}
          </h2>
          <p className="text-[11px] truncate leading-tight">
            {isPartnerOnline ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                online
              </span>
            ) : (
              <span className="text-violet-300/70 font-normal">
                {formatLastSeen(partner?.lastSeen)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* RIGHT: Controls Toolbar */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* WebRTC Video Call */}
        <button
          onClick={() => onStartCall('video')}
          className="p-2 rounded-xl text-violet-200 hover:text-white hover:bg-violet-800/40 active:scale-95 transition-all"
          title="Video Call"
        >
          <Video className="w-5 h-5 text-violet-300" />
        </button>

        {/* WebRTC Voice Call */}
        <button
          onClick={() => onStartCall('audio')}
          className="p-2 rounded-xl text-violet-200 hover:text-white hover:bg-violet-800/40 active:scale-95 transition-all"
          title="Voice Call"
        >
          <Phone className="w-4.5 h-4.5 text-violet-300" />
        </button>

        {/* Notification Alert Toggle */}
        <button
          onClick={onToggleNotifications}
          className={`p-2 rounded-xl transition-all ${
            notificationsEnabled 
              ? 'text-amber-400 hover:bg-amber-400/10' 
              : 'text-violet-400/60 hover:text-violet-200 hover:bg-violet-800/40'
          }`}
          title={notificationsEnabled ? 'Notifications On' : 'Notifications Off (Click to enable)'}
        >
          {notificationsEnabled ? <Bell className="w-4.5 h-4.5" /> : <BellOff className="w-4.5 h-4.5" />}
        </button>

        {/* Multi-Theme Wallpaper Selector */}
        <div className="relative">
          <button
            onClick={() => setShowWallpaperMenu(!showWallpaperMenu)}
            className="p-2 rounded-xl text-violet-200 hover:text-white hover:bg-violet-800/40 active:scale-95 transition-all"
            title="Chat Wallpaper Theme"
          >
            <Palette className="w-4.5 h-4.5 text-violet-300" />
          </button>

          {showWallpaperMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#16123a] border border-violet-500/30 rounded-2xl p-2 shadow-2xl z-50 animate-fade-in backdrop-blur-xl">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-300/80 px-2 py-1">
                Chat Theme Wallpaper
              </div>
              <div className="space-y-1 mt-1">
                {WALLPAPERS.map((wp) => (
                  <button
                    key={wp.id}
                    onClick={() => {
                      onSelectWallpaper(wp.id);
                      setShowWallpaperMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      activeWallpaper === wp.id
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-violet-200 hover:bg-violet-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-violet-400/40 shadow-xs"
                        style={{ backgroundColor: wp.previewColor }}
                      />
                      <span>{wp.name}</span>
                    </div>
                    {activeWallpaper === wp.id && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Toggle (great for mobile) */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-xl text-violet-200 hover:text-white hover:bg-violet-800/40 active:scale-95 transition-all hidden sm:flex"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize className="w-4.5 h-4.5" /> : <Maximize className="w-4.5 h-4.5" />}
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-violet-200 hover:text-white hover:bg-violet-800/40 active:scale-95 transition-all"
          title="Settings"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>

        {/* Panic / Tasks Exit */}
        <button
          onClick={onPanicExit}
          className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all"
          title="Quick Exit"
        >
          <ShieldAlert className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
}
