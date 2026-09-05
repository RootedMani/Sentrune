import React from 'react';
import { 
  TrendingUp, 
  RotateCw, 
  Globe, 
  Wifi, 
  Database, 
  Sliders, 
  UserCheck, 
  ShieldAlert,
  Plus
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';
import { useAuth } from '../context/AuthContext';
import { INITIAL_ASSETS } from '../data/mockMarketData';
import { TRANSLATIONS } from '../data/translations';
import { Asset } from '../types';

export const Sidebar: React.FC = () => {
  const { 
    selectedAsset, 
    setSelectedAsset, 
    timeframe, 
    setTimeframe, 
    language, 
    setLanguage, 
    cacheMeta, 
    isRefreshing, 
    refreshFeeds,
    setOpenSettingsModal,
    appMode
  } = useWorkstation();

  const { isDemo, openAuthModal } = useAuth();
  const t = TRANSLATIONS[language];

  return (
    <aside 
      id="sentrune-sidebar"
      className="w-72 md:w-80 flex-shrink-0 bg-[#07111e] border-r border-slate-800/80 flex flex-col h-full overflow-y-auto"
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/60">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-950/40 text-white">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">{t.appTitle}</h1>
                <span className="text-[10px] font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                  {t.v1}
                </span>
              </div>
              <p className="text-[11px] leading-tight text-slate-400 mt-0.5 max-w-[190px]">
                {t.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Refresh Market Feeds button matching screenshot */}
        <div className="mt-4">
          <button
            id="sidebar-refresh-feeds-btn"
            onClick={refreshFeeds}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-semibold text-xs tracking-wide transition-all shadow-md shadow-cyan-950/50 cursor-pointer disabled:opacity-60"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Revalidating Cache...' : t.refreshFeeds}</span>
          </button>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {t.lastUpdated} <strong className="text-slate-300 font-normal">{t.justNow}</strong>
            </span>
            <span className="text-cyan-400/80 text-[10px] font-mono">
              {cacheMeta.latencyMs}ms L1
            </span>
          </div>
        </div>
      </div>

      {/* Language Switcher & Quick Mode Selector */}
      <div className="p-3 border-b border-slate-800/60 bg-[#060e1a]/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px]">{t.changeLang}</span>
        </div>
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5">
          <button
            id="lang-btn-en"
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              language === 'en' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            EN
          </button>
          <button
            id="lang-btn-fa"
            onClick={() => setLanguage('fa')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              language === 'fa' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            فارسی
          </button>
        </div>
      </div>

      {/* TARGET ASSET List */}
      <div className="p-3 border-b border-slate-800/60 flex-1">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            {t.targetAsset}
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">
            {INITIAL_ASSETS.length} Active
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {INITIAL_ASSETS.map((asset: Asset) => {
            const isSelected = selectedAsset.symbol === asset.symbol;
            const isPositive = asset.change >= 0;

            return (
              <button
                key={asset.symbol}
                id={`target-asset-${asset.symbol.toLowerCase()}`}
                onClick={() => setSelectedAsset(asset)}
                className={`p-2.5 rounded-lg text-left transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-sm shadow-cyan-950/30 ring-1 ring-cyan-500/30'
                    : 'bg-[#0b1626]/80 border-slate-800/70 hover:bg-[#0f1d32] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{asset.symbol}</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded uppercase font-medium ${
                    asset.type === 'crypto' 
                      ? 'bg-amber-950/70 text-amber-400 border border-amber-800/40' 
                      : 'bg-blue-950/70 text-blue-400 border border-blue-800/40'
                  }`}>
                    {asset.type}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {asset.name}
                </div>
                <div className="flex items-baseline justify-between mt-1.5">
                  <span className="text-xs font-semibold text-slate-200 font-mono">
                    ${asset.price.toLocaleString()}
                  </span>
                  <span className={`text-[11px] font-mono font-medium ${
                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {isPositive ? '+' : ''}{asset.changePercent.toFixed(2)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Timeframe Selector matching screenshot */}
        <div className="mt-4 pt-3 border-t border-slate-800/60">
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-2 px-1">
            {t.timeframe}
          </span>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            {(['1d', '1h', '1wk'] as const).map(tf => (
              <button
                key={tf}
                id={`timeframe-btn-${tf}`}
                onClick={() => setTimeframe(tf)}
                className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Demo Callout if User is in Demo Tier */}
        {isDemo && (
          <div className="mt-4 p-2.5 rounded-lg bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-800/50">
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Demo Workstation</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
              Explore freely. Register your free zero-cost account to unlock unlimited news feeds and custom price alerts.
            </p>
            <button
              id="sidebar-unlock-demo-btn"
              onClick={() => openAuthModal('signup')}
              className="mt-2 w-full py-1 text-[11px] font-semibold text-cyan-300 bg-cyan-900/40 hover:bg-cyan-900/70 border border-cyan-700/60 rounded transition-colors cursor-pointer"
            >
              Unlock Full Access (Free)
            </button>
          </div>
        )}
      </div>

      {/* Stream & Cache Telemetry Footer matching screenshot */}
      <div className="p-3.5 border-t border-slate-800/80 bg-[#050c17] text-[11px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            {t.marketDataStream}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {t.liveStream}
          </span>
        </div>

        <div className="space-y-1 text-slate-400">
          <div className="flex justify-between">
            <span>{t.streamQuality}</span>
            <span className="text-cyan-400 font-medium">{t.ultraLowLatency}</span>
          </div>
          <div className="flex justify-between">
            <span>{t.assetCoverage}</span>
            <span className="text-slate-300">{t.cryptoUS}</span>
          </div>
          <div className="flex justify-between">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-cyan-400" />
              {t.cacheStatus}
            </span>
            <span className="text-emerald-400 font-mono">{t.instantHit}</span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
          <button
            id="sidebar-settings-btn"
            onClick={() => setOpenSettingsModal(true)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer text-[11px]"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Settings ({appMode === 'casual' ? 'Casual' : 'Power'})</span>
          </button>
          <span className="text-[10px] text-slate-400 font-mono">
            Zero-Cost Ready
          </span>
        </div>
      </div>
    </aside>
  );
};
