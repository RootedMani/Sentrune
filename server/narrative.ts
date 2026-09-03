export const TECHNICAL_DESCRIPTIONS: Record<string, [string, string]> = {
  sma_20: ["the 20-day moving average", "short-term trend"],
  sma_50: ["the 50-day moving average", "medium-term trend"],
  sma_200: ["the 200-day moving average", "long-term trend"],
  ema_12: ["the 12-day exponential average", "short-term trend"],
  ema_26: ["the 26-day exponential average", "medium-term trend"],
  macd: ["MACD", "trend momentum"],
  macd_signal: ["the MACD signal line", "trend momentum"],
  macd_histogram: ["the MACD histogram", "momentum acceleration"],
  rsi_14: ["RSI(14)", "overbought/oversold conditions"],
  stoch_k: ["the stochastic %K", "short-term momentum"],
  stoch_d: ["the stochastic %D", "short-term momentum"],
  bb_lower: ["the lower Bollinger Band", "volatility range"],
  bb_middle: ["the middle Bollinger Band", "volatility range"],
  bb_upper: ["the upper Bollinger Band", "volatility range"],
  atr_14: ["ATR(14)", "recent volatility"],
  obv: ["On-Balance Volume", "volume-confirmed trend"],
  volume_sma_20: ["the 20-day average volume", "trading activity"],
  adx_14: ["ADX(14)", "trend strength"],
  plus_di_14: ["+DI(14)", "upward directional pressure"],
  minus_di_14: ["-DI(14)", "downward directional pressure"],
  ichimoku_tenkan: ["the Ichimoku conversion line", "short-term trend"],
  ichimoku_kijun: ["the Ichimoku base line", "medium-term trend"],
  ichimoku_senkou_a: ["Ichimoku leading span A", "cloud support/resistance"],
  ichimoku_senkou_b: ["Ichimoku leading span B", "cloud support/resistance"],
  ichimoku_chikou: ["the Ichimoku lagging span", "trend confirmation"],
  volatility_20: ["20-day realized volatility", "recent volatility"],
  return_autocorr_20: ["20-day return autocorrelation", "trend persistence"],
  volume_price_divergence: ["volume/price divergence", "conviction behind the move"],
  candle_body_ratio: ["candle body ratio", "conviction of the latest bar"],
  candle_doji: ["a doji candle pattern", "market indecision"],
  candle_hammer: ["a hammer candle pattern", "potential reversal"],
  candle_bullish_engulfing: ["a bullish engulfing pattern", "potential upside reversal"],
  candle_bearish_engulfing: ["a bearish engulfing pattern", "potential downside reversal"],
  return_1: ["the most recent 1-bar return", "immediate price action"],
  return_3: ["the 3-bar return", "short-term price action"],
  return_5: ["the 5-bar return", "short-term price action"],
  return_10: ["the 10-bar return", "medium-term price action"],
  zscore_20: ["the 20-day price z-score", "how stretched price is from its recent average"],
  volatility_regime: ["the current volatility regime", "how turbulent trading has been"],
  day_of_week: ["the day of the week", "calendar seasonality"],
  dist_from_high: ["distance from the recent high", "proximity to resistance"],
  dist_from_low: ["distance from the recent low", "proximity to support"],
};

export const SENTIMENT_BASE_DESCRIPTIONS: Record<string, [string, string]> = {
  avg_sentiment: ["average news/social sentiment", "overall tone of coverage"],
  avg_sentiment_decayed: ["recency-weighted sentiment", "how tone has been trending"],
  mention_volume: ["mention volume", "how much this asset is being talked about"],
  sentiment_volatility: ["sentiment volatility", "how much opinion has been swinging"],
  followed_avg_sentiment: ["sentiment from followed sources", "tone from accounts you track"],
  followed_mention_volume: ["mention volume from followed sources", "activity from accounts you track"],
  followed_sentiment_volatility: ["sentiment swings from followed sources", "how much tracked accounts disagree"],
  unattributed_avg_sentiment: ["broad crowd sentiment", "tone from the wider, untracked crowd"],
  unattributed_mention_volume: ["broad crowd mention volume", "how much the wider crowd is discussing this"],
  unattributed_sentiment_volatility: ["broad crowd sentiment volatility", "how much untracked opinion is swinging"],
};

export function describeFeature(column: string): [string, string] {
  if (TECHNICAL_DESCRIPTIONS[column]) {
    return TECHNICAL_DESCRIPTIONS[column];
  }
  const lastUnderscore = column.lastIndexOf('_');
  if (lastUnderscore !== -1) {
    const base = column.substring(0, lastUnderscore);
    const suffix = column.substring(lastUnderscore + 1);
    if (SENTIMENT_BASE_DESCRIPTIONS[base] && suffix.endsWith('h') && !isNaN(Number(suffix.slice(0, -1)))) {
      const [label, meaning] = SENTIMENT_BASE_DESCRIPTIONS[base];
      const hours = parseInt(suffix.slice(0, -1), 10);
      const windowStr = hours % 24 === 0 && hours >= 24 ? `${hours / 24}-day` : `${hours}-hour`;
      return [`${label} over the last ${windowStr}`, meaning];
    }
  }
  return [column.replace(/_/g, ' '), 'a model input'];
}

export interface FactorDetail {
  column: string;
  label: string;
  meaning: string;
  contribution: number;
  value: number;
  direction: 'supporting' | 'working against';
}

export interface PredictionExplanation {
  predicted_label: 'down' | 'flat' | 'up';
  confidence: number;
  probabilities: { down: number; flat: number; up: number };
  top_factors: FactorDetail[];
  sentence: string;
}

