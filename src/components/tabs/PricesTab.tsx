import React, { useState, useMemo } from 'react';
import { PriceBar } from '../../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Table,
  Calendar,
  Download,
  Search,
  Filter,
  BarChart2,
  Activity,
  Layers,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface PricesTabProps {
  symbol: string;
  interval: string;
  bars: PriceBar[];
  lastClose: number;
  change: number;
  changePct: number;
}

export const PricesTab: React.FC<PricesTabProps> = ({
  symbol,
  interval,
  bars,
  lastClose,
  change,
  changePct,
}) => {
  const { isDark } = useTheme();
  const { t, language, isRtl, formatCurrency, formatNumber, formatPercent, toPersianDigits } = useLanguage();
  const [showRawBars, setShowRawBars] = useState(false);
  const [timeframe, setTimeframe] = useState<'1W' | '1M' | '3M' | 'ALL'>('ALL');
  const [chartView, setChartView] = useState<'area' | 'bar'>('area');
  const [searchFilter, setSearchFilter] = useState('');

  // Filter bars based on timeframe
  const filteredBars = useMemo(() => {
    if (bars.length === 0) return [];
    if (timeframe === '1W') return bars.slice(-7);
    if (timeframe === '1M') return bars.slice(-30);
    if (timeframe === '3M') return bars.slice(-90);
    return bars;
  }, [bars, timeframe]);

  // High, Low, Average calculations
  const stats = useMemo(() => {
    if (filteredBars.length === 0) {
      return {
        high: lastClose > 0 ? lastClose : 0,
        low: lastClose > 0 ? lastClose : 0,
        avgVol: 0,
        periodReturn: changePct,
      };
    }
    const highs = filteredBars.map((b) => b.high);
    const lows = filteredBars.map((b) => b.low);
    const volumes = filteredBars.map((b) => b.volume);
    const firstClose = filteredBars[0].open;
    const currentClose = filteredBars[filteredBars.length - 1].close;

    const high = Math.max(...highs);
    const low = Math.min(...lows);
    const avgVol = volumes.reduce((acc, v) => acc + v, 0) / volumes.length;
    const periodReturn = firstClose > 0 ? ((currentClose - firstClose) / firstClose) * 100 : 0;

    return { high, low, avgVol, periodReturn };
  }, [filteredBars, lastClose, changePct]);

  // Format data for Recharts
  const chartData = useMemo(() => {
    return filteredBars.map((b) => {
      const d = new Date(b.timestamp);
      const isIntraday = interval === '1h';
      const label = isIntraday
        ? `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`
        : d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

      return {
        timestamp: label,
        fullTime: b.timestamp,
        close: b.close,
        open: b.open,
        high: b.high,
        low: b.low,
        volume: b.volume,
      };
    });
  }, [filteredBars, interval]);

  // Search filtered raw bars
  const tableBars = useMemo(() => {
    if (!searchFilter.trim()) return filteredBars;
    const q = searchFilter.toLowerCase();
    return filteredBars.filter(
      (b) =>
        b.timestamp.toLowerCase().includes(q) ||
        b.close.toString().includes(q) ||
        b.source.toLowerCase().includes(q)
    );
  }, [filteredBars, searchFilter]);

  const exportCSV = () => {
    if (bars.length === 0) return;
    const headers = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume', 'Source'];
    const rows = bars.map((b) => [
      b.timestamp,
      b.open,
      b.high,
      b.low,
      b.close,
      b.volume,
      b.source,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${symbol}_prices_${interval}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPositive = change >= 0;
  const isPeriodPositive = stats.periodReturn >= 0;

  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div id="prices-tab-content" className="space-y-6">
      {/* Header Metric Card */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            {t('last_close')} ({symbol})
          </span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-mono" dir="ltr">
              {formatCurrency(lastClose, lastClose > 10 ? 2 : 4)}
            </span>
            <div
              className={`flex items-center gap-1 text-sm font-semibold font-mono px-2.5 py-0.5 rounded-lg ${
                isPositive
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
              }`}
              dir="ltr"
            >
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>
                {formatNumber(change, { decimals: 2, showSign: true })} ({formatPercent(changePct, 2, true)})
              </span>
            </div>
          </div>
        </div>

        {/* Timeframe & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
            {(['1W', '1M', '3M', 'ALL'] as const).map((tf) => {
              const labelKey = tf === '1W' ? 'tf_1w' : tf === '1M' ? 'tf_1m' : tf === '3M' ? 'tf_3m' : 'tf_all';
              return (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    timeframe === tf
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {t(labelKey, tf)}
                </button>
              );
            })}
          </div>

          {/* Export CSV button */}
          <button
            onClick={exportCSV}
            title={t('export_csv')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('export_csv')}</span>
          </button>
        </div>
      </div>

      {/* Key Period Statistics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('metric_period_high')}
          </p>
          <p className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5" dir="ltr">
            {formatCurrency(stats.high, 2)}
          </p>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('metric_period_low')}
          </p>
          <p className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5" dir="ltr">
            {formatCurrency(stats.low, 2)}
          </p>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('metric_return')}
          </p>
          <p
            className={`text-base font-bold font-mono mt-0.5 ${
              isPeriodPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
            dir="ltr"
          >
            {formatPercent(stats.periodReturn, 2, true)}
          </p>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('metric_avg_volume')}
          </p>
          <p className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5" dir="ltr">
            {stats.avgVol > 1e6
              ? `${formatNumber(stats.avgVol / 1e6, { decimals: 2 })}M`
              : `${formatNumber(stats.avgVol / 1e3, { decimals: 1 })}K`}
          </p>
        </div>
      </div>

      {bars.length === 0 ? (
        <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-500 dark:text-slate-400 shadow-xs">
          {t('no_price_bars')}
        </div>
      ) : (
        <>
          {/* Close Price Area Chart */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('price_chart_title')}
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400" dir="ltr">
                {filteredBars.length} {t('bars_loaded')}
              </span>
            </div>

            <div className="h-72 w-full pt-2" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="timestamp"
                    stroke={textColor}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    stroke={textColor}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: any) => [
                      formatCurrency(Number(value), 2),
                      t('legend_close'),
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#priceGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Volume Chart */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {language === 'fa' ? 'حجم معاملات' : 'Trading Volume'}
              </h3>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {language === 'fa' ? 'توزیع حجم' : 'Volume Distribution'}
              </span>
            </div>
            <div className="h-36 w-full pt-1" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="timestamp"
                    stroke={textColor}
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={textColor}
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: isDark ? '#f8fafc' : '#0f172a',
                    }}
                    formatter={(value: any) => [
                      formatNumber(Number(value), { decimals: 0 }),
                      t('table_volume'),
                    ]}
                  />
                  <Bar dataKey="volume" fill={isDark ? '#38bdf8' : '#0284c7'} opacity={0.75} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Raw Data Table with Search */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
            <button
              onClick={() => setShowRawBars(!showRawBars)}
              className="w-full p-4 flex items-center justify-between text-left rtl:text-right hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {language === 'fa' ? 'مشاهده جدول ردیف‌های OHLCV' : 'Inspect Raw OHLCV Price Records'} ({language === 'fa' ? toPersianDigits(filteredBars.length) : filteredBars.length})
                </h3>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  showRawBars ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showRawBars && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className={`w-4 h-4 absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5 text-slate-400`} />
                    <input
                      type="text"
                      placeholder={language === 'fa' ? 'جستجو در تاریخ، قیمت...' : 'Search dates, prices, sources...'}
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className={`w-full ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500`}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400" dir="ltr">
                    {language === 'fa' ? `${toPersianDigits(tableBars.length)} ردیف` : `${tableBars.length} records`}
                  </span>
                </div>

                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left rtl:text-right text-xs border-collapse font-mono">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900">
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                        <th className="py-2 px-2">{t('table_date')}</th>
                        <th className="py-2 px-2">{t('table_open')}</th>
                        <th className="py-2 px-2">{t('table_high')}</th>
                        <th className="py-2 px-2">{t('table_low')}</th>
                        <th className="py-2 px-2">{t('table_close')}</th>
                        <th className="py-2 px-2">{t('table_volume')}</th>
                        <th className="py-2 px-2">{language === 'fa' ? 'منبع' : 'Source'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
                      {tableBars
                        .slice()
                        .reverse()
                        .map((b) => (
                          <tr key={b.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-2 text-slate-500 dark:text-slate-400" dir="ltr">
                              {language === 'fa' ? toPersianDigits(b.timestamp.slice(0, 10)) : b.timestamp.slice(0, 10)}
                            </td>
                            <td className="py-2 px-2" dir="ltr">{formatCurrency(b.open, 2)}</td>
                            <td className="py-2 px-2 text-emerald-600 dark:text-emerald-400" dir="ltr">
                              {formatCurrency(b.high, 2)}
                            </td>
                            <td className="py-2 px-2 text-rose-600 dark:text-rose-400" dir="ltr">
                              {formatCurrency(b.low, 2)}
                            </td>
                            <td className="py-2 px-2 font-bold text-slate-900 dark:text-slate-100" dir="ltr">
                              {formatCurrency(b.close, 2)}
                            </td>
                            <td className="py-2 px-2" dir="ltr">{formatNumber(b.volume, { decimals: 0 })}</td>
                            <td className="py-2 px-2 text-cyan-600 dark:text-cyan-400">
                              {b.source}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
