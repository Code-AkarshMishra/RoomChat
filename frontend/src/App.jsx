import React, { useState, useEffect } from 'react';
import CoverApp from './components/StealthCover/CoverApp';
import AuthModal from './components/Auth/AuthModal';
import ChatApp from './components/Chat/ChatApp';
import { setAuthToken, clearAuthToken } from './services/api';

export default function App() {
  const [appMode, setAppMode] = useState('cover'); // 'cover' | 'auth' | 'chat'
  const [sessionUser, setSessionUser] = useState(null);
  const [partnerUser, setPartnerUser] = useState(null);
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'

  // Apply dark mode class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Triggered when user enters "open chat" in task list
  const handleUnlockSecretGate = () => {
    setAppMode('auth');
  };

  // Triggered when both Step 1 & Step 2 pass
  const handleAuthenticated = ({ token, user, partner }) => {
    setAuthToken(token);
    setSessionUser(user);
    setPartnerUser(partner);
    setAppMode('chat');
  };

  // Immediate Panic Wipe (wipes memory, returns to cover)
  const handlePanicExit = () => {
    clearAuthToken();
    setSessionUser(null);
    setPartnerUser(null);
    setAppMode('cover');
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0a081a] text-white' : 'bg-slate-50 text-slate-900'} select-none transition-colors overflow-hidden`}>
      {appMode === 'chat' && sessionUser ? (
        <ChatApp
          sessionUser={sessionUser}
          initialPartner={partnerUser}
          onPanicExit={handlePanicExit}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <>
          <CoverApp
            onUnlockSecretGate={handleUnlockSecretGate}
            theme={theme}
            onToggleTheme={toggleTheme}
          />

          {appMode === 'auth' && (
            <AuthModal
              onAuthenticated={handleAuthenticated}
              onClose={() => setAppMode('cover')}
              theme={theme}
            />
          )}
        </>
      )}
    </div>
  );
}
