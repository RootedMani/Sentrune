import React, { useState } from 'react';
import { Asset, IngestionLog, ModelPrediction, PriceBar } from '../../types';
import {
  BarChart3,
  Newspaper,
  MessageSquare,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  Info,
  Layers,
  Terminal,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Zap,
  Activity,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface OverviewTabProps {
  asset: Asset | null;
  counts: {
    price_bars: number;
    news_items: number;
    social_items: number;
    technical_features: number;
    model_runs: number;
    sentiment_aggregates: number;
  };
  ingestionLog: IngestionLog[];
  hints: string[];
  lastClose?: number;
  priceChange?: number;
  priceChangePct?: number;
  onNavigateTab?: (tab: string) => void;
  prediction?: ModelPrediction;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  asset,
  counts,
  ingestionLog,
  hints,
  lastClose = 0,
  priceChange = 0,
  priceChangePct = 0,
  onNavigateTab,
  prediction,
}) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { t, language, isRtl } = useLanguage();

  const isPositive = priceChange >= 0;

  const getBriefingText = () => {
    if (!prediction) {
      return t('exec_briefing_desc');
    }
    if (language === 'fa') {
      const dirText =
        prediction.predicted_label === 'up'
          ? 'صعودی (UP)'
          : prediction.predicted_label === 'down'
          ? 'نزولی (DOWN)'
          : 'خنثی (FLAT)';
      const confPct = (prediction.confidence * 100).toFixed(1);
      return `مجموعه مدل هوش مصنوعی سیگنال جهت‌گیری ${dirText} با سطح اطمینان ${confPct}٪ صادر کرده است که با وضعیت قیمت ${isPositive ? 'مثبت' : 'منفی'} و فاکتورهای کلیدی همراه است.`;
    }
    return `Quantitative ensemble signals a ${prediction.predicted_label.toUpperCase()} regime (${(prediction.confidence * 100).toFixed(1)}% confidence) driven by ${prediction.top_factors.slice(0, 2).map((f) => f.label.toLowerCase()).join(' and ')} with ${isPositive ? 'positive' : 'negative'} price action.`;
  };

  return (
    <div id="overview-tab-content" className="space-y-6">
      {/* Executive Market Intelligence Briefing Card */}
      <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> {t('exec_briefing')}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {asset?.name} ({asset?.symbol}) {language === 'fa' ? 'سنتز جامع بازار' : 'Market Synthesis'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              {getBriefingText()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onNavigateTab && (
              <>
                <button
                  onClick={() => onNavigateTab('prices')}
                  className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-cyan-500" />
                  {t('tab_prices')}
                </button>
                <button
                  onClick={() => onNavigateTab('model')}
                  className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-cyan-900/20"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  {t('tab_model')}
                  <ArrowRight className={`w-3 h-3 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Price Bars */}
        <div
          onClick={() => onNavigateTab?.('prices')}
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-blue-400 dark:hover:border-blue-500/50 transition-all cursor-pointer shadow-xs group"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('price_bars_count')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" dir="ltr">
              {counts.price_bars.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'fa' ? 'ردیف‌های کندل ذخیره‌شده' : 'Ingested OHLCV rows'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Metric 2: News Items */}
        <div
          onClick={() => onNavigateTab?.('news')}
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all cursor-pointer shadow-xs group"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('news_count')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" dir="ltr">
              {counts.news_items.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'fa' ? 'تحلیل‌شده با FinBERT' : 'FinBERT Scored Feeds'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Newspaper className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        {/* Metric 3: Social Discussion */}
        <div
          onClick={() => onNavigateTab?.('social')}
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-purple-400 dark:hover:border-purple-500/50 transition-all cursor-pointer shadow-xs group"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('social_count')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" dir="ltr">
              {counts.social_items.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'fa' ? 'دیدگاه‌ها و پیام‌ها' : 'Community Discussions'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        {/* Metric 4: ML Models */}
        <div
          onClick={() => onNavigateTab?.('model')}
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-cyan-400 dark:hover:border-cyan-500/50 transition-all cursor-pointer shadow-xs group"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('model_runs_count')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" dir="ltr">
              {counts.model_runs.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'fa' ? 'اعتبارسنجی ۵ مرحله‌ای' : 'LightGBM Walk-Forward'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Cpu className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Selected Asset Information Specification */}
      {asset && (
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              {language === 'fa' ? 'مشخصات دارایی هدف انتخاب‌شده' : 'Active Target Asset Specification'}
            </h3>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700" dir="ltr">
              ID #{asset.id}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="pb-2.5">{language === 'fa' ? 'نماد' : 'Symbol'}</th>
                  <th className="pb-2.5">{language === 'fa' ? 'نام دارایی' : 'Asset Name'}</th>
                  <th className="pb-2.5">{language === 'fa' ? 'نوع' : 'Type'}</th>
                  <th className="pb-2.5">{language === 'fa' ? 'صرافی / منبع' : 'Exchange / Source'}</th>
                  <th className="pb-2.5">{language === 'fa' ? 'جفت ارز / فرمت' : 'Pair / Symbol Format'}</th>
                  <th className="pb-2.5">{language === 'fa' ? 'وضعیت' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="py-3 font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {asset.symbol}
                  </td>
                  <td className="py-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                    {asset.name}
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-sans font-semibold ${
                        asset.asset_type === 'crypto'
                          ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60'
                          : 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-400 border border-blue-300 dark:border-blue-800/60'
                      }`}
                    >
                      {asset.asset_type === 'crypto' && language === 'fa' ? 'کریپتو' : asset.asset_type === 'stock' && language === 'fa' ? 'سهام' : asset.asset_type}
                    </span>
                  </td>
                  <td className="py-3">{asset.exchange}</td>
                  <td className="py-3">{asset.pair || asset.symbol}</td>
                  <td className="py-3">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-sans font-semibold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {language === 'fa' ? 'فعال' : 'Active'} ({asset.is_active})
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Operational Diagnostics & Ingestion History */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="w-full p-4 flex items-center justify-between text-left rtl:text-right hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t('sys_diagnostics')}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono" dir="ltr">
              {ingestionLog.length} logs
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                showDiagnostics ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {showDiagnostics && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
            {ingestionLog.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono py-2">
                {t('no_logs')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-xs border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                      <th className="pb-2">{t('ingestion_col_time')}</th>
                      <th className="pb-2">{t('ingestion_col_provider')}</th>
                      <th className="pb-2">{t('ingestion_col_status')}</th>
                      <th className="pb-2">{t('ingestion_col_items')}</th>
                      <th className="pb-2">{language === 'fa' ? 'توضیحات' : 'Notes / Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
                    {ingestionLog.slice(0, 5).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 text-slate-500 dark:text-slate-400" dir="ltr">
                          {new Date(log.started_at).toLocaleTimeString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 font-bold text-cyan-600 dark:text-cyan-400">
                          {log.source}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                              log.status === 'success'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60'
                                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60'
                            }`}
                          >
                            {log.status === 'success' ? t('status_success') : log.status}
                          </span>
                        </td>
                        <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200" dir="ltr">
                          {log.records_fetched}
                        </td>
                        <td className="py-2.5 text-slate-500 dark:text-slate-400 truncate max-w-xs">
                          {log.error_message || 'OK'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
