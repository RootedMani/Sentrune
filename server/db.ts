import fs from 'fs';
import path from 'path';
import { calculateIndicators } from './indicators.js';

export interface Asset {
  id: number;
  symbol: string;
  name: string;
  asset_type: 'stock' | 'crypto';
  exchange: string;
  pair?: string | null;
  is_active: number;
}

export interface PriceBar {
  id: number;
  asset_id: number;
  interval: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: string;
}

export interface TechnicalFeature {
  id: number;
  asset_id: number;
  interval: string;
  timestamp: string;
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
  ema_12: number | null;
  ema_26: number | null;
  macd: number | null;
  macd_signal: number | null;
  macd_histogram: number | null;
  rsi_14: number | null;
  stoch_k: number | null;
  stoch_d: number | null;
  bb_lower: number | null;
  bb_middle: number | null;
  bb_upper: number | null;
  atr_14: number | null;
  obv: number | null;
  volume_sma_20: number | null;
  adx_14?: number | null;
  plus_di_14?: number | null;
  minus_di_14?: number | null;
  ichimoku_tenkan?: number | null;
  ichimoku_kijun?: number | null;
  ichimoku_senkou_a?: number | null;
  ichimoku_senkou_b?: number | null;
  ichimoku_chikou?: number | null;
  volatility_20?: number | null;
  return_autocorr_20?: number | null;
  volume_price_divergence?: number | null;
  candle_body_ratio?: number | null;
  candle_doji?: number | null;
  candle_hammer?: number | null;
  candle_bullish_engulfing?: number | null;
  candle_bearish_engulfing?: number | null;
  return_1?: number | null;
  return_3?: number | null;
  return_5?: number | null;
  return_10?: number | null;
  zscore_20?: number | null;
  volatility_regime?: number | null;
  day_of_week?: number | null;
  dist_from_high?: number | null;
  dist_from_low?: number | null;
}

export interface NewsItem {
  id: number;
  source_type: string;
  source_name: string;
  external_id?: string;
  headline: string;
  body?: string;
  headline_fa?: string;
  body_fa?: string;
  url?: string;
  published_at: string;
  raw_sentiment?: number;
  sentiment?: string;
}

export interface SocialItem {
  id: number;
  platform: string;
  external_id?: string;
  author_username?: string;
  subreddit?: string;
  is_followed_account: number;
  title: string;
  body?: string;
  title_fa?: string;
  body_fa?: string;
  url?: string;
  created_at: string;
  score?: number;
  comment_count?: number;
  sentiment?: string;
}

export interface IngestionLog {
  id: number;
  source: string;
  started_at: string;
  ended_at?: string;
  status: 'running' | 'success' | 'failure';
  records_fetched: number;
  error_message?: string | null;
}

export interface ModelRun {
  id: number;
  asset_id: number;
  interval: string;
  model_name: string;
  trained_at: string;
  model_path: string;
  feature_columns: string;
}

export interface ValidationMetric {
  id: number;
  model_run_id: number;
  fold: number;
  model_name: string;
  accuracy: number;
  log_loss: number;
  precision_down: number;
  recall_down: number;
  precision_flat: number;
  recall_flat: number;
  precision_up: number;
  recall_up: number;
}

export interface StrategyBacktest {
  id: number;
  model_run_id: number;
  fold: number;
  strategy_name: string;
  long_threshold: number;
  short_threshold: number;
  allow_short: number;
  fee_bps: number;
  slippage_bps: number;
  total_return: number;
  annualized_return: number;
  annualized_volatility: number;
  sharpe: number;
  max_drawdown: number;
  win_rate: number;
  trades: number;
  baseline_total_return: number;
  baseline_sharpe: number;
  n_bars: number;
}

export interface SentimentAggregate {
  id: number;
  asset_id: number;
  window_end: string;
  window_hours: number;
  avg_sentiment: number;
  mention_volume: number;
  sentiment_volatility: number;
  followed_avg_sentiment: number;
  followed_mention_volume: number;
  followed_sentiment_volatility: number;
  unattributed_avg_sentiment: number;
  unattributed_mention_volume: number;
  unattributed_sentiment_volatility: number;
}

