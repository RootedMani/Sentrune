import React from 'react';
import { 
  RotateCw, 
  Sun, 
  Moon, 
  Bell, 
  Sliders, 
  User, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Flame,
  BarChart2
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';
import { useAuth } from '../context/AuthContext';
import { TRANSLATIONS } from '../data/translations';

export const Header: React.FC = () => {
  const { 
    selectedAsset, 
    timeframe, 
    isRefreshing, 
    refreshFeeds, 
    language, 
    setLanguage, 
    appMode, 
    setAppMode,
    theme,
    setTheme,
    setOpenAlertsModal,
    setOpenSettingsModal,
    alerts
  } = useWorkstation();

  const { user, isDemo, openAuthModal, logout } = useAuth();
  const t = TRANSLATIONS[language];
  const isPositive = selectedAsset.change >= 0;

  return (
    <header 
      id="sentrune-header"
      className="h-16 bg-[#071221] border-b border-slate-800/80 px-4 flex items-center justify-between gap-3 text-slate-200"
    >
      {/* Left: Asset Ticker & Price Real-time Status Banner matching screenshot */}
      <div className="flex items-center gap-3 overflow-x-auto py-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base md:text-lg font-bold text-white tracking-tight whitespace-nowrap">
            {selectedAsset.name}
          </h2>
          <span className="text-xs font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60 px-2 py-0.5 rounded">
            {selectedAsset.symbol}
          </span>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            {selectedAsset.exchange} • {timeframe}
          </span>
        </div>

        {/* Price & Change Badge */}
        <div className="flex items-center gap-2 bg-[#0c1a2d] px-2.5 py-1 rounded-md border border-slate-800">
          <span className="text-sm md:text-base font-bold font-mono text-white">
            ${selectedAsset.price.toLocaleString()}
          </span>
          <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${
            isPositive
              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
              : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
          }`}>
            {isPositive ? '+' : ''}{selectedAsset.change.toFixed(2)} ({isPositive ? '+' : ''}{selectedAsset.changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Right Controls: Stream status, Mode Switch, Alerts, Language, Theme, Account */}
      <div className="flex items-center gap-2 md:gap-2.5 flex-shrink-0">
        {/* Live Status indicator */}
        <div className="hidden lg:flex items-center gap-1.5 bg-[#0a1829] border border-slate-800 text-xs px-2.5 py-1 rounded-md text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-emerald-400 font-semibold text-[11px]">LIVE</span>
          <span className="text-[11px] text-slate-400">5s ago</span>
        </div>

        {/* Refresh Feed Button matching screenshot */}
        <button
          id="header-refresh-btn"
          onClick={refreshFeeds}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 bg-[#0c1a2d] hover:bg-[#11233d] border border-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          title="Instant refresh cache"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          <span className="hidden sm:inline">{t.refresh}</span>
        </button>

        {/* Mode Selector Pill: Casual (Afternoon cash) vs Power Analyst (Dedicated) */}
        <div 
          className="flex items-center bg-[#091524] border border-slate-800 rounded-lg p-0.5"
          title="Switch between Casual Trader and Power Analyst mode"
        >
          <button
            id="mode-toggle-casual"
            onClick={() => setAppMode('casual')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              appMode === 'casual'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Casual</span>
          </button>
          <button
            id="mode-toggle-power"
            onClick={() => setAppMode('power')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              appMode === 'power'
                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Power</span>
          </button>
        </div>

        {/* Automated Newsletter & Price Alerts Button */}
        <button
          id="header-alerts-btn"
          onClick={() => setOpenAlertsModal(true)}
          className="relative flex items-center gap-1.5 bg-[#0c1a2d] hover:bg-[#132642] border border-cyan-900/60 text-cyan-300 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer"
          title="Automated Newsletter & Price Alerts"
        >
          <Bell className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Alerts</span>
          {alerts.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-cyan-600 text-white text-[10px] font-bold flex items-center justify-center">
              {alerts.length}
            </span>
          )}
        </button>

        {/* Language quick button */}
        <button
          id="header-lang-toggle"
          onClick={() => setLanguage(language === 'en' ? 'fa' : 'en')}
          className="hidden sm:flex items-center gap-1 bg-[#0c1a2d] hover:bg-[#12243d] border border-slate-800 text-slate-300 px-2 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer"
        >
          {language === 'en' ? 'فارسی' : 'English'}
        </button>

        {/* Theme toggle matching screenshot */}
        <button
          id="header-theme-toggle"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-1.5 bg-[#0c1a2d] hover:bg-[#12243d] border border-slate-800 text-slate-300 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer"
          title="Toggle Light / Dark mode"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">{t.light}</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline">{t.dark}</span>
            </>
          )}
        </button>

        {/* Account / Demo System Button */}
        {isDemo ? (
          <button
            id="header-demo-unlock-btn"
            onClick={() => openAuthModal('signup')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600/30 to-amber-500/20 hover:from-amber-600/40 hover:to-amber-500/30 border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Free Sign Up</span>
            <span className="text-[10px] bg-amber-500/30 px-1 rounded text-amber-200 uppercase font-mono">Demo</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 bg-[#0b1b30] border border-cyan-800/60 px-2.5 py-1 rounded-md text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-200 max-w-[90px] truncate">{user.name}</span>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-rose-400 text-[11px] ml-1 transition-colors cursor-pointer"
              title="Sign Out"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
