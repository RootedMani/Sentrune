import React, { useState } from 'react';
import { SentimentAggregate } from '../../types';
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
  Legend,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import {
  MessageSquareText,
  ChevronDown,
  Table,
  Users,
  Activity,
  Info,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Layers,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface SentimentTabProps {
  aggregates: SentimentAggregate[];
  availableWindows: number[];
  selectedWindow: number;
  onSelectWindow: (window: number) => void;
  symbol: string;
}

export const SentimentTab: React.FC<SentimentTabProps> = ({
  aggregates,
  availableWindows,
  selectedWindow,
  onSelectWindow,
  symbol,
}) => {
  const { isDark } = useTheme();
  const { t, language, isRtl } = useLanguage();
  const [showRawAggregates, setShowRawAggregates] = useState(false);

  const filteredAggregates = aggregates.filter(
    (a) => a.window_hours === selectedWindow
  );

  const chartData = filteredAggregates.map((a) => ({
    timestamp: new Date(a.window_end).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    fullTime: a.window_end,
    avg_sentiment: a.avg_sentiment,
    followed_avg_sentiment: a.followed_avg_sentiment,
    unattributed_avg_sentiment: a.unattributed_avg_sentiment,
    mention_volume: a.mention_volume,
    sentiment_volatility: a.sentiment_volatility,
  }));

  const latestAgg = filteredAggregates[filteredAggregates.length - 1];

  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const sentimentScore = latestAgg?.avg_sentiment ?? 0;
  const isBullish = sentimentScore > 0.1;
  const isBearish = sentimentScore < -0.1;

  const getWindowLabel = (win: number) => {
    if (language === 'fa') {
      return win === 24 ? '۲۴ ساعت' : win === 72 ? '۷۲ ساعت' : '۷ روز';
    }
    return win === 24 ? '24 Hours' : win === 72 ? '72 Hours' : '7 Days';
  };

  return (
    <div id="sentiment-tab-content" className="space-y-6">
      {/* Header & Window Selector */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === 'fa' ? `تله‌متری احساسات چندافقی (${symbol})` : `Multi-Horizon Sentiment Telemetry (${symbol})`}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'fa' ? 'قطبیت زبان طبیعی FinBERT در تیترهای خبری مالی و بحث‌های جامعه بازار.' : 'Rolling FinBERT natural language polarity across financial news headlines and market discussions.'}
          </p>
        </div>

        {/* Window Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {language === 'fa' ? 'بازه:' : 'Window:'}
          </span>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700/60">
            {availableWindows.map((win) => (
              <button
                key={win}
                onClick={() => onSelectWindow(win)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  selectedWindow === win
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {getWindowLabel(win)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sentiment Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Overall Polarity Card */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {language === 'fa' ? 'قطبیت کلی احساسات' : 'Composite Polarity'}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isBullish
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60'
                  : isBearish
                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60'
                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800/60'
              }`}
            >
              {isBullish ? t('sentiment_bullish') : isBearish ? t('sentiment_bearish') : t('sentiment_neutral')}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold font-mono ${
                isBullish
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : isBearish
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-800 dark:text-slate-200'
              }`}
              dir="ltr"
            >
              {sentimentScore > 0 ? '+' : ''}
              {sentimentScore.toFixed(3)}
            </span>
            <span className="text-xs text-slate-400 font-mono" dir="ltr">[-1.0 to +1.0]</span>
          </div>

          {/* Meter Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex" dir="ltr">
            <div
              style={{ width: `${Math.max(0, Math.min(100, (sentimentScore + 1) * 50))}%` }}
              className={`h-full transition-all duration-300 ${
                isBullish ? 'bg-emerald-500' : isBearish ? 'bg-rose-500' : 'bg-blue-500'
              }`}
            />
          </div>
        </div>

        {/* Followed Analysts vs Retail Sentiment */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs space-y-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {language === 'fa' ? 'تحلیل‌گران منتخب در برابر خرده‌فروشان' : 'Followed Analysts vs Retail'}
          </span>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">{language === 'fa' ? 'معامله‌گران میزهای تخصصی:' : 'Followed Desk Traders:'}</span>
              <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400" dir="ltr">
                {latestAgg?.followed_avg_sentiment !== undefined && latestAgg?.followed_avg_sentiment > 0 ? '+' : ''}
                {latestAgg?.followed_avg_sentiment?.toFixed(3) || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">{language === 'fa' ? 'معامله‌گران خرد و عمومی:' : 'Unattributed / Retail:'}</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300" dir="ltr">
                {latestAgg?.unattributed_avg_sentiment !== undefined && latestAgg?.unattributed_avg_sentiment > 0 ? '+' : ''}
                {latestAgg?.unattributed_avg_sentiment?.toFixed(3) || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Mentions & Volatility */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs space-y-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {language === 'fa' ? 'حجم گفتگو و پراکندگی' : 'Volume & Dispersion'}
          </span>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">{language === 'fa' ? 'کل پیام‌های اشاره‌شده:' : 'Total Mention Volume:'}</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100" dir="ltr">
                {latestAgg?.mention_volume ?? 0} {language === 'fa' ? 'پیام / بازه' : 'mentions / window'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">{language === 'fa' ? 'نوسان احساسات:' : 'Sentiment Volatility:'}</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300" dir="ltr">
                {latestAgg?.sentiment_volatility?.toFixed(3) || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart: Sentiment Polarity Trajectory */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {language === 'fa' ? `مسیر قطبیت احساسات (بازه غلتان ${selectedWindow} ساعته)` : `Sentiment Polarity Trajectory (${selectedWindow}h Rolling)`}
          </h3>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {language === 'fa' ? 'منحنی احساسات تلفیقی' : 'Composite Sentiment Curve'}
          </span>
        </div>

        <div className="h-64 w-full pt-2" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="timestamp" stroke={textColor} fontSize={11} tickLine={false} />
              <YAxis domain={[-1, 1]} stroke={textColor} fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#cbd5e1',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: isDark ? '#f8fafc' : '#0f172a',
                }}
              />
              <ReferenceLine y={0} stroke={textColor} strokeDasharray="2 2" />
              <Line type="monotone" dataKey="avg_sentiment" name={language === 'fa' ? 'احساسات تلفیقی' : 'Composite Sentiment'} stroke="#06b6d4" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="followed_avg_sentiment" name={language === 'fa' ? 'تحلیل‌گران منتخب' : 'Followed Analysts'} stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
