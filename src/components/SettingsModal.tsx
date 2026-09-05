import React from 'react';
import { 
  Sliders, 
  X, 
  Zap, 
  BarChart2, 
  Check, 
  Database, 
  Trash2, 
  RotateCw, 
  ShieldCheck, 
  Layers
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';
import { MarketCacheService } from '../services/marketCache';
import { TRANSLATIONS } from '../data/translations';

export const SettingsModal: React.FC = () => {
  const { 
    openSettingsModal, 
    setOpenSettingsModal, 
    appMode, 
    setAppMode, 
    showTechnicalMetadata, 
    setShowTechnicalMetadata,
    language,
    cacheMeta,
    refreshFeeds
  } = useWorkstation();

  const t = TRANSLATIONS[language];

  if (!openSettingsModal) return null;

  const handleClearCache = () => {
    MarketCacheService.clearAll();
    refreshFeeds();
    alert('Cache storage flushed and re-warmed with fresh seeds.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        id="settings-modal-content"
        className="bg-[#081322] border border-slate-700/80 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-[#060e1a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Workstation Settings</h3>
              <p className="text-xs text-slate-400">User experience profile & data caching</p>
            </div>
          </div>
          <button
            id="close-settings-modal-btn"
            onClick={() => setOpenSettingsModal(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Dedicated Mode Selection: Casual vs Power */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
              {t.experienceMode}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Casual Mode Card */}
              <button
                type="button"
                id="select-casual-mode-card"
                onClick={() => setAppMode('casual')}
                className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer relative ${
                  appMode === 'casual'
                    ? 'bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-500/40'
                    : 'bg-[#050c17] border-slate-800 hover:border-slate-700'
                }`}
              >
                {appMode === 'casual' && (
                  <div className="absolute top-3 right-3 text-amber-400">
                    <Check className="w-4 h-4" />
                  </div>
                )}
                <div className="flex items-center gap-2 font-bold text-xs text-white">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Casual Trader</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  {t.casualDesc}
                </p>
              </button>

              {/* Power Mode Card */}
              <button
                type="button"
                id="select-power-mode-card"
                onClick={() => setAppMode('power')}
                className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer relative ${
                  appMode === 'power'
                    ? 'bg-cyan-950/30 border-cyan-500/80 ring-1 ring-cyan-500/40'
                    : 'bg-[#050c17] border-slate-800 hover:border-slate-700'
                }`}
              >
                {appMode === 'power' && (
                  <div className="absolute top-3 right-3 text-cyan-400">
                    <Check className="w-4 h-4" />
                  </div>
                )}
                <div className="flex items-center gap-2 font-bold text-xs text-white">
                  <BarChart2 className="w-4 h-4 text-cyan-400" />
                  <span>Power Trader</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  {t.powerDesc}
                </p>
              </button>
            </div>
          </div>

          {/* Dedicated Toggle for Technical Metadata */}
          <div className="p-3.5 rounded-xl bg-[#050c17] border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-200">
                {t.technicalMetaToggle}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {t.technicalMetaDesc}
              </div>
            </div>

            <button
              id="technical-metadata-switch-btn"
              type="button"
              onClick={() => setShowTechnicalMetadata(!showTechnicalMetadata)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                showTechnicalMetadata ? 'bg-cyan-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  showTechnicalMetadata ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Caching Engine Diagnostics */}
          <div className="p-4 rounded-xl bg-[#050c17] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">Zero-Cost Caching Engine</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                Active (SWR)
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Provides instant 0ms response time on initial page loads and asset transitions by leveraging local memory and storage caching.
            </p>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-[#091524] rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Response Latency</div>
                <div className="font-bold text-cyan-400 font-mono mt-0.5">{cacheMeta.latencyMs} ms</div>
              </div>
              <div className="p-2 bg-[#091524] rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Cache Hits</div>
                <div className="font-bold text-emerald-400 font-mono mt-0.5">{cacheMeta.hitCount}</div>
              </div>
              <div className="p-2 bg-[#091524] rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Cached Items</div>
                <div className="font-bold text-slate-200 font-mono mt-0.5">{cacheMeta.itemCount}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleClearCache}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge & Reset Cache</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  refreshFeeds();
                  setOpenSettingsModal(false);
                }}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
