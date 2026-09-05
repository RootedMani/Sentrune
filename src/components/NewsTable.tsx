import React, { useState, useMemo } from 'react';
import { 
  Flame, 
  Search, 
  Filter, 
  Clock, 
  ExternalLink, 
  Database, 
  Sparkles, 
  Sliders, 
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';
import { useAuth } from '../context/AuthContext';
import { MarketCacheService } from '../services/marketCache';
import { TRANSLATIONS } from '../data/translations';
import { NewsItem } from '../types';

export const NewsTable: React.FC = () => {
  const { 
    selectedAsset, 
    showTechnicalMetadata, 
    setShowTechnicalMetadata, 
    appMode, 
    language,
    cacheMeta 
  } = useWorkstation();

  const { isDemo, openAuthModal } = useAuth();
  const t = TRANSLATIONS[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [highImpactOnly, setHighImpactOnly] = useState(false);

  // Retrieve news instantly from L1/L2 cache (0ms latency, eliminates loading screen)
  const cachedData = useMemo(() => {
    return MarketCacheService.getNews(selectedAsset.symbol);
  }, [selectedAsset.symbol, cacheMeta.lastUpdated]);

  const allFilteredNews = useMemo(() => {
    return cachedData.items.filter(item => {
      const matchesSearch = 
        item.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.marketTakeaway.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesImpact = !highImpactOnly || item.isHighImpact;

      return matchesSearch && matchesCategory && matchesImpact;
    });
  }, [cachedData.items, searchQuery, selectedCategory, highImpactOnly]);

  // Demo gating: Demo users see 4 stories, registered users see all
  const displayItems = isDemo ? allFilteredNews.slice(0, 4) : allFilteredNews;
  const hiddenCount = isDemo ? Math.max(0, allFilteredNews.length - 4) : 0;

  return (
    <div id="financial-news-view" className="space-y-3 p-4">
      {/* Top Filter and Caching Status Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#081322] p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2.5 flex-1">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="news-search-input"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t.searchNews}
              className="w-full bg-[#050c17] border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Category Filter */}
          <select
            id="news-category-select"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-[#050c17] border border-slate-700/80 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">{t.allCategories}</option>
            <option value="crypto">{t.crypto}</option>
            <option value="equities">{t.equities}</option>
            <option value="macro">{t.macro}</option>
            <option value="regulatory">{t.regulatory}</option>
          </select>

          {/* High Impact Toggle */}
          <button
            id="news-high-impact-filter-btn"
            onClick={() => setHighImpactOnly(!highImpactOnly)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              highImpactOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-[#050c17] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${highImpactOnly ? 'text-amber-400' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">High Impact</span>
          </button>
        </div>

        {/* Right side: Cache status & Power mode metadata toggle */}
        <div className="flex items-center gap-2.5 self-end md:self-center">
          {/* Cache Status Badge */}
          <div className="flex items-center gap-1.5 text-[11px] bg-[#050c17] border border-slate-800 px-2.5 py-1 rounded-md text-slate-400">
            <Database className="w-3 h-3 text-cyan-400" />
            <span>Cache: <strong className="text-emerald-400 font-normal">Instant ({cachedData.meta.latencyMs}ms)</strong></span>
          </div>

          {/* Dedicated Toggle for Technical Metadata */}
          <button
            id="toggle-technical-metadata-btn"
            onClick={() => setShowTechnicalMetadata(!showTechnicalMetadata)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
              showTechnicalMetadata
                ? 'bg-cyan-950 text-cyan-300 border-cyan-700/80'
                : 'bg-[#050c17] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle raw quantitative FinBERT score display"
          >
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>Tech Metadata: {showTechnicalMetadata ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Main Financial News Table matching screenshot */}
      <div className="bg-[#07111e] rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-[#050c17]/90 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                <th className="py-3 px-4 w-28 whitespace-nowrap">{t.colTime}</th>
                <th className="py-3 px-3 w-36 whitespace-nowrap">{t.colSource}</th>
                <th className="py-3 px-4">{t.colHeadline}</th>
                {showTechnicalMetadata && (
                  <th className="py-3 px-4 w-32 text-right whitespace-nowrap">{t.colFinbert}</th>
                )}
                {!showTechnicalMetadata && (
                  <th className="py-3 px-4 w-28 text-right whitespace-nowrap">SENTIMENT</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {displayItems.map((news: NewsItem) => {
                const isFinbertPositive = news.finbertScore > 0.2;
                const isFinbertNegative = news.finbertScore < -0.2;

                return (
                  <tr 
                    key={news.id}
                    id={`news-row-${news.id}`}
                    className="hover:bg-[#0c1a2d]/80 transition-colors group"
                  >
                    {/* Time */}
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap font-medium text-[11px]">
                      {news.time}
                    </td>

                    {/* Source Badge matching screenshot rounded pill style */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[#0d1c31] text-slate-300 border border-slate-700/60 shadow-xs">
                        {news.source}
                      </span>
                    </td>

                    {/* Headline & Market Context (NO prompt leaks, crisp Orange takeaway, selective 🔥 emoji) */}
                    <td className="py-3.5 px-4">
                      {/* Clean Headline */}
                      <div className="font-semibold text-slate-100 text-xs md:text-sm group-hover:text-cyan-300 transition-colors leading-snug">
                        {news.headline}
                      </div>

                      {/* Short Description below headline in clean ORANGE text (per user directive) */}
                      {/* Fire emoji 🔥 is placed ONLY on selected few (isHighImpact), not all! */}
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
                        {news.isHighImpact ? (
                          <span className="inline-flex items-center text-amber-400 flex-shrink-0" title="High-Impact Breaking Story">
                            🔥
                          </span>
                        ) : (
                          <span className="inline-block w-1 h-1 rounded-full bg-amber-400/60 flex-shrink-0"></span>
                        )}
                        <span className="truncate max-w-2xl leading-normal">
                          {news.marketTakeaway}
                        </span>
                      </div>
                    </td>

                    {/* FinBERT / Sentiment Score Column */}
                    {showTechnicalMetadata ? (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          isFinbertPositive
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            : isFinbertNegative
                            ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                            : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
                        }`}>
                          {news.finbertScore > 0 ? '+' : ''}{news.finbertScore.toFixed(2)}
                        </span>
                      </td>
                    ) : (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          news.sentiment === 'bullish'
                            ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40'
                            : news.sentiment === 'bearish'
                            ? 'text-rose-400 bg-rose-950/60 border border-rose-800/40'
                            : 'text-slate-300 bg-slate-800/60 border border-slate-700/40'
                        }`}>
                          {news.sentiment === 'bullish' && <TrendingUp className="w-3 h-3" />}
                          {news.sentiment === 'bearish' && <TrendingDown className="w-3 h-3" />}
                          {news.sentiment === 'neutral' && <Minus className="w-3 h-3" />}
                          <span className="capitalize">{news.sentiment}</span>
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Demo Mode Gating Banner */}
        {isDemo && hiddenCount > 0 && (
          <div className="p-4 bg-gradient-to-r from-[#09182b] to-[#0d2038] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  Demo Preview ({hiddenCount} more real-time market stories waiting)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Register for a free zero-cost account to unlock unlimited live institutional feeds and custom email alerts.
                </p>
              </div>
            </div>

            <button
              id="unlock-full-news-btn"
              onClick={() => openAuthModal('signup')}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-md shadow-cyan-950/60 transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Unlock Free Full Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
