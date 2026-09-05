export type AssetType = 'stock' | 'crypto';

export interface Asset {
  symbol: string;
  name: string;
  type: AssetType;
  price: number;
  change: number;
  changePercent: number;
  exchange: string;
  volume: string;
  high24h: number;
  low24h: number;
  marketCap: string;
  peRatio?: string;
  rsi?: number;
  macd?: string;
  volatility?: string;
  currency: string;
}

export type SentimentType = 'bullish' | 'neutral' | 'bearish';

export interface NewsItem {
  id: string;
  time: string;
  timestamp: number;
  source: string;
  headline: string;
  /** Short, high-context takeaway displayed in orange. Never contains prompt-leak phrases. */
  marketTakeaway: string;
  /** Only a selected few high-impact/breaking stories get the fire emoji */
  isHighImpact: boolean;
  /** Quantitative FinBERT sentiment score (-1.00 to +1.00) */
  finbertScore: number;
  sentiment: SentimentType;
  relatedAssets: string[];
  category: 'crypto' | 'equities' | 'macro' | 'regulatory';
  readTime: string;
  sourceUrl?: string;
  fullStory?: string;
  cachedAt?: number;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'guest' | 'registered';
  tier: 'demo' | 'full';
  watchlist: string[];
  createdAt: string;
}

export type AlertTriggerCondition = 
  | 'price_above' 
  | 'price_below' 
  | 'pct_change' 
  | 'high_impact_news' 
  | 'daily_digest';

export interface NewsletterAlert {
  id: string;
  email: string;
  assetSymbol: string;
  condition: AlertTriggerCondition;
  threshold?: number;
  frequency: 'instant' | 'daily_morning' | 'weekly';
  active: boolean;
  createdAt: string;
  lastDispatched?: string;
  dispatchCount: number;
}

export type AppMode = 'casual' | 'power';
export type Language = 'en' | 'fa';

export interface CacheMetadata {
  lastUpdated: number;
  itemCount: number;
  hitCount: number;
  isStale: boolean;
  latencyMs: number;
  source: 'memory' | 'local_storage' | 'network';
}

export interface TechnicalIndicator {
  name: string;
  value: string | number;
  status: 'bullish' | 'neutral' | 'bearish';
  interpretation: string;
}