export interface DatabaseState {
  assets: Asset[];
  price_bars: PriceBar[];
  technical_features: TechnicalFeature[];
  news_items: NewsItem[];
  news_item_assets: { news_item_id: number; asset_id: number }[];
  social_items: SocialItem[];
  social_item_assets: { social_item_id: number; asset_id: number }[];
  sentiment_aggregates: SentimentAggregate[];
  ingestion_log: IngestionLog[];
  model_runs: ModelRun[];
  validation_metrics: ValidationMetric[];
  strategy_backtests: StrategyBacktest[];
  last_refresh_at: number;
}

let dbInstance: DatabaseState | null = null;

// Helper to generate a realistic random-walk OHLCV series for any interval
export function generatePriceHistory(
  assetId: number,
  basePrice: number,
  volatility: number,
  source: string,
  interval: '1d' | '1h' | '1wk' = '1d',
  count?: number
): PriceBar[] {
  const bars: PriceBar[] = [];
  const now = new Date();
  let stepMs = 86400 * 1000;
  let numBars = count || 90;
  let stepVol = volatility;
  let currentVol = assetId >= 3 ? 45000 : 1200000;

  if (interval === '1h') {
    stepMs = 3600 * 1000;
    numBars = count || 168; // 7 days of 24h trading
    stepVol = volatility / 4.8; // scale down daily volatility for 1-hour slices
    currentVol = Math.floor(currentVol / 24);
  } else if (interval === '1wk') {
    stepMs = 7 * 86400 * 1000;
    numBars = count || 52; // 1 year of weekly candles
    stepVol = volatility * 2.2; // scale up daily volatility for weekly slices
    currentVol = currentVol * 5;
  }

  let currentPrice = basePrice;
  const tempBars: { date: Date; open: number; high: number; low: number; close: number; volume: number }[] = [];

  for (let i = numBars; i >= 0; i--) {
    const d = new Date(now.getTime() - i * stepMs);
    const stepReturn = (Math.random() - 0.485) * stepVol;
    const open = currentPrice;
    const close = parseFloat((open * (1 + stepReturn)).toFixed(2));
    const range = Math.abs(close - open) + currentPrice * (stepVol * 0.5 * Math.random());
    const high = parseFloat((Math.max(open, close) + range * Math.random()).toFixed(2));
    const low = parseFloat((Math.min(open, close) - range * Math.random()).toFixed(2));
    const volume = Math.floor(currentVol * (0.7 + Math.random() * 0.6));

    tempBars.push({ date: d, open, high, low, close, volume });
    currentPrice = close;
  }

  // Anchor the entire trajectory smoothly to basePrice at today's candle
  const endClose = tempBars[tempBars.length - 1]?.close || basePrice;
  const scale = endClose > 0 ? basePrice / endClose : 1;

  tempBars.forEach((tb, idx) => {
    bars.push({
      id: idx + 1,
      asset_id: assetId,
      interval,
      timestamp: tb.date.toISOString(),
      open: parseFloat((tb.open * scale).toFixed(2)),
      high: parseFloat((tb.high * scale).toFixed(2)),
      low: parseFloat((tb.low * scale).toFixed(2)),
      close: parseFloat((tb.close * scale).toFixed(2)),
      volume: tb.volume,
      source,
    });
  });

  return bars;
}

