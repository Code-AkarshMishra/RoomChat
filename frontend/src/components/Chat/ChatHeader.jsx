import React from 'react';
import { Settings, ShieldAlert } from 'lucide-react';

export default function ChatHeader({
  partner,
  isPartnerOnline,
  onPanicExit,
  onOpenSettings,
  theme,
}) {
  const isDark = theme === 'dark';

  // Format last seen timestamp
  const formatLastSeen = (dateStr) => {
    if (!dateStr) return 'Offline';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Last seen today at ${timeStr}`;
    }
    const dateFormatted = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `Last seen ${dateFormatted} at ${timeStr}`;
  };

  return (
    <header className={`h-16 px-4 ${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'} border-b flex items-center justify-between z-20 sticky top-0 transition-colors`}>
      {/* Partner Info & Presence */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700/30 flex items-center justify-center bg-indigo-600 text-white font-semibold text-sm shadow-xs">
            {partner?.avatarUrl ? (
              <img src={partner.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              partner?.displayName?.charAt(0) || 'P'
            )}
          </div>
          {/* Live Online Badge */}
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${isDark ? 'border-slate-900' : 'border-white'} ${
              isPartnerOnline ? 'bg-emerald-500' : 'bg-slate-400'
            }`}
          />
        </div>

        <div>
          <h2 className={`text-sm font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {partner?.displayName || 'Partner'}
          </h2>
          <p className={`text-xs ${isPartnerOnline ? 'text-emerald-500 font-medium' : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>
            {isPartnerOnline ? 'Online' : formatLastSeen(partner?.lastSeen)}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenSettings}
          className={`p-2 rounded-xl transition-colors ${
            isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        <button
          onClick={onPanicExit}
          className={`p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors`}
          title="Exit to Tasks"
        >
          <ShieldAlert className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
