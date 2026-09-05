import React, { useState } from 'react';
import { 
  BellRing, 
  Mail, 
  Send, 
  Trash2, 
  CheckCircle, 
  Plus, 
  TrendingUp, 
  Flame, 
  Eye, 
  Calendar,
  Sparkles,
  ShieldCheck,
  Check,
  AlertCircle,
  KeyRound,
  RotateCcw
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';
import { useAuth } from '../context/AuthContext';
import { INITIAL_ASSETS } from '../data/mockMarketData';
import { AlertTriggerCondition, NewsletterAlert } from '../types';
import { EmailVerificationService } from '../services/emailVerification';

export const AlertsView: React.FC = () => {
  const { 
    alerts, 
    addAlert, 
    removeAlert, 
    toggleAlert, 
    verifyAlertEmail,
    resendVerificationCode,
    simulateDispatchAlert,
    selectedAsset 
  } = useWorkstation();

  const { user, isDemo, openAuthModal } = useAuth();

  const [email, setEmail] = useState(user.email.includes('demo') ? '' : user.email);
  const [assetSymbol, setAssetSymbol] = useState(selectedAsset.symbol);
  const [condition, setCondition] = useState<AlertTriggerCondition>('pct_change');
  const [threshold, setThreshold] = useState<number>(3.0);
  const [frequency, setFrequency] = useState<'instant' | 'daily_morning' | 'weekly'>('instant');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Verification step state
  const [verifyingAlert, setVerifyingAlert] = useState<{ id: string; email: string; code: string } | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate email format and check for disposable domains
    const validation = EmailVerificationService.validate(email);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Please enter a valid email address.');
      return;
    }

    if (isDemo && alerts.length >= 1) {
      alert('Demo limit reached: 1 active automated alert allowed. Register a free account for unlimited alerts!');
      openAuthModal('signup');
      return;
    }

    const generatedCode = EmailVerificationService.generateCode();
    EmailVerificationService.dispatchVerificationCode(email, generatedCode);

    const created = addAlert({
      email: email.trim(),
      assetSymbol,
      condition,
      threshold: condition === 'pct_change' ? threshold : undefined,
      frequency,
      active: true,
      isVerified: false,
      verificationCode: generatedCode
    });

    setVerifyingAlert({
      id: created.id,
      email: email.trim(),
      code: generatedCode
    });
    setEnteredCode('');
    setVerificationError(null);
  };

  const handleConfirmCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingAlert) return;

    if (enteredCode.length !== 6) {
      setVerificationError('Please enter all 6 digits of the code.');
      return;
    }

    const success = verifyAlertEmail(verifyingAlert.id, enteredCode);
    if (success) {
      setStatusMessage(`Email ownership verified! Alerts are live for ${verifyingAlert.email}.`);
      setVerifyingAlert(null);
      setEnteredCode('');
      setVerificationError(null);
      setTimeout(() => setStatusMessage(null), 5000);
    } else {
      setVerificationError('Invalid 6-digit code. Please check your inbox or click the simulation code.');
    }
  };

  const handleResend = () => {
    if (!verifyingAlert) return;
    const newCode = resendVerificationCode(verifyingAlert.id);
    setVerifyingAlert(prev => prev ? { ...prev, code: newCode } : null);
    setStatusMessage(`Fresh 6-digit confirmation code dispatched to ${verifyingAlert.email}.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleTestDispatch = async (alertItem: NewsletterAlert) => {
    if (!alertItem.isVerified) {
      setStatusMessage(`Cannot dispatch to unverified email. Please confirm ownership first.`);
      setVerifyingAlert({
        id: alertItem.id,
        email: alertItem.email,
        code: alertItem.verificationCode || '849201'
      });
      return;
    }
    const msg = await simulateDispatchAlert(alertItem.id);
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4500);
  };

  return (
    <div id="alerts-and-newsletter-view" className="space-y-4 p-4">
      {/* Top Banner */}
      <div className="bg-[#081322] p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700/60 text-cyan-400 flex items-center justify-center">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Automated Asset Newsletter & Price Alert Service
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded font-mono">
                Double Opt-In Protected
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified price alerts with 6-digit confirmation codes to ensure real, active inboxes.
            </p>
          </div>
        </div>

        {isDemo ? (
          <button
            id="alerts-view-unlock-free-btn"
            onClick={() => openAuthModal('signup')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer self-start sm:self-center"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unlock Unlimited Subscriptions</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
            <span>Unlimited Alerts Unlocked</span>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-600/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {validationError && (
        <div className="p-3 bg-rose-950/60 border border-rose-600/60 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Grid: Form on Left, Active Subscriptions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Form or 6-digit Verification Step */}
        <div className="lg:col-span-5 space-y-4">
          {verifyingAlert ? (
            <div className="bg-[#07111e] p-5 rounded-xl border border-cyan-500/70 space-y-4 shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Confirm Email Ownership
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setVerifyingAlert(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                We sent a 6-digit confirmation code to <strong className="text-cyan-300 font-mono">{verifyingAlert.email}</strong> to verify this inbox is yours.
              </p>

              {verificationError && (
                <div className="p-2.5 bg-rose-950/70 border border-rose-700/60 rounded-lg text-xs text-rose-300">
                  {verificationError}
                </div>
              )}

              <form onSubmit={handleConfirmCode} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    value={enteredCode}
                    onChange={e => setEnteredCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[0.5em] text-lg font-mono font-bold bg-[#050c17] border border-cyan-500/80 rounded-lg py-2 text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg shadow-md transition-colors cursor-pointer"
                >
                  Verify Email & Activate Alert
                </button>

                {/* Simulation Zero-Cost Assistance */}
                <div className="p-3 bg-[#0a182b] border border-cyan-800/40 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Zero-Cost Simulation Dispatch Code:
                    </span>
                    <button
                      type="button"
                      onClick={() => setEnteredCode(verifyingAlert.code)}
                      className="text-cyan-300 hover:underline font-mono text-[11px] cursor-pointer"
                    >
                      Autofill Code
                    </button>
                  </div>
                  <div className="font-mono text-base font-bold text-white tracking-widest">
                    {verifyingAlert.code}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Didn't receive code?</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Resend Code</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-[#07111e] p-4 rounded-xl border border-slate-800 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                Configure Automated Dispatch
              </h4>

              <form onSubmit={handleSubscribe} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Your Email Address
                  </label>
                  <input
                    id="tab-newsletter-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="trader@domain.com"
                    className="w-full bg-[#050c17] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Target Asset
                    </label>
                    <select
                      id="tab-newsletter-asset"
                      value={assetSymbol}
                      onChange={e => setAssetSymbol(e.target.value)}
                      className="w-full bg-[#050c17] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      {INITIAL_ASSETS.map(a => (
                        <option key={a.symbol} value={a.symbol}>
                          {a.symbol} — {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Alert Cadence
                    </label>
                    <select
                      id="tab-newsletter-frequency"
                      value={frequency}
                      onChange={e => setFrequency(e.target.value as any)}
                      className="w-full bg-[#050c17] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="instant">Instant Trigger</option>
                      <option value="daily_morning">Daily Brief (08:00)</option>
                      <option value="weekly">Weekly Recap</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Trigger Criteria
                  </label>
                  <select
                    id="tab-newsletter-condition"
                    value={condition}
                    onChange={e => setCondition(e.target.value as any)}
                    className="w-full bg-[#050c17] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="pct_change">Price Movement (% threshold)</option>
                    <option value="high_impact_news">High-Impact News Catalyst</option>
                    <option value="daily_digest">Daily Closing Digest</option>
                  </select>
                </div>

                {condition === 'pct_change' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Percentage Shift Target (± %)
                    </label>
                    <input
                      id="tab-newsletter-threshold"
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="50"
                      value={threshold}
                      onChange={e => setThreshold(parseFloat(e.target.value) || 1)}
                      className="w-full bg-[#050c17] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  id="tab-newsletter-submit-btn"
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-bold text-xs rounded-lg shadow-md shadow-cyan-950/60 transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Send Confirmation & Subscribe</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Subscriptions & Previews on Right */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Active Subscriptions ({alerts.length})
            </h4>
            <span className="text-[11px] text-slate-400">
              Dispatched automatically via double opt-in
            </span>
          </div>

          <div className="space-y-2">
            {alerts.map(a => (
              <div 
                key={a.id}
                className="p-3.5 bg-[#07111e] rounded-xl border border-slate-800 hover:border-slate-700 transition-colors space-y-2.5"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-cyan-300 bg-cyan-950 border border-cyan-800/60 px-2 py-0.5 rounded font-mono">
                      {a.assetSymbol}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">
                      {a.condition === 'pct_change' ? `±${a.threshold}% Price Movement` : a.condition}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({a.frequency})
                    </span>

                    {/* Verification Status Badge */}
                    {a.isVerified ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Verified Email</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setVerifyingAlert({
                          id: a.id,
                          email: a.email,
                          code: a.verificationCode || '849201'
                        })}
                        className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/80 hover:bg-amber-900/80 px-2 py-0.5 rounded border border-amber-700/60 transition-colors cursor-pointer"
                        title="Click to enter verification code"
                      >
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        <span>Unverified — Confirm PIN</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTestDispatch(a)}
                      className="px-2 py-1 text-[11px] font-semibold bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 rounded flex items-center gap-1 cursor-pointer transition-colors"
                      title="Test Dispatch Newsletter"
                    >
                      <Send className="w-3 h-3" />
                      <span>Test Dispatch</span>
                    </button>

                    <button
                      onClick={() => toggleAlert(a.id)}
                      className={`px-2 py-1 text-[11px] font-semibold rounded border cursor-pointer ${
                        a.active
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {a.active ? 'Active' : 'Paused'}
                    </button>

                    <button
                      onClick={() => removeAlert(a.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>Recipient: <strong className="text-slate-300 font-normal">{a.email}</strong></span>
                  <span>Dispatches Sent: <strong className="text-cyan-400 font-mono">{a.dispatchCount}</strong></span>
                  <span>{a.lastDispatched || 'Awaiting trigger'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Email Newsletter Mock Preview Card */}
          <div className="mt-4 p-4 bg-[#050c17] rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Live Newsletter Sample Preview
              </span>
              <span className="text-[10px] text-slate-500 font-mono">HTML Email Output</span>
            </div>

            <div className="p-3 bg-[#081322] rounded-lg border border-slate-800 space-y-1.5 text-xs">
              <div className="text-slate-200 font-bold text-sm">
                Sentrune Daily Morning Brief • {selectedAsset.symbol} Market Alert
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Good morning. {selectedAsset.name} is trading at ${selectedAsset.price.toLocaleString()} ({selectedAsset.changePercent > 0 ? '+' : ''}{selectedAsset.changePercent.toFixed(2)}%). 
                Key catalyst: Institutional orderflow indicates steady accumulation near the weekly moving average.
              </p>
              <div className="text-[11px] text-amber-400 font-semibold pt-1">
                Takeaway: Momentum favorable; primary support held at ${(selectedAsset.price * 0.96).toFixed(2)}.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
