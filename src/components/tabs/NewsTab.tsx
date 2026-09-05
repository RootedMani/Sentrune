import React, { useState, useMemo, useEffect } from 'react';
import { NewsItem } from '../../types';
import {
  Newspaper,
  ExternalLink,
  Calendar,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Sparkles,
  Languages,
  Bookmark,
  BookmarkCheck,
  Share2,
  Copy,
  Check,
  Clock,
  Flame,
  LayoutGrid,
  List,
  Columns2,
  X,
  ChevronRight,
  ArrowUpRight,
  SlidersHorizontal,
  Info,
  Radio,
  Tag,
  Eye,
  CheckCircle2,
  Zap,
  BookOpen,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const ASSET_KEYWORDS_MAP: Record<string, string[]> = {
  AAPL: ['apple', 'aapl', 'iphone', 'ipad', 'mac', 'macbook', 'tim cook', 'ios', 'app store', 'vision pro', 'cupertino'],
  MSFT: ['microsoft', 'msft', 'azure', 'satya nadella', 'windows', 'copilot', 'xbox', 'surface', 'redmond'],
  BTC: ['bitcoin', 'btc', 'satoshi', 'crypto', 'cryptocurrency', 'halving', 'lightning network'],
  ETH: ['ethereum', 'eth', 'vitalik', 'ether', 'layer-2', 'erc-20', 'defi', 'smart contracts'],
};

interface NewsTabProps {
  news: NewsItem[];
  symbol: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

type ViewMode = 'wire' | 'grid' | 'split';
type SentimentFilter = 'all' | 'positive' | 'neutral' | 'negative';
type TimeFilter = 'all' | '24h' | '3d' | '7d';
type SortOption = 'latest' | 'bullish' | 'bearish' | 'impact';

// Helper to deduce topic category from headline keywords
function detectTopicCategory(headline: string): string {
  const h = headline.toLowerCase();
  if (h.includes('earning') || h.includes('revenue') || h.includes('q1') || h.includes('q2') || h.includes('q3') || h.includes('q4') || h.includes('eps') || h.includes('profit')) {
    return 'Earnings & Financials';
  }
  if (h.includes('fed') || h.includes('rate') || h.includes('inflation') || h.includes('cpi') || h.includes('treasury') || h.includes('macro') || h.includes('gdp')) {
    return 'Macro & Central Banks';
  }
  if (h.includes('upgrade') || h.includes('downgrade') || h.includes('price target') || h.includes('analyst') || h.includes('rating') || h.includes('outperform')) {
    return 'Analyst Research';
  }
  if (h.includes('crypto') || h.includes('bitcoin') || h.includes('btc') || h.includes('eth') || h.includes('solana') || h.includes('token') || h.includes('sec')) {
    return 'Digital Assets & SEC';
  }
  if (h.includes('ai') || h.includes('chip') || h.includes('nvidia') || h.includes('cloud') || h.includes('launch') || h.includes('apple intelligence')) {
    return 'AI & Technology';
  }
  if (h.includes('deal') || h.includes('acquisition') || h.includes('merger') || h.includes('partner') || h.includes('buyout')) {
    return 'M&A & Strategy';
  }
  return 'Market Wire';
}

function cleanDisplayContent(
  headline: string,
  body?: string,
  isFa: boolean = false,
  aiSummary?: string
): string | null {
  if (aiSummary && aiSummary.trim().length > 10) {
    return aiSummary;
  }
  if (!body) return null;
  if (
    body.includes('&lt;a') ||
    body.includes('<a') ||
    body.includes('news.google.com') ||
    body.includes('href=') ||
    body.includes('CBMi') ||
    body.startsWith('http')
  ) {
    const stripped = body
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/<[^>]*>/g, ' ')
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (stripped.length > 30 && !stripped.includes('news.google.com')) {
      return stripped;
    }

    const h = headline.toLowerCase();
    if (isFa) {
      if (h.includes('etf') || h.includes('sec')) {
        return 'تحلیل جامع جریان ورودی سرمایه و تحولات نظارتی پیرامون صندوق‌های قابل‌معامله ETF.';
      }
      if (h.includes('fed') || h.includes('rate') || h.includes('inflation')) {
        return 'بررسی پیامدهای سیاست‌های پولی فدرال رزرو بر نقدینگی و تمایلات ریسک‌پذیری در بازار.';
      }
      if (h.includes('ai') || h.includes('chip') || h.includes('cloud')) {
        return 'گزارش پیشرفت‌های تکنولوژیک، تقاضای زیرساخت‌های محاسباتی هوش مصنوعی و چشم‌انداز درآمدی.';
      }
      return 'تحلیل و سنتز رویدادهای مؤثر بر ساختار نقدینگی، قیمت و تمایلات معامله‌گران.';
    }

    if (h.includes('etf') || h.includes('sec')) {
      return 'Institutional analysis covering ETF asset flows, custody structures, and regulatory approvals impacting market depth.';
    }
    if (h.includes('fed') || h.includes('rate') || h.includes('inflation')) {
      return 'Macro monetary assessment dissecting policy trajectory, rate expectations, and liquidity shifts across risk assets.';
    }
    if (h.includes('ai') || h.includes('chip') || h.includes('cloud')) {
      return 'Enterprise technology coverage evaluating compute demand, revenue trajectory, and multi-year AI capital expenditures.';
    }
    return 'Detailed market intelligence synthesizing order-flow momentum, valuation metrics, and institutional positioning.';
  }
  return body;
}

interface AiEngagementHookCardProps {
  article: NewsItem;
  symbol: string;
  languageMode: 'en' | 'fa' | 'bilingual';
  isGenerating: boolean;
  onRegenerate: () => void;
  language: 'en' | 'fa';
  t: (key: string, fallback?: string) => string;
}

const AiEngagementHookCard: React.FC<AiEngagementHookCardProps> = ({
  article,
  symbol,
  languageMode,
  isGenerating,
  onRegenerate,
  language,
  t,
}) => {
  const [copied, setCopied] = useState(false);

  const hookEn =
    article.hook_ai ||
    `Why ${symbol} traders are watching: Key catalysts developing around ${article.headline.slice(0, 80)}.`;
  const hookFa =
    article.hook_ai_fa ||
    `چرا معامله‌گران ${symbol} این رویداد را رصد می‌کنند: سیگنال‌های کلیدی مرتبط با ${article.headline.slice(0, 80)}.`;

  const summaryEn =
    article.summary_ai ||
    article.body ||
    `Market intelligence update analyzing ${symbol} momentum, catalyst impact, and sentiment dynamics.`;
  const summaryFa =
    article.summary_ai_fa ||
    article.body_fa ||
    `تحلیل تحولات اخیر بازار پیرامون نماد ${symbol} و بازتاب رویداد در جهت‌گیری قیمت و تمایلات فعالان بازار.`;

  const takeawaysEn = article.key_takeaways && article.key_takeaways.length > 0 ? article.key_takeaways : null;
  const takeawaysFa =
    article.key_takeaways_fa && article.key_takeaways_fa.length > 0 ? article.key_takeaways_fa : null;

  const handleCopyText = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `⚡ ${language === 'fa' ? hookFa : hookEn}\n\n📋 ${
      language === 'fa' ? summaryFa : summaryEn
    }\n\n🔗 ${article.url || ''}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-300/80 dark:border-amber-500/30 bg-gradient-to-br from-amber-50/70 via-white to-cyan-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-4 sm:p-5 shadow-xs transition-all space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-amber-200/60 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Zap className="w-4 h-4 fill-amber-500/30" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>{language === 'fa' ? 'هوک هوش مصنوعی و سنتز رویداد' : 'AI Market Hook & Executive Synthesis'}</span>
              </span>
              {article.alpaca_coverage ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800/60 font-mono">
                  Alpaca Benzinga Feed
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 font-mono">
                  Gemini Flash 2.5
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {language === 'fa'
                ? 'تحلیل عمیق رویداد برای ترغیب مطالعه و ارزیابی تأثیر آنی بر استراتژی معامله‌گر'
                : 'Hooking traders into critical story catalysts & institutional ramifications'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyText}
            className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 text-xs transition-colors cursor-pointer"
            title={language === 'fa' ? 'کپی هوک و چکیده' : 'Copy Hook & Summary'}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            className="px-2.5 py-1.5 rounded-lg bg-white/90 dark:bg-slate-800 border border-amber-300 dark:border-slate-700 hover:border-amber-400 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-amber-500' : ''}`} />
            <span className="hidden sm:inline">
              {isGenerating
                ? (language === 'fa' ? 'در حال تولید...' : 'Synthesizing...')
                : (language === 'fa' ? 'تولید مجدد هوک' : 'Regenerate Hook')}
            </span>
          </button>
        </div>
      </div>

      {/* 1. The Engagement Hook (Why Click & Read) */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>{language === 'fa' ? 'هوک کلیدی رویداد (چرا باید این مقاله را بخوانید):' : 'The Hook — Why Traders Are Clicking:'}</span>
        </div>

        {languageMode === 'bilingual' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border-l-4 border-amber-500 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-semibold leading-snug font-sans">
              "{hookEn}"
            </div>
            <div
              className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border-r-4 border-amber-500 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-semibold leading-relaxed font-vazir text-right"
              dir="rtl"
            >
              «{hookFa}»
            </div>
          </div>
        ) : languageMode === 'fa' ? (
          <div
            className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border-r-4 border-amber-500 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-semibold leading-relaxed font-vazir text-right"
            dir="rtl"
          >
            «{hookFa}»
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border-l-4 border-amber-500 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-semibold leading-snug font-sans">
            "{hookEn}"
          </div>
        )}
      </div>

      {/* 2. Executive 2-Line Summary */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          <span>{language === 'fa' ? 'چکیده ۲ خطی رویداد و تأثیر بر بازار:' : '2-Line Market Impact Summary:'}</span>
        </div>

        {languageMode === 'bilingual' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
              {summaryEn}
            </div>
            <div
              className="p-3 rounded-lg bg-cyan-50/40 dark:bg-cyan-950/20 border border-cyan-200/60 dark:border-cyan-800/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-vazir text-right"
              dir="rtl"
            >
              {summaryFa}
            </div>
          </div>
        ) : languageMode === 'fa' ? (
          <div
            className="p-3 rounded-lg bg-cyan-50/40 dark:bg-cyan-950/20 border border-cyan-200/60 dark:border-cyan-800/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-vazir text-right"
            dir="rtl"
          >
            {summaryFa}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
            {summaryEn}
          </div>
        )}
      </div>

      {/* 3. Key Takeaways */}
      {((languageMode === 'fa' ? takeawaysFa : takeawaysEn) ||
        (languageMode === 'bilingual' && (takeawaysEn || takeawaysFa))) && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {language === 'fa' ? 'نکات کلیدی برای تصمیم‌گیری معامله‌گر:' : 'Key Decision Points for Traders:'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(languageMode === 'fa' ? takeawaysFa || takeawaysEn : takeawaysEn || takeawaysFa)?.map(
              (point, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/40 text-xs text-slate-700 dark:text-slate-300"
                  dir={languageMode === 'fa' ? 'rtl' : 'ltr'}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{point}</span>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* 4. Click & Read Full Post Hook CTA Button */}
      {article.url && (
        <div className="pt-2">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer group"
          >
            <BookOpen className="w-4 h-4" />
            <span>
              {language === 'fa'
                ? `ادامه مطالعه و جزئیات کامل گزارش در ${article.source_name || 'منبع اصلی'}`
                : `Read Full Post & In-Depth Analysis on ${article.source_name || 'Publisher'}`}
            </span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      )}
    </div>
  );
};

export const NewsTab: React.FC<NewsTabProps> = ({ news, symbol, onRefresh, isRefreshing }) => {
  const { isDark } = useTheme();
  const { t, language, isRtl, formatNumber, toPersianDigits, formatDate } = useLanguage();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('sentrune_news_view_mode') as ViewMode) || 'wire';
    }
    return 'wire';
  });

  // Selected article for Split Reader or Detail Modal
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState<SentimentFilter>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedTime, setSelectedTime] = useState<TimeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [onlySaved, setOnlySaved] = useState<boolean>(false);
  const [strictAssetOnly, setStrictAssetOnly] = useState<boolean>(true);

  // Split Reader & Modal language display mode: 'en' | 'fa' | 'bilingual'
  const [readerLanguageMode, setReaderLanguageMode] = useState<'en' | 'fa' | 'bilingual'>(() => {
    return language === 'fa' ? 'fa' : 'en';
  });

  // Sync reader language default with global language
  useEffect(() => {
    setReaderLanguageMode(language === 'fa' ? 'fa' : 'en');
  }, [language]);

  // Bookmarking state (persisted in localStorage)
  const [savedIds, setSavedIds] = useState<Set<number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sentrune_saved_news');
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  // Toast feedback
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Per-article language toggles
  const [itemLanguageOverrides, setItemLanguageOverrides] = useState<Record<number, 'en' | 'fa'>>({});

  // AI Hook & Summary enrichment state
  const [generatingAiIds, setGeneratingAiIds] = useState<Set<number>>(new Set());
  const [localAiEnrichments, setLocalAiEnrichments] = useState<Record<number, Partial<NewsItem>>>({});

  const handleGenerateAiHook = async (item: NewsItem) => {
    if (!item) return;
    setGeneratingAiIds((prev) => new Set(prev).add(item.id));
    try {
      const res = await fetch('/api/news/ai-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          headline: item.headline,
          body: item.body,
          source_name: item.source_name,
          symbol,
          url: item.url,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLocalAiEnrichments((prev) => ({
          ...prev,
          [item.id]: {
            summary_ai: data.summary,
            hook_ai: data.hook,
            summary_ai_fa: data.summary_fa,
            hook_ai_fa: data.hook_fa,
            key_takeaways: data.key_takeaways,
            key_takeaways_fa: data.key_takeaways_fa,
          },
        }));
      }
    } catch (err) {
      console.error('Error generating AI hook & summary:', err);
    } finally {
      setGeneratingAiIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sentrune_news_view_mode', viewMode);
    }
  }, [viewMode]);

  const toggleBookmark = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem('sentrune_saved_news', JSON.stringify(Array.from(next)));
      } catch (err) {
        console.error('Failed to save bookmark:', err);
      }
      return next;
    });
  };

  const toggleItemLanguage = (id: number, currentLang: 'en' | 'fa', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setItemLanguageOverrides((prev) => ({
      ...prev,
      [id]: currentLang === 'fa' ? 'en' : 'fa',
    }));
  };

  const handleCopy = (item: NewsItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const textToCopy = `${item.headline}\n${item.url || ''}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Distinct sources list
  const sources = useMemo(() => {
    const s = Array.from(new Set(news.map((n) => n.source_name || 'Market Wire'))).filter(Boolean);
    return s.sort();
  }, [news]);

  // Distinct topic categories
  const topicCategories = useMemo(() => {
    const set = new Set<string>();
    news.forEach((item) => {
      set.add(detectTopicCategory(item.headline));
    });
    return Array.from(set).sort();
  }, [news]);

  // Calculate sentiment statistics across all news
  const sentimentStats = useMemo(() => {
    if (news.length === 0) {
      return { positive: 0, neutral: 0, negative: 0, posPct: 0, neuPct: 0, negPct: 0, avgScore: 0 };
    }
    let pos = 0;
    let neu = 0;
    let neg = 0;
    let totalScore = 0;

    news.forEach((item) => {
      const sent = (item.sentiment || 'neutral').toLowerCase();
      if (sent === 'positive' || sent === 'bullish') pos++;
      else if (sent === 'negative' || sent === 'bearish') neg++;
      else neu++;

      totalScore += item.raw_sentiment ?? 0;
    });

    const total = news.length;
    return {
      positive: pos,
      neutral: neu,
      negative: neg,
      posPct: Math.round((pos / total) * 100),
      neuPct: Math.round((neu / total) * 100),
      negPct: Math.round((neg / total) * 100),
      avgScore: Number((totalScore / total).toFixed(2)),
    };
  }, [news]);

  // Filter and sort news
  const filteredAndSortedNews = useMemo(() => {
    const now = Date.now();
    const result = news.filter((item) => {
      // Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === '' ||
        item.headline.toLowerCase().includes(searchLower) ||
        (item.headline_fa && item.headline_fa.toLowerCase().includes(searchLower)) ||
        (item.body && item.body.toLowerCase().includes(searchLower)) ||
        (item.body_fa && item.body_fa.toLowerCase().includes(searchLower)) ||
        (item.source_name && item.source_name.toLowerCase().includes(searchLower));

      // Sentiment
      const itemSent = (item.sentiment || 'neutral').toLowerCase();
      const matchesSentiment =
        selectedSentiment === 'all' ||
        (selectedSentiment === 'positive' && (itemSent === 'positive' || itemSent === 'bullish')) ||
        (selectedSentiment === 'negative' && (itemSent === 'negative' || itemSent === 'bearish')) ||
        (selectedSentiment === 'neutral' && itemSent === 'neutral');

      // Source
      const matchesSource =
        selectedSource === 'all' || (item.source_name || '').toLowerCase() === selectedSource.toLowerCase();

      // Topic
      const itemTopic = detectTopicCategory(item.headline);
      const matchesTopic = selectedTopic === 'all' || itemTopic === selectedTopic;

      // Saved only
      const matchesSaved = !onlySaved || savedIds.has(item.id);

      // Time
      let matchesTime = true;
      if (selectedTime !== 'all') {
        const itemTime = new Date(item.published_at).getTime();
        const diffHours = (now - itemTime) / (1000 * 60 * 60);
        if (selectedTime === '24h') matchesTime = diffHours <= 24;
        else if (selectedTime === '3d') matchesTime = diffHours <= 72;
        else if (selectedTime === '7d') matchesTime = diffHours <= 168;
      }

      // Strict Asset Relevance Filtering
      let matchesAsset = true;
      if (strictAssetOnly && symbol) {
        const sym = symbol.toUpperCase();
        const keywords = ASSET_KEYWORDS_MAP[sym] || [symbol.toLowerCase()];
        const fullText = (item.headline + ' ' + (item.body || '')).toLowerCase();
        const mentionsCurrent = keywords.some((k) => fullText.includes(k.toLowerCase()));

        if (sym === 'AAPL' || sym === 'MSFT') {
          // Reject pure crypto news (e.g. Injective, CoinTelegraph mortgage tokens) from stock feeds
          const isPureCrypto =
            (fullText.includes('crypto') ||
              fullText.includes('bitcoin') ||
              fullText.includes('injective') ||
              fullText.includes('ethereum') ||
              fullText.includes('blockchain') ||
              fullText.includes('doge')) &&
            !mentionsCurrent;
          if (isPureCrypto) matchesAsset = false;
          else if (!mentionsCurrent && (fullText.includes('injective') || fullText.includes('pineapple financial'))) {
            matchesAsset = false;
          }
        } else if (sym === 'BTC' || sym === 'ETH') {
          // Reject pure stock earnings from crypto feeds
          const isPureStock = (fullText.includes('apple') || fullText.includes('microsoft') || fullText.includes('tim cook')) && !mentionsCurrent;
          if (isPureStock) matchesAsset = false;
        }
      }

      return matchesSearch && matchesSentiment && matchesSource && matchesTopic && matchesSaved && matchesTime && matchesAsset;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      }
      if (sortBy === 'bullish') {
        return (b.raw_sentiment ?? 0) - (a.raw_sentiment ?? 0);
      }
      if (sortBy === 'bearish') {
        return (a.raw_sentiment ?? 0) - (b.raw_sentiment ?? 0);
      }
      if (sortBy === 'impact') {
        const impactA = Math.abs(a.raw_sentiment ?? 0);
        const impactB = Math.abs(b.raw_sentiment ?? 0);
        return impactB - impactA;
      }
      return 0;
    });
  }, [news, searchTerm, selectedSentiment, selectedSource, selectedTopic, selectedTime, sortBy, onlySaved, savedIds, strictAssetOnly, symbol]);

  // Set default selected article for Split Reader
  useEffect(() => {
    if (filteredAndSortedNews.length > 0) {
      if (!selectedArticleId || !filteredAndSortedNews.some((n) => n.id === selectedArticleId)) {
        setSelectedArticleId(filteredAndSortedNews[0].id);
      }
    } else {
      setSelectedArticleId(null);
    }
  }, [filteredAndSortedNews, selectedArticleId]);

  const activeArticle = useMemo(() => {
    if (!selectedArticleId) return null;
    const base = news.find((n) => n.id === selectedArticleId) || null;
    if (!base) return null;
    const enrichment = localAiEnrichments[base.id];
    return enrichment ? { ...base, ...enrichment } : base;
  }, [news, selectedArticleId, localAiEnrichments]);

  const handleArticleClick = (item: NewsItem) => {
    setSelectedArticleId(item.id);
    if (viewMode !== 'split') {
      setIsModalOpen(true);
    }
  };

  return (
    <div id="news-tab-content" className="space-y-4 select-none">
      {/* 1. Institutional Intelligence Header & Pulse Bar */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Live Status */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/60 flex items-center justify-center shrink-0">
                <Newspaper className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{language === 'fa' ? `ترمینال فید زنده اخبار و تحلیل‌ها` : `Financial News Wire & Intelligence`}</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 font-bold" dir="ltr">
                    {symbol}
                  </span>
                </h3>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-full flex items-center gap-1 shrink-0 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{language === 'fa' ? 'فید زنده' : 'STREAM ACTIVE'}</span>
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono" dir="ltr">
                {language === 'fa' ? `${toPersianDigits(filteredAndSortedNews.length)} از ${toPersianDigits(news.length)} مقاله` : `${filteredAndSortedNews.length} of ${news.length} articles`}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              {language === 'fa'
                ? 'فید لحظه‌ای خبرگزاری‌های معتبر مالی (Yahoo Finance, Google News, CoinDesk) مجهز به امتیازدهی زبانی FinBERT و ترجمه هوشمند.'
                : 'Real-time financial wire aggregated from Yahoo Finance, Google News, and CoinDesk with FinBERT sentiment scoring and dual-language translation.'}
            </p>
          </div>

          {/* Quick Stats & View Switcher */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs">
              <button
                onClick={() => setViewMode('wire')}
                id="news-view-wire-btn"
                title={t('news_view_wire', 'Wire Feed (Compact)')}
                className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  viewMode === 'wire'
                    ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('news_view_wire', 'Wire')}</span>
              </button>

              <button
                onClick={() => setViewMode('grid')}
                id="news-view-grid-btn"
                title={t('news_view_grid', 'Card Grid')}
                className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('news_view_grid', 'Grid')}</span>
              </button>

              <button
                onClick={() => setViewMode('split')}
                id="news-view-split-btn"
                title={t('news_view_split', 'Split Reader')}
                className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('news_view_split', 'Split')}</span>
              </button>
            </div>

            {/* Refresh Action */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                id="refresh-news-tab-btn"
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>
                  {isRefreshing
                    ? (language === 'fa' ? 'در حال دریافت...' : 'Scraping...')
                    : (language === 'fa' ? 'به‌روزرسانی فید' : 'Refresh Feeds')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Sentiment Distribution Bar & Quick Metrics */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Interactive Sentiment Meter Bar */}
          <div className="md:col-span-8 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>{t('news_sentiment_distribution', 'Sentiment Breakdown')}</span>
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedSentiment(selectedSentiment === 'positive' ? 'all' : 'positive')}
                  className={`text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer ${
                    selectedSentiment === 'positive' ? 'underline ring-1 ring-emerald-500 rounded px-1' : ''
                  }`}
                >
                  {language === 'fa' ? `${toPersianDigits(sentimentStats.posPct)}٪ صعودی` : `${sentimentStats.posPct}% Bullish`}
                </button>
                <button
                  onClick={() => setSelectedSentiment(selectedSentiment === 'neutral' ? 'all' : 'neutral')}
                  className={`text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer ${
                    selectedSentiment === 'neutral' ? 'underline ring-1 ring-blue-500 rounded px-1' : ''
                  }`}
                >
                  {language === 'fa' ? `${toPersianDigits(sentimentStats.neuPct)}٪ خنثی` : `${sentimentStats.neuPct}% Neutral`}
                </button>
                <button
                  onClick={() => setSelectedSentiment(selectedSentiment === 'negative' ? 'all' : 'negative')}
                  className={`text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer ${
                    selectedSentiment === 'negative' ? 'underline ring-1 ring-rose-500 rounded px-1' : ''
                  }`}
                >
                  {language === 'fa' ? `${toPersianDigits(sentimentStats.negPct)}٪ نزولی` : `${sentimentStats.negPct}% Bearish`}
                </button>
              </div>
            </div>

            {/* Segmented Bar */}
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex cursor-pointer">
              <div
                style={{ width: `${sentimentStats.posPct}%` }}
                onClick={() => setSelectedSentiment(selectedSentiment === 'positive' ? 'all' : 'positive')}
                className="bg-emerald-500 hover:bg-emerald-400 transition-all"
                title={`Bullish: ${sentimentStats.positive} items (${sentimentStats.posPct}%)`}
              />
              <div
                style={{ width: `${sentimentStats.neuPct}%` }}
                onClick={() => setSelectedSentiment(selectedSentiment === 'neutral' ? 'all' : 'neutral')}
                className="bg-blue-500 hover:bg-blue-400 transition-all"
                title={`Neutral: ${sentimentStats.neutral} items (${sentimentStats.neuPct}%)`}
              />
              <div
                style={{ width: `${sentimentStats.negPct}%` }}
                onClick={() => setSelectedSentiment(selectedSentiment === 'negative' ? 'all' : 'negative')}
                className="bg-rose-500 hover:bg-rose-400 transition-all"
                title={`Bearish: ${sentimentStats.negative} items (${sentimentStats.negPct}%)`}
              />
            </div>
          </div>

          {/* Average Sentiment Score Tile */}
          <div className="md:col-span-4 flex items-center justify-between sm:justify-end gap-3 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-slate-700/60 text-xs">
            <span className="text-slate-500 dark:text-slate-400">{t('news_avg_sentiment', 'Avg FinBERT Polarity')}:</span>
            <div className="flex items-center gap-1 font-mono font-bold" dir="ltr">
              {sentimentStats.avgScore > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : sentimentStats.avgScore < 0 ? (
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              ) : null}
              <span
                className={
                  sentimentStats.avgScore > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : sentimentStats.avgScore < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-600 dark:text-slate-300'
                }
              >
                {sentimentStats.avgScore > 0 ? '+' : ''}
                {sentimentStats.avgScore.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-normal">
                ({sentimentStats.avgScore > 0.15 ? 'Bull' : sentimentStats.avgScore < -0.15 ? 'Bear' : 'Neutral'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. High-Speed Filter & Control Bar */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`w-4 h-4 absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5 text-slate-400`} />
            <input
              type="text"
              id="news-search-input"
              placeholder={t('news_search_placeholder', 'Search headlines, keywords, or topics...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRtl ? 'pr-9 pl-8' : 'pl-9 pr-8'} py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500`}
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

          {/* Controls: Source, Sort, Horizon, Bookmarks */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Source Dropdown */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="all">
                {language === 'fa' ? `همه منابع (${toPersianDigits(sources.length)})` : `All Sources (${sources.length})`}
              </option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="latest">{t('news_sort_latest', 'Latest First')}</option>
              <option value="impact">{t('news_sort_impact', 'Highest Market Impact')}</option>
              <option value="bullish">{t('news_sort_bullish', 'Most Bullish')}</option>
              <option value="bearish">{t('news_sort_bearish', 'Most Bearish')}</option>
            </select>

            {/* Time Horizon */}
            <div className="flex bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/70 text-xs">
              {(['all', '24h', '3d', '7d'] as TimeFilter[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setSelectedTime(tf)}
                  className={`px-2 py-1 rounded-md text-[11px] font-mono font-medium transition-all cursor-pointer ${
                    selectedTime === tf
                      ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 font-bold shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tf === 'all' ? (language === 'fa' ? 'همه' : 'All') : tf}
                </button>
              ))}
            </div>

            {/* Saved Filter Button */}
            <button
              onClick={() => setOnlySaved(!onlySaved)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                onlySaved
                  ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 ring-1 ring-amber-400/50'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={t('news_saved', 'Bookmarks')}
            >
              <Bookmark className={`w-3.5 h-3.5 ${onlySaved ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span className="hidden sm:inline">{t('news_saved', 'Saved')}</span>
              {savedIds.size > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
                  {toPersianDigits(savedIds.size)}
                </span>
              )}
            </button>

            {/* Strict Asset Toggle */}
            <button
              onClick={() => setStrictAssetOnly(!strictAssetOnly)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                strictAssetOnly
                  ? 'bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800 ring-1 ring-cyan-400/40'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={strictAssetOnly ? `Filtered strictly for ${symbol}` : 'Showing all market news'}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${strictAssetOnly ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
              <span>{language === 'fa' ? `اخبار اختصاصی ${symbol}` : `${symbol} Focus`}</span>
            </button>
          </div>
        </div>

        {/* Quick Topic Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0 font-medium">
            <Tag className="w-3 h-3" />
            <span>{language === 'fa' ? 'موضوعات:' : 'Themes:'}</span>
          </span>
          <button
            onClick={() => setSelectedTopic('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
              selectedTopic === 'all'
                ? 'bg-cyan-600 text-white font-bold shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {language === 'fa' ? 'همه موضوعات' : 'All Themes'}
          </button>
          {topicCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedTopic(selectedTopic === cat ? 'all' : cat)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
                selectedTopic === cat
                  ? 'bg-cyan-600 text-white font-bold shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. News Presentation (Wire / Grid / Split) */}
      {filteredAndSortedNews.length === 0 ? (
        <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-500 dark:text-slate-400 shadow-xs space-y-3">
          <Newspaper className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium">{t('no_news_found', 'No news matching your filter criteria.')}</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedSentiment('all');
              setSelectedSource('all');
              setSelectedTopic('all');
              setSelectedTime('all');
              setOnlySaved(false);
            }}
            className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-semibold hover:bg-cyan-500 transition-all cursor-pointer inline-block"
          >
            {language === 'fa' ? 'پاک کردن فیلترها' : 'Clear All Filters'}
          </button>
        </div>
      ) : viewMode === 'split' ? (
        /* ================= SPLIT READER MODE ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Compact Wire List */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex flex-col max-h-[750px]">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>{language === 'fa' ? 'فهرست مقالات' : 'HEADLINE STREAM'}</span>
              <span>{toPersianDigits(filteredAndSortedNews.length)} items</span>
            </div>
            <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-1">
              {filteredAndSortedNews.map((item) => {
                const isSelected = item.id === selectedArticleId;
                const isPos = item.sentiment === 'positive' || item.sentiment === 'bullish';
                const isNeg = item.sentiment === 'negative' || item.sentiment === 'bearish';
                const isSaved = savedIds.has(item.id);
                const itemLang = itemLanguageOverrides[item.id] || language;
                const headline = itemLang === 'fa' && item.headline_fa ? item.headline_fa : item.headline;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedArticleId(item.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-800 text-cyan-950 dark:text-cyan-100 shadow-2xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] mb-1">
                      <span className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {item.source_name || 'Wire'}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono">
                        {item.alpaca_coverage && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800/60 font-mono">
                            Alpaca
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold ${
                            isPos
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                              : isNeg
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400'
                              : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400'
                          }`}
                          dir="ltr"
                        >
                          {item.raw_sentiment && item.raw_sentiment > 0 ? '+' : ''}
                          {(item.raw_sentiment ?? 0).toFixed(2)}
                        </span>
                        <span className="text-slate-400">{formatDate(item.published_at)}</span>
                      </div>
                    </div>
                    <h5
                      className={`text-xs font-semibold leading-snug line-clamp-2 ${
                        itemLang === 'fa' ? 'font-vazir' : 'font-sans'
                      }`}
                      dir={itemLang === 'fa' ? 'rtl' : 'ltr'}
                    >
                      {headline}
                    </h5>
                    {(item.hook_ai || item.hook_ai_fa) && (
                      <p
                        className={`text-[10px] text-amber-600 dark:text-amber-400 font-medium line-clamp-1 flex items-center gap-1 mt-1 ${
                          itemLang === 'fa' ? 'font-vazir' : 'font-sans'
                        }`}
                        dir={itemLang === 'fa' ? 'rtl' : 'ltr'}
                      >
                        <Flame className="w-2.5 h-2.5 shrink-0 text-amber-500" />
                        <span>{itemLang === 'fa' && item.hook_ai_fa ? item.hook_ai_fa : item.hook_ai}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Full Reader Pane */}
          <div className="lg:col-span-7 sticky top-24">
            {activeArticle ? (
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
                {/* Meta Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                      {activeArticle.source_name || 'Market Wire'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1" dir="ltr">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(activeArticle.published_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                      {detectTopicCategory(activeArticle.headline)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Language Switcher: EN / فارسی / Dual */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                      <button
                        onClick={() => setReaderLanguageMode('en')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                          readerLanguageMode === 'en'
                            ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                        title="English"
                      >
                        EN
                      </button>
                      <button
                        onClick={() => setReaderLanguageMode('fa')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all font-vazir cursor-pointer ${
                          readerLanguageMode === 'fa'
                            ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                        title="فارسی"
                      >
                        فارسی
                      </button>
                      <button
                        onClick={() => setReaderLanguageMode('bilingual')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                          readerLanguageMode === 'bilingual'
                            ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                        title="Bilingual / دوزبانه"
                      >
                        {language === 'fa' ? 'دوزبانه' : 'Dual'}
                      </button>
                    </div>

                    {/* Bookmark Toggle */}
                    <button
                      onClick={(e) => toggleBookmark(activeArticle.id, e)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        savedIds.has(activeArticle.id)
                          ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-600 border-amber-300 dark:border-amber-800'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-600 dark:hover:text-slate-200'
                      }`}
                      title={savedIds.has(activeArticle.id) ? t('news_remove_saved', 'Remove bookmark') : t('news_save_article', 'Bookmark')}
                    >
                      <Bookmark className={`w-4 h-4 ${savedIds.has(activeArticle.id) ? 'fill-amber-500' : ''}`} />
                    </button>

                    {/* Copy Link */}
                    <button
                      onClick={(e) => handleCopy(activeArticle, e)}
                      className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                      title={t('social_copy', 'Copy Quote')}
                    >
                      {copiedId === activeArticle.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sentiment & NLP Score Box */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        FinBERT NLP Assessment
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {activeArticle.sentiment === 'positive' || activeArticle.sentiment === 'bullish'
                          ? t('sentiment_bullish', 'Bullish Signal')
                          : activeArticle.sentiment === 'negative' || activeArticle.sentiment === 'bearish'
                          ? t('sentiment_bearish', 'Bearish Signal')
                          : t('sentiment_neutral', 'Neutral Signal')}
                      </div>
                    </div>
                  </div>

                  <div className="text-right" dir="ltr">
                    <span className="text-sm font-bold font-mono text-cyan-600 dark:text-cyan-400">
                      {formatNumber(activeArticle.raw_sentiment || 0, { decimals: 3, showSign: true })}
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono">Raw Polarity</div>
                  </div>
                </div>

                {/* AI Market Hook & Executive Summary Section */}
                <AiEngagementHookCard
                  article={activeArticle}
                  symbol={symbol}
                  languageMode={readerLanguageMode}
                  isGenerating={generatingAiIds.has(activeArticle.id)}
                  onRegenerate={() => handleGenerateAiHook(activeArticle)}
                  language={language}
                  t={t}
                />

                {/* Article Content based on readerLanguageMode */}
                {(() => {
                  const cleanEn = cleanDisplayContent(
                    activeArticle.headline,
                    activeArticle.body,
                    false,
                    activeArticle.summary_ai
                  );
                  const cleanFa = cleanDisplayContent(
                    activeArticle.headline_fa || activeArticle.headline,
                    activeArticle.body_fa || activeArticle.body,
                    true,
                    activeArticle.summary_ai_fa
                  );

                  if (readerLanguageMode === 'bilingual') {
                    return (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">English (Original)</div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug font-sans">
                            {activeArticle.headline}
                          </h4>
                          {cleanEn && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                              {cleanEn}
                            </p>
                          )}
                        </div>

                        <div className="p-4 rounded-xl bg-cyan-50/40 dark:bg-cyan-950/20 border border-cyan-200/70 dark:border-cyan-800/40 space-y-2 text-right font-vazir" dir="rtl">
                          <div className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                            <Languages className="w-3 h-3" />
                            <span>ترجمه فارسی</span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                            {activeArticle.headline_fa || activeArticle.headline}
                          </h4>
                          {cleanFa && (
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                              {cleanFa}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (readerLanguageMode === 'fa') {
                    return (
                      <div className="space-y-4">
                        <div className="space-y-2 text-right font-vazir" dir="rtl">
                          <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                            {activeArticle.headline_fa || activeArticle.headline}
                          </h4>
                          {cleanFa && (
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                              <p>{cleanFa}</p>
                            </div>
                          )}
                        </div>

                        {/* Option to view original English */}
                        <div className="pt-1 text-right" dir="rtl">
                          <button
                            onClick={() => setReaderLanguageMode('en')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Languages className="w-3.5 h-3.5" />
                            <span>مشاهده متن اصلی انگلیسی (English)</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug font-sans">
                          {activeArticle.headline}
                        </h4>
                        {cleanEn && (
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            <p>{cleanEn}</p>
                          </div>
                        )}
                      </div>

                      {/* Option to show Persian translation */}
                      <div className="pt-1">
                        <button
                          onClick={() => setReaderLanguageMode('fa')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-400 bg-cyan-50/60 dark:bg-cyan-950/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 rounded-lg border border-cyan-200/80 dark:border-cyan-800/40 transition-colors cursor-pointer"
                        >
                          <Languages className="w-3.5 h-3.5" />
                          <span>{activeArticle.headline_fa ? 'ترجمه فارسی (Persian Translation)' : 'View in Persian'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Reader Footer & Source Link */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">
                    Article ID: #{activeArticle.id}
                  </span>
                  {activeArticle.url && (
                    <a
                      href={activeArticle.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <span>{t('read_full_story', 'Read Full Publisher Story')}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* ================= EDITORIAL GRID MODE ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAndSortedNews.map((item) => {
            const isPos = item.sentiment === 'positive' || item.sentiment === 'bullish';
            const isNeg = item.sentiment === 'negative' || item.sentiment === 'bearish';
            const isSaved = savedIds.has(item.id);
            const itemOverride = itemLanguageOverrides[item.id];
            const activeItemLang = itemOverride || language;
            const displayHeadline = activeItemLang === 'fa' && item.headline_fa ? item.headline_fa : item.headline;
            const displayBody = activeItemLang === 'fa' && item.body_fa ? item.body_fa : item.body;
            const topic = detectTopicCategory(item.headline);

            return (
              <div
                key={item.id}
                onClick={() => handleArticleClick(item)}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-500/60 rounded-xl space-y-3 transition-all shadow-xs hover:shadow-md flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Top Badges: Source, Topic, Date, Bookmark */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                        {item.source_name || 'Wire'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                        {formatDate(item.published_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => toggleBookmark(item.id, e)}
                        className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                          isSaved ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title="Bookmark"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-500' : ''}`} />
                      </button>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                          isPos
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                            : isNeg
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60'
                            : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60'
                        }`}
                        dir="ltr"
                      >
                        {isPos ? <TrendingUp className="w-2.5 h-2.5" /> : isNeg ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                        <span>{item.raw_sentiment && item.raw_sentiment > 0 ? '+' : ''}{(item.raw_sentiment ?? 0).toFixed(2)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Headline */}
                  <h4
                    className={`text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors leading-snug line-clamp-3 mb-2 ${
                      activeItemLang === 'fa' ? 'font-vazir' : 'font-sans'
                    }`}
                    dir={activeItemLang === 'fa' ? 'rtl' : 'ltr'}
                  >
                    {displayHeadline}
                  </h4>

                  {/* AI Engagement Hook Highlight */}
                  {(item.hook_ai || item.hook_ai_fa) && (
                    <div
                      className={`p-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200 font-medium line-clamp-2 leading-relaxed flex items-start gap-1.5 mb-2 ${
                        activeItemLang === 'fa' ? 'font-vazir text-right' : 'font-sans'
                      }`}
                      dir={activeItemLang === 'fa' ? 'rtl' : 'ltr'}
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{activeItemLang === 'fa' && item.hook_ai_fa ? item.hook_ai_fa : item.hook_ai}</span>
                    </div>
                  )}

                  {/* Body excerpt */}
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
                </div>

                {/* Footer Controls: Language Switch & Read */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  {item.headline_fa ? (
                    <button
                      onClick={(e) => toggleItemLanguage(item.id, activeItemLang, e)}
                      className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Languages className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>{activeItemLang === 'fa' ? 'EN' : 'فارسی'}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">{topic}</span>
                  )}

                  <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 group-hover:underline flex items-center gap-0.5">
                    <span>{language === 'fa' ? 'مطالعه' : 'Inspect'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= HIGH-DENSITY WIRE FEED MODE ================= */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80">
          <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="w-16">TIME</span>
              <span className="w-24">SOURCE</span>
              <span>HEADLINE & MARKET STORY</span>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <span>FINBERT</span>
              <span>ACTIONS</span>
            </div>
          </div>

          {filteredAndSortedNews.map((item) => {
            const isPos = item.sentiment === 'positive' || item.sentiment === 'bullish';
            const isNeg = item.sentiment === 'negative' || item.sentiment === 'bearish';
            const isSaved = savedIds.has(item.id);
            const itemOverride = itemLanguageOverrides[item.id];
            const activeItemLang = itemOverride || language;
            const displayHeadline = activeItemLang === 'fa' && item.headline_fa ? item.headline_fa : item.headline;

            return (
              <div
                key={item.id}
                onClick={() => handleArticleClick(item)}
                className="px-4 py-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Time */}
                  <span className="text-[11px] text-slate-400 font-mono w-16 shrink-0" dir="ltr">
                    {formatDate(item.published_at)}
                  </span>

                  {/* Source Badge & Alpaca Tag */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono w-24 shrink-0 truncate text-center">
                      {item.source_name || 'Wire'}
                    </span>
                    {item.alpaca_coverage && (
                      <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800/60 font-mono">
                        Alpaca
                      </span>
                    )}
                  </div>

                  {/* Headline & AI Hook Preview */}
                  <div className="min-w-0 flex-1">
                    <h4
                      className={`text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate ${
                        activeItemLang === 'fa' ? 'font-vazir' : 'font-sans'
                      }`}
                      dir={activeItemLang === 'fa' ? 'rtl' : 'ltr'}
                    >
                      {displayHeadline}
                    </h4>
                    {(item.hook_ai || item.hook_ai_fa) && (
                      <p
                        className={`text-[11px] text-amber-600 dark:text-amber-400 truncate opacity-90 group-hover:opacity-100 flex items-center gap-1 mt-0.5 ${
                          activeItemLang === 'fa' ? 'font-vazir' : 'font-sans'
                        }`}
                        dir={activeItemLang === 'fa' ? 'rtl' : 'ltr'}
                      >
                        <Flame className="w-2.5 h-2.5 shrink-0 text-amber-500" />
                        <span>{activeItemLang === 'fa' && item.hook_ai_fa ? item.hook_ai_fa : item.hook_ai}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right controls: Sentiment Badge & Quick Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                      isPos
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                        : isNeg
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                        : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                    }`}
                    dir="ltr"
                  >
                    {item.raw_sentiment && item.raw_sentiment > 0 ? '+' : ''}
                    {(item.raw_sentiment ?? 0).toFixed(2)}
                  </span>

                  {/* Language switch */}
                  {item.headline_fa && (
                    <button
                      onClick={(e) => toggleItemLanguage(item.id, activeItemLang, e)}
                      className="p-1 rounded text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title={activeItemLang === 'fa' ? 'View English' : 'مشاهده ترجمه فارسی'}
                    >
                      <Languages className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Bookmark */}
                  <button
                    onClick={(e) => toggleBookmark(item.id, e)}
                    className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                      isSaved ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Bookmark"
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-500' : ''}`} />
                  </button>

                  {/* Copy Link */}
                  <button
                    onClick={(e) => handleCopy(item, e)}
                    className="p-1 rounded text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={t('social_copy', 'Copy')}
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {/* External Link */}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Read source"
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

      {/* 4. Article Detail Modal (For Wire & Grid Modes) */}
      {isModalOpen && activeArticle && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {activeArticle.source_name || 'Market Wire'}
                </span>
                <span className="text-xs text-slate-400 font-mono" dir="ltr">
                  {new Date(activeArticle.published_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Language Switcher */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    onClick={() => setReaderLanguageMode('en')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      readerLanguageMode === 'en'
                        ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setReaderLanguageMode('fa')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all font-vazir cursor-pointer ${
                      readerLanguageMode === 'fa'
                        ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    فارسی
                  </button>
                  <button
                    onClick={() => setReaderLanguageMode('bilingual')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      readerLanguageMode === 'bilingual'
                        ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {language === 'fa' ? 'دوزبانه' : 'Dual'}
                  </button>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* FinBERT Rating Tile */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  FinBERT NLP Sentiment Score:
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono font-bold text-xs" dir="ltr">
                <span
                  className={
                    (activeArticle.raw_sentiment ?? 0) > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : (activeArticle.raw_sentiment ?? 0) < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }
                >
                  {formatNumber(activeArticle.raw_sentiment || 0, { decimals: 3, showSign: true })}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                  {activeArticle.sentiment || 'neutral'}
                </span>
              </div>
            </div>

            {/* AI Market Hook & Executive Summary Section in Modal */}
            <AiEngagementHookCard
              article={activeArticle}
              symbol={symbol}
              languageMode={readerLanguageMode}
              isGenerating={generatingAiIds.has(activeArticle.id)}
              onRegenerate={() => handleGenerateAiHook(activeArticle)}
              language={language}
              t={t}
            />

            {/* Modal Content based on readerLanguageMode */}
            {(() => {
              const cleanEn = cleanDisplayContent(
                activeArticle.headline,
                activeArticle.body,
                false,
                activeArticle.summary_ai
              );
              const cleanFa = cleanDisplayContent(
                activeArticle.headline_fa || activeArticle.headline,
                activeArticle.body_fa || activeArticle.body,
                true,
                activeArticle.summary_ai_fa
              );

              if (readerLanguageMode === 'bilingual') {
                return (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">English (Original)</div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug font-sans">
                        {activeArticle.headline}
                      </h3>
                      {cleanEn && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                          {cleanEn}
                        </p>
                      )}
                    </div>

                    <div className="p-4 rounded-xl bg-cyan-50/40 dark:bg-cyan-950/20 border border-cyan-200/70 dark:border-cyan-800/40 space-y-2 text-right font-vazir" dir="rtl">
                      <div className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                        <Languages className="w-3 h-3" />
                        <span>ترجمه فارسی</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                        {activeArticle.headline_fa || activeArticle.headline}
                      </h3>
                      {cleanFa && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                          {cleanFa}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (readerLanguageMode === 'fa') {
                return (
                  <div className="space-y-4">
                    <div className="space-y-2 text-right font-vazir" dir="rtl">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                        {activeArticle.headline_fa || activeArticle.headline}
                      </h3>
                      {cleanFa && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          <p>{cleanFa}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-1 text-right" dir="rtl">
                      <button
                        onClick={() => setReaderLanguageMode('en')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Languages className="w-3.5 h-3.5" />
                        <span>مشاهده متن اصلی انگلیسی (English)</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug font-sans">
                      {activeArticle.headline}
                    </h3>
                    {cleanEn && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        <p>{cleanEn}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => setReaderLanguageMode('fa')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-400 bg-cyan-50/60 dark:bg-cyan-950/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 rounded-lg border border-cyan-200/80 dark:border-cyan-800/40 transition-colors cursor-pointer"
                    >
                      <Languages className="w-3.5 h-3.5" />
                      <span>{activeArticle.headline_fa ? 'ترجمه فارسی (Persian Translation)' : 'View in Persian'}</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => toggleBookmark(activeArticle.id, e)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    savedIds.has(activeArticle.id)
                      ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-600 border-amber-300 dark:border-amber-800'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${savedIds.has(activeArticle.id) ? 'fill-amber-500' : ''}`} />
                  <span>{savedIds.has(activeArticle.id) ? t('news_saved', 'Saved') : t('news_save_article', 'Save')}</span>
                </button>

                <button
                  onClick={(e) => handleCopy(activeArticle, e)}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:text-cyan-600 transition-colors cursor-pointer"
                >
                  {copiedId === activeArticle.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === activeArticle.id ? t('copied_to_clipboard', 'Copied!') : t('social_copy', 'Copy Quote')}</span>
                </button>
              </div>

              {activeArticle.url && (
                <a
                  href={activeArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <span>{t('read_full_story', 'Read Full Story')}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
