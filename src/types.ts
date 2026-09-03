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
  candle_body_ratio?: number | null;
  candle_doji?: number | null;
  candle_hammer?: number | null;
  candle_bullish_engulfing?: number | null;
  candle_bearish_engulfing?: number | null;
  return_1?: number | null;
  return_3?: number | null;
  return_5?: number | null;
  return_10?: number | null;
  volatility_20?: number | null;
  day_of_week?: number | null;
  dist_from_high?: number | null;
  dist_from_low?: number | null;
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

export interface TopFactor {
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
  top_factors: TopFactor[];
  sentence: string;
}

export interface ValidationMetricSummary {
  model_name: string;
  folds: number;
  accuracy: number;
  log_loss: number;
}

export interface StrategyBacktestSummary {
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

export interface ModelRun {
  id: number;
  asset_id: number;
  interval: string;
  model_name: string;
  trained_at: string;
  model_path: string;
  feature_columns: string;
}

export interface ModelDataResponse {
  has_models: boolean;
  message?: string;
  asset: Asset;
  model_run?: ModelRun;
  as_of?: string;
  prediction?: ModelPrediction;
  validation_summary?: ValidationMetricSummary[];
  strategy_backtests?: StrategyBacktestSummary[];
  recent_runs?: ModelRun[];
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
  success: boolean;
  asset: Asset;
  latest_price: number;
  timestamp: string;
  tournament: {
    winner: ModelBenchmarkResult;
    models: ModelBenchmarkResult[];
    consensus: {
      action: 'BUY' | 'SELL' | 'HOLD';
      agreementScorePct: number;
      avgConfidence: number;
      syntheticConviction: string;
    };
  };
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
}

export interface SimulationResponse {
  success: boolean;
  asset: Asset;
  simulation: SimulationResults;
}

export interface SimulationCompareResponse {
  success: boolean;
  asset: Asset;
  best_model: SimulationResults;
  comparisons: SimulationResults[];
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
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}