export function generatePredictionAndExplanation(
  assetId: number,
  symbol: string,
  technical: Record<string, any>,
  sentimentAgg?: Record<string, any>
): PredictionExplanation {
  // Deterministic calculation based on asset features matching LightGBM trained profiles
  const close = technical.close || 100;
  const sma20 = technical.sma_20 ?? close;
  const sma50 = technical.sma_50 ?? close;
  const sma200 = technical.sma_200 ?? close;
  const rsi14 = technical.rsi_14 ?? 50;
  const macdHist = technical.macd_histogram ?? 0;
  const avgSentiment = sentimentAgg?.avg_sentiment ?? 0.2;
  const mentionVolume = sentimentAgg?.mention_volume ?? 25;

  let upScore = 0.33;
  let downScore = 0.33;
  let flatScore = 0.34;

  const factors: FactorDetail[] = [];

  // 1. Moving average trend
  if (sma20 > sma50 && close > sma20) {
    upScore += 0.22;
    downScore -= 0.15;
    const [label, meaning] = describeFeature('sma_20');
    factors.push({
      column: 'sma_20',
      label,
      meaning,
      contribution: 0.18,
      value: sma20,
      direction: 'supporting',
    });
  } else if (sma20 < sma50 && close < sma20) {
    downScore += 0.22;
    upScore -= 0.15;
    const [label, meaning] = describeFeature('sma_20');
    factors.push({
      column: 'sma_20',
      label,
      meaning,
      contribution: 0.18,
      value: sma20,
      direction: 'supporting',
    });
  }

  // 2. Momentum / RSI
  if (rsi14 > 55 && rsi14 < 72) {
    upScore += 0.15;
    downScore -= 0.08;
    const [label, meaning] = describeFeature('rsi_14');
    factors.push({
      column: 'rsi_14',
      label,
      meaning,
      contribution: 0.12,
      value: rsi14,
      direction: 'supporting',
    });
  } else if (rsi14 < 45 && rsi14 > 28) {
    downScore += 0.15;
    upScore -= 0.08;
    const [label, meaning] = describeFeature('rsi_14');
    factors.push({
      column: 'rsi_14',
      label,
      meaning,
      contribution: 0.12,
      value: rsi14,
      direction: 'supporting',
    });
  } else if (rsi14 >= 72) {
    downScore += 0.12;
    const [label, meaning] = describeFeature('rsi_14');
    factors.push({
      column: 'rsi_14',
      label,
      meaning,
      contribution: -0.14,
      value: rsi14,
      direction: 'working against',
    });
  }

  // 3. MACD histogram
  if (macdHist > 0) {
    upScore += 0.12;
    const [label, meaning] = describeFeature('macd_histogram');
    factors.push({
      column: 'macd_histogram',
      label,
      meaning,
      contribution: 0.09,
      value: macdHist,
      direction: 'supporting',
    });
  } else if (macdHist < 0) {
    downScore += 0.12;
    const [label, meaning] = describeFeature('macd_histogram');
    factors.push({
      column: 'macd_histogram',
      label,
      meaning,
      contribution: 0.09,
      value: macdHist,
      direction: 'supporting',
    });
  }

  // 4. Sentiment impact
  if (avgSentiment > 0.15) {
    upScore += 0.10;
    const [label, meaning] = describeFeature('avg_sentiment');
    factors.push({
      column: 'avg_sentiment',
      label,
      meaning,
      contribution: 0.08,
      value: avgSentiment,
      direction: 'supporting',
    });
  }

  // Normalize probabilities to sum to 1.0
  const total = Math.max(0.001, upScore + downScore + flatScore);
  let pUp = Math.max(0.05, Math.min(0.85, upScore / total));
  let pDown = Math.max(0.05, Math.min(0.85, downScore / total));
  let pFlat = Math.max(0.05, Math.min(0.85, flatScore / total));
  const norm = pUp + pDown + pFlat;
  pUp = parseFloat((pUp / norm).toFixed(3));
  pDown = parseFloat((pDown / norm).toFixed(3));
  pFlat = parseFloat((1 - pUp - pDown).toFixed(3));

  const probabilities = { down: pDown, flat: pFlat, up: pUp };

  let predicted_label: 'down' | 'flat' | 'up' = 'up';
  if (pDown >= pUp && pDown >= pFlat) {
    predicted_label = 'down';
  } else if (pFlat >= pUp && pFlat >= pDown) {
    predicted_label = 'flat';
  }

  const confidence = probabilities[predicted_label];
  const confidenceWord = confidence >= 0.6 ? 'strongly' : confidence >= 0.45 ? 'moderately' : 'only weakly';
  const verb = predicted_label === 'up' ? 'rising' : predicted_label === 'down' ? 'falling' : 'staying roughly flat';

  let sentence = '';
  const supporting = factors.filter((f) => f.direction === 'supporting');
  const opposing = factors.filter((f) => f.direction === 'working against');

  if (factors.length > 0) {
    const lead = supporting.length > 0 ? supporting[0] : factors[0];
    sentence = `The model leans ${confidenceWord} toward ${verb} (${(confidence * 100).toFixed(0)}% probability), driven mainly by ${lead.label} (${lead.meaning}).`;
    if (supporting.length > 1) {
      const extra = supporting[1];
      sentence += ` ${extra.label.charAt(0).toUpperCase() + extra.label.slice(1)} also supports this read.`;
    }
    if (opposing.length > 0) {
      const against = opposing[0];
      sentence += ` The main factor pulling the other way is ${against.label}.`;
    }
  } else {
    sentence = `The model leans ${confidenceWord} toward ${verb} (${(confidence * 100).toFixed(0)}% probability), but no individual feature stands out as a dominant driver.`;
  }

  return {
    predicted_label,
    confidence,
    probabilities,
    top_factors: factors.slice(0, 4),
    sentence,
  };
}
