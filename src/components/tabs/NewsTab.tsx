import React, { useState } from 'react';
import { NewsItem } from '../../types';
import {
  Newspaper,
  ExternalLink,
  Calendar,
  Tag,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Info,
  Globe,
  RefreshCw,
  Sparkles,
  Layers,
  Languages,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface NewsTabProps {
  news: NewsItem[];
  symbol: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const NewsTab: React.FC<NewsTabProps> = ({ news, symbol, onRefresh, isRefreshing }) => {
  const { isDark } = useTheme();
  const { t, language, isRtl, formatNumber, toPersianDigits, formatDate } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');
  // Track items where the user manually toggled the language view
  const [itemLanguageOverrides, setItemLanguageOverrides] = useState<Record<number, 'en' | 'fa'>>({});

  const toggleItemLanguage = (id: number, currentDisplayLang: 'en' | 'fa') => {
    setItemLanguageOverrides((prev) => ({
      ...prev,
      [id]: currentDisplayLang === 'fa' ? 'en' : 'fa',
    }));
  };

  // Extract unique sources
  const sources = Array.from(new Set(news.map((n) => n.source_name || 'Web Scraper'))).filter(Boolean);

  // Filtered news
  const filteredNews = news.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === '' ||
      item.headline.toLowerCase().includes(searchLower) ||
      (item.headline_fa && item.headline_fa.toLowerCase().includes(searchLower)) ||
      (item.body && item.body.toLowerCase().includes(searchLower)) ||
      (item.body_fa && item.body_fa.toLowerCase().includes(searchLower));

    const matchesSource =
      selectedSource === 'all' ||
      (item.source_name || '').toLowerCase() === selectedSource.toLowerCase() ||
      (item.source_type || '').toLowerCase().includes(selectedSource.toLowerCase());

    const itemSentiment = (item.sentiment || 'neutral').toLowerCase();
    const matchesSentiment = selectedSentiment === 'all' || itemSentiment === selectedSentiment;

    return matchesSearch && matchesSource && matchesSentiment;
  });

  return (
    <div id="news-tab-content" className="space-y-6">
      {/* Header with Scraping Indicator & Action */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === 'fa' ? `اخبار زنده و فیدهای بازار (${symbol})` : `Live News & Market Feeds (${symbol})`}
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 rounded-full flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {language === 'fa' ? 'فید زنده فعال' : 'Live Feed Active'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'fa'
              ? 'جمع‌آوری‌شده از Google News، CoinDesk، CoinTelegraph و Yahoo Finance با ترجمه هوشمند فارسی و تحلیل احساسات FinBERT.'
              : 'Aggregated from Google News, CoinDesk, CoinTelegraph, and Yahoo Finance with smart Persian localization and FinBERT sentiment.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing
                ? language === 'fa'
                  ? 'در حال دریافت فیدها...'
                  : 'Scraping Feeds...'
                : language === 'fa'
                ? 'دریافت تازه‌ترین فیدها'
                : 'Scrape Latest Feeds'}
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5 text-slate-400`} />
            <input
              type="text"
              placeholder={
                language === 'fa'
                  ? 'جستجو در تیترها (فارسی و انگلیسی)، کلمات کلیدی یا موضوعات...'
                  : 'Search news headlines, keywords, or topics...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500`}
            />
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="all">
                {language === 'fa' ? `همه منابع (${toPersianDigits(news.length)})` : `All Sources (${news.length})`}
              </option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Sentiment Filter */}
            <select
              value={selectedSentiment}
              onChange={(e) => setSelectedSentiment(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="all">{language === 'fa' ? 'همه احساسات' : 'All Sentiments'}</option>
              <option value="positive">{language === 'fa' ? 'صعودی / مثبت' : 'Bullish / Positive'}</option>
              <option value="neutral">{language === 'fa' ? 'خنثی' : 'Neutral'}</option>
              <option value="negative">{language === 'fa' ? 'نزولی / منفی' : 'Bearish / Negative'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* News List Items */}
      {filteredNews.length === 0 ? (
        <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-500 dark:text-slate-400 shadow-xs">
          {language === 'fa'
            ? 'هیچ مقاله‌ای با معیارهای فیلتر شما مطابقت ندارد.'
            : "No news articles match your filter criteria. Try searching for a different term or click 'Scrape Latest Feeds'."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNews.map((item) => {
            const isPos = item.sentiment === 'positive';
            const isNeg = item.sentiment === 'negative';
            const sentimentLabel = isPos
              ? t('sentiment_bullish', 'صعودی / مثبت')
              : isNeg
              ? t('sentiment_bearish', 'نزولی / منفی')
              : t('sentiment_neutral', 'خنثی');

            // Determine if Persian or English should be displayed for this item
            const itemOverride = itemLanguageOverrides[item.id];
            const activeItemLang = itemOverride || language;
            const displayHeadline =
              activeItemLang === 'fa' ? item.headline_fa || item.headline : item.headline;
            const displayBody =
              activeItemLang === 'fa' ? item.body_fa || item.body : item.body;
            const isTranslatedToFa = Boolean(item.headline_fa && activeItemLang === 'fa');

            return (
              <div
                key={item.id}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-500/50 rounded-xl space-y-3 transition-all shadow-xs group"
              >
                {/* Meta row: Source, Date, Translation Tag, Sentiment */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {item.source_name || 'Web Feed'}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono" dir="ltr">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.published_at)}
                    </span>

                    {isTranslatedToFa && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 flex items-center gap-1 font-vazir">
                        <Languages className="w-3 h-3" />
                        {language === 'fa' ? 'ترجمه فارسی' : 'FA Translated'}
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                      isPos
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                        : isNeg
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60'
                        : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60'
                    }`}
                  >
                    {isPos ? <TrendingUp className="w-3 h-3" /> : isNeg ? <TrendingDown className="w-3 h-3" /> : null}
                    <span>{sentimentLabel}</span>
                    <span dir="ltr">({formatNumber(item.raw_sentiment || 0, { decimals: 2, showSign: true })})</span>
                  </span>
                </div>

                {/* Headline */}
                <h4
                  className={`text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors leading-snug ${
                    activeItemLang === 'fa' ? 'font-vazir' : 'font-sans'
                  }`}
                  dir={activeItemLang === 'fa' ? 'rtl' : 'ltr'}
                >
                  {displayHeadline}
                </h4>

                {/* Body Summary */}
                {displayBody && (
                  <p
                    className={`text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed ${
                      activeItemLang === 'fa' ? 'font-vazir' : 'font-sans'
                    }`}
                    dir={activeItemLang === 'fa' ? 'rtl' : 'ltr'}
                  >
                    {displayBody}
                  </p>
                )}

                {/* Action Bar: Toggle language & Original Source */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3 text-xs">
                  {/* Language switch button for this card */}
                  {item.headline_fa ? (
                    <button
                      onClick={() => toggleItemLanguage(item.id, activeItemLang)}
                      className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1.5 transition-colors"
                      title={activeItemLang === 'fa' ? 'مشاهده متن انگلیسی' : 'مشاهده ترجمه فارسی'}
                    >
                      <Languages className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>
                        {activeItemLang === 'fa'
                          ? language === 'fa'
                            ? 'مشاهده تیتر اصلی (EN)'
                            : 'View English original'
                          : language === 'fa'
                          ? 'مشاهده ترجمه فارسی (FA)'
                          : 'View Persian translation'}
                      </span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400"></span>
                  )}

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 shrink-0"
                    >
                      <span>{language === 'fa' ? 'مشاهده منبع اصلی' : 'Read original source'}</span>
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
