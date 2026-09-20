import { NewsItem, CacheMetadata } from '../types';
import { INITIAL_NEWS, INITIAL_DISCUSSIONS, generateLiveNewsItem } from '../data/mockMarketData';

const CACHE_KEYS = {
  NEWS: 'sentrune_cached_news_v2',
  DISCUSSIONS: 'sentrune_cached_discussions_v2',
  META: 'sentrune_cache_meta_v2',
  TTL: 'sentrune_cache_ttl_seconds_v2'
};

const DEFAULT_TTL_MS = 180 * 1000;

// L1 In-Memory Cache for ultra-fast 0ms lookups
const memoryStore = new Map<string, { data: any; timestamp: number }>();

export class MarketCacheService {
  private static hitCount = 0;

  /**
   * Get cached news items.
   * If symbol is provided and not 'ALL', returns items that match the symbol OR are broad market/macro ('ALL').
   */
  static getNews(symbol?: string): { items: NewsItem[]; meta: CacheMetadata } {
    const startTime = performance.now();
    const cacheKey = CACHE_KEYS.NEWS;

    let allItems: NewsItem[] = [];
    let source: 'memory' | 'local_storage' = 'memory';
    let cacheTimestamp = Date.now();

    // 1. Check L1 Memory Cache
    if (memoryStore.has(cacheKey)) {
      const entry = memoryStore.get(cacheKey)!;
      allItems = entry.data;
      cacheTimestamp = entry.timestamp;
      this.hitCount++;
    } else {
      // 2. Check L2 LocalStorage
      try {
        const serialized = localStorage.getItem(cacheKey);
        if (serialized) {
          const parsed = JSON.parse(serialized);
          memoryStore.set(cacheKey, parsed);
          allItems = parsed.data;
          cacheTimestamp = parsed.timestamp;
          source = 'local_storage';
          this.hitCount++;
        }
      } catch {
        // ignore storage errors
      }

      // 3. Fallback to Initial Seed Data if empty
      if (!allItems || allItems.length === 0) {
        allItems = INITIAL_NEWS;
        this.setNews(allItems);
        cacheTimestamp = Date.now();
      }
    }

    // Filter items appropriately
    let filtered = allItems;
    if (symbol && symbol !== 'ALL') {
      const upperSym = symbol.toUpperCase();
      filtered = allItems.filter(item => {
        if (!item.relatedAssets || item.relatedAssets.length === 0) return true;
        return (
          item.relatedAssets.includes(upperSym) ||
          item.relatedAssets.includes('ALL') ||
          item.category === 'macro'
        );
      });
      // If asset has fewer than 4 items, backfill with top macro/market news
      if (filtered.length < 4) {
        const generalStories = allItems.filter(i => !filtered.some(f => f.id === i.id));
        filtered = [...filtered, ...generalStories.slice(0, 6 - filtered.length)];
      }
    }

    const latencyMs = Number((performance.now() - startTime).toFixed(2));
    const isStale = Date.now() - cacheTimestamp > this.getTTL();

    return {
      items: filtered,
      meta: {
        lastUpdated: cacheTimestamp,
        itemCount: filtered.length,
        hitCount: this.hitCount,
        isStale,
        latencyMs,
        source
      }
    };
  }

