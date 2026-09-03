import React, { useState } from 'react';
import { TechnicalFeature, PriceBar } from '../../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  Activity,
  ChevronDown,
  Table,
  Compass,
  Info,
  Sparkles,
  TrendingUp,
  TrendingDown,
  HelpCircle,
  Zap,
  Sliders,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface TechnicalsTabProps {
  technicals: TechnicalFeature[];
  bars: PriceBar[];
  symbol: string;
}

export const TechnicalsTab: React.FC<TechnicalsTabProps> = ({
  technicals,
  bars,
  symbol,
}) => {
  const { isDark } = useTheme();
  const { t, language, isRtl } = useLanguage();
  const [showRawTechnicals, setShowRawTechnicals] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  // Overlay state toggles
  const [showSma20, setShowSma20] = useState(true);
  const [showSma50, setShowSma50] = useState(true);
  const [showSma200, setShowSma200] = useState(false);
  const [showBands, setShowBands] = useState(true);

  const safeTechnicals = Array.isArray(technicals) ? technicals : [];
  const safeBars = Array.isArray(bars) ? bars : [];

  // Merge technicals with price close
  const mergedData = safeTechnicals.map((tf) => {
    const matchingBar = safeBars.find(
      (b) =>
        b.timestamp === tf.timestamp ||
        b.timestamp.slice(0, 13) === tf.timestamp.slice(0, 13) ||
        b.timestamp.slice(0, 10) === tf.timestamp.slice(0, 10)
    );
    return {
      timestamp: new Date(tf.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      fullTime: tf.timestamp,
      close: matchingBar ? matchingBar.close : null,
      sma_20: tf.sma_20,
      sma_50: tf.sma_50,
      sma_200: tf.sma_200,
      ema_12: tf.ema_12,
      ema_26: tf.ema_26,
      rsi_14: tf.rsi_14,
      macd: tf.macd,
      macd_signal: tf.macd_signal,
      macd_histogram: tf.macd_histogram,
      bb_upper: tf.bb_upper,
      bb_middle: tf.bb_middle,
      bb_lower: tf.bb_lower,
      atr_14: tf.atr_14,
    };
  });

  const latest = safeTechnicals[safeTechnicals.length - 1];
  const latestBar = safeBars[safeBars.length - 1];

  // Quick Signal Assessment
  const isAboveSma20 =
    latest && latestBar && latest.sma_20 ? latestBar.close > latest.sma_20 : false;
  const isAboveSma50 =
    latest && latestBar && latest.sma_50 ? latestBar.close > latest.sma_50 : false;
  const isRsiOverbought =
    latest && typeof latest.rsi_14 === 'number' ? latest.rsi_14 > 70 : false;
  const isRsiOversold =
    latest && typeof latest.rsi_14 === 'number' ? latest.rsi_14 < 30 : false;
  const isMacdBullish =
    latest &&
    typeof latest.macd === 'number' &&
    typeof latest.macd_signal === 'number'
      ? latest.macd > latest.macd_signal
      : false;

  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div id="technicals-tab-content" className="space-y-6">
      {/* Header & Controls */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === 'fa' ? `مجموعه شاخص‌های تکنیکال (${symbol})` : `Technical Indicator Suite (${symbol})`}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'fa' ? 'فیلترهای روند، اسیلاتورهای مومنتوم، کانال‌های نوسان و میانگین‌های متحرک' : 'Mathematical trend filters, momentum oscillators, volatility envelopes, and moving averages.'}
          </p>
        </div>

        {/* Overlay toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">
            {language === 'fa' ? 'نمایش لایه‌ها:' : 'Overlays:'}
          </span>
          <button
            onClick={() => setShowSma20(!showSma20)}
            className={`px-2 py-1 rounded-md border flex items-center gap-1 font-medium transition-all ${
              showSma20
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 text-amber-800 dark:text-amber-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            {showSma20 ? <CheckSquare className="w-3 h-3 text-amber-500" /> : <Square className="w-3 h-3" />}
            SMA 20
          </button>
          <button
            onClick={() => setShowSma50(!showSma50)}
            className={`px-2 py-1 rounded-md border flex items-center gap-1 font-medium transition-all ${
              showSma50
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-800 dark:text-blue-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            {showSma50 ? <CheckSquare className="w-3 h-3 text-blue-500" /> : <Square className="w-3 h-3" />}
            SMA 50
          </button>
          <button
            onClick={() => setShowBands(!showBands)}
            className={`px-2 py-1 rounded-md border flex items-center gap-1 font-medium transition-all ${
              showBands
                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 text-purple-800 dark:text-purple-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            {showBands ? <CheckSquare className="w-3 h-3 text-purple-500" /> : <Square className="w-3 h-3" />}
            BB Bands
          </button>
        </div>
      </div>

      {/* Signal Summary Gauge Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {language === 'fa' ? 'روند SMA 20 روزه' : '20-Day SMA Trend'}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-semibold ${
                isAboveSma20
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400'
              }`}
            >
              {isAboveSma20
                ? (language === 'fa' ? 'بالای میانگین (صعودی)' : 'Above (Bullish)')
                : (language === 'fa' ? 'زیر میانگین (نزولی)' : 'Below (Bearish)')}
            </span>
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2" dir="ltr">
            ${latest?.sma_20?.toFixed(2) || 'N/A'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {t('table_close')}: ${latestBar?.close?.toFixed(2) || 'N/A'}
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {language === 'fa' ? 'شاخص RSI 14 روزه' : '14-Day RSI'}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-semibold ${
                isRsiOverbought
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400'
                  : isRsiOversold
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400'
              }`}
            >
              {isRsiOverbought
                ? (language === 'fa' ? 'اشباع خرید (>۷۰)' : 'Overbought (>70)')
                : isRsiOversold
                ? (language === 'fa' ? 'اشباع فروش (<۳۰)' : 'Oversold (<30)')
                : (language === 'fa' ? 'خنثی (۳۰-۷۰)' : 'Neutral (30-70)')}
            </span>
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2" dir="ltr">
            {latest?.rsi_14?.toFixed(1) || 'N/A'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'fa' ? 'شاخص قدرت نسبی' : 'Relative Strength Index'}
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {language === 'fa' ? 'مومنتوم MACD' : 'MACD Momentum'}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-semibold ${
                isMacdBullish
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400'
              }`}
            >
              {isMacdBullish
                ? (language === 'fa' ? 'تقاطع مثبت' : 'Positive Crossover')
                : (language === 'fa' ? 'تقاطع منفی' : 'Negative Crossover')}
            </span>
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2" dir="ltr">
            {latest?.macd_histogram !== null && latest?.macd_histogram !== undefined
              ? (latest.macd_histogram > 0 ? '+' : '') + latest.macd_histogram.toFixed(2)
              : 'N/A'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'fa' ? 'هیستوگرام واگرایی MACD' : 'MACD Histogram Divergence'}
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {language === 'fa' ? 'نوسان‌پذیری ATR 14 روزه' : '14-Day ATR Volatility'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {language === 'fa' ? 'دامنه واقعی' : 'True Range'}
            </span>
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2" dir="ltr">
            ${latest?.atr_14?.toFixed(2) || 'N/A'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'fa' ? 'میانگین دامنه نوسان روزانه' : 'Average Daily Expected Range'}
          </p>
        </div>
      </div>

      {/* Chart 1: Price with Overlays (SMA, BB) */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {language === 'fa' ? 'قیمت و میانگین‌های متحرک' : 'Price & Moving Average Overlays'}
          </h3>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-cyan-500 inline-block" /> {t('legend_close')}
            </span>
            {showSma20 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <span className="w-2.5 h-0.5 bg-amber-500 inline-block" /> SMA 20
              </span>
            )}
            {showSma50 && (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <span className="w-2.5 h-0.5 bg-blue-500 inline-block" /> SMA 50
              </span>
            )}
          </div>
        </div>

        <div className="h-72 w-full pt-2" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="timestamp" stroke={textColor} fontSize={11} tickLine={false} />
              <YAxis domain={['auto', 'auto']} stroke={textColor} fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#cbd5e1',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: isDark ? '#f8fafc' : '#0f172a',
                }}
              />
              <Line type="monotone" dataKey="close" stroke="#06b6d4" strokeWidth={2} dot={false} name={t('legend_close')} />
              {showSma20 && (
                <Line type="monotone" dataKey="sma_20" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="SMA 20" />
              )}
              {showSma50 && (
                <Line type="monotone" dataKey="sma_50" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="5 5" name="SMA 50" />
              )}
              {showBands && (
                <>
                  <Line type="monotone" dataKey="bb_upper" stroke="#a855f7" strokeWidth={1} dot={false} strokeDasharray="2 2" name="BB Upper" />
                  <Line type="monotone" dataKey="bb_lower" stroke="#a855f7" strokeWidth={1} dot={false} strokeDasharray="2 2" name="BB Lower" />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: RSI Oscillator */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {language === 'fa' ? 'شاخص قدرت نسبی (RSI 14)' : 'Relative Strength Index (RSI 14)'}
          </h3>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {language === 'fa' ? 'سطوح: اشباع خرید (۷۰) · اشباع فروش (۳۰)' : 'Levels: Overbought (70) · Oversold (30)'}
          </span>
        </div>

        <div className="h-44 w-full pt-1" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="timestamp" stroke={textColor} fontSize={10} tickLine={false} />
              <YAxis domain={[0, 100]} ticks={[30, 50, 70]} stroke={textColor} fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#cbd5e1',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: isDark ? '#f8fafc' : '#0f172a',
                }}
                formatter={(val: any) => [Number(val).toFixed(2), 'RSI(14)']}
              />
              <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: '70 Overbought', fill: '#f43f5e', fontSize: 10 }} />
              <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" label={{ value: '30 Oversold', fill: '#10b981', fontSize: 10 }} />
              <ReferenceLine y={50} stroke={textColor} strokeDasharray="2 2" />
              <Line type="monotone" dataKey="rsi_14" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: MACD & Histogram */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {language === 'fa' ? 'اسیلاتور MACD (12, 26, 9)' : 'MACD Oscillator (12, 26, 9)'}
          </h3>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {language === 'fa' ? 'خط MACD · خط سیگنال · هیستوگرام' : 'MACD Line · Signal Line · Histogram'}
          </span>
        </div>

        <div className="h-44 w-full pt-1" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mergedData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="timestamp" stroke={textColor} fontSize={10} tickLine={false} />
              <YAxis stroke={textColor} fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#cbd5e1',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: isDark ? '#f8fafc' : '#0f172a',
                }}
              />
              <ReferenceLine y={0} stroke={textColor} />
              <Bar dataKey="macd_histogram" name="Histogram" fill="#06b6d4" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
