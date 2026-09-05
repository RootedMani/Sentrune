import React, { useState, useMemo } from 'react';
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
  Copy,
  Check,
  Languages,
  BadgeCheck,
  Flame,
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
  Tag,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Heart,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface SocialTabProps {
  social: SocialItem[];
  symbol: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

type SocialViewMode = 'stream' | 'cards';
type SocialSortOption = 'newest' | 'score' | 'bullish' | 'bearish';

// Helper to extract keywords or trending tags from trader posts
function extractTraderTags(items: SocialItem[]): string[] {
  const commonKeywords = [
    { tag: 'Earnings', matches: ['earning', 'revenue', 'eps', 'guidance'] },
    { tag: 'Breakout', matches: ['breakout', 'ath', 'highs', 'surge', 'rally'] },
    { tag: 'Options & Calls', matches: ['calls', 'options', 'puts', 'strike', 'expiry'] },
    { tag: 'Support & Dip', matches: ['support', 'dip', 'bounce', 'oversold', 'buy the dip'] },
    { tag: 'Short Squeeze', matches: ['squeeze', 'short', 'si', 'float'] },
    { tag: 'Macro & Fed', matches: ['fed', 'rate', 'powell', 'inflation', 'cpi'] },
    { tag: 'Long Term / DCA', matches: ['dca', 'hold', 'hodl', 'long term', 'accumulate'] },
  ];

  const set = new Set<string>();
  items.forEach((item) => {
    const text = `${item.title} ${item.body || ''}`.toLowerCase();
    commonKeywords.forEach((kw) => {
      if (kw.matches.some((m) => text.includes(m))) {
        set.add(kw.tag);
      }
    });
  });

  return Array.from(set);
}

export const SocialTab: React.FC<SocialTabProps> = ({ social, symbol, onRefresh, isRefreshing }) => {
  const { isDark } = useTheme();
  const { t, language, isRtl, formatNumber, toPersianDigits, formatDate } = useLanguage();

  // View mode: 'stream' (high-density chatter) or 'cards' (rich alpha cards)
  const [viewMode, setViewMode] = useState<SocialViewMode>('stream');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [onlyVerifiedDesks, setOnlyVerifiedDesks] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SocialSortOption>('newest');

  // Local upvotes tracking
  const [upvotes, setUpvotes] = useState<Record<number, number>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Per-post language toggle
  const [showOriginalMap, setShowOriginalMap] = useState<Record<number, boolean>>({});

  const toggleShowOriginal = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowOriginalMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpvote = (id: number, initialScore: number = 1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setUpvotes((prev) => {
      const current = prev[id] !== undefined ? prev[id] : initialScore;
      return { ...prev, [id]: current + 1 };
    });
  };

  const handleCopy = (item: SocialItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = `"${item.title}" - @${item.author_username || 'trader'} on ${item.platform}\n${item.url || ''}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Distinct platforms
  const platforms = useMemo(() => {
    return Array.from(new Set(social.map((s) => s.platform))).filter(Boolean);
  }, [social]);

  // Extract trending tags
  const trendingTags = useMemo(() => {
    return extractTraderTags(social);
  }, [social]);

  // Sentiment and volume metrics
  const stats = useMemo(() => {
    if (social.length === 0) {
      return {
        total: 0,
        bulls: 0,
        bears: 0,
        neutrals: 0,
        bullPct: 0,
        bearPct: 0,
        neuPct: 0,
        ratio: 1,
        followedCount: 0,
      };
    }
    let bulls = 0;
    let bears = 0;
    let neutrals = 0;
    let followed = 0;

    social.forEach((s) => {
      const sent = (s.sentiment || 'neutral').toLowerCase();
      if (sent === 'bullish' || sent === 'positive') bulls++;
      else if (sent === 'bearish' || sent === 'negative') bears++;
      else neutrals++;

      if (s.is_followed_account === 1) followed++;
    });

    const total = social.length;
    const ratio = bears > 0 ? Number((bulls / bears).toFixed(1)) : bulls > 0 ? bulls : 1;

    return {
      total,
      bulls,
      bears,
      neutrals,
      bullPct: Math.round((bulls / total) * 100),
      bearPct: Math.round((bears / total) * 100),
      neuPct: Math.round((neutrals / total) * 100),
      ratio,
      followedCount: followed,
    };
  }, [social]);

  // Filtered & Sorted items
  const filteredAndSortedSocial = useMemo(() => {
    const result = social.filter((item) => {
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
      const matchesSentiment =
        selectedSentiment === 'all' ||
        (selectedSentiment === 'bullish' && (itemSentiment === 'bullish' || itemSentiment === 'positive')) ||
        (selectedSentiment === 'bearish' && (itemSentiment === 'bearish' || itemSentiment === 'negative')) ||
        (selectedSentiment === 'neutral' && itemSentiment === 'neutral');

      const matchesVerified = !onlyVerifiedDesks || item.is_followed_account === 1;

      let matchesTag = true;
      if (selectedTag !== 'all') {
        const fullText = `${item.title} ${item.body || ''}`.toLowerCase();
        matchesTag = fullText.includes(selectedTag.toLowerCase().split(' ')[0]);
      }

      return matchesSearch && matchesPlatform && matchesSentiment && matchesVerified && matchesTag;
    });

    return result.sort((a, b) => {
      const scoreA = upvotes[a.id] !== undefined ? upvotes[a.id] : a.score ?? 1;
      const scoreB = upvotes[b.id] !== undefined ? upvotes[b.id] : b.score ?? 1;

      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'score') {
        return scoreB - scoreA;
      }
      if (sortBy === 'bullish') {
        const isBullA = a.sentiment === 'bullish' || a.sentiment === 'positive' ? 1 : 0;
        const isBullB = b.sentiment === 'bullish' || b.sentiment === 'positive' ? 1 : 0;
        return isBullB - isBullA;
      }
      if (sortBy === 'bearish') {
        const isBearA = a.sentiment === 'bearish' || a.sentiment === 'negative' ? 1 : 0;
        const isBearB = b.sentiment === 'bearish' || b.sentiment === 'negative' ? 1 : 0;
        return isBearB - isBearA;
      }
      return 0;
    });
  }, [social, searchTerm, selectedPlatform, selectedSentiment, selectedTag, onlyVerifiedDesks, sortBy, upvotes]);

  // Brand style helper for platforms
  const getPlatformStyle = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('reddit')) {
      return {
        bg: 'bg-orange-50 dark:bg-orange-950/70',
        text: 'text-orange-700 dark:text-orange-400',
        border: 'border-orange-200 dark:border-orange-800/60',
        label: 'Reddit',
      };
    }
    if (p.includes('twitter') || p.includes('x')) {
      return {
        bg: 'bg-sky-50 dark:bg-sky-950/70',
        text: 'text-sky-700 dark:text-sky-400',
        border: 'border-sky-200 dark:border-sky-800/60',
        label: 'Twitter/X',
      };
    }
    if (p.includes('stocktwits')) {
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/70',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800/60',
        label: 'StockTwits',
      };
    }
    return {
      bg: 'bg-purple-50 dark:bg-purple-950/70',
      text: 'text-purple-700 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800/60',
      label: platform,
    };
  };

  return (
    <div id="social-tab-content" className="space-y-4 select-none">
      {/* 1. Institutional Social Pulse & Discussion Velocity Bar */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Header Title & Status */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{language === 'fa' ? 'نبض گفتگوهای بازار و شبکه‌های معامله‌گران' : 'Market Discussion & Community Pulse'}</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold" dir="ltr">
                    {symbol}
                  </span>
                </h3>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-full flex items-center gap-1 shrink-0 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                <span>{language === 'fa' ? 'پایش لحظه‌ای' : 'PULSE ACTIVE'}</span>
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono" dir="ltr">
                {language === 'fa' ? `${toPersianDigits(filteredAndSortedSocial.length)} از ${toPersianDigits(social.length)} دیدگاه` : `${filteredAndSortedSocial.length} of ${social.length} discussions`}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              {language === 'fa'
                ? 'پایش گفتگوی معامله‌گران در StockTwits، بحث‌های معاملاتی Reddit و میزهای تحلیلی نهادی با تفکیک لحن صعودی/نزولی.'
                : 'Aggregates retail chatter, options flow sentiment, and institutional desk posts from StockTwits and Reddit.'}
            </p>
          </div>

          {/* View Mode Switcher & Refresh */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* View Switcher */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs">
              <button
                onClick={() => setViewMode('stream')}
                id="social-view-stream-btn"
                className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  viewMode === 'stream'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('social_view_stream', 'Live Stream')}</span>
              </button>

              <button
                onClick={() => setViewMode('cards')}
                id="social-view-cards-btn"
                className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('social_view_cards', 'Alpha Cards')}</span>
              </button>
            </div>

            {/* Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                id="refresh-social-btn"
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>
                  {isRefreshing
                    ? (language === 'fa' ? 'در حال دریافت...' : 'Refreshing...')
                    : (language === 'fa' ? 'به‌روزرسانی گفتگوها' : 'Refresh Feed')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Community Sentiment Polarity Gauge & Velocity Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Segmented Bar */}
          <div className="md:col-span-8 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>{t('social_sentiment_ratio', 'Trader Sentiment Ratio')}</span>
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedSentiment(selectedSentiment === 'bullish' ? 'all' : 'bullish')}
                  className={`text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer ${
                    selectedSentiment === 'bullish' ? 'underline ring-1 ring-emerald-500 rounded px-1' : ''
                  }`}
                >
                  {language === 'fa' ? `${toPersianDigits(stats.bullPct)}٪ خریدار` : `${stats.bullPct}% Bullish`}
                </button>
                <button
                  onClick={() => setSelectedSentiment(selectedSentiment === 'neutral' ? 'all' : 'neutral')}
                  className={`text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer ${
                    selectedSentiment === 'neutral' ? 'underline ring-1 ring-blue-500 rounded px-1' : ''
                  }`}
                >
                  {language === 'fa' ? `${toPersianDigits(stats.neuPct)}٪ خنثی` : `${stats.neuPct}% Neutral`}
                </button>
                <button
                  onClick={() => setSelectedSentiment(selectedSentiment === 'bearish' ? 'all' : 'bearish')}
                  className={`text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer ${
                    selectedSentiment === 'bearish' ? 'underline ring-1 ring-rose-500 rounded px-1' : ''
                  }`}
                >
                  {language === 'fa' ? `${toPersianDigits(stats.bearPct)}٪ فروشنده` : `${stats.bearPct}% Bearish`}
                </button>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex cursor-pointer">
              <div
                style={{ width: `${stats.bullPct}%` }}
                onClick={() => setSelectedSentiment(selectedSentiment === 'bullish' ? 'all' : 'bullish')}
                className="bg-emerald-500 hover:bg-emerald-400 transition-all"
                title={`Bullish: ${stats.bulls} items (${stats.bullPct}%)`}
              />
              <div
                style={{ width: `${stats.neuPct}%` }}
                onClick={() => setSelectedSentiment(selectedSentiment === 'neutral' ? 'all' : 'neutral')}
                className="bg-blue-500 hover:bg-blue-400 transition-all"
                title={`Neutral: ${stats.neutrals} items (${stats.neuPct}%)`}
              />
              <div
                style={{ width: `${stats.bearPct}%` }}
                onClick={() => setSelectedSentiment(selectedSentiment === 'bearish' ? 'all' : 'bearish')}
                className="bg-rose-500 hover:bg-rose-400 transition-all"
                title={`Bearish: ${stats.bears} items (${stats.bearPct}%)`}
              />
            </div>
          </div>

          {/* Ratio Tile */}
          <div className="md:col-span-4 flex items-center justify-between sm:justify-end gap-3 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-slate-700/60 text-xs">
            <span className="text-slate-500 dark:text-slate-400">{t('social_velocity', 'Discussion Velocity')}:</span>
            <div className="flex items-center gap-1.5 font-mono font-bold" dir="ltr">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-purple-600 dark:text-purple-400">
                {stats.ratio}x {stats.ratio >= 1.2 ? 'Long Bias' : stats.ratio <= 0.8 ? 'Short Bias' : 'Neutral'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Fast Filter & Engagement Controls */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`w-4 h-4 absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5 text-slate-400`} />
            <input
              type="text"
              id="social-search-input"
              placeholder={t('social_search_placeholder', 'Search discussions, authors, tickers...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRtl ? 'pr-9 pl-8' : 'pl-9 pr-8'} py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`absolute ${isRtl ? 'left-2.5' : 'right-2.5'} top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Channel Dropdown & Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Channel Select */}
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              id="social-platform-select"
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">
                {language === 'fa' ? `همه کانال‌ها (${toPersianDigits(platforms.length)})` : `All Channels (${platforms.length})`}
              </option>
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SocialSortOption)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
            >
              <option value="newest">{language === 'fa' ? 'تازه‌ترین دیدگاه‌ها' : 'Newest First'}</option>
              <option value="score">{language === 'fa' ? 'بیشترین تعامل و امتیاز' : 'Top Engagement'}</option>
              <option value="bullish">{language === 'fa' ? 'بیشترین دیدگاه صعودی' : 'Most Bullish'}</option>
              <option value="bearish">{language === 'fa' ? 'بیشترین دیدگاه نزولی' : 'Most Bearish'}</option>
            </select>

            {/* Verified Desks Only Filter */}
            <button
              onClick={() => setOnlyVerifiedDesks(!onlyVerifiedDesks)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                onlyVerifiedDesks
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-400/50'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t('social_view_desks', 'Verified Desks')}</span>
              {stats.followedCount > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
                  {toPersianDigits(stats.followedCount)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Trending Trader Hashtags */}
        {trendingTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0 font-medium">
              <Flame className="w-3 h-3 text-amber-500" />
              <span>{language === 'fa' ? 'موضوعات داغ:' : 'Trending:'}</span>
            </span>
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
                selectedTag === 'all'
                  ? 'bg-purple-600 text-white font-bold shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {language === 'fa' ? 'همه' : 'All'}
            </button>
            {trendingTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? 'all' : tag)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-purple-600 text-white font-bold shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Social Items Presentation */}
      {filteredAndSortedSocial.length === 0 ? (
        <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-500 dark:text-slate-400 shadow-xs space-y-3">
          <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium">{t('no_social_found', 'No social discussions found matching criteria.')}</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedPlatform('all');
              setSelectedSentiment('all');
              setSelectedTag('all');
              setOnlyVerifiedDesks(false);
            }}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-500 transition-all cursor-pointer inline-block"
          >
            {language === 'fa' ? 'پاک کردن فیلترها' : 'Clear Filters'}
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* ================= ALPHA CARDS GRID ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAndSortedSocial.map((item) => {
            const isBull = item.sentiment === 'bullish' || item.sentiment === 'positive';
            const isBear = item.sentiment === 'bearish' || item.sentiment === 'negative';
            const style = getPlatformStyle(item.platform);

            const hasPersian = !!item.title_fa;
            const isShowingOriginal = showOriginalMap[item.id] || false;
            const displayInPersian = language === 'fa' && hasPersian && !isShowingOriginal;
            const title = displayInPersian ? (item.title_fa || item.title) : item.title;
            const body = displayInPersian ? (item.body_fa || item.body) : item.body;

            const cleanUsername = item.author_username ? item.author_username.replace(/^@+/, '') : 'trader';
            const currentScore = upvotes[item.id] !== undefined ? upvotes[item.id] : item.score ?? 1;

            return (
              <div
                key={item.id}
                id={`social-post-${item.id}`}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500/60 rounded-xl space-y-3 transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  {/* Top Meta: Platform, Author, Desk, Date */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${style.bg} ${style.text} border ${style.border} font-mono`}>
                        {style.label}
                      </span>

                      {item.is_followed_account === 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3 text-emerald-500" />
                          <span>{language === 'fa' ? 'میز رسمی' : 'Desk'}</span>
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        isBull
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                          : isBear
                          ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60'
                          : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60'
                      }`}
                    >
                      {isBull ? <TrendingUp className="w-2.5 h-2.5" /> : isBear ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                      <span>{isBull ? 'BULL' : isBear ? 'BEAR' : 'NEU'}</span>
                    </span>
                  </div>

                  {/* Author Handle & Timestamp */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2 font-mono">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate" dir="ltr">
                      @{cleanUsername}
                    </span>
                    <span className="text-[10px]" dir="ltr">
                      {formatDate(item.created_at)}
                    </span>
                  </div>

                  {/* Post Title */}
                  <h4
                    className={`text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-3 mb-1.5 ${
                      displayInPersian ? 'font-vazir' : 'font-sans'
                    }`}
                    dir={displayInPersian ? 'rtl' : 'ltr'}
                  >
                    {title}
                  </h4>

                  {/* Body excerpt */}
                  {body && (
                    <p
                      className={`text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed ${
                        displayInPersian ? 'font-vazir' : 'font-sans'
                      }`}
                      dir={displayInPersian ? 'rtl' : 'ltr'}
                    >
                      {body}
                    </p>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  {/* Upvote & Copy */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleUpvote(item.id, item.score, e)}
                      className="px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-purple-400 text-slate-700 dark:text-slate-300 font-mono text-[11px] flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      title="Upvote post"
                    >
                      <ThumbsUp className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      <span>{toPersianDigits(currentScore)}</span>
                    </button>

                    <button
                      onClick={(e) => handleCopy(item, e)}
                      className="p-1 rounded text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title={t('social_copy', 'Copy Quote')}
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Language Toggle & External Link */}
                  <div className="flex items-center gap-2">
                    {hasPersian && (
                      <button
                        onClick={(e) => toggleShowOriginal(item.id, e)}
                        className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Languages className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        <span>{displayInPersian ? 'EN' : 'فارسی'}</span>
                      </button>
                    )}

                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 text-xs font-semibold"
                        title={t('view_discussion', 'View discussion')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= HIGH-DENSITY LIVE STREAM ================= */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80">
          <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="w-16">TIME</span>
              <span className="w-24">SOURCE</span>
              <span>COMMUNITY COMMENTARY & SIGNALS</span>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <span>SENTIMENT</span>
              <span>ENGAGEMENT</span>
            </div>
          </div>

          {filteredAndSortedSocial.map((item) => {
            const isBull = item.sentiment === 'bullish' || item.sentiment === 'positive';
            const isBear = item.sentiment === 'bearish' || item.sentiment === 'negative';
            const style = getPlatformStyle(item.platform);

            const hasPersian = !!item.title_fa;
            const isShowingOriginal = showOriginalMap[item.id] || false;
            const displayInPersian = language === 'fa' && hasPersian && !isShowingOriginal;
            const title = displayInPersian ? (item.title_fa || item.title) : item.title;
            const body = displayInPersian ? (item.body_fa || item.body) : item.body;

            const cleanUsername = item.author_username ? item.author_username.replace(/^@+/, '') : 'trader';
            const currentScore = upvotes[item.id] !== undefined ? upvotes[item.id] : item.score ?? 1;

            return (
              <div
                key={item.id}
                id={`social-post-${item.id}`}
                className="p-3.5 sm:px-4 sm:py-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  {/* Timestamp */}
                  <span className="text-[11px] text-slate-400 font-mono w-16 shrink-0 pt-0.5 sm:pt-0" dir="ltr">
                    {formatDate(item.created_at)}
                  </span>

                  {/* Platform & Desk Badge */}
                  <div className="flex items-center gap-1 w-24 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase truncate ${style.bg} ${style.text} border ${style.border} font-mono w-full text-center`}>
                      {style.label}
                    </span>
                  </div>

                  {/* Content & Author */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono flex items-center gap-0.5" dir="ltr">
                        <span>@{cleanUsername}</span>
                      </span>
                      {item.is_followed_account === 1 && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          {language === 'fa' ? 'میز معاملاتی' : 'Desk'}
                        </span>
                      )}
                    </div>

                    <h4
                      className={`text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 ${
                        displayInPersian ? 'font-vazir' : 'font-sans'
                      }`}
                      dir={displayInPersian ? 'rtl' : 'ltr'}
                    >
                      {title}
                    </h4>

                    {body && (
                      <p
                        className={`text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 ${
                          displayInPersian ? 'font-vazir' : 'font-sans'
                        }`}
                        dir={displayInPersian ? 'rtl' : 'ltr'}
                      >
                        {body}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right controls: Sentiment Badge, Upvote, Share */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                  {/* Sentiment Pill */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono tracking-wider flex items-center gap-1 ${
                      isBull
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                        : isBear
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                        : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                    }`}
                  >
                    {isBull ? <TrendingUp className="w-2.5 h-2.5" /> : isBear ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                    <span>{isBull ? 'BULL' : isBear ? 'BEAR' : 'NEU'}</span>
                  </span>

                  {/* Upvote Button */}
                  <button
                    onClick={(e) => handleUpvote(item.id, item.score, e)}
                    className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-purple-400 text-slate-700 dark:text-slate-300 font-mono text-[11px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                    title="Upvote post"
                  >
                    <ThumbsUp className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    <span>{toPersianDigits(currentScore)}</span>
                  </button>

                  {/* Language switch */}
                  {hasPersian && (
                    <button
                      onClick={(e) => toggleShowOriginal(item.id, e)}
                      className="p-1 rounded text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title={displayInPersian ? 'View English Original' : 'مشاهده ترجمه فارسی'}
                    >
                      <Languages className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Copy quote */}
                  <button
                    onClick={(e) => handleCopy(item, e)}
                    className="p-1 rounded text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={t('social_copy', 'Copy Quote')}
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {/* Source Link */}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={t('view_discussion', 'View discussion')}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
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
