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
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

  // Sync tab with context trigger
  React.useEffect(() => {
    setTab(authModalTab);
  }, [authModalTab]);

  if (!authModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (tab === 'signup') {
      signup(name || email.split('@')[0], email, password);
    } else {
      login(email, password);
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
            <span>{tab === 'signup' ? 'Activate Free Account' : 'Log In to Terminal'}</span>
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
      </div>
    </div>
  );
};
