import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle } from 'lucide-react';
import { apiLoginStep1, apiLoginStep2 } from '../../services/api';

export default function AuthModal({ onAuthenticated, onClose, theme }) {
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [partialToken, setPartialToken] = useState(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isDark = theme === 'dark';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmitStep1 = async (e) => {
    e.preventDefault();
    if (!userId.trim() || !password) {
      setErrorMessage('Please fill in both fields.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const data = await apiLoginStep1(userId.trim(), password);
      if (data.success && data.partialToken) {
        setPartialToken(data.partialToken);
        setStep(2);
      } else {
        setErrorMessage(data.message || 'Invalid login.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitStep2 = async (e) => {
    e?.preventDefault();
    if (pin.length !== 4) {
      setErrorMessage('Enter 4-digit PIN.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const data = await apiLoginStep2(partialToken, pin);
      if (data.success && data.token) {
        onAuthenticated({
          token: data.token,
          user: data.user,
          partner: data.partner,
        });
      } else {
        setErrorMessage(data.message || 'Incorrect PIN.');
        setPin('');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid PIN.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handlePinInput = (digit) => {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      if (next.length === 4) {
        // Auto submit
        setTimeout(() => {
          verifyCompletedPin(next);
        }, 50);
      }
    }
  };

  const verifyCompletedPin = async (completedPin) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await apiLoginStep2(partialToken, completedPin);
      if (data.success && data.token) {
        onAuthenticated({
          token: data.token,
          user: data.user,
          partner: data.partner,
        });
      } else {
        setErrorMessage(data.message || 'Incorrect PIN.');
        setPin('');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid PIN.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090717]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`w-full max-w-sm ${isDark ? 'bg-[#120f2e] border-violet-500/30 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-3xl p-6 shadow-2xl relative`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full ${isDark ? 'text-violet-400 hover:text-white hover:bg-violet-800/30' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold tracking-tight mb-4 text-violet-100">
          Secure Login
        </h2>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSubmitStep1} className="space-y-4">
            <div>
              <label className={`text-xs font-medium ${isDark ? 'text-violet-300' : 'text-slate-600'} block mb-1`}>
                User ID
              </label>
              <input
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className={`w-full ${isDark ? 'bg-[#181438] border-violet-500/30 text-white focus:border-violet-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500'} border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-colors`}
                autoFocus
              />
            </div>

            <div>
              <label className={`text-xs font-medium ${isDark ? 'text-violet-300' : 'text-slate-600'} block mb-1`}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full ${isDark ? 'bg-[#181438] border-violet-500/30 text-white focus:border-violet-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500'} border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-colors`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-violet-950/50 disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Proceed'}
            </button>
          </form>
        ) : (
          <div>
            <label className={`text-xs font-medium ${isDark ? 'text-violet-300' : 'text-slate-600'} block text-center mb-3`}>
              Enter 4-Digit Secret PIN
            </label>

            {/* PIN Bubbles */}
            <div className="flex justify-center gap-3.5 my-4">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all ${
                    pin.length > index
                      ? 'bg-violet-500 scale-110 shadow-md shadow-violet-500/50'
                      : (isDark ? 'border-2 border-violet-500/40 bg-[#181438]' : 'border-2 border-slate-300 bg-slate-100')
                  }`}
                />
              ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto mt-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={loading || pin.length >= 4}
                  onClick={() => handlePinInput(digit)}
                  className={`h-11 ${isDark ? 'bg-[#19153b] hover:bg-[#231d52] text-white border-violet-500/30' : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200'} border text-base font-semibold rounded-xl active:scale-95 transition-all`}
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPin('')}
                className={`h-11 ${isDark ? 'bg-[#19153b]/50 text-violet-400' : 'bg-slate-50 text-slate-500'} text-xs font-medium rounded-xl`}
              >
                Clear
              </button>

              <button
                type="button"
                disabled={loading || pin.length >= 4}
                onClick={() => handlePinInput('0')}
                className={`h-11 ${isDark ? 'bg-[#19153b] hover:bg-[#231d52] text-white border-violet-500/30' : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200'} border text-base font-semibold rounded-xl active:scale-95 transition-all`}
              >
                0
              </button>

              <button
                type="button"
                onClick={() => setPin(pin.slice(0, -1))}
                className={`h-11 ${isDark ? 'bg-[#19153b]/50 text-violet-400' : 'bg-slate-50 text-slate-500'} text-xs font-medium rounded-xl`}
              >
                Del
              </button>
            </div>

            <div className="mt-5 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setPin('');
                  setErrorMessage('');
                }}
                className={`${isDark ? 'text-violet-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleSubmitStep2}
                disabled={loading || pin.length !== 4}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-medium disabled:opacity-50 shadow-md shadow-violet-950/40"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Proceed'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
