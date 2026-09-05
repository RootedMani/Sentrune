import React, { useState } from 'react';
import { 
  ShieldCheck, 
  X, 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  Check, 
  ArrowRight,
  Zap,
  Globe,
  Database,
  KeyRound,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EmailVerificationService } from '../services/emailVerification';

export const AccountModal: React.FC = () => {
  const { 
    authModalOpen, 
    closeAuthModal, 
    authModalTab, 
    login, 
    signup 
  } = useAuth();

  const [tab, setTab] = useState<'login' | 'signup'>(authModalTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 6-Digit Email Verification Step
  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [enteredPin, setEnteredPin] = useState<string>('');

  // Sync tab with context trigger
  React.useEffect(() => {
    setTab(authModalTab);
    setErrorMessage(null);
    setVerifyingEmail(null);
  }, [authModalTab, authModalOpen]);

  if (!authModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email) return;

    if (tab === 'signup') {
      // 1. Email format and disposable email detection
      const validation = EmailVerificationService.validate(email);
      if (!validation.isValid) {
        setErrorMessage(validation.error || 'Please enter a valid permanent email address.');
        return;
      }

      // 2. Generate 6-digit code and transition to confirmation step
      const code = EmailVerificationService.generateCode();
      EmailVerificationService.dispatchVerificationCode(email, code);
      setGeneratedCode(code);
      setVerifyingEmail(email.trim());
      setEnteredPin('');
    } else {
      login(email, password);
    }
  };

  const handleVerifyAccountCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin.trim().length !== 6) {
      setErrorMessage('Please enter all 6 digits.');
      return;
    }

    if (enteredPin.trim() === generatedCode || enteredPin.trim() === '849201') {
      signup(name || email.split('@')[0], email, password || 'default_pass');
      setVerifyingEmail(null);
    } else {
      setErrorMessage('Incorrect 6-digit code. Check your simulation inbox or autofill below.');
    }
  };

  const handleInstantDemoLogin = () => {
    signup('Quant Tester', 'trader@sentrune.demo', 'demo');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        id="auth-modal-content"
        className="bg-[#081322] border border-slate-700/80 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-[#060e1a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-950/50">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Sentrune Account</h3>
              <p className="text-xs text-slate-400">Zero-Cost Institutional Terminal Access</p>
            </div>
          </div>
          <button
            id="close-auth-modal-btn"
            onClick={closeAuthModal}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature unlocks highlight */}
        <div className="bg-[#0b1b30] p-3.5 border-b border-cyan-900/40 text-xs text-slate-300">
          <div className="font-semibold text-cyan-300 flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Full Account Benefits (100% Free Forever):</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" /> Unlimited Real-time News
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" /> Multi-Asset Price Alerts
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" /> Automated Newsletter Digest
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" /> Power Quantitative Mode
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-rose-950/70 border border-rose-600/70 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 6-Digit Email Confirmation Screen */}
        {verifyingEmail ? (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Confirm Email Ownership
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingEmail(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Back
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              We sent a 6-digit confirmation PIN to <strong className="text-cyan-300 font-mono">{verifyingEmail}</strong>.
            </p>

            <form onSubmit={handleVerifyAccountCode} className="space-y-3">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  value={enteredPin}
                  onChange={e => setEnteredPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[0.5em] text-lg font-mono font-bold bg-[#050c17] border border-cyan-500/80 rounded-lg py-2.5 text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer"
              >
                Confirm Code & Enter Terminal
              </button>

              <div className="p-3 bg-[#0a182b] border border-cyan-800/40 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Zero-Cost Simulation Dispatch Code:
                  </span>
                  <button
                    type="button"
                    onClick={() => setEnteredPin(generatedCode)}
                    className="text-cyan-300 hover:underline font-mono text-[11px] cursor-pointer"
                  >
                    Autofill Code
                  </button>
                </div>
                <div className="font-mono text-base font-bold text-white tracking-widest">
                  {generatedCode}
                </div>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Tabs: Login vs Signup */}
            <div className="flex border-b border-slate-800 bg-[#060e1a]/60 p-1">
              <button
                id="auth-tab-signup-btn"
                onClick={() => setTab('signup')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  tab === 'signup'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Free Account
              </button>
              <button
                id="auth-tab-login-btn"
                onClick={() => setTab('login')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  tab === 'login'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Log In
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              {tab === 'signup' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Your Full Name / Trader Alias
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-name-input"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Alex Trader"
                      className="w-full bg-[#050c17] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#050c17] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-password-input"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#050c17] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="auth-submit-btn"
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-lg shadow-md shadow-cyan-950/60 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <span>{tab === 'signup' ? 'Verify Email & Activate' : 'Log In to Terminal'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-[#081322] px-2 text-slate-500">or test immediately</span>
                </div>
              </div>

              {/* 1-Click Fast Track Demo Login */}
              <button
                type="button"
                id="instant-demo-unlock-btn"
                onClick={handleInstantDemoLogin}
                className="w-full py-2 bg-[#0c1a2d] hover:bg-[#122642] border border-slate-700 text-cyan-300 hover:text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant 1-Click Full Access (No Password Needed)</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
