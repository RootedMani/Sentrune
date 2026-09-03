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
}

export const Sidebar: React.FC<SidebarProps> = ({
  assets,
  selectedAsset,
  onSelectAsset,
  selectedInterval,
  onSelectInterval,
  configuredProviders,
  lastRefreshAt,
  onRefresh,
  isRefreshing,
  mobileMenuOpen = false,
  onCloseMobile,
}) => {
  const [showDbLocation, setShowDbLocation] = useState(false);
  const { theme, isDark, setTheme, toggleTheme } = useTheme();
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
                  {inv}
                </button>
              ))}
            </div>
          </div>

          {/* Data Sources Status */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-800 dark:text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                {t('active_feed_status')}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="space-y-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>{t('prices_feed')}:</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono font-medium">
                  yfinance · Binance · CB
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('public_rss')}:</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono font-medium">
                  Google News · CoinDesk
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('sentiment_model')}:</span>
                <span className="text-cyan-700 dark:text-cyan-400 font-semibold font-mono">
                  FinBERT NLP
                </span>
              </div>
              {configuredProviders && configuredProviders.length > 0 && (
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700/60">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 mb-1">
                    {language === 'fa' ? 'کلیدها و سرویس‌های فعال' : 'Active Providers & Keys'}:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {configuredProviders.map((p, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-medium"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Database Location Expander */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowDbLocation(!showDbLocation)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Database className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                {t('db_location')}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform ${
                  showDbLocation ? 'rotate-180' : ''
                }`}
              />
            </button>
            {showDbLocation && (
              <div className="p-3 bg-slate-100 dark:bg-slate-900/90 text-[11px] space-y-2 border-t border-slate-200 dark:border-slate-800">
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {language === 'fa'
                    ? 'پایگاه داده رابطه‌ای با کارایی بالا، شاخص‌گذاری در حافظه و ذخیره‌سازی رمزنگاری‌شده محلی.'
                    : 'Enterprise quantitative data store with in-memory caching and encrypted local persistence.'}
                </p>
                <div className="p-2 bg-white dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-800 font-mono text-[10px] text-slate-800 dark:text-slate-300 break-all" dir="ltr">
                  Sentrune Ledger Core (In-Memory / Multi-Horizon Store)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Theme Controls & Model Engine */}
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

          <div className="flex items-center gap-1 font-mono text-[10px]" dir="ltr">
            <span>{t('engine_label')}:</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-semibold">LightGBM</span>
          </div>
        </div>
      </aside>
    </>
  );
};