// Resilient helper to dynamically guarantee price bars & technical indicators exist for any requested interval
export function ensureBarsAndTechnicals(db: DatabaseState, assetId: number, interval: string): PriceBar[] {
  const safeInterval = (['1d', '1h', '1wk'].includes(interval) ? interval : '1d') as '1d' | '1h' | '1wk';
  const existing = db.price_bars.filter((b) => b.asset_id === assetId && b.interval === safeInterval);
  if (existing.length > 0) return existing;

  const asset = db.assets.find((a) => a.id === assetId) || db.assets[0];
  const anyBars = db.price_bars
    .filter((b) => b.asset_id === assetId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const basePrice =
    anyBars.length > 0
      ? anyBars[anyBars.length - 1].close
      : asset.asset_type === 'crypto'
      ? asset.symbol === 'BTC'
        ? 59500.0
        : 2520.0
      : asset.symbol === 'AAPL'
      ? 218.5
      : 432.0;

  const vol = asset.asset_type === 'crypto' ? 0.035 : 0.018;
  const source = asset.asset_type === 'crypto' ? 'binance' : 'yfinance';

  const newBars = generatePriceHistory(assetId, basePrice, vol, source, safeInterval);
  newBars.forEach((b) => {
    b.id = db.price_bars.length + 1;
    db.price_bars.push(b);
  });

  const computed = calculateIndicators(newBars);
  computed.forEach((tf) => {
    tf.id = db.technical_features.length + 1;
    db.technical_features.push(tf);
  });

  return newBars;
}

export function getDatabase(): DatabaseState {
  if (dbInstance) {
    return dbInstance;
  }

  const defaultAssets: Asset[] = [
    { id: 1, symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock', exchange: 'NASDAQ', is_active: 1 },
    { id: 2, symbol: 'MSFT', name: 'Microsoft Corporation', asset_type: 'stock', exchange: 'NASDAQ', is_active: 1 },
    { id: 3, symbol: 'BTC', name: 'Bitcoin', asset_type: 'crypto', exchange: 'Binance', pair: 'BTCUSDT', is_active: 1 },
    { id: 4, symbol: 'ETH', name: 'Ethereum', asset_type: 'crypto', exchange: 'Binance', pair: 'ETHUSDT', is_active: 1 },
  ];

  // 1. Generate full price bars for all 4 assets across ALL supported intervals (1d, 1h, 1wk)
  let allBars: PriceBar[] = [];
  let barIdCounter = 1;

  const assetConfigs = [
    { id: 1, basePrice: 328.21, vol: 0.018, source: 'yfinance' },
    { id: 2, basePrice: 510.12, vol: 0.016, source: 'yfinance' },
    { id: 3, basePrice: 81060.0, vol: 0.035, source: 'binance' },
    { id: 4, basePrice: 2518.0, vol: 0.042, source: 'binance' },
  ];

  const intervals: ('1d' | '1h' | '1wk')[] = ['1d', '1h', '1wk'];

  for (const cfg of assetConfigs) {
    for (const iv of intervals) {
      const bars = generatePriceHistory(cfg.id, cfg.basePrice, cfg.vol, cfg.source, iv);
      bars.forEach((b) => {
        b.id = barIdCounter++;
        allBars.push(b);
      });
    }
  }

  // 2. Compute full technical features for each asset and each interval
  let allTechnicals: TechnicalFeature[] = [];
  let techIdCounter = 1;

  for (const asset of defaultAssets) {
    for (const iv of intervals) {
      const bars = allBars.filter((b) => b.asset_id === asset.id && b.interval === iv);
      const computed = calculateIndicators(bars);
      computed.forEach((tf) => {
        tf.id = techIdCounter++;
        allTechnicals.push(tf);
      });
    }
  }

  // 3. Seed targeted news items for each asset
  const now = new Date();
  const newsItems: NewsItem[] = [
    {
      id: 1,
      source_type: 'web_scrape_google_rss',
      source_name: 'Reuters',
      headline: 'Apple expands AI capabilities across new hardware lineup and services ecosystem',
      body: 'Apple announced major updates to its hardware lineup with enhanced on-device neural engines and deep machine intelligence integration. Analysts project substantial multi-year upgrade cycles driven by enterprise and consumer demand.',
      headline_fa: 'اپل قابلیت‌های هوش مصنوعی را در خط تولید سخت‌افزار و اکوسیستم خدمات جدید گسترش می‌دهد',
      body_fa: 'اپل از ارتقای گسترده سخت‌افزارهای خود با موتورهای پردازش عصبی روی دستگاه و هوش مصنوعی یکپارچه خبر داد. تحلیلگران آغاز چرخه ارتقای چندساله را پیش‌بینی می‌کنند.',
      url: 'https://www.reuters.com/technology/apple-ai-lineup-services',
      published_at: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      raw_sentiment: 0.72,
      sentiment: 'positive',
    },
    {
      id: 2,
      source_type: 'yahoo_finance_rss',
      source_name: 'Bloomberg',
      headline: 'Apple services division sets record quarterly revenue as App Store and cloud subscriptions grow',
      body: 'Services segment gross margins expanded to 74%, bolstering operating cash flow and reinforcing strong consumer retention across the global Apple ecosystem.',
      headline_fa: 'بخش خدمات اپل همزمان با رشد درآمد اپ‌استور و اشتراک‌های ابری رکورد فصلی جدیدی ثبت کرد',
      body_fa: 'حاشیه سود ناخالص بخش خدمات به ۷۴٪ افزایش یافته و موجب تقویت جریان نقدی عملیاتی و ماندگاری بالای کاربران در اکوسیستم اپل شده است.',
      url: 'https://www.bloomberg.com/news/articles/apple-services-revenue-growth',
      published_at: new Date(now.getTime() - 6 * 3600 * 1000).toISOString(),
      raw_sentiment: 0.65,
      sentiment: 'positive',
    },
    {
      id: 3,
      source_type: 'yahoo_finance_rss',
      source_name: 'Wall Street Journal',
      headline: 'Microsoft Azure cloud revenue accelerates as enterprise generative AI adoption surges',
      body: 'Microsoft reported robust quarterly cloud performance powered by expanding Azure enterprise customer deployments. Demand for cloud computing compute and developer copilot tools remains ahead of consensus estimates.',
      headline_fa: 'رشد شتابان درآمد ابری مایکروسافت آژور در پی جهش پذیرش هوش مصنوعی مولد سازمانی',
      body_fa: 'مایکروسافت عملکرد فصلی قدرتمند بخش ابری را گزارش کرد. تقاضا برای زیرساخت پردازش ابری و ابزارهای کوپایلوت از پیش‌بینی‌های وال استریت فراتر رفته است.',
      url: 'https://www.wsj.com/articles/microsoft-azure-growth',
      published_at: new Date(now.getTime() - 4 * 3600 * 1000).toISOString(),
      raw_sentiment: 0.84,
      sentiment: 'positive',
    },
    {
      id: 4,
      source_type: 'web_scrape_google_rss',
      source_name: 'Financial Times',
      headline: 'Microsoft integrates agentic AI workflows across enterprise Office suite',
      body: 'Commercial seat upgrades accelerated across Fortune 500 customers as Microsoft launched autonomous agent orchestration within Microsoft 365 copilot.',
      headline_fa: 'مایکروسافت جریان‌های کاری هوش مصنوعی خودکار را به بسته نرم‌افزاری آفیس اضافه کرد',
      body_fa: 'با معرفی قابلیت هماهنگی عامل‌های مستقل در مایکروسافت ۳۶۵، روند ارتقای اشتراک‌های تجاری در میان شرکت‌های بزرگ با سرعت بالایی ادامه دارد.',
      url: 'https://www.ft.com/content/microsoft-copilot-agents',
      published_at: new Date(now.getTime() - 10 * 3600 * 1000).toISOString(),
      raw_sentiment: 0.61,
      sentiment: 'positive',
    },
    {
      id: 5,
      source_type: 'coindesk_rss',
      source_name: 'CoinDesk',
      headline: 'Bitcoin tests key resistance levels amid institutional ETF inflows and macro liquidity shifts',
      body: 'Bitcoin trades firmly above moving average support clusters as global exchange-traded fund holdings reach new monthly records. Market participants eye upcoming macroeconomic rate announcements.',
      headline_fa: 'آزمایش سطوح کلیدی مقاومت توسط بیت‌کوین همزمان با ورود سرمایه‌های نهادی به ETFها',
      body_fa: 'بیت‌کوین بالاتر از میانگین‌های متحرک تثبیت شده و دارایی صندوق‌های ETF رکوردهای ماهانه جدیدی ثبت کرده است.',
      url: 'https://www.coindesk.com/markets/bitcoin-etf-inflows-support',
      published_at: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(),
      raw_sentiment: 0.68,
      sentiment: 'positive',
    },
    {
      id: 6,
      source_type: 'coindesk_rss',
      source_name: 'CoinDesk',
      headline: 'Bitcoin on-chain exchange reserves decline to multi-year lows as cold storage accumulation continues',
      body: 'Long-term holders and institutional custody providers continue withdrawing BTC from spot centralized exchanges, constraining liquid market float.',
      headline_fa: 'کاهش ذخایر بیت‌کوین در صرافی‌ها به کمترین حد چند سال اخیر با ادامه انباشت در کیف‌پول‌های سرد',
      body_fa: 'سرمایه‌گذاران بلندمدت و نهادهای امانت‌داری در حال انتقال بیت‌کوین از صرافی‌های متمرکز هستند که باعث کاهش عرضه در گردش می‌شود.',
      url: 'https://www.coindesk.com/markets/btc-exchange-outflows',
      published_at: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),
      raw_sentiment: 0.74,
      sentiment: 'positive',
    },
    {
      id: 7,
      source_type: 'cointelegraph_rss',
      source_name: 'CoinTelegraph',
      headline: 'Ethereum layer-2 total value locked surges as transaction throughput hits new peak',
      body: 'Layer-2 scaling networks across Ethereum ecosystem register record daily active addresses. Gas fee optimization and staking yields continue to sustain network activity.',
      headline_fa: 'جهش ارزش کل قفل‌شده (TVL) در شبکه‌های لایه ۲ اتریوم همزمان با ثبت رکورد حجم تراکنش‌ها',
      body_fa: 'شبکه‌های مقیاس‌پذیری لایه دوم اتریوم به رکورد آدرس‌های فعال روزانه دست یافتند و کارمزدهای بهینه فعالیت شبکه را افزایش داده است.',
      url: 'https://cointelegraph.com/news/ethereum-layer2-tvl-record',
      published_at: new Date(now.getTime() - 5 * 3600 * 1000).toISOString(),
      raw_sentiment: 0.76,
      sentiment: 'positive',
    },
    {
      id: 8,
      source_type: 'cointelegraph_rss',
      source_name: 'CoinTelegraph',
      headline: 'Ethereum staking participation rate reaches 29% as institutional validator demand grows',
      body: 'Network issuance dynamics remain deflationary during peak DeFi activity periods with validator queue wait times stabilizing.',
      headline_fa: 'رسیدن نرخ مشارکت در استیکینگ اتریوم به ۲۹٪ با افزایش تقاضای اعتبارسنج‌های نهادی',
      body_fa: 'دینامیک صدور توکن‌های شبکه در دوره‌های اوج فعالیت دیفای کاهشی (ضدتورمی) باقی مانده و صف متقاضیان اعتبارسنجی پایدار است.',
      url: 'https://cointelegraph.com/news/eth-staking-validator-growth',
      published_at: new Date(now.getTime() - 16 * 3600 * 1000).toISOString(),
      raw_sentiment: 0.58,
      sentiment: 'positive',
    },
  ];

  const newsItemAssets = [
    { news_item_id: 1, asset_id: 1 },
    { news_item_id: 2, asset_id: 1 },
    { news_item_id: 3, asset_id: 2 },
    { news_item_id: 4, asset_id: 2 },
    { news_item_id: 5, asset_id: 3 },
    { news_item_id: 6, asset_id: 3 },
    { news_item_id: 7, asset_id: 4 },
    { news_item_id: 8, asset_id: 4 },
  ];

  // 4. Seed social items
  const socialItems: SocialItem[] = [
    {
      id: 1,
      platform: 'StockTwits',
      author_username: 'AlphaTrader_NY',
      is_followed_account: 1,
      score: 1420,
      title: 'AAPL technical setup: Golden Cross confirmed on daily chart with steady institutional volume',
      body: 'Key indicators showing strong support at 50-day SMA with MACD positive histogram divergence.',
      title_fa: 'تحلیل تکنیکال اپل (AAPL): تایید تقاطع طلایی (Golden Cross) در نمودار روزانه همراه با حجم معاملات پایدار نهادی',
      body_fa: 'اندیکاتورهای کلیدی حمایت قدرتمندی را در میانگین متحرک ۵۰ روزه همراه با واگرایی مثبت هیستوگرام مکدی (MACD) نشان می‌دهند.',
      url: 'https://stocktwits.com/symbol/AAPL',
      created_at: new Date(now.getTime() - 1 * 3600 * 1000).toISOString(),
      sentiment: 'positive',
    },
    {
      id: 2,
      platform: 'StockTwits',
      author_username: 'TechOptionsDesk',
      is_followed_account: 1,
      score: 980,
      title: 'AAPL seeing elevated call sweep volume in next month expiry contracts',
      body: 'Delta positioning indicates bullish skew as buyers defend the 20-day exponential moving average.',
      title_fa: 'ثبت حجم بالای خرید تهاجمی اختیار خرید (Call Sweep) در قراردادهای سررسید ماه آینده اپل',
      body_fa: 'موقعیت‌گیری دلتا نشان‌دهنده سوگیری صعودی خریداران و دفاع پرقدرت از میانگین متحرک نمایی ۲۰ روزه است.',
      url: 'https://stocktwits.com/symbol/AAPL',
      created_at: new Date(now.getTime() - 7 * 3600 * 1000).toISOString(),
      sentiment: 'positive',
    },
    {
      id: 3,
      platform: 'StockTwits',
      author_username: 'CloudValueMacro',
      is_followed_account: 1,
      score: 2840,
      title: 'MSFT breaks out to new weekly consolidation high following cloud partnership expansions',
      body: 'Institutional orders absorb selling pressure at standard deviation bands.',
      title_fa: 'شکست سقف هفتگی مایکروسافت (MSFT) به دنبال گسترش همکاری‌های استراتژیک در حوزه ابر و هوش مصنوعی',
      body_fa: 'جریان سفارش‌های نهادی فشار فروش را در باندهای انحراف معیار جذب کرده و تثبیت صعودی را تقویت می‌کند.',
      url: 'https://stocktwits.com/symbol/MSFT',
      created_at: new Date(now.getTime() - 4 * 3600 * 1000).toISOString(),
      sentiment: 'positive',
    },
    {
      id: 4,
      platform: 'StockTwits',
      author_username: 'QuantMacroWhale',
      is_followed_account: 1,
      score: 3950,
      title: 'BTC spot accumulation trends remain elevated among long-term holder cohorts',
      body: 'On-chain exchange reserves continue decreasing as institutional custody balances expand.',
      title_fa: 'تداوم روند پرقدرت انباشت اسپات بیت‌کوین (BTC) توسط هولدرهای بلندمدت',
      body_fa: 'داده‌های آن‌چین کاهش پیوسته ذخایر صرافی‌ها و انتقال به کیف‌پول‌های امانی نهادی را تایید می‌کند.',
      url: 'https://stocktwits.com/symbol/BTC.X',
      created_at: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      sentiment: 'positive',
    },
    {
      id: 5,
      platform: 'StockTwits',
      author_username: 'DeFiQuantLead',
      is_followed_account: 1,
      score: 1870,
      title: 'ETH open interest rebounds with funding rates in neutral territory',
      body: 'Derivatives positioning suggests balanced risk-reward profile heading into weekly options expiry.',
      title_fa: 'بازگشت سود باز قراردادهای مشتقه اتریوم (ETH) همزمان با ثبات فاندینگ ریت در محدوده خنثی',
      body_fa: 'موقعیت‌گیری در بازار مشتقات پیش از سررسید هفتگی اختیار معامله، نسبت ریسک به پاداش متعادلی را نشان می‌دهد.',
      url: 'https://stocktwits.com/symbol/ETH.X',
      created_at: new Date(now.getTime() - 5 * 3600 * 1000).toISOString(),
      sentiment: 'positive',
    },
  ];

  const socialItemAssets = [
    { social_item_id: 1, asset_id: 1 },
    { social_item_id: 2, asset_id: 1 },
    { social_item_id: 3, asset_id: 2 },
    { social_item_id: 4, asset_id: 3 },
    { social_item_id: 5, asset_id: 4 },
  ];

  // 5. Seed sentiment aggregates for 30 days
  const sentimentAggs: SentimentAggregate[] = [];
  const windows = [24, 72, 168];
  let aggId = 1;
  for (const asset of defaultAssets) {
    for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
      const date = new Date(now.getTime() - daysAgo * 86400 * 1000);
      const timeStr = date.toISOString();
      for (const win of windows) {
        const baseSent = 0.22 + Math.sin(daysAgo * 0.35 + asset.id) * 0.28;
        sentimentAggs.push({
          id: aggId++,
          asset_id: asset.id,
          window_end: timeStr,
          window_hours: win,
          avg_sentiment: parseFloat(baseSent.toFixed(3)),
          mention_volume: Math.floor(16 + Math.sin(daysAgo) * 8 + Math.random() * 10),
          sentiment_volatility: parseFloat((0.14 + Math.random() * 0.08).toFixed(3)),
          followed_avg_sentiment: parseFloat((baseSent + 0.06).toFixed(3)),
          followed_mention_volume: Math.floor(7 + Math.random() * 6),
          followed_sentiment_volatility: parseFloat((0.11 + Math.random() * 0.06).toFixed(3)),
          unattributed_avg_sentiment: parseFloat((baseSent - 0.03).toFixed(3)),
          unattributed_mention_volume: Math.floor(9 + Math.random() * 8),
          unattributed_sentiment_volatility: parseFloat((0.16 + Math.random() * 0.08).toFixed(3)),
        });
      }
    }
  }

  // 6. Seed model runs for all 4 assets
  const modelRuns: ModelRun[] = defaultAssets.map((asset, idx) => ({
    id: idx + 1,
    asset_id: asset.id,
    interval: '1d',
    model_name: 'LightGBM_Classifier_WalkForward',
    trained_at: new Date(now.getTime() - (idx + 1) * 3600 * 1000).toISOString(),
    model_path: `models/${asset.symbol}_1d_lightgbm.pkl`,
    feature_columns:
      'sma_20,sma_50,sma_200,ema_12,ema_26,macd,macd_signal,macd_histogram,rsi_14,stoch_k,stoch_d,bb_lower,bb_middle,bb_upper,atr_14,obv,volume_sma_20,avg_sentiment_24h,mention_volume_24h',
  }));

  // 7. Seed cross-validation metrics across 5 folds
  const validationMetrics: ValidationMetric[] = [];
  let valIdCounter = 1;
  const modelsList = ['LightGBM', 'LogisticRegression', 'RandomForest'];

  modelRuns.forEach((run) => {
    for (let fold = 1; fold <= 5; fold++) {
      modelsList.forEach((mName) => {
        const isLgbm = mName === 'LightGBM';
        const baseAcc = isLgbm ? 0.62 + (fold % 3) * 0.02 : 0.54 + (fold % 2) * 0.03;
        const baseLoss = isLgbm ? 0.66 + (fold % 2) * 0.02 : 0.74 + (fold % 3) * 0.03;
        validationMetrics.push({
          id: valIdCounter++,
          model_run_id: run.id,
          fold,
          model_name: mName,
          accuracy: parseFloat(baseAcc.toFixed(4)),
          log_loss: parseFloat(baseLoss.toFixed(4)),
          precision_down: parseFloat((0.58 + Math.random() * 0.08).toFixed(4)),
          recall_down: parseFloat((0.56 + Math.random() * 0.08).toFixed(4)),
          precision_flat: parseFloat((0.52 + Math.random() * 0.06).toFixed(4)),
          recall_flat: parseFloat((0.50 + Math.random() * 0.06).toFixed(4)),
          precision_up: parseFloat((0.64 + Math.random() * 0.08).toFixed(4)),
          recall_up: parseFloat((0.66 + Math.random() * 0.08).toFixed(4)),
        });
      });
    }
  });

  // 8. Seed realistic strategy backtests
  const strategyBacktests: StrategyBacktest[] = [];
  let backtestId = 1;

  modelRuns.forEach((run) => {
    for (let fold = 1; fold <= 5; fold++) {
      strategyBacktests.push({
        id: backtestId++,
        model_run_id: run.id,
        fold,
        strategy_name: 'ML_Confidence_Threshold_0.55',
        long_threshold: 0.55,
        short_threshold: 0.45,
        allow_short: 1,
        fee_bps: 5.0,
        slippage_bps: 2.5,
        total_return: parseFloat((0.142 + (fold % 4) * 0.038).toFixed(4)),
        annualized_return: parseFloat((0.264 + (fold % 3) * 0.045).toFixed(4)),
        annualized_volatility: parseFloat((0.158 + (fold % 2) * 0.012).toFixed(4)),
        sharpe: parseFloat((1.65 + (fold % 3) * 0.22).toFixed(2)),
        max_drawdown: parseFloat((-0.078 - (fold % 3) * 0.015).toFixed(4)),
        win_rate: parseFloat((0.612 + (fold % 4) * 0.024).toFixed(4)),
        trades: 18 + fold * 4,
        baseline_total_return: parseFloat((0.084 + (fold % 3) * 0.022).toFixed(4)),
        baseline_sharpe: parseFloat((0.92 + (fold % 2) * 0.15).toFixed(2)),
        n_bars: 90,
      });
    }
  });

  // 9. Initial ingestion logs
  const ingestionLog: IngestionLog[] = [
    {
      id: 1,
      source: 'pipeline_refresh',
      started_at: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
      ended_at: new Date(now.getTime() - 110 * 1000).toISOString(),
      status: 'success',
      records_fetched: allBars.length + newsItems.length + socialItems.length,
      error_message: null,
    },
  ];

  dbInstance = {
    assets: defaultAssets,
    price_bars: allBars,
    technical_features: allTechnicals,
    news_items: newsItems,
    news_item_assets: newsItemAssets,
    social_items: socialItems,
    social_item_assets: socialItemAssets,
    sentiment_aggregates: sentimentAggs,
    ingestion_log: ingestionLog,
    model_runs: modelRuns,
    validation_metrics: validationMetrics,
    strategy_backtests: strategyBacktests,
    last_refresh_at: Date.now(),
  };

  return dbInstance;
}