  /**
   * Save news items to both L1 memory and L2 localStorage
   */
  static setNews(items: NewsItem[]): void {
    const cacheKey = CACHE_KEYS.NEWS;
    const entry = {
      data: items,
      timestamp: Date.now()
    };

    memoryStore.set(cacheKey, entry);

    try {
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (e) {
      console.warn('MarketCache: Failed to persist to localStorage', e);
    }
  }

  /**
   * Injects a new live news headline into the cached feed (simulating a live streaming news desk)
   */
  static injectLiveTick(symbol?: string): NewsItem {
    const current = this.getNews().items;
    const freshItem = generateLiveNewsItem(symbol);
    const updated = [freshItem, ...current.slice(0, 45)];
    this.setNews(updated);
    return freshItem;
  }

  /**
   * Get cached discussions with full field validation
   */
  static getDiscussions(assetSymbol?: string): any[] {
    const cacheKey = CACHE_KEYS.DISCUSSIONS;
    let data = INITIAL_DISCUSSIONS;

    if (memoryStore.has(cacheKey)) {
      data = memoryStore.get(cacheKey)!.data;
    } else {
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed.data) && parsed.data.length > 0) {
            memoryStore.set(cacheKey, parsed);
            data = parsed.data;
          }
        }
      } catch {
        // fallback
      }
    }

    if (assetSymbol && assetSymbol !== 'ALL') {
      const filtered = data.filter(d => d.asset?.toUpperCase() === assetSymbol.toUpperCase());
      return filtered.length > 0 ? filtered : data;
    }
    return data;
  }

  static setDiscussions(discussions: any[]): void {
    const entry = { data: discussions, timestamp: Date.now() };
    memoryStore.set(CACHE_KEYS.DISCUSSIONS, entry);
    try {
      localStorage.setItem(CACHE_KEYS.DISCUSSIONS, JSON.stringify(entry));
    } catch {}
  }

  static addDiscussion(post: {
    author?: string;
    handle?: string;
    platform?: string;
    content: string;
    sentiment?: 'bullish' | 'bearish' | 'neutral';
    asset: string;
    tags?: string[];
  }): any {
    const all = this.getDiscussions();
    const newPost = {
      id: `disc-user-${Date.now()}`,
      author: post.author || 'AlphaTrader',
      handle: post.handle || '@trader',
      platform: post.platform || 'Community Alpha',
      time: 'Just now',
      content: post.content,
      sentiment: post.sentiment || 'bullish',
      upvotes: 1,
      commentCount: 0,
      isFollowed: true,
      asset: post.asset || 'BTC',
      tags: post.tags || ['#Analysis', '#Alpha']
    };
    const updated = [newPost, ...all];
    this.setDiscussions(updated);
    return newPost;
  }

  static upvoteDiscussion(id: string): number {
    const all = this.getDiscussions();
    let newCount = 1;
    const updated = all.map(d => {
      if (String(d.id) === String(id)) {
        newCount = (d.upvotes || 0) + 1;
        return { ...d, upvotes: newCount };
      }
      return d;
    });
    this.setDiscussions(updated);
    return newCount;
  }

  /**
   * Refresh / Revalidate cache: generates fresh live news and ticks
   */
  static async revalidate(symbol?: string): Promise<{ items: NewsItem[]; meta: CacheMetadata }> {
    // Artificial 120ms realistic network synchronization
    await new Promise(r => setTimeout(r, 120));

    // Generate 1-2 new live stories
    const current = this.getNews().items;
    const freshStory1 = generateLiveNewsItem(symbol);
    const freshStory2 = generateLiveNewsItem('ALL');
    const updated = [freshStory1, freshStory2, ...current.slice(0, 48)];

    this.setNews(updated);
    return this.getNews(symbol);
  }

  static clearAll(): void {
    memoryStore.clear();
    try {
      localStorage.removeItem(CACHE_KEYS.NEWS);
      localStorage.removeItem(CACHE_KEYS.DISCUSSIONS);
      localStorage.removeItem(CACHE_KEYS.META);
    } catch {}
    this.setNews(INITIAL_NEWS);
    this.setDiscussions(INITIAL_DISCUSSIONS);
  }

  static getTTL(): number {
    try {
      const stored = localStorage.getItem(CACHE_KEYS.TTL);
      if (stored) return parseInt(stored, 10) * 1000;
    } catch {}
    return DEFAULT_TTL_MS;
  }

  static setTTLSeconds(seconds: number): void {
    try {
      localStorage.setItem(CACHE_KEYS.TTL, seconds.toString());
    } catch {}
  }
}
