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
  ShieldCheck
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';
import { useAuth } from '../context/AuthContext';
import { AlertTriggerCondition } from '../types';
import { INITIAL_ASSETS } from '../data/mockMarketData';

export const NewsletterAlertsModal: React.FC = () => {
  const { 
    openAlertsModal, 
    setOpenAlertsModal, 
    alerts, 
    addAlert, 
    removeAlert, 
    toggleAlert, 
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
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!openAlertsModal) return null;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    if (isDemo && alerts.length >= 1) {
      alert('Demo limit reached: 1 active alert allowed. Register a free account for unlimited alerts!');
      openAuthModal('signup');
      return;
    }

    addAlert({
      email: email.trim(),
      assetSymbol: targetAssetSymbol,
      condition,
      threshold: condition === 'pct_change' ? threshold : undefined,
      frequency,
      active: true
    });

    setDispatchStatus(`Subscribed! Automated newsletter & price alerts active for ${targetAssetSymbol}.`);
    setTimeout(() => setDispatchStatus(null), 4000);
  };

  const handleTestDispatch = async (alertId: string) => {
    const msg = await simulateDispatchAlert(alertId);
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
                  Zero-Cost Ready
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Receive scheduled executive bulletins and instant price trigger dispatches in your inbox.
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

          {/* New Alert Form */}
          <form onSubmit={handleSubscribe} className="bg-[#050c17] p-4 rounded-xl border border-slate-800 space-y-3.5">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              Setup New Automated Email Dispatch
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Email Field */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Recipient Email
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
                <span>Activate Automated Alert</span>
              </button>
            </div>
          </form>

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

          {/* Active Subscriptions List */}
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
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  id={`alert-row-${alert.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#050c17] rounded-xl border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white bg-slate-800 px-2 py-0.5 rounded font-mono">
                        {alert.assetSymbol}
                      </span>
                      <span className="text-xs text-slate-200 font-medium">
                        {alert.condition === 'pct_change' ? `±${alert.threshold}% Movement` : alert.condition}
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">
                        {alert.frequency}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{alert.email}</span>
                      <span>•</span>
                      <span>Dispatches: {alert.dispatchCount}</span>
                      {alert.lastDispatched && (
                        <>
                          <span>•</span>
                          <span>Last: {alert.lastDispatched}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleTestDispatch(alert.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/50 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                      title="Trigger simulation dispatch now"
                    >
                      <Send className="w-3 h-3" />
                      <span>Test Dispatch</span>
                    </button>

                    <button
                      onClick={() => toggleAlert(alert.id)}
                      className={`px-2 py-1 text-[11px] font-semibold rounded-md border cursor-pointer ${
                        alert.active
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {alert.active ? 'Active' : 'Paused'}
                    </button>

                    <button
                      onClick={() => removeAlert(alert.id)}
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
