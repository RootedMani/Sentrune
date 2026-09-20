import React from 'react';
import { 
  Sliders, 
  X, 
  Database, 
  Trash2
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';
import { MarketCacheService } from '../services/marketCache';
import { TRANSLATIONS } from '../data/translations';

export const SettingsModal: React.FC = () => {
  const { 
    openSettingsModal, 
    setOpenSettingsModal, 
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4">
      <div 
        id="settings-modal-content"
        className="bg-white dark:bg-[#081322] border border-slate-200 dark:border-slate-700/80 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#060e1a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-950 border border-cyan-300 dark:border-cyan-700/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Workstation Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Quantitative indicators & data cache controls</p>
            </div>
          </div>
          <button
            id="close-settings-modal-btn"
            onClick={() => setOpenSettingsModal(false)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Toggle for Technical Metadata */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#050c17] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-200">
                {t.technicalMetaToggle}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t.technicalMetaDesc}
              </div>
            </div>

            <button
              id="technical-metadata-switch-btn"
              type="button"
              onClick={() => setShowTechnicalMetadata(!showTechnicalMetadata)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                showTechnicalMetadata ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-700'
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
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#050c17] border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-200">Zero-Cost Caching Engine</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/40">
                Active (SWR)
              </span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Provides instant sub-millisecond response times on page loads and asset transitions by leveraging local memory and storage caching.
            </p>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-white dark:bg-[#091524] rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Response Latency</div>
                <div className="font-bold text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">{cacheMeta.latencyMs} ms</div>
              </div>
              <div className="p-2 bg-white dark:bg-[#091524] rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Cache Hits</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{cacheMeta.hitCount}</div>
              </div>
              <div className="p-2 bg-white dark:bg-[#091524] rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Cached Items</div>
                <div className="font-bold text-slate-900 dark:text-slate-200 font-mono mt-0.5">{cacheMeta.itemCount}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleClearCache}
                className="flex items-center gap-1.5 text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors cursor-pointer"
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
