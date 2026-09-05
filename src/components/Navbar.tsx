import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { RealtimeIndicator } from './RealtimeIndicator';
import { RealtimeConnectionStatus } from '../types';
import { AlpacaModal } from './AlpacaModal';

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
  connectionStatus?: RealtimeConnectionStatus;
  isInitialSyncing?: boolean;
  initialSyncDone?: boolean;
  lastTickTime?: number;
  priceFlash?: 'up' | 'down' | null;
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
  connectionStatus = 'connected',
  isInitialSyncing = false,
  initialSyncDone = true,
  lastTickTime = Date.now(),
  priceFlash = null,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { language, toggleLanguage, t, isRtl, formatCurrency, formatNumber, formatPercent, toPersianDigits } = useLanguage();
  const [isAlpacaOpen, setIsAlpacaOpen] = useState(false);

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
      defaultLabel: 'AI Strategy & Insights',
      icon: <Cpu className="w-3.5 h-3.5" />,
    },
    {
      id: 'alpaca',
      key: 'tab_alpaca',
      defaultLabel: 'Alpaca Brokerage',
      icon: <span className="text-xs">🦙</span>,
    },
  ];

  const isPositive = priceChange >= 0;

  // Horizontal Tab Scroll & Slider state
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const checkScrollability = useCallback(() => {
    const el = tabScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, [checkScrollability]);

  // When active tab or language changes, auto-scroll active tab into view smoothly
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeEl = document.getElementById(`tab-btn-${activeTab}`);
      if (activeEl && tabScrollRef.current) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      checkScrollability();
    }, 60);
    return () => clearTimeout(timer);
  }, [activeTab, language, checkScrollability]);

  const handleScrollLeft = () => {
    if (tabScrollRef.current) {
      tabScrollRef.current.scrollBy({ left: isRtl ? 220 : -220, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (tabScrollRef.current) {
      tabScrollRef.current.scrollBy({ left: isRtl ? -220 : 220, behavior: 'smooth' });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && tabScrollRef.current) {
      tabScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tabScrollRef.current) return;
    setIsDragging(true);
    setDragStartX(e.pageX - tabScrollRef.current.offsetLeft);
    setDragScrollLeft(tabScrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !tabScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabScrollRef.current.offsetLeft;
    const walk = (x - dragStartX) * 1.5;
    tabScrollRef.current.scrollLeft = dragScrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

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

            {/* Desktop Price Quote Badge */}
            {lastClose > 0 && (
              <div
                className={`hidden md:flex items-center gap-2 ${
                  isRtl ? 'pr-3 border-r' : 'pl-3 border-l'
                } border-slate-200 dark:border-slate-700/80 shrink-0 px-2 py-1 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 transition-colors duration-200`}
                dir="ltr"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-sm sm:text-base font-bold font-mono transition-colors duration-200 ${
                      priceFlash === 'up'
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : priceFlash === 'down'
                        ? 'text-rose-500 dark:text-rose-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {formatCurrency(lastClose, lastClose > 10 ? 2 : 4)}
                  </span>
                  {priceFlash && (
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        priceFlash === 'up' ? 'bg-emerald-500 animate-ping' : 'bg-rose-500 animate-ping'
                      }`}
                    />
                  )}
                </div>
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

        {/* Right Side: Real-Time Indicator, Refresh, Language, and Theme Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Real-time streaming status indicator */}
          <RealtimeIndicator
            connectionStatus={connectionStatus}
            isInitialSyncing={isInitialSyncing}
            initialSyncDone={initialSyncDone}
            isRefreshing={isRefreshing}
            lastTickTime={lastTickTime}
            onManualRefresh={onRefresh}
          />

          {/* Quick Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            id="btn-header-refresh"
            title={language === 'fa' ? 'به‌روزرسانی فوری داده‌ها و قیمت‌ها' : 'Force Market Refresh'}
            className="px-2 sm:px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">
              {isRefreshing
                ? (language === 'fa' ? 'در حال دریافت...' : 'Refreshing...')
                : (language === 'fa' ? 'به‌روزرسانی' : 'Refresh')}
            </span>
          </button>

          {/* Alpaca Paper Trading Button */}
          <button
            onClick={() => setIsAlpacaOpen(true)}
            id="btn-header-alpaca"
            title={language === 'fa' ? 'مدیریت و اتصال حساب آلپاکا' : 'Alpaca Brokerage & Paper Trading'}
            className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="text-xs">🦙</span>
            <span className="hidden sm:inline text-[11px] font-bold">Alpaca</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            id="lang-toggle-btn-header"
            title={t('language_toggle')}
            className="px-2 sm:px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer"
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

      {/* Mobile-Only Secondary Price & Regime Strip - Clean, Never cramped */}
      {lastClose > 0 && (
        <div className="md:hidden px-4 py-1.5 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0" dir="ltr">
            <span
              className={`text-sm font-bold font-mono transition-colors duration-200 ${
                priceFlash === 'up'
                  ? 'text-emerald-500 dark:text-emerald-400'
                  : priceFlash === 'down'
                  ? 'text-rose-500 dark:text-rose-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {formatCurrency(lastClose, lastClose > 10 ? 2 : 4)}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                isPositive
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
              }`}
            >
              {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              <span>
                {formatNumber(priceChange, { decimals: 2, showSign: true })} ({formatPercent(priceChangePct, 1, true)})
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              dir="ltr"
            >
              {selectedAsset?.exchange} · {language === 'fa' ? toPersianDigits(selectedInterval) : selectedInterval}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Sub-Bar: Dedicated Full-Width Tab Navigation with Interactive Slider Controls */}
      <div className="relative border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 backdrop-blur-xs flex items-center">
        {/* Left scroll chevron button (desktop only) */}
        {canScrollLeft && (
          <div className="hidden md:flex absolute left-0 top-0 bottom-0 z-10 items-center pr-4 pl-1.5 bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent dark:from-slate-900 dark:via-slate-900/90 dark:to-transparent pointer-events-auto">
            <button
              onClick={handleScrollLeft}
              className="p-1 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Slide tabs left"
              title="Slide tabs left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable / Draggable tab container */}
        <div
          ref={tabScrollRef}
          onScroll={checkScrollability}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className={`px-3 sm:px-6 py-1.5 overflow-x-auto scrollbar-none flex items-center w-full select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab sm:cursor-default'
          }`}
        >
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
                      ? 'bg-cyan-600 text-white shadow-xs ring-1 ring-cyan-500'
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

        {/* Right scroll chevron button (desktop only) */}
        {canScrollRight && (
          <div className="hidden md:flex absolute right-0 top-0 bottom-0 z-10 items-center pl-4 pr-1.5 bg-gradient-to-l from-slate-50 via-slate-50/90 to-transparent dark:from-slate-900 dark:via-slate-900/90 dark:to-transparent pointer-events-auto">
            <button
              onClick={handleScrollRight}
              className="p-1 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Slide tabs right"
              title="Slide tabs right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Alpaca Paper Trading Modal */}
      <AlpacaModal
        isOpen={isAlpacaOpen}
        onClose={() => setIsAlpacaOpen(false)}
        defaultSymbol={selectedAsset?.symbol || 'AAPL'}
      />
    </header>
  );
};
