import React, { useState } from 'react';
import { Asset } from '../types';
import {
  TrendingUp,
  RefreshCw,
  Database,
  Layers,
  Clock,
  Radio,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Moon,
  Laptop,
  Activity,
  Cpu,
  BarChart2,
  X,
} from 'lucide-react';
import { useTheme, Theme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';
import { LivePriceUpdate, RealtimeConnectionStatus } from '../types';

interface SidebarProps {
  assets: Asset[];
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset) => void;
  selectedInterval: string;
  onSelectInterval: (interval: string) => void;
  configuredProviders: string[];
  lastRefreshAt: number;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  mobileMenuOpen?: boolean;
  onCloseMobile?: () => void;
  livePrices?: Record<number, LivePriceUpdate>;
  connectionStatus?: RealtimeConnectionStatus;
}

export const Sidebar: React.FC<SidebarProps> = ({
  assets,
  selectedAsset,
  onSelectAsset,
  selectedInterval,
  onSelectInterval,
  configuredProviders: _configuredProviders,
  lastRefreshAt,
  onRefresh,
  isRefreshing,
  mobileMenuOpen = false,
  onCloseMobile,
  livePrices = {},
  connectionStatus = 'connected',
}) => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, toggleLanguage, t, isRtl, toPersianDigits } = useLanguage();
  const intervals = ['1d', '1h', '1wk'];

  const formatRelativeTime = (timeMs: number): string => {
    if (!timeMs) return language === 'fa' ? 'هرگز' : 'never';
    const elapsedSec = Math.max(0, Math.floor((Date.now() - timeMs) / 1000));
    if (elapsedSec < 60) return language === 'fa' ? 'هم‌اکنون' : 'just now';
    if (elapsedSec < 3600) {
      const m = Math.floor(elapsedSec / 60);
      return language === 'fa' ? `${toPersianDigits(m)} دقیقه قبل` : `${m} min ago`;
    }
    if (elapsedSec < 86400) {
      const h = Math.floor(elapsedSec / 3600);
      return language === 'fa' ? `${toPersianDigits(h)} ساعت قبل` : `${h} hr ago`;
    }
    const d = Math.floor(elapsedSec / 86400);
    return language === 'fa' ? `${toPersianDigits(d)} روز قبل` : `${d} days ago`;
  };

  const handleAssetClick = (asset: Asset) => {
    onSelectAsset(asset);
    if (onCloseMobile) onCloseMobile();
  };

  const handleIntervalClick = (inv: string) => {
    onSelectInterval(inv);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        id="sidebar-container"
        className={`fixed md:static inset-y-0 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} z-50 w-72 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-y-auto shrink-0 select-none shadow-xl md:shadow-none transition-transform duration-200 ease-in-out ${
          mobileMenuOpen
            ? 'translate-x-0'
            : isRtl
            ? 'translate-x-full md:translate-x-0'
            : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shadow-xs border border-slate-800 dark:border-slate-200 shrink-0">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-slate-100 text-base tracking-tight leading-none">
                {t('app_name')}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                {t('app_subname')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-800/60 rounded font-mono">
              {t('version')}
            </span>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="md:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-5 flex-1">
          {/* Refresh Action */}
          <div>
            <button
              id="btn-refresh-pipeline"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="w-full py-2.5 px-3 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg transition-all duration-150 flex items-center justify-center gap-2 shadow-sm shadow-cyan-900/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? t('refreshing') : t('refresh_prices_news')}
            </button>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 px-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                {t('last_updated')}:
              </span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                {formatRelativeTime(lastRefreshAt)}
              </span>
            </div>
          </div>

          {/* Language Switcher in Sidebar */}
          <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              {t('language_toggle')}
            </span>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded transition-all ${
                  language === 'en'
                    ? 'bg-cyan-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('fa')}
                className={`px-2 py-0.5 rounded font-vazir transition-all ${
                  language === 'fa'
                    ? 'bg-cyan-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                فارسی
              </button>
            </div>
          </div>

          {/* Asset Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              {t('target_asset')}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {assets.map((asset) => {
                const isSelected = selectedAsset?.id === asset.id;
                const lp = livePrices[asset.id];
                const lpIsPositive = lp ? lp.change >= 0 : true;

                return (
                  <button
                    key={asset.id}
                    id={`asset-select-${asset.symbol.toLowerCase()}`}
                    onClick={() => handleAssetClick(asset)}
                    className={`p-2.5 rounded-lg text-left rtl:text-right transition-all border ${
                      isSelected
                        ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-900 dark:text-cyan-200 shadow-xs ring-1 ring-cyan-500/30 font-medium'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{asset.symbol}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-mono font-semibold ${
                          asset.asset_type === 'crypto'
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-400'
                            : 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-400'
                        }`}
                      >
                        {asset.asset_type === 'crypto' && language === 'fa' ? 'کریپتو' : asset.asset_type === 'stock' && language === 'fa' ? 'سهم' : asset.asset_type}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {asset.name}
                    </p>
                    {lp && (
                      <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/50 text-[10px] font-mono" dir="ltr">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          ${lp.last_close > 100 ? lp.last_close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : lp.last_close.toFixed(2)}
                        </span>
                        <span className={`font-semibold ${lpIsPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {lpIsPositive ? '+' : ''}{lp.change_pct}%
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interval Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              {t('bar_interval')}
            </label>
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700/60">
              {intervals.map((inv) => (
                <button
                  key={inv}
                  id={`interval-btn-${inv}`}
                  onClick={() => handleIntervalClick(inv)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    selectedInterval === inv
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {language === 'fa' ? toPersianDigits(inv) : inv}
                </button>
              ))}
            </div>
          </div>

          {/* Institutional Feed Status */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 font-semibold">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                {language === 'fa' ? 'فیدهای زنده و یکپارچه بازار' : 'Market Data Stream'}
              </span>
              <span className={`flex items-center gap-1 text-[11px] font-mono font-bold ${
                connectionStatus === 'connected'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                }`} />
                {connectionStatus === 'connected'
                  ? (language === 'fa' ? 'زنده (SSE)' : 'Live Stream')
                  : (language === 'fa' ? 'در حال اتصال' : 'Syncing')}
              </span>
            </div>

            <div className="space-y-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>{language === 'fa' ? 'وضعیت اتصال:' : 'Stream Quality:'}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {language === 'fa' ? 'بدون تاخیر (< ۵۰ms)' : 'Ultra-Low Latency'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{language === 'fa' ? 'پوشش نمادها:' : 'Asset Coverage:'}</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {language === 'fa' ? 'کریپتو و بازار سهام' : 'Crypto & US Equities'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{language === 'fa' ? 'تحلیل احساسات:' : 'Sentiment Feed:'}</span>
                <span className="text-cyan-700 dark:text-cyan-400 font-medium">
                  {language === 'fa' ? 'پیوسته و خودکار' : 'Continuous NLP'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Theme Controls & Platform Identity */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTheme('light')}
              title={t('theme_light')}
              className={`p-1.5 rounded ${
                theme === 'light'
                  ? 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              title={t('theme_dark')}
              className={`p-1.5 rounded ${
                theme === 'dark'
                  ? 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              title={t('theme_system')}
              className={`p-1.5 rounded ${
                theme === 'system'
                  ? 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400 dark:text-slate-500" dir="ltr">
            <span>Sentrune Terminal v2.4</span>
          </div>
        </div>
      </aside>
    </>
  );
};
