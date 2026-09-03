import React, { useState } from 'react';
import { SocialItem } from '../../types';
import {
  MessageSquare,
  ExternalLink,
  Calendar,
  Radio,
  Users,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Info,
  Sparkles,
  RefreshCw,
  ThumbsUp,
  Share2,
  Globe,
  Languages,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface SocialTabProps {
  social: SocialItem[];
  symbol: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const SocialTab: React.FC<SocialTabProps> = ({ social, symbol, onRefresh, isRefreshing }) => {
  const { isDark } = useTheme();
  const { t, language, isRtl } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');
  const [showOriginalMap, setShowOriginalMap] = useState<Record<number, boolean>>({});

  const toggleShowOriginal = (id: number) => {
    setShowOriginalMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const platforms = Array.from(new Set(social.map((s) => s.platform))).filter(Boolean);

  const filteredSocial = social.filter((item) => {
    const sTerm = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === '' ||
      item.title.toLowerCase().includes(sTerm) ||
      (item.body && item.body.toLowerCase().includes(sTerm)) ||
      (item.title_fa && item.title_fa.includes(searchTerm)) ||
      (item.body_fa && item.body_fa.includes(searchTerm)) ||
      (item.author_username && item.author_username.toLowerCase().includes(sTerm));

    const matchesPlatform =
      selectedPlatform === 'all' || item.platform.toLowerCase() === selectedPlatform.toLowerCase();

    const itemSentiment = (item.sentiment || 'neutral').toLowerCase();
    const matchesSentiment = selectedSentiment === 'all' || itemSentiment === selectedSentiment;

    return matchesSearch && matchesPlatform && matchesSentiment;
  });

  return (
    <div id="social-tab-content" className="space-y-6">
      {/* Header */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{language === 'fa' ? 'جریان‌های گفتگوی معامله‌گران و شبکه‌های اجتماعی' : 'Trader Discussion & Social Streams'}</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800" dir="ltr">
                {symbol}
              </span>
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800/60 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
              {language === 'fa' ? 'فید زنده و تحلیل احساسات' : 'Live Sentiment Feed'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'fa'
              ? 'پایش هوشمند جریان پیام‌های StockTwits، بحث‌های معاملاتی Reddit و انجمن‌های سرمایه‌گذاری با ترجمه فارسی.'
              : 'Community sentiment from StockTwits, Reddit trading discussions, and financial message boards.'}
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            id="refresh-social-btn"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing
              ? (language === 'fa' ? 'در حال دریافت اطلاعات...' : 'Refreshing...')
              : (language === 'fa' ? 'به‌روزرسانی گفتگوها' : 'Refresh Discussions')}
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5 text-slate-400`} />
            <input
              type="text"
              id="social-search-input"
              placeholder={language === 'fa' ? 'جستجو در دیدگاه‌ها، تحلیل‌ها، شناسه تحلیل‌گر...' : 'Search commentary, market sentiment, analyst handles...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500`}
            />
          </div>

          {/* Platform Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              id="social-platform-select"
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="all">
                {language === 'fa' ? `همه کانال‌ها (${social.length})` : `All Channels (${social.length})`}
              </option>
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Sentiment Filter */}
            <select
              value={selectedSentiment}
              onChange={(e) => setSelectedSentiment(e.target.value)}
              id="social-sentiment-select"
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="all">{language === 'fa' ? 'همه احساسات' : 'All Sentiments'}</option>
              <option value="bullish">{language === 'fa' ? 'صعودی (Bullish)' : 'Bullish'}</option>
              <option value="bearish">{language === 'fa' ? 'نزولی (Bearish)' : 'Bearish'}</option>
              <option value="neutral">{language === 'fa' ? 'خنثی (Neutral)' : 'Neutral'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Social Posts Stream */}
      {filteredSocial.length === 0 ? (
        <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-500 dark:text-slate-400 shadow-xs">
          {language === 'fa' ? 'هیچ گفتگویی با معیارهای فیلتر شما مطابقت ندارد.' : 'No discussions match your filter criteria.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSocial.map((item) => {
            const isBull = item.sentiment === 'bullish' || item.sentiment === 'positive';
            const isBear = item.sentiment === 'bearish' || item.sentiment === 'negative';
            const sentimentLabel = isBull
              ? t('sentiment_bullish')
              : isBear
              ? t('sentiment_bearish')
              : t('sentiment_neutral');

            const hasPersian = !!item.title_fa;
            const isShowingOriginal = showOriginalMap[item.id] || false;
            const displayInPersian = language === 'fa' && hasPersian && !isShowingOriginal;

            const title = displayInPersian ? (item.title_fa || item.title) : item.title;
            const body = displayInPersian ? (item.body_fa || item.body) : item.body;
            const cleanUsername = item.author_username ? item.author_username.replace(/^@+/, '') : '';

            return (
              <div
                key={item.id}
                id={`social-post-${item.id}`}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500/50 rounded-xl space-y-3 transition-all shadow-xs group"
              >
                {/* Post Metadata Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-mono">
                      {item.platform}
                    </span>

                    {cleanUsername && (
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono flex items-center gap-0.5" dir="ltr">
                        <span>@</span>
                        <span>{cleanUsername}</span>
                      </span>
                    )}

                    {item.is_followed_account === 1 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                        {language === 'fa' ? 'میز معاملاتی منتخب' : 'Followed Desk'}
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {hasPersian && language === 'fa' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 flex items-center gap-1">
                        <Languages className="w-2.5 h-2.5" />
                        {isShowingOriginal ? 'متن اصلی (EN)' : 'ترجمه فارسی'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {hasPersian && language === 'fa' && (
                      <button
                        onClick={() => toggleShowOriginal(item.id)}
                        className="px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        title="تغییر زبان این پست"
                      >
                        {isShowingOriginal ? 'نمایش ترجمه فارسی' : 'Show Original (EN)'}
                      </button>
                    )}

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        isBull
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                          : isBear
                          ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60'
                          : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60'
                      }`}
                    >
                      {isBull ? <TrendingUp className="w-3 h-3" /> : isBear ? <TrendingDown className="w-3 h-3" /> : null}
                      {sentimentLabel}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h4
                  className={`text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug ${
                    displayInPersian ? 'font-vazir' : 'font-sans'
                  }`}
                  dir={displayInPersian ? 'rtl' : 'ltr'}
                >
                  {title}
                </h4>

                {/* Body if available */}
                {body && (
                  <p
                    className={`text-xs text-slate-600 dark:text-slate-300 leading-relaxed ${
                      displayInPersian ? 'font-vazir' : 'font-sans'
                    }`}
                    dir={displayInPersian ? 'rtl' : 'ltr'}
                  >
                    {body}
                  </p>
                )}

                {/* Footer Info & Link */}
                <div className="pt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="flex items-center gap-1.5 text-xs font-mono">
                    <ThumbsUp className="w-3 h-3 text-slate-400" />
                    <span>{language === 'fa' ? 'امتیاز تعامل:' : 'Score:'}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{item.score ?? 1}</span>
                  </span>

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 text-xs"
                    >
                      <span>{language === 'fa' ? 'مشاهده منبع اصلی' : 'View discussion'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

