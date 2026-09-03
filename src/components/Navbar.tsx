import React from 'react';
import { Asset } from '../types';
import {
  TrendingUp,
  TrendingDown,
  Sun,
  Moon,
  Menu,
  X,
  RefreshCw,
  Globe,
  BarChart3,
  LineChart,
  Activity,
  MessageSquare,
  Newspaper,
  Users,
  Cpu,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedAsset: Asset | null;
  selectedInterval: string;
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  lastClose: number;
  priceChange: number;
  priceChangePct: number;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  selectedAsset,
  selectedInterval,
  lastClose,
  priceChange,
  priceChangePct,
  isRefreshing,
  onRefresh,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { language, toggleLanguage, t, isRtl, formatCurrency, formatNumber, formatPercent, toPersianDigits } = useLanguage();

  const tabs = [
    {
      id: 'overview',
      key: 'tab_overview',
      defaultLabel: 'Overview',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
    },
    {
      id: 'prices',
      key: 'tab_prices',
      defaultLabel: 'Prices & OHLCV',
      icon: <LineChart className="w-3.5 h-3.5" />,
    },
    {
      id: 'technicals',
      key: 'tab_technicals',
      defaultLabel: 'Technicals',
      icon: <Activity className="w-3.5 h-3.5" />,
    },
    {
      id: 'sentiment',
      key: 'tab_sentiment',
      defaultLabel: 'Sentiment',
      icon: <MessageSquare className="w-3.5 h-3.5" />,
    },
    {
      id: 'news',
      key: 'tab_news',
      defaultLabel: 'News Feed',
      icon: <Newspaper className="w-3.5 h-3.5" />,
    },
    {
      id: 'social',
      key: 'tab_social',
      defaultLabel: 'Market Discussion',
      icon: <Users className="w-3.5 h-3.5" />,
    },
    {
      id: 'model',
      key: 'tab_model',
      defaultLabel: 'ML Prediction',
      icon: <Cpu className="w-3.5 h-3.5" />,
    },
  ];

  const isPositive = priceChange >= 0;

  return (
    <header
      id="main-header"
      className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs select-none shrink-0"
    >
      {/* Top Bar: Asset Quote, Live Ticker, and Quick Controls */}
      <div className="px-4 lg:px-6 py-2.5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
        {/* Left Side: Asset Details & Live Price */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile menu trigger */}
          <button
            id="btn-mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label={t('toggle_navigation')}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Asset Identity Block */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5 truncate">
                <bdi dir="ltr" className="truncate font-bold">
                  {selectedAsset?.name || t('app_name')}
                </bdi>
                <span
                  className="px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400 font-mono text-xs font-bold border border-cyan-200 dark:border-cyan-800 shrink-0"
                  dir="ltr"
                >
                  {selectedAsset?.symbol}
                </span>
              </h2>

              <span
                className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0"
                dir="ltr"
              >
                {selectedAsset?.exchange} · {language === 'fa' ? toPersianDigits(selectedInterval) : selectedInterval}
              </span>
            </div>

            {/* Price Quote Badge */}
            {lastClose > 0 && (
              <div
                className={`flex items-center gap-2 ${
                  isRtl ? 'pr-3 border-r' : 'pl-3 border-l'
                } border-slate-200 dark:border-slate-700/80 shrink-0`}
                dir="ltr"
              >
                <span className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                  {formatCurrency(lastClose, lastClose > 10 ? 2 : 4)}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isPositive
                      ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                  }`}
                >
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>
                    {formatNumber(priceChange, { decimals: 2, showSign: true })} ({formatPercent(priceChangePct, 2, true)})
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Refresh, Language, and Theme Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            id="btn-header-refresh"
            title={language === 'fa' ? 'به‌روزرسانی داده‌ها و قیمت‌ها' : 'Refresh Market Feeds'}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">
              {isRefreshing
                ? (language === 'fa' ? 'در حال دریافت...' : 'Refreshing...')
                : (language === 'fa' ? 'به‌روزرسانی' : 'Refresh')}
            </span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            id="lang-toggle-btn-header"
            title={t('language_toggle')}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className={language === 'en' ? 'font-vazir text-xs font-semibold' : 'font-sans text-xs font-semibold'}>
              {language === 'en' ? 'فارسی' : 'English'}
            </span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            id="theme-toggle-btn-header"
            title={isDark ? t('theme_light') : t('theme_dark')}
            className="p-1.5 px-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all flex items-center justify-center gap-1 text-xs font-medium cursor-pointer"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline text-[11px] text-slate-300 font-medium">{t('theme_light')}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span className="hidden sm:inline text-[11px] text-slate-600 font-medium">{t('theme_dark')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Sub-Bar: Dedicated Full-Width Tab Navigation */}
      <div className="px-4 lg:px-6 py-1.5 overflow-x-auto scrollbar-none flex items-center bg-slate-50/70 dark:bg-slate-900/50">
        <nav id="dashboard-tabs" className="flex items-center gap-1.5 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60'
                }`}
              >
                <span className={`${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                  {tab.icon}
                </span>
                <span>{t(tab.key, tab.defaultLabel)}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
