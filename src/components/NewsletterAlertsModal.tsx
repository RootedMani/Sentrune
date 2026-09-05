import React, { useState } from 'react';
import { 
  BellRing, 
  Mail, 
  Send, 
  Trash2, 
  CheckCircle, 
  X, 
  Clock, 
  Flame, 
  TrendingUp, 
  AlertCircle,
  Eye,
  Sparkles,
  ShieldCheck,
  KeyRound,
  RotateCcw,
  Check
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';
import { useAuth } from '../context/AuthContext';
import { AlertTriggerCondition, NewsletterAlert } from '../types';
import { INITIAL_ASSETS } from '../data/mockMarketData';
import { EmailVerificationService } from '../services/emailVerification';

export const NewsletterAlertsModal: React.FC = () => {
  const { 
    openAlertsModal, 
    setOpenAlertsModal, 
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
  const [targetAssetSymbol, setTargetAssetSymbol] = useState(selectedAsset.symbol);
  const [condition, setCondition] = useState<AlertTriggerCondition>('pct_change');
  const [threshold, setThreshold] = useState<number>(3.0);
  const [frequency, setFrequency] = useState<'instant' | 'daily_morning' | 'weekly'>('instant');
  
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Verification Step state
  const [verifyingAlert, setVerifyingAlert] = useState<{ id: string; email: string; code: string } | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);

  if (!openAlertsModal) return null;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 1. Email format and disposable email domain check
    const validation = EmailVerificationService.validate(email);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Please provide a valid email address.');
      return;
    }

    if (isDemo && alerts.length >= 1) {
      alert('Demo limit reached: 1 active alert allowed. Register a free account for unlimited alerts!');
      openAuthModal('signup');
      return;
    }

    // 2. Generate 6-digit confirmation code
    const generatedCode = EmailVerificationService.generateCode();
    EmailVerificationService.dispatchVerificationCode(email, generatedCode);

    // 3. Create alert in unverified pending state
    const created = addAlert({
      email: email.trim(),
      assetSymbol: targetAssetSymbol,
      condition,
      threshold: condition === 'pct_change' ? threshold : undefined,
      frequency,
      active: true,
      isVerified: false,
      verificationCode: generatedCode
    });

    // 4. Prompt verification step
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
      setVerificationError('Please enter all 6 digits of your verification code.');
      return;
    }

    const success = verifyAlertEmail(verifyingAlert.id, enteredCode);
    if (success) {
      setDispatchStatus(`Email ownership verified! Alerts are now live for ${verifyingAlert.email}.`);
      setVerifyingAlert(null);
      setEnteredCode('');
      setVerificationError(null);
      setTimeout(() => setDispatchStatus(null), 5000);
    } else {
      setVerificationError('Invalid 6-digit code. Please check your inbox or use the test code shown below.');
    }
  };

  const handleResend = () => {
    if (!verifyingAlert) return;
    const newCode = resendVerificationCode(verifyingAlert.id);
    setVerifyingAlert(prev => prev ? { ...prev, code: newCode } : null);
    setDispatchStatus(`Fresh 6-digit code dispatched to ${verifyingAlert.email}.`);
    setTimeout(() => setDispatchStatus(null), 4000);
  };

  const handleTestDispatch = async (alertItem: NewsletterAlert) => {
    if (!alertItem.isVerified) {
      setDispatchStatus(`Cannot dispatch to unconfirmed address. Please verify email ownership first.`);
      setVerifyingAlert({
        id: alertItem.id,
        email: alertItem.email,
        code: alertItem.verificationCode || '849201'
      });
      return;
    }
    const msg = await simulateDispatchAlert(alertItem.id);
    setDispatchStatus(msg);
    setTimeout(() => setDispatchStatus(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        id="newsletter-alerts-modal-content"
        className="bg-[#081322] border border-slate-700/80 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between bg-[#060e1a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-400 flex items-center justify-center">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Automated Asset Alerts & Newsletter Service
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono">
                  Double Opt-In Protected
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verified price alert dispatching with 6-digit email confirmation.
              </p>
            </div>
          </div>
          <button
            id="close-alerts-modal-btn"
            onClick={() => setOpenAlertsModal(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Dispatch Notice Banner */}
          {dispatchStatus && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-600/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{dispatchStatus}</span>
            </div>
          )}

          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3 bg-rose-950/60 border border-rose-600/60 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Verification Code Step (When Pending) */}
          {verifyingAlert ? (
            <div className="bg-[#050c17] p-5 rounded-xl border border-cyan-500/60 shadow-lg space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-600 flex items-center justify-center text-cyan-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Confirm Email Ownership (Double Opt-In)
                    </h4>
                    <p className="text-xs text-slate-400">
                      Code dispatched to <strong className="text-cyan-300 font-mono">{verifyingAlert.email}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setVerifyingAlert(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {verificationError && (
                <div className="p-2.5 bg-rose-950/70 border border-rose-700/60 rounded-lg text-xs text-rose-300">
                  {verificationError}
                </div>
              )}

              <form onSubmit={handleConfirmCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Enter 6-Digit Verification PIN
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="verification-pin-input"
                      type="text"
                      maxLength={6}
                      autoFocus
                      value={enteredCode}
                      onChange={e => setEnteredCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="• • • • • •"
                      className="w-48 text-center tracking-[0.6em] text-xl font-mono font-bold bg-[#091524] border border-cyan-500/70 rounded-xl py-2.5 text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                    <button
                      type="submit"
                      id="confirm-verification-btn"
                      className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
                    >
                      Verify & Activate
                    </button>
                  </div>
                </div>

                {/* Simulation Zero-Cost Assistance helper */}
                <div className="p-3 bg-[#0a182b] border border-cyan-800/40 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
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
                  <p className="text-[11px] text-slate-400">
                    In live production, this 6-digit code or direct magic-link is sent via free transactional services (like Resend or Brevo) directly to the user's inbox.
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Didn't receive the email? Check spam or resend.</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Resend Code</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* New Alert Form */
            <form onSubmit={handleSubscribe} className="bg-[#050c17] p-4 rounded-xl border border-slate-800 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                Setup New Automated Email Dispatch
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Email Field */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Recipient Email Address
                  </label>
                  <input
                    id="newsletter-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full bg-[#091524] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Target Asset */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Target Asset
                  </label>
                  <select
                    id="newsletter-asset-select"
                    value={targetAssetSymbol}
                    onChange={e => setTargetAssetSymbol(e.target.value)}
                    className="w-full bg-[#091524] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {INITIAL_ASSETS.map(asset => (
                      <option key={asset.symbol} value={asset.symbol}>
                        {asset.symbol} — {asset.name} (${asset.price.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Condition */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Trigger Condition
                  </label>
                  <select
                    id="newsletter-condition-select"
                    value={condition}
                    onChange={e => setCondition(e.target.value as AlertTriggerCondition)}
                    className="w-full bg-[#091524] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="pct_change">Price Movement (% shift)</option>
                    <option value="high_impact_news">High-Impact News Only</option>
                    <option value="daily_digest">Daily Market Close Digest</option>
                    <option value="price_above">Price Rises Above Target</option>
                    <option value="price_below">Price Drops Below Target</option>
                  </select>
                </div>

                {/* Threshold (if % change) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Movement Threshold
                  </label>
                  <input
                    id="newsletter-threshold-input"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="50"
                    disabled={condition !== 'pct_change'}
                    value={threshold}
                    onChange={e => setThreshold(parseFloat(e.target.value) || 1)}
                    className="w-full bg-[#091524] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 disabled:opacity-40 focus:outline-none focus:border-cyan-500 font-mono"
                    placeholder="e.g. 3.0%"
                  />
                </div>

                {/* Delivery Cadence */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Delivery Cadence
                  </label>
                  <select
                    id="newsletter-cadence-select"
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as any)}
                    className="w-full bg-[#091524] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="instant">Instant Real-time Dispatch</option>
                    <option value="daily_morning">Daily Morning Brief (8:00 AM)</option>
                    <option value="weekly">Weekly Strategic Overview</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  id="preview-newsletter-format-btn"
                  onClick={() => setPreviewOpen(!previewOpen)}
                  className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{previewOpen ? 'Hide Newsletter Sample' : 'Preview Email Template'}</span>
                </button>

                <button
                  type="submit"
                  id="subscribe-alert-submit-btn"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-bold text-xs rounded-lg shadow-md shadow-cyan-950/50 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Send Confirmation & Activate</span>
                </button>
              </div>
            </form>
          )}

          {/* Interactive Newsletter Template Preview */}
          {previewOpen && (
            <div className="bg-[#0b1626] border border-cyan-800/50 p-4 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-cyan-400">Sentrune Market Dispatch</span>
                  <span className="text-[10px] text-slate-400">• Automated Edition</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">To: {email || 'your-email@domain.com'}</span>
              </div>
              <div className="p-3 bg-[#060e1a] rounded-lg border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-sm text-slate-100">
                    {targetAssetSymbol} Price Shift Alert (+{threshold}%)
                  </h5>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/50 font-bold">
                    TRIGGER MET
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Institutional orderbook absorption triggered momentum above the previous 4-hour resistance band. 
                  Consensus catalyst stems from recent ETF net inflows and macro liquidity adjustments.
                </p>
                <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                  <span>Takeaway:</span>
                  <span className="text-slate-300">Support zone tested with lower volatility spread.</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Subscriptions List with Verification Badges */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Active Subscriptions ({alerts.length})
              </h4>
              {isDemo && (
                <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  Demo limit: 1 of 1 slot used
                </span>
              )}
            </div>

            <div className="space-y-2">
              {alerts.map(alertItem => (
                <div
                  key={alertItem.id}
                  id={`alert-row-${alertItem.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#050c17] rounded-xl border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-white bg-slate-800 px-2 py-0.5 rounded font-mono">
                        {alertItem.assetSymbol}
                      </span>
                      <span className="text-xs text-slate-200 font-medium">
                        {alertItem.condition === 'pct_change' ? `±${alertItem.threshold}% Movement` : alertItem.condition}
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">
                        ({alertItem.frequency})
                      </span>

                      {/* Verification Status Badge */}
                      {alertItem.isVerified ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Verified Ownership</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setVerifyingAlert({
                            id: alertItem.id,
                            email: alertItem.email,
                            code: alertItem.verificationCode || '849201'
                          })}
                          className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/80 hover:bg-amber-900/80 px-2 py-0.5 rounded border border-amber-700/60 transition-colors cursor-pointer"
                          title="Click to enter verification code"
                        >
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          <span>Pending Verification — Verify Now</span>
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{alertItem.email}</span>
                      <span>•</span>
                      <span>Dispatches: {alertItem.dispatchCount}</span>
                      {alertItem.lastDispatched && (
                        <>
                          <span>•</span>
                          <span>Last: {alertItem.lastDispatched}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleTestDispatch(alertItem)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/50 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                      title="Trigger simulation dispatch now"
                    >
                      <Send className="w-3 h-3" />
                      <span>Test Dispatch</span>
                    </button>

                    <button
                      onClick={() => toggleAlert(alertItem.id)}
                      className={`px-2 py-1 text-[11px] font-semibold rounded-md border cursor-pointer ${
                        alertItem.active
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {alertItem.active ? 'Active' : 'Paused'}
                    </button>

                    <button
                      onClick={() => removeAlert(alertItem.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete subscription"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
