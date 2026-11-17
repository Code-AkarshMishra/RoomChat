import React, { useState } from 'react';
import { 
  X, 
  User, 
  Camera, 
  Lock, 
  Trash2, 
  Sun, 
  Moon, 
  Check, 
  RefreshCw, 
  ShieldAlert 
} from 'lucide-react';
import { apiUpdateProfile, apiClearChat, apiUploadMedia } from '../../services/api';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
];

export default function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
  onClearChat,
  theme,
  onToggleTheme,
  onPanicExit,
}) {
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [newPassword, setNewPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await apiUploadMedia(file, 'image');
      if (res.success && res.mediaUrl) {
        setAvatarUrl(res.mediaUrl);
      }
    } catch (err) {
      alert('Avatar upload failed.');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');

    try {
      const payload = {
        displayName: displayName.trim(),
        avatarUrl,
        ...(newPassword.trim() ? { newPassword: newPassword.trim() } : {}),
        ...(newPin.trim() ? { newPin: newPin.trim() } : {}),
      };

      const res = await apiUpdateProfile(payload);
      if (res.success) {
        setSuccessMsg('Profile updated.');
        onProfileUpdated(res.user);
        setTimeout(() => setSuccessMsg(''), 2500);
      }
    } catch (err) {
      alert(err.message || 'Update failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to delete all messages for both of you? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      await apiClearChat();
      onClearChat();
      onClose();
    } catch (err) {
      alert('Could not clear chat.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`w-full max-w-md ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold tracking-tight mb-5">
          Settings
        </h2>

        {successMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative group mb-3">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-500 flex items-center justify-center bg-indigo-600 text-white font-bold text-2xl shadow-md">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  displayName.charAt(0) || 'U'
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full cursor-pointer shadow-md">
                <Camera className="w-3.5 h-3.5" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-2">
              {AVATAR_PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAvatarUrl(p)}
                  className={`w-7 h-7 rounded-full overflow-hidden border-2 ${avatarUrl === p ? 'border-indigo-500 scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  <img src={p} alt="Preset" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'} block mb-1`}>
              Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`w-full ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} border rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'} block mb-1`}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500`}
              />
            </div>
            <div>
              <label className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'} block mb-1`}>
                New 4-Digit PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className={`w-full ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Save Changes</>}
          </button>
        </form>

        <div className={`my-5 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />

        {/* Preferences & Actions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Theme
            </span>
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-xl border flex items-center gap-2 text-xs ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
            >
              {isDark ? <><Sun className="w-3.5 h-3.5 text-amber-300" /> Light</> : <><Moon className="w-3.5 h-3.5" /> Dark</>}
            </button>
          </div>

          <button
            type="button"
            onClick={handleClearHistory}
            disabled={isClearing}
            className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All Chat History
          </button>

          <button
            type="button"
            onClick={onPanicExit}
            className={`w-full py-2.5 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Exit to Tasks
          </button>
        </div>
      </div>
    </div>
  );
}
