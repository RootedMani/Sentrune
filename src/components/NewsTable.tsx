import React, { useState, useMemo, useEffect } from 'react';
import { 
  Flame, 
  Search, 
  RotateCw, 
  Database, 
  Sliders, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Radio,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';
import { MarketCacheService } from '../services/marketCache';
import { TRANSLATIONS } from '../data/translations';
import { NewsItem } from '../types';

export const NewsTable: React.FC = () => {
  const { 
    selectedAsset, 
    showTechnicalMetadata, 
    setShowTechnicalMetadata, 
    language,
    cacheMeta,
    isRefreshing,
    refreshFeeds
  } = useWorkstation();

  const t = TRANSLATIONS[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [highImpactOnly, setHighImpactOnly] = useState(false);
  const [assetScope, setAssetScope] = useState<'all' | 'selected'>('all');
  const [isLiveAutoStreaming, setIsLiveAutoStreaming] = useState(true);
  const [lastTickNotice, setLastTickNotice] = useState<string | null>(null);

  // Retrieve news instantly from L1/L2 cache
  const cachedData = useMemo(() => {
    const symbolToQuery = assetScope === 'selected' ? selectedAsset.symbol : undefined;
    return MarketCacheService.getNews(symbolToQuery);
  }, [selectedAsset.symbol, assetScope, cacheMeta.lastUpdated]);

  // Live streaming effect: inject a fresh headline every 3-4 seconds when active
  useEffect(() => {
    if (!isLiveAutoStreaming) return;

    const interval = setInterval(() => {
      const target = assetScope === 'selected' ? selectedAsset.symbol : undefined;
      const fresh = MarketCacheService.injectLiveTick(target);
      setLastTickNotice(fresh.source);
      // Trigger context cache timestamp update
      setTimeout(() => setLastTickNotice(null), 1500);
    }, 3500);

    return () => clearInterval(interval);
  }, [isLiveAutoStreaming, assetScope, selectedAsset.symbol]);

  const allFilteredNews = useMemo(() => {
    return cachedData.items.filter(item => {
      const headline = item.headline || '';
      const source = item.source || '';
      const takeaway = item.marketTakeaway || '';

      const matchesSearch = 
        headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        takeaway.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesImpact = !highImpactOnly || item.isHighImpact;

      return matchesSearch && matchesCategory && matchesImpact;
    });
  }, [cachedData.items, searchQuery, selectedCategory, highImpactOnly]);

  return (
    <div id="financial-news-view" className="space-y-3 p-4">
      {/* Top Filter, Live Stream & Caching Status Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-[#081322] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-2.5 flex-1 flex-wrap">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="news-search-input"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t.searchNews}
              className="w-full bg-slate-50 dark:bg-[#050c17] border border-slate-200 dark:border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          {/* Asset Scope Toggle: All Markets vs Target Asset */}
          <div className="flex items-center bg-slate-100 dark:bg-[#060e1a] p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setAssetScope('all')}
              className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                assetScope === 'all'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Assets News ({cachedData.items.length})
            </button>
            <button
              onClick={() => setAssetScope('selected')}
              className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                assetScope === 'selected'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ${selectedAsset.symbol} News
            </button>
          </div>

          {/* Category Filter */}
          <select
            id="news-category-select"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-slate-50 dark:bg-[#050c17] border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
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
                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/50 shadow-xs'
                : 'bg-slate-50 dark:bg-[#050c17] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${highImpactOnly ? 'text-amber-500' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Breaking / High Impact</span>
          </button>
        </div>

        {/* Right side: Live auto-stream toggle & Manual refresh */}
        <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
          {/* Live Auto Streaming Badge / Toggle */}
          <button
            onClick={() => setIsLiveAutoStreaming(!isLiveAutoStreaming)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
              isLiveAutoStreaming
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
            }`}
            title="Toggle live news ticker updates"
          >
            <span className={`w-2 h-2 rounded-full ${isLiveAutoStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
            <span>Live Stream: {isLiveAutoStreaming ? 'ON' : 'PAUSED'}</span>
          </button>

          {/* Quick Manual Refresh Button */}
          <button
            onClick={refreshFeeds}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-[11px] font-bold transition-all cursor-pointer"
          >
            <RotateCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Fetch New</span>
          </button>

          {/* Dedicated Toggle for Technical Metadata */}
          <button
            id="toggle-technical-metadata-btn"
            onClick={() => setShowTechnicalMetadata(!showTechnicalMetadata)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
              showTechnicalMetadata
                ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700/80 shadow-xs'
                : 'bg-slate-50 dark:bg-[#050c17] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Toggle raw quantitative FinBERT score display"
          >
            <Sliders className="w-3 h-3 text-cyan-500" />
            <span>Tech Metadata: {showTechnicalMetadata ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Main Financial News Table */}
      <div className="bg-white dark:bg-[#07111e] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#050c17]/90 text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {allFilteredNews.length === 0 ? (
                <tr>
                  <td colSpan={showTechnicalMetadata ? 4 : 4} className="py-8 text-center text-slate-400 text-xs">
                    No articles match current filters. Switch to "All Assets News" or click "Fetch New".
                  </td>
                </tr>
              ) : (
                allFilteredNews.map((news: NewsItem) => {
                  const finScore = typeof news.finbertScore === 'number' ? news.finbertScore : 0.5;
                  const isFinbertPositive = finScore > 0.2;
                  const isFinbertNegative = finScore < -0.2;
                  const isBullish = news.sentiment === 'bullish';
                  const isBearish = news.sentiment === 'bearish';

                  return (
                    <tr 
                      key={news.id}
                      id={`news-row-${news.id}`}
                      className="hover:bg-slate-50 dark:hover:bg-[#0c1a2d]/80 transition-colors group"
                    >
                      {/* Time */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium text-[11px]">
                        {news.time || 'Recently'}
                      </td>

                      {/* Source Badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-slate-100 dark:bg-[#0d1c31] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 shadow-xs">
                          {news.source || 'MARKET'}
                        </span>
                      </td>

                      {/* Headline & Market Context */}
                      <td className="py-3.5 px-4">
                        {/* Clean Headline */}
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs md:text-sm group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors leading-snug">
                          {news.headline}
                        </div>

                        {/* Short Description below headline in clean Amber text */}
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          {news.isHighImpact ? (
                            <span className="inline-flex items-center text-amber-500 flex-shrink-0" title="High-Impact Breaking Story">
                              🔥
                            </span>
                          ) : (
                            <span className="inline-block w-1 h-1 rounded-full bg-amber-500/60 flex-shrink-0"></span>
                          )}
                          <span className="truncate max-w-2xl leading-normal">
                            {news.marketTakeaway || 'Key market driver impacting order flow.'}
                          </span>
                        </div>
                      </td>

                      {/* FinBERT / Sentiment Score Column */}
                      {showTechnicalMetadata ? (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            isFinbertPositive
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60'
                              : isFinbertNegative
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60'
                              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/60'
                          }`}>
                            {finScore > 0 ? '+' : ''}{finScore.toFixed(2)}
                          </span>
                        </td>
                      ) : (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isBullish
                              ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40'
                              : isBearish
                              ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/40'
                              : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/40'
                          }`}>
                            {isBullish && <TrendingUp className="w-3 h-3" />}
                            {isBearish && <TrendingDown className="w-3 h-3" />}
                            {!isBullish && !isBearish && <Minus className="w-3 h-3" />}
                            <span className="capitalize">{news.sentiment || 'neutral'}</span>
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
