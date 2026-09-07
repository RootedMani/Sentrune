export type AssetType = 'stock' | 'crypto';

export interface Asset {
  id?: number;
  symbol: string;
  name: string;
  type?: AssetType;
  asset_type?: 'stock' | 'crypto';
  price?: number;
  change?: number;
  changePercent?: number;
  exchange?: string;
  volume?: string | number;
  high24h?: number;
  low24h?: number;
  marketCap?: string;
  peRatio?: string;
  rsi?: number;
  macd?: string;
  volatility?: string;
  currency?: string;
  pair?: string | null;
  is_active?: number;
}

export type SentimentType = 'bullish' | 'neutral' | 'bearish';

export interface NewsItem {
  id: string | number;
  time?: string;
  timestamp?: number;
  source?: string;
  headline: string;
  body?: string;
  source_name?: string;
  source_type?: string;
  author?: string;
  external_id?: string;
  headline_fa?: string;
  body_fa?: string;
  summary_ai?: string;
  hook_ai?: string;
  summary_ai_fa?: string;
  hook_ai_fa?: string;
  key_takeaways?: string[];
  key_takeaways_fa?: string[];
  alpaca_coverage?: boolean;
  url?: string;
  published_at?: string;
  raw_sentiment?: number;
  /** Short, high-context takeaway displayed in orange. Never contains prompt-leak phrases. */
  marketTakeaway?: string;
  /** Only a selected few high-impact/breaking stories get the fire emoji */
  isHighImpact?: boolean;
  /** Quantitative FinBERT sentiment score (-1.00 to +1.00) */
  finbertScore?: number;
  sentiment?: SentimentType | string;
  relatedAssets?: string[];
  category?: 'crypto' | 'equities' | 'macro' | 'regulatory';
  readTime?: string;
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
  isVerified?: boolean;
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
  isVerified: boolean;
  verificationCode?: string;
  verifiedAt?: string;
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

export type RealtimeConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error';

export interface LivePriceUpdate {
  asset_id: number;
  symbol: string;
  name: string;
  asset_type: 'stock' | 'crypto';
  last_close: number;
  change: number;
  change_pct: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  timestamp: string;
  source: string;
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

export interface FactorDetail {
  column: string;
  label: string;
  meaning: string;
  contribution: number;
  value: number;
  direction: 'supporting' | 'working against';
}

export interface ModelPrediction {
  predicted_label: 'down' | 'flat' | 'up';
  confidence: number;
  probabilities: { down: number; flat: number; up: number };
  top_factors: FactorDetail[];
  sentence: string;
}

export interface ModelDataResponse {
  has_models?: boolean;
  message?: string;
  asset?: Asset;
  prediction?: ModelPrediction;
  model_run?: ModelRun;
  as_of?: string;
  validation_summary?: any;
  strategy_backtests?: StrategyBacktest[];
  recent_runs?: ModelRun[];
}

export interface SimulationTrade {
  id: string;
  timestamp: string;
  barIndex: number;
  action: 'BUY' | 'SELL';
  price: number;
  shares: number;
  tradeCost: number;
  fee: number;
  realizedPnl: number;
  pnlPct: number;
  portfolioEquityAfter: number;
  cashAfter: number;
  reasonEn: string;
  reasonFa: string;
  modelUsed: string;
}

export interface SimulationEquityPoint {
  timestamp: string;
  barIndex: number;
  price: number;
  cash: number;
  holdings: number;
  holdingsValue: number;
  portfolioEquity: number;
  benchmarkEquity: number;
  drawdownPct: number;
  actionTaken?: 'BUY' | 'SELL' | 'HOLD';
  tradeId?: string;
}

export interface SimulationResults {
  modelId: string;
  modelName: string;
  initialCapital: number;
  finalEquity: number;
  totalReturnPct: number;
  totalProfit: number;
  benchmarkReturnPct: number;
  alphaPct: number;
  totalTrades: number;
  totalClosedTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  avgWinPct: number;
  avgLossPct: number;
  equityCurve: SimulationEquityPoint[];
  trades: SimulationTrade[];
  currentPosition: {
    shares: number;
    avgCost: number;
    currentValue: number;
    unrealizedPnl: number;
    unrealizedPnlPct: number;
  };
  metrics?: {
    calmarRatio: number;
    maxConsecutiveLosses: number;
    avgTradeHoldingBars: number;
    exposurePct: number;
  };
}

export interface ModelBenchmarkResult {
  modelId: string;
  modelName: string;
  provider: 'groq' | 'gemini' | 'quant';
  latencyMs: number;
  tokensPerSecond: number;
  tokensUsed: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  probabilities: { up: number; flat: number; down: number };
  suggestedPosition: {
    sizePct: number;
    stopLoss: number;
    takeProfit: number;
    riskRewardRatio: number;
  };
  reasoningEn: string;
  reasoningFa: string;
  drivers: { factor: string; impact: string; weight: number }[];
  efficiencyScore: number;
  isWinner?: boolean;
}

export interface AiTournamentResponse {
  winner: ModelBenchmarkResult;
  models: ModelBenchmarkResult[];
  consensus: {
    action: 'BUY' | 'SELL' | 'HOLD';
    agreementScorePct: number;
    avgConfidence: number;
    syntheticConviction: string;
  };
}

export interface CustomModelArchitecture {
  id: string;
  name: string;
  type: 'mlp' | 'transformer' | 'ensemble' | 'statistical_regressor' | 'reinforcement_learning';
  descriptionEn: string;
  descriptionFa: string;
  hiddenLayers: number[];
  activation: 'relu' | 'gelu' | 'swish' | 'leaky_relu';
  dropout: number;
  batchNorm: boolean;
  learningRate: number;
  optimizer: 'adamw' | 'sgd_momentum' | 'rmsprop';
  lossFunction: 'sharpe_loss' | 'huber' | 'quantile' | 'cross_entropy';
  regularizationL2: number;
  epochs: number;
  batchSize: number;
  attentionHeads?: number;
  features: string[];
  strategyParams: {
    takeProfitPct: number;
    stopLossPct: number;
    buyRsiThresh: number;
    sellRsiThresh: number;
    positionSizePct: number;
    sentimentWeight: number;
    volatilityGating: boolean;
  };
  metrics?: {
    status: 'profitable' | 'loss' | 'break_even';
    roiPct: number;
    sharpe: number;
    winRatePct: number;
    maxDrawdownPct: number;
    trainLoss: number;
    valLoss: number;
    accuracyPct: number;
    totalTrades: number;
  };
  diagnostics?: {
    status: 'profitable' | 'loss' | 'break_even';
    summaryEn: string;
    summaryFa: string;
    rootCausesEn: string[];
    rootCausesFa: string[];
    recommendationsEn: string[];
    recommendationsFa: string[];
  };
  lossHistory?: {
    epoch: number;
    trainLoss: number;
    valLoss: number;
    accuracy: number;
    sharpe: number;
  }[];
  featureImportances?: {
    feature: string;
    importance: number;
    weight: number;
  }[];
  createdAt?: string;
  trainedAt?: string;
}

