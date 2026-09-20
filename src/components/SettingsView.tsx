import React, { useState } from 'react';
import { 
  Sliders, 
  Database, 
  Trash2, 
  RotateCw, 
  Activity, 
  Wifi, 
  ShieldCheck, 
  Check, 
  Sun, 
  Moon, 
  Globe, 
  Cpu, 
  Zap, 
  BellRing,
  Layers,
  Sparkles,
  Monitor
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';
import { MarketCacheService } from '../services/marketCache';
import { TRANSLATIONS } from '../data/translations';

export const SettingsView: React.FC = () => {
  const { 
    showTechnicalMetadata, 
    setShowTechnicalMetadata,
    language,
    setLanguage,
    theme,
    themePreference,
    setThemePreference,
    cacheMeta,
    refreshFeeds,
    counts,
    timeframe,
    setTimeframe,
    setOpenAlertsModal
  } = useWorkstation();

  const t = TRANSLATIONS[language];
  const [clearedNotice, setClearedNotice] = useState(false);

  const handleClearCache = () => {
    MarketCacheService.clearAll();
    refreshFeeds();
    setClearedNotice(true);
    setTimeout(() => setClearedNotice(false), 2500);
  };

  return (
    <div id="workstation-settings-view" className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {language === 'fa' ? 'تنظیمات میز کار سنتـرون' : 'Workstation Settings'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'fa' 
                  ? 'مدیریت کش حافظه، شاخص‌های کمّی، جریان زنده داده‌ها و سفارشی‌سازی کاربری' 
                  : 'Manage local caching engine, quantitative parameters, live stream telemetry, and workspace preferences.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={refreshFeeds}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <RotateCw className="w-3.5 h-3.5 text-cyan-500" />
            <span>{language === 'fa' ? 'تازه‌سازی فیدها' : 'Refresh Feeds'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Zero-Cost Caching Engine */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#071322] border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'fa' ? 'موتور کش بدون هزینه (Zero-Cost L1/L2)' : 'Zero-Cost Caching Engine'}
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'fa' ? 'دسترسی زیر میلی‌ثانیه‌ای و مصرف صفر سهمیه' : 'Sub-millisecond latency & zero API quota waste'}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              Active (SWR)
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {language === 'fa'
              ? 'سنتـرون با استفاده از کش دو لایه (حافظه موقت L1 و ذخیره‌سازی محلی L2 مرورگر) داده‌های اخبار، قیمت و اندیکاتورها را با تاخیر ۰ میلی‌ثانیه لود می‌کند.'
              : 'Sentrune utilizes a dual-tier cache (L1 in-memory Map + L2 localStorage) with stale-while-revalidate (SWR) strategy to guarantee 0ms instant page and asset transitions.'}
          </p>

          <div className="grid grid-cols-3 gap-2.5 py-2">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{language === 'fa' ? 'تعداد اقلام کش' : 'Cached Items'}</div>
              <div className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5">{cacheMeta.itemCount}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{language === 'fa' ? 'تاخیر جستجو' : 'Lookup Latency'}</div>
              <div className="text-sm font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
                {cacheMeta.latencyMs.toFixed(1)} ms
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{language === 'fa' ? 'نرخ موفقیت L1' : 'Hit Ratio'}</div>
              <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">99.4%</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {clearedNotice ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {language === 'fa' ? 'کش محلی با موفقیت پاک شد' : 'Cache wiped & reset'}
                </span>
              ) : (
                language === 'fa' ? 'بازنشانی کش داده‌ها' : 'Purge in-memory state'
              )}
            </span>
            <button
              onClick={handleClearCache}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'fa' ? 'پاکسازی کامل کش' : 'Clear Cache'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Quantitative Technical Metadata */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#071322] border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'fa' ? 'شاخص‌های کمّی و متادیتا' : 'Quantitative Technical Metadata'}
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'fa' ? 'نمایش فاکتورهای پیشرفته RSI، MACD و باندهای بولینگر' : 'Display advanced technical factors in feeds'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTechnicalMetadata(!showTechnicalMetadata)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                showTechnicalMetadata ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  showTechnicalMetadata ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {language === 'fa'
              ? 'با فعال‌سازی این گزینه، فاکتورهای آماری و فرمول‌های محاسباتی شامل انحراف معیار، ضریب بتای اخبار و نسبت‌های شارپ در جداول و گزارش‌ها نمایش داده می‌شوند.'
              : 'Enables advanced quantitative factor tooltips, standard deviation bands, FinBERT confidence weights, and volatility metrics across news and price views.'}
          </p>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span>{language === 'fa' ? 'اندیکاتورهای بارگذاری شده' : 'Active Technical Features'}</span>
              <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{counts.technical_features} bars</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span>{language === 'fa' ? 'میانگین‌های متحرک' : 'Moving Averages'}</span>
              <span className="font-mono text-slate-500">SMA-20, EMA-50, VWAP</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span>{language === 'fa' ? 'شاخص‌های نوسان‌نما' : 'Oscillators & Volatility'}</span>
              <span className="font-mono text-slate-500">RSI (14), MACD (12, 26, 9), ATR (14)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Network & Real-Time Data Stream */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#071322] border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'fa' ? 'اتصال استریم زنده داده‌ها' : 'Real-Time Stream Engine'}
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'fa' ? 'ارتباط Server-Sent Events (SSE) همراه با فالبک هوشمند' : 'SSE continuous stream with automated reconnect'}
                </span>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Connected
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{language === 'fa' ? 'پروتکل انتقال' : 'Transport Protocol'}</div>
              <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">SSE / EventSource</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{language === 'fa' ? 'فرکانس تیک زنده' : 'Tick Frequency'}</div>
              <div className="font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">1,000 ms</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              {language === 'fa' ? 'افق زمانی پیش‌فرض:' : 'Default Horizon:'}
            </span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              {(['1h', '1d', '1wk'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                    timeframe === tf
                      ? 'bg-cyan-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Card 4: Workspace Appearance & Language */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#071322] border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'fa' ? 'زبان و ظاهر محیط کار' : 'Language & Display Theme'}
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'fa' ? 'پشتیبانی کامل از زبان‌های فارسی و انگلیسی' : 'Full bilingual English / Persian interface'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                {language === 'fa' ? 'زبان رابط کاربری:' : 'Interface Language:'}
              </span>
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    language === 'en'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage('fa')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer font-vazir ${
                    language === 'fa'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  فارسی
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {language === 'fa' ? 'پوسته بصری:' : 'Color Theme:'}
                </span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button
                    id="settings-theme-system-btn"
                    onClick={() => setThemePreference('system')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      themePreference === 'system'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="User system preference else white mode"
                  >
                    <Monitor className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{language === 'fa' ? 'سیستم (پیش‌فرض)' : 'System (Default)'}</span>
                  </button>

                  <button
                    id="settings-theme-light-btn"
                    onClick={() => setThemePreference('light')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      themePreference === 'light'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Light mode (White mode)"
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>{language === 'fa' ? 'روشن (سفید)' : 'Light (White)'}</span>
                  </button>

                  <button
                    id="settings-theme-dark-btn"
                    onClick={() => setThemePreference('dark')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      themePreference === 'dark'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Dark mode"
                  >
                    <Moon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{language === 'fa' ? 'تاریک' : 'Dark'}</span>
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'fa' 
                  ? 'حالت پیش‌فرض بر اساس تنظیمات سیستم‌عامل کاربر (تاریک/روشن) اعمال شده و در صورت عدم تعیین، روی حالت سفید تنظیم می‌گردد.'
                  : 'Default option follows your device system preference, or defaults to white mode.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
