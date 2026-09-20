import React from 'react';
import { 
  RotateCw, 
  Sun, 
  Moon, 
  Bell, 
  ShieldCheck, 
  Sparkles, 
  Radio
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
    theme, 
    setTheme, 
    toggleTheme,
    setOpenAlertsModal,
    alerts
  } = useWorkstation();

  const { user, isDemo, openAuthModal, logout } = useAuth();
  const t = TRANSLATIONS[language];
  const isPositive = selectedAsset.change >= 0;

  return (
    <header 
      id="sentrune-header"
      className="h-16 bg-white dark:bg-[#071221] border-b border-slate-200 dark:border-slate-800/80 px-4 flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200 transition-colors shadow-sm dark:shadow-none"
    >
      {/* Left: Asset Ticker & Price Real-time Status Banner */}
      <div className="flex items-center gap-3 overflow-x-auto py-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
            {selectedAsset.name}
          </h2>
          <span className="text-xs font-mono font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/60 px-2 py-0.5 rounded">
            {selectedAsset.symbol}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
            {selectedAsset.exchange} • {timeframe}
          </span>
        </div>

        {/* Price & Change Badge */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#0c1a2d] px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800">
          <span className="text-sm md:text-base font-bold font-mono text-slate-900 dark:text-white">
            ${selectedAsset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${
            isPositive
              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50'
              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/50'
          }`}>
            {isPositive ? '+' : ''}{selectedAsset.change.toFixed(2)} ({isPositive ? '+' : ''}{selectedAsset.changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Right Controls: Live Status, Refresh, Alerts, Language, Theme, Account */}
      <div className="flex items-center gap-2 md:gap-2.5 flex-shrink-0">
        {/* Live Status indicator */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 dark:bg-[#0a1829] border border-slate-200 dark:border-slate-800 text-xs px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">LIVE STREAM</span>
        </div>

        {/* Refresh Feed Button */}
        <button
          id="header-refresh-btn"
          onClick={refreshFeeds}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 bg-cyan-50 dark:bg-[#0c1a2d] hover:bg-cyan-100 dark:hover:bg-[#11233d] border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-300 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-xs"
          title="Refresh market prices, technicals and news"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-500' : ''}`} />
          <span>{isRefreshing ? 'Updating...' : t.refresh}</span>
        </button>

        {/* Automated Newsletter & Price Alerts Button */}
        <button
          id="header-alerts-btn"
          onClick={() => setOpenAlertsModal(true)}
          className="relative flex items-center gap-1.5 bg-slate-100 dark:bg-[#0c1a2d] hover:bg-slate-200 dark:hover:bg-[#132642] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer"
          title="Automated Newsletter & Price Alerts"
        >
          <Bell className="w-3.5 h-3.5 text-cyan-500" />
          <span className="hidden md:inline">Alerts</span>
          {Array.isArray(alerts) && alerts.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-cyan-600 text-white text-[10px] font-bold flex items-center justify-center">
              {alerts.length}
            </span>
          )}
        </button>

        {/* Language toggle button */}
        <button
          id="header-lang-toggle"
          onClick={() => setLanguage(language === 'en' ? 'fa' : 'en')}
          className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-[#0c1a2d] hover:bg-slate-200 dark:hover:bg-[#12243d] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
        >
          {language === 'en' ? 'فارسی' : 'English'}
        </button>

        {/* Theme toggle */}
        <button
          id="header-theme-toggle"
          onClick={toggleTheme}
          className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0c1a2d] hover:bg-slate-200 dark:hover:bg-[#12243d] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer"
          title="Toggle Light / Dark mode"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">{t.light}</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-cyan-600" />
              <span className="hidden lg:inline">{t.dark}</span>
            </>
          )}
        </button>

        {/* Account System Button */}
        {isDemo ? (
          <button
            id="header-demo-unlock-btn"
            onClick={() => openAuthModal('signup')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span className="hidden sm:inline">Sign In</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0b1b30] border border-slate-200 dark:border-cyan-800/60 px-2.5 py-1 rounded-md text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[90px] truncate">{user.name}</span>
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
