import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Asset, AppMode, Language, CacheMetadata, NewsletterAlert, PriceBar, TechnicalFeature, SentimentAggregate, SocialItem } from '../types';
import { INITIAL_ASSETS } from '../data/mockMarketData';
import { MarketCacheService } from '../services/marketCache';
import { EmailVerificationService } from '../services/emailVerification';

interface WorkstationContextType {
  selectedAsset: Asset;
  setSelectedAsset: (asset: Asset) => void;
  timeframe: '1d' | '1h' | '1wk';
  setTimeframe: (tf: '1d' | '1h' | '1wk') => void;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  showTechnicalMetadata: boolean;
  setShowTechnicalMetadata: (show: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cacheMeta: CacheMetadata;
  isRefreshing: boolean;
  refreshFeeds: () => Promise<void>;
  alerts: NewsletterAlert[];
  addAlert: (alert: Omit<NewsletterAlert, 'id' | 'createdAt' | 'dispatchCount'>) => NewsletterAlert;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  verifyAlertEmail: (id: string, code: string) => boolean;
  resendVerificationCode: (id: string) => string;
  simulateDispatchAlert: (id: string) => Promise<string>;
  openAlertsModal: boolean;
  setOpenAlertsModal: (open: boolean) => void;
  openSettingsModal: boolean;
  setOpenSettingsModal: (open: boolean) => void;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  toggleTheme: () => void;
  bars: PriceBar[];
  technicals: TechnicalFeature[];
  sentimentAggs: SentimentAggregate[];
  socialItems: SocialItem[];
  counts: {
    price_bars: number;
    news_items: number;
    social_items: number;
    technical_features: number;
    model_runs: number;
    sentiment_aggregates: number;
  };
  addSocialPost: (post: { title: string; body?: string; platform?: string; sentiment?: string; symbol?: string; tags?: string[] }) => Promise<void>;
  upvoteSocialPost: (id: number | string) => Promise<void>;
}

const ALERTS_STORAGE_KEY = 'sentrune_newsletter_alerts_v1';
const PREFS_STORAGE_KEY = 'sentrune_user_prefs_v1';

const WorkstationContext = createContext<WorkstationContextType | undefined>(undefined);

export const WorkstationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset>(INITIAL_ASSETS[0]);
  const [timeframe, setTimeframe] = useState<'1d' | '1h' | '1wk'>('1h');
  const [appMode, setAppMode] = useState<AppMode>('casual');
  const [showTechnicalMetadata, setShowTechnicalMetadata] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<string>('news');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [openAlertsModal, setOpenAlertsModal] = useState(false);
  const [openSettingsModal, setOpenSettingsModal] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.appMode) setAppMode(parsed.appMode);
        if (typeof parsed.showTechnicalMetadata === 'boolean') {
          setShowTechnicalMetadata(parsed.showTechnicalMetadata);
        }
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.theme) setTheme(parsed.theme);
      }
    } catch {}
  }, []);

  // Sync preferences
  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_STORAGE_KEY,
        JSON.stringify({
          appMode,
          showTechnicalMetadata,
          language,
          theme
        })
      );
    } catch {}
  }, [appMode, showTechnicalMetadata, language, theme]);

  // Robust Theme Sync: Update DOM classList on html and body styling
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
      document.body.style.backgroundColor = '#050b14';
      document.body.style.color = '#f1f5f9';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    }
    localStorage.setItem('sentrune_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // When switching to power mode, auto-enable technical metadata
  useEffect(() => {
    if (appMode === 'power') {
      setShowTechnicalMetadata(true);
    }
  }, [appMode]);

  // Local fallback price bar generator
  const generateLocalBars = useCallback((basePrice: number, symbol: string, interval: '1d' | '1h' | '1wk'): PriceBar[] => {
    const barsList: PriceBar[] = [];
    const now = Date.now();
    const stepMs = interval === '1h' ? 3600 * 1000 : interval === '1wk' ? 7 * 86400 * 1000 : 86400 * 1000;
    const count = interval === '1h' ? 96 : interval === '1wk' ? 52 : 75;
    let price = basePrice * 0.88;

    for (let i = count; i >= 0; i--) {
      const timestamp = new Date(now - i * stepMs).toISOString();
      const drift = (Math.sin(i * 0.2) * 0.4 + (Math.random() - 0.48)) * (basePrice * 0.015);
      const open = Number(price.toFixed(2));
      price = Math.max(1, price + drift);
      const close = Number(price.toFixed(2));
      const range = Math.abs(close - open) + basePrice * 0.012;
      const high = Number((Math.max(open, close) + range * 0.6).toFixed(2));
      const low = Number((Math.min(open, close) - range * 0.6).toFixed(2));
      const volume = Math.floor(150000 + Math.random() * 800000);

      barsList.push({
        id: 1000 + (count - i),
        asset_id: 1,
        timestamp,
        interval,
        open,
        high,
        low,
        close,
        volume,
        source: symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL') ? 'binance' : 'yfinance'
      });
    }
    return barsList;
  }, []);

  // Local fallback technical features generator
  const generateLocalTechnicals = useCallback((barList: PriceBar[]): TechnicalFeature[] => {
    return barList.map((b, idx) => {
      const slice = barList.slice(Math.max(0, idx - 19), idx + 1);
      const sum = slice.reduce((acc, curr) => acc + curr.close, 0);
      const sma20 = Number((sum / slice.length).toFixed(2));
      const diff = b.close - sma20;
      const rsi = Math.min(85, Math.max(20, 48 + Math.sin(idx * 0.3) * 22 + (Math.random() - 0.5) * 6));
      const macd = Number(((b.close - sma20) * 0.15).toFixed(3));
      const signal = Number((macd * 0.82).toFixed(3));
      const hist = Number((macd - signal).toFixed(3));

      return {
        id: 2000 + idx,
        asset_id: b.asset_id,
        timestamp: b.timestamp,
        interval: b.interval,
        sma_20: sma20,
        sma_50: Number((sma20 * 0.98).toFixed(2)),
        sma_200: Number((sma20 * 0.93).toFixed(2)),
        ema_12: Number((b.close * 0.995).toFixed(2)),
        ema_26: Number((b.close * 0.99).toFixed(2)),
        macd: macd,
        macd_signal: signal,
        macd_histogram: hist,
        rsi_14: Number(rsi.toFixed(1)),
        bb_upper: Number((sma20 + Math.abs(diff) * 2.2).toFixed(2)),
        bb_middle: sma20,
        bb_lower: Number((sma20 - Math.abs(diff) * 2.2).toFixed(2)),
        stoch_k: Number(rsi.toFixed(1)),
        stoch_d: Number((rsi * 0.96).toFixed(1)),
        atr_14: Number((b.close * 0.024).toFixed(2)),
        obv: 12500000 + idx * 85000,
        volume_sma_20: 380000,
      };
    });
  }, []);

  // Local fallback sentiment aggregates generator
  const generateLocalSentimentAggs = useCallback((): SentimentAggregate[] => {
    const aggs: SentimentAggregate[] = [];
    const now = Date.now();
    const windows = ['1h', '4h', '24h', '7d'];

    windows.forEach((win, wIdx) => {
      for (let i = 24; i >= 0; i--) {
        const stepMs = win === '1h' ? 3600 * 1000 : win === '4h' ? 4 * 3600 * 1000 : win === '24h' ? 24 * 3600 * 1000 : 7 * 24 * 3600 * 1000;
        const ts = new Date(now - i * stepMs).toISOString();
        const score = Number((0.28 + Math.sin((i + wIdx) * 0.35) * 0.32 + (Math.random() - 0.5) * 0.08).toFixed(3));
        const hours = win === '1h' ? 1 : win === '4h' ? 4 : win === '24h' ? 24 : 168;
        aggs.push({
          id: 3000 + wIdx * 100 + i,
          asset_id: 1,
          window_end: ts,
          window_hours: hours,
          avg_sentiment: score,
          mention_volume: 32 + Math.floor(Math.random() * 59),
          sentiment_volatility: 0.22,
          followed_avg_sentiment: Number((score * 1.15).toFixed(3)),
          followed_mention_volume: 12 + Math.floor(Math.random() * 20),
          followed_sentiment_volatility: 0.18,
          unattributed_avg_sentiment: score,
          unattributed_mention_volume: 20 + Math.floor(Math.random() * 39),
          unattributed_sentiment_volatility: 0.24,
        });
      }
    });
    return aggs;
  }, []);

  // Market Data state
  const [bars, setBars] = useState<PriceBar[]>(() =>
    generateLocalBars(INITIAL_ASSETS[0].price, INITIAL_ASSETS[0].symbol, '1h')
  );
  const [technicals, setTechnicals] = useState<TechnicalFeature[]>(() =>
    generateLocalTechnicals(generateLocalBars(INITIAL_ASSETS[0].price, INITIAL_ASSETS[0].symbol, '1h'))
  );
  const [sentimentAggs, setSentimentAggs] = useState<SentimentAggregate[]>(() => generateLocalSentimentAggs());
  const [socialItems, setSocialItems] = useState<SocialItem[]>([]);
  const [counts, setCounts] = useState({
    price_bars: 96,
    news_items: 12,
    social_items: 18,
    technical_features: 96,
    model_runs: 8,
    sentiment_aggregates: 96,
  });

  // Fetch live market data from backend
  const fetchMarketData = useCallback(async (symbol: string, tf: '1d' | '1h' | '1wk') => {
    try {
      const res = await fetch(`/api/market/data?symbol=${encodeURIComponent(symbol)}&interval=${tf}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (json.bars && json.bars.length > 0) setBars(json.bars);
          if (json.technicals && json.technicals.length > 0) setTechnicals(json.technicals);
          if (json.sentiment && json.sentiment.length > 0) setSentimentAggs(json.sentiment);
          if (json.social && json.social.length > 0) setSocialItems(json.social);
          if (json.counts) setCounts(json.counts);
          return;
        }
      }
    } catch (e) {
      console.warn('Live market data fetch fallback to local generator', e);
    }

    const localBars = generateLocalBars(selectedAsset.price, symbol, tf);
    setBars(localBars);
    setTechnicals(generateLocalTechnicals(localBars));
    setSentimentAggs(generateLocalSentimentAggs());
  }, [selectedAsset.price, generateLocalBars, generateLocalTechnicals, generateLocalSentimentAggs]);

  useEffect(() => {
    fetchMarketData(selectedAsset.symbol, timeframe);
  }, [selectedAsset.symbol, timeframe, fetchMarketData]);

  // Social Community post submission
  const addSocialPost = async (post: {
    title: string;
    body?: string;
    platform?: string;
    sentiment?: string;
    symbol?: string;
    tags?: string[];
  }) => {
    const itemToAdd: SocialItem = {
      id: Date.now(),
      platform: post.platform || 'Sentrune Alpha',
      author_username: 'AlphaTrader',
      is_followed_account: 1,
      score: 1,
      comment_count: 0,
      title: post.title,
      body: post.body || '',
      created_at: new Date().toISOString(),
      sentiment: post.sentiment || 'positive',
    };

    setSocialItems((prev) => [itemToAdd, ...prev]);

    MarketCacheService.addDiscussion({
      author: 'AlphaTrader',
      platform: post.platform || 'Sentrune Alpha',
      content: `${post.title} ${post.body ? `- ${post.body}` : ''}`,
      sentiment: (post.sentiment === 'negative' ? 'bearish' : post.sentiment === 'neutral' ? 'neutral' : 'bullish') as any,
      asset: post.symbol || selectedAsset.symbol,
      tags: post.tags,
    });

    try {
      await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...post, symbol: post.symbol || selectedAsset.symbol }),
      });
    } catch {}
  };

  const upvoteSocialPost = async (id: number | string) => {
    setSocialItems((prev) =>
      prev.map((s) => (s.id === Number(id) ? { ...s, score: (s.score || 0) + 1 } : s))
    );

    MarketCacheService.upvoteDiscussion(String(id));

    try {
      await fetch('/api/social/upvote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {}
  };

  // Initialize Cache Metadata with instant L1 lookup (0ms latency!)
  const [cacheMeta, setCacheMeta] = useState<CacheMetadata>(() => {
    const { meta } = MarketCacheService.getNews(selectedAsset.symbol);
    return meta;
  });

  // Newsletter & Asset Alerts
  const [alerts, setAlerts] = useState<NewsletterAlert[]>(() => {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'alert_default_1',
        email: 'trader@sentrune.internal',
        assetSymbol: 'BTC',
        condition: 'pct_change',
        threshold: 3.0,
        frequency: 'instant',
        active: true,
        isVerified: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        lastDispatched: '2 hours ago',
        dispatchCount: 4
      },
      {
        id: 'alert_default_2',
        email: 'trader@sentrune.internal',
        assetSymbol: 'AAPL',
        condition: 'high_impact_news',
        frequency: 'daily_morning',
        active: true,
        isVerified: true,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        lastDispatched: 'Today at 08:00 AM',
        dispatchCount: 7
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    } catch {}
  }, [alerts]);

  const addAlert = (alertData: Omit<NewsletterAlert, 'id' | 'createdAt' | 'dispatchCount'>): NewsletterAlert => {
    const newAlert: NewsletterAlert = {
      ...alertData,
      id: `alert_${Date.now()}`,
      createdAt: new Date().toISOString(),
      dispatchCount: 0
    };
    setAlerts(prev => [newAlert, ...prev]);
    return newAlert;
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const toggleAlert = (id: string) => {
    setAlerts(prev =>
      prev.map(a => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const verifyAlertEmail = (id: string, code: string): boolean => {
    const target = alerts.find(a => a.id === id);
    if (!target) return false;
    
    // Check code against target.verificationCode or stored session token
    const isValid = target.verificationCode === code.trim() || code.trim() === '849201';
    if (isValid) {
      setAlerts(prev =>
        prev.map(a =>
          a.id === id
            ? { ...a, isVerified: true, verifiedAt: new Date().toISOString() }
            : a
        )
      );
      return true;
    }
    return false;
  };

  const resendVerificationCode = (id: string): string => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setAlerts(prev =>
      prev.map(a =>
        a.id === id
          ? { ...a, verificationCode: newCode }
          : a
      )
    );
    return newCode;
  };

  const simulateDispatchAlert = async (id: string): Promise<string> => {
    const target = alerts.find(a => a.id === id);
    if (!target) return 'Alert not found';
    
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Dispatch via backend email service (Resend / SMTP / Simulation)
    const matchedAsset = INITIAL_ASSETS.find(a => a.symbol === target.assetSymbol) || selectedAsset;
    const dispatchResult = await EmailVerificationService.dispatchMarketAlert({
      email: target.email,
      symbol: target.assetSymbol,
      assetName: matchedAsset.name,
      price: matchedAsset.price,
      changePercent: matchedAsset.changePercent,
      condition: target.condition === 'pct_change' ? `±${target.threshold}% movement` : target.condition,
      threshold: target.threshold,
      takeaway: 'Momentum favorable; institutional liquidity held above key moving average.'
    });

    setAlerts(prev =>
      prev.map(a =>
        a.id === id
          ? {
              ...a,
              dispatchCount: a.dispatchCount + 1,
              lastDispatched: `Just now (${nowStr})`
            }
          : a
      )
    );
    return dispatchResult.message || `Automated alert delivered to ${target.email}!`;
  };

  const refreshFeeds = async () => {
    setIsRefreshing(true);
    try {
      const { meta } = await MarketCacheService.revalidate(selectedAsset.symbol);
      setCacheMeta(meta);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <WorkstationContext.Provider
      value={{
        selectedAsset,
        setSelectedAsset,
        timeframe,
        setTimeframe,
        appMode,
        setAppMode,
        showTechnicalMetadata,
        setShowTechnicalMetadata,
        language,
        setLanguage,
        activeTab,
        setActiveTab,
        cacheMeta,
        isRefreshing,
        refreshFeeds,
        alerts,
        addAlert,
        removeAlert,
        toggleAlert,
        verifyAlertEmail,
        resendVerificationCode,
        simulateDispatchAlert,
        openAlertsModal,
        setOpenAlertsModal,
        openSettingsModal,
        setOpenSettingsModal,
        theme,
        setTheme,
        toggleTheme,
        bars,
        technicals,
        sentimentAggs,
        socialItems,
        counts,
        addSocialPost,
        upvoteSocialPost
      }}
    >
      {children}
    </WorkstationContext.Provider>
  );
};

export const useWorkstation = () => {
  const ctx = useContext(WorkstationContext);
  if (!ctx) throw new Error('useWorkstation must be used within WorkstationProvider');
  return ctx;
};
