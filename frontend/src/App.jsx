import React, { useState } from 'react';
import CoverApp from './components/StealthCover/CoverApp';
import AuthModal from './components/Auth/AuthModal';
import ChatApp from './components/Chat/ChatApp';
import { setAuthToken, clearAuthToken } from './services/api';

export default function App() {
  // Mode: 'cover' (innocent To-Do list), 'auth' (security gateway popup), 'chat' (secure room)
  const [appMode, setAppMode] = useState('cover');
  const [sessionUser, setSessionUser] = useState(null);
  const [partnerUser, setPartnerUser] = useState(null);

  // Triggered by stealth gesture
  const handleUnlockSecretGate = () => {
    setAppMode('auth');
  };

  // Triggered when both Step 1 (credentials) and Step 2 (PIN) pass
  const handleAuthenticated = ({ token, user, partner }) => {
    // Save token strictly in JavaScript memory closure (zero storage policy)
    setAuthToken(token);
    setSessionUser(user);
    setPartnerUser(partner);
    setAppMode('chat');
  };

  // Immediate Panic Wipe (returns to cover, destroys memory tokens)
  const handlePanicExit = () => {
    clearAuthToken();
    setSessionUser(null);
    setPartnerUser(null);
    setAppMode('cover');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 select-none">
      {appMode === 'chat' && sessionUser ? (
        <ChatApp
          sessionUser={sessionUser}
          initialPartner={partnerUser}
          onPanicExit={handlePanicExit}
        />
      ) : (
        <>
          {/* Always render deceptive Cover App when not in chat */}
          <CoverApp onUnlockSecretGate={handleUnlockSecretGate} />

          {/* Secret Security Vault Gateway */}
          {appMode === 'auth' && (
            <AuthModal
              onAuthenticated={handleAuthenticated}
              onClose={() => setAppMode('cover')}
            />
          )}
        </>
      )}
    </div>
  );
}
