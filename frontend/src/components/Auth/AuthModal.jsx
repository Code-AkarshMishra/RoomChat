import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  KeyRound, 
  ArrowRight, 
  X, 
  AlertCircle, 
  Delete,
  Fingerprint,
  RefreshCw
} from 'lucide-react';
import { apiLoginStep1, apiLoginStep2 } from '../../services/api';

export default function AuthModal({ onAuthenticated, onClose }) {
  // Step 1 states
  const [step, setStep] = useState(1); // 1 = Credentials, 2 = 4-digit PIN
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [partialToken, setPartialToken] = useState(null);

  // Step 2 states
  const [pin, setPin] = useState('');
  
  // UX states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);

  // Listen for Escape key to instantly close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle Step 1: User ID + Password
  const handleSubmitStep1 = async (e) => {
    e.preventDefault();
    if (!userId.trim() || !password) {
      triggerError('Please enter both User ID and Password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const data = await apiLoginStep1(userId.trim(), password);
      if (data.success && data.partialToken) {
        setPartialToken(data.partialToken);
        setDisplayName(data.displayName || userId);
        setStep(2);
        setErrorMessage('');
      } else {
        triggerError(data.message || 'Verification failed.');
      }
    } catch (err) {
      triggerError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: PIN entry
  const handlePinDigit = (digit) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handlePinBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  const verifyPin = async (completedPin) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const data = await apiLoginStep2(partialToken, completedPin);
      if (data.success && data.token) {
        // Authenticated! Hand the session token & users to parent state strictly in memory
        onAuthenticated({
          token: data.token,
          user: data.user,
          partner: data.partner,
        });
      } else {
        triggerError(data.message || 'Incorrect PIN.');
        setPin('');
      }
    } catch (err) {
      triggerError(err.message || 'Invalid PIN code. Try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const triggerError = (msg) => {
    setErrorMessage(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 transition-all">
      <div 
        className={`w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative transition-all duration-200 ${
          shake ? 'translate-x-[-10px] animate-wiggle' : ''
        }`}
      >
        {/* Close Button / Emergency Return */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-300 rounded-full hover:bg-slate-800 transition-colors"
          title="Exit to stealth mode (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step 1: User ID and Password */}
        {step === 1 && (
          <div>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">Security Gateway</h2>
              <p className="text-xs text-slate-400 mt-1">
                Phase 1: Dual Identity Authorization
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitStep1} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">User ID</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g. alex or sam"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Proceed to PIN Gate <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 text-center">
              <span className="text-[11px] text-slate-500 font-mono">
                🔒 In-memory session. Zero storage footprint.
              </span>
            </div>
          </div>
        )}

        {/* Step 2: 4-digit Secret PIN Gate */}
        {step === 2 && (
          <div>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">4-Digit PIN Gate</h2>
              <p className="text-xs text-slate-400 mt-1">
                Identity: <span className="text-cyan-400 font-semibold">{displayName}</span>
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* PIN Bubble Indicators */}
            <div className="flex justify-center gap-4 my-6">
              {[0, 1, 2, 3].map((index) => {
                const filled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      filled
                        ? 'bg-cyan-400 scale-125 shadow-md shadow-cyan-400/50'
                        : 'border-2 border-slate-700 bg-slate-950'
                    }`}
                  />
                );
              })}
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={loading || pin.length >= 4}
                  onClick={() => handlePinDigit(digit)}
                  className="h-12 bg-slate-800/80 hover:bg-slate-700 text-slate-100 text-lg font-semibold rounded-2xl active:scale-95 transition-all shadow-sm border border-slate-700/50 disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPin('')}
                disabled={loading || pin.length === 0}
                className="h-12 bg-slate-800/40 hover:bg-slate-800 text-slate-400 text-xs font-medium rounded-2xl active:scale-95 transition-all"
              >
                Clear
              </button>

              <button
                type="button"
                disabled={loading || pin.length >= 4}
                onClick={() => handlePinDigit('0')}
                className="h-12 bg-slate-800/80 hover:bg-slate-700 text-slate-100 text-lg font-semibold rounded-2xl active:scale-95 transition-all shadow-sm border border-slate-700/50 disabled:opacity-50"
              >
                0
              </button>

              <button
                type="button"
                onClick={handlePinBackspace}
                disabled={loading || pin.length === 0}
                className="h-12 bg-slate-800/40 hover:bg-slate-800 text-slate-400 flex items-center justify-center rounded-2xl active:scale-95 transition-all"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Back to Step 1 */}
            <div className="mt-5 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setPin('');
                  setErrorMessage('');
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ← Back to Credentials
              </button>

              {loading && (
                <span className="text-cyan-400 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

