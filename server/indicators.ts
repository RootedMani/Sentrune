import { PriceBar, TechnicalFeature } from './db.js';

export function calculateIndicators(bars: PriceBar[]): TechnicalFeature[] {
  if (!bars || bars.length === 0) return [];

  // Sort bars chronologically
  const sorted = [...bars].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const closes = sorted.map((b) => b.close);
  const highs = sorted.map((b) => b.high);
  const lows = sorted.map((b) => b.low);
  const opens = sorted.map((b) => b.open);
  const volumes = sorted.map((b) => b.volume || 0);

  const n = sorted.length;
  const results: TechnicalFeature[] = [];

  // Helper functions
  const sma = (series: number[], period: number, idx: number): number | null => {
    if (idx < period - 1) return null;
    let sum = 0;
    for (let i = idx - period + 1; i <= idx; i++) sum += series[i];
    return sum / period;
  };

  // EMA series calculation
  const calcEMA = (series: number[], period: number): (number | null)[] => {
    const emaArr: (number | null)[] = [];
    const k = 2 / (period + 1);
    let prevEma: number | null = null;
    for (let i = 0; i < series.length; i++) {
      if (i < period - 1) {
        emaArr.push(null);
      } else if (i === period - 1) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += series[j];
        prevEma = sum / period;
        emaArr.push(prevEma);
      } else {
        prevEma = series[i] * k + (prevEma as number) * (1 - k);
        emaArr.push(prevEma);
      }
    }
    return emaArr;
  };

  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);

  // MACD Line = EMA12 - EMA26
  const macdLine: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (ema12[i] !== null && ema26[i] !== null) {
      macdLine.push((ema12[i] as number) - (ema26[i] as number));
    } else {
      macdLine.push(null);
    }
  }

  // MACD Signal = 9 period EMA of MACD Line
  const validMacdIndices = macdLine.map((v, i) => (v !== null ? i : -1)).filter((i) => i !== -1);
  const macdSignal: (number | null)[] = new Array(n).fill(null);
  const macdHist: (number | null)[] = new Array(n).fill(null);

  if (validMacdIndices.length >= 9) {
    const validMacdVals = validMacdIndices.map((i) => macdLine[i] as number);
    const sigVals = calcEMA(validMacdVals, 9);
    for (let k = 0; k < validMacdIndices.length; k++) {
      const origIdx = validMacdIndices[k];
      macdSignal[origIdx] = sigVals[k];
      if (macdLine[origIdx] !== null && sigVals[k] !== null) {
        macdHist[origIdx] = (macdLine[origIdx] as number) - (sigVals[k] as number);
      }
    }
  }

  // RSI 14
  const rsi: (number | null)[] = new Array(n).fill(null);
  if (n > 14) {
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= 14; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    let avgGain = gains / 14;
    let avgLoss = losses / 14;
    rsi[14] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

    for (let i = 15; i < n; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * 13 + gain) / 14;
      avgLoss = (avgLoss * 13 + loss) / 14;
      rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
  }

  // OBV
  let currentObv = 0;
  const obvArr: number[] = [0];
  for (let i = 1; i < n; i++) {
    if (closes[i] > closes[i - 1]) currentObv += volumes[i];
    else if (closes[i] < closes[i - 1]) currentObv -= volumes[i];
    obvArr.push(currentObv);
  }

  // Generate full features
  for (let i = 0; i < n; i++) {
    const bar = sorted[i];
    const s20 = sma(closes, 20, i);
    const s50 = sma(closes, 50, i);
    const s200 = sma(closes, 200, i);
    const volSma20 = sma(volumes, 20, i);

    // Bollinger bands (20, 2 std)
    let bbLower: number | null = null;
    let bbMiddle: number | null = s20;
    let bbUpper: number | null = null;
    if (i >= 19 && s20 !== null) {
      let variance = 0;
      for (let j = i - 19; j <= i; j++) variance += Math.pow(closes[j] - s20, 2);
      const std = Math.sqrt(variance / 20);
      bbLower = s20 - 2 * std;
      bbUpper = s20 + 2 * std;
    }

    // Stochastic %K %D (14, 3)
    let stochK: number | null = null;
    let stochD: number | null = null;
    if (i >= 13) {
      let minLow = lows[i];
      let maxHigh = highs[i];
      for (let j = i - 13; j <= i; j++) {
        if (lows[j] < minLow) minLow = lows[j];
        if (highs[j] > maxHigh) maxHigh = highs[j];
      }
      const range = maxHigh - minLow;
      stochK = range > 0 ? ((closes[i] - minLow) / range) * 100 : 50;
    }

    // ATR 14
    let atr14: number | null = null;
    if (i >= 13) {
      let trSum = 0;
      for (let j = i - 13; j <= i; j++) {
        const prevClose = j > 0 ? closes[j - 1] : opens[j];
        const tr = Math.max(highs[j] - lows[j], Math.abs(highs[j] - prevClose), Math.abs(lows[j] - prevClose));
        trSum += tr;
      }
      atr14 = trSum / 14;
    }

    // Candle patterns
    const body = Math.abs(closes[i] - opens[i]);
    const candleRange = Math.max(0.0001, highs[i] - lows[i]);
    const upperWick = highs[i] - Math.max(opens[i], closes[i]);
    const lowerWick = Math.min(opens[i], closes[i]) - lows[i];
    const bodyRatio = Math.min(1.0, body / candleRange);
    const candleDoji = bodyRatio < 0.1 ? 1 : 0;
    const candleHammer = lowerWick >= 2 * body && upperWick <= body && body > 0 ? 1 : 0;

    let candleBullishEngulfing = 0;
    let candleBearishEngulfing = 0;
    if (i > 0) {
      const prevOpen = opens[i - 1];
      const prevClose = closes[i - 1];
      const prevBodyLow = Math.min(prevOpen, prevClose);
      const prevBodyHigh = Math.max(prevOpen, prevClose);
      if (prevClose < prevOpen && closes[i] > opens[i] && opens[i] <= prevBodyLow && closes[i] >= prevBodyHigh) {
        candleBullishEngulfing = 1;
      }
      if (prevClose > prevOpen && closes[i] < opens[i] && opens[i] >= prevBodyHigh && closes[i] <= prevBodyLow) {
        candleBearishEngulfing = 1;
      }
    }

    // Returns
    const return1 = i >= 1 ? (closes[i] - closes[i - 1]) / closes[i - 1] : null;
    const return3 = i >= 3 ? (closes[i] - closes[i - 3]) / closes[i - 3] : null;
    const return5 = i >= 5 ? (closes[i] - closes[i - 5]) / closes[i - 5] : null;
    const return10 = i >= 10 ? (closes[i] - closes[i - 10]) / closes[i - 10] : null;

    // Volatility 20
    let vol20: number | null = null;
    if (i >= 19) {
      const rets: number[] = [];
      for (let j = i - 19; j <= i; j++) {
        if (j > 0) rets.push((closes[j] - closes[j - 1]) / closes[j - 1]);
      }
      const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
      const variance = rets.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rets.length;
      vol20 = Math.sqrt(variance);
    }

    const date = new Date(bar.timestamp);

    results.push({
      id: bar.id,
      asset_id: bar.asset_id,
      interval: bar.interval,
      timestamp: bar.timestamp,
      sma_20: s20 ? parseFloat(s20.toFixed(4)) : null,
      sma_50: s50 ? parseFloat(s50.toFixed(4)) : null,
      sma_200: s200 ? parseFloat(s200.toFixed(4)) : null,
      ema_12: ema12[i] !== null ? parseFloat((ema12[i] as number).toFixed(4)) : null,
      ema_26: ema26[i] !== null ? parseFloat((ema26[i] as number).toFixed(4)) : null,
      macd: macdLine[i] !== null ? parseFloat((macdLine[i] as number).toFixed(4)) : null,
      macd_signal: macdSignal[i] !== null ? parseFloat((macdSignal[i] as number).toFixed(4)) : null,
      macd_histogram: macdHist[i] !== null ? parseFloat((macdHist[i] as number).toFixed(4)) : null,
      rsi_14: rsi[i] !== null ? parseFloat((rsi[i] as number).toFixed(2)) : null,
      stoch_k: stochK !== null ? parseFloat(stochK.toFixed(2)) : null,
      stoch_d: stochD !== null ? parseFloat(stochD.toFixed(2)) : null,
      bb_lower: bbLower !== null ? parseFloat(bbLower.toFixed(4)) : null,
      bb_middle: bbMiddle !== null ? parseFloat(bbMiddle.toFixed(4)) : null,
      bb_upper: bbUpper !== null ? parseFloat(bbUpper.toFixed(4)) : null,
      atr_14: atr14 !== null ? parseFloat(atr14.toFixed(4)) : null,
      obv: obvArr[i],
      volume_sma_20: volSma20 ? parseFloat(volSma20.toFixed(2)) : null,
      candle_body_ratio: parseFloat(bodyRatio.toFixed(4)),
      candle_doji: candleDoji,
      candle_hammer: candleHammer,
      candle_bullish_engulfing: candleBullishEngulfing,
      candle_bearish_engulfing: candleBearishEngulfing,
      return_1: return1 !== null ? parseFloat(return1.toFixed(5)) : null,
      return_3: return3 !== null ? parseFloat(return3.toFixed(5)) : null,
      return_5: return5 !== null ? parseFloat(return5.toFixed(5)) : null,
      return_10: return10 !== null ? parseFloat(return10.toFixed(5)) : null,
      volatility_20: vol20 !== null ? parseFloat(vol20.toFixed(5)) : null,
      day_of_week: date.getUTCDay(),
      dist_from_high: highs[i] > 0 ? parseFloat(((highs[i] - closes[i]) / highs[i]).toFixed(4)) : 0,
      dist_from_low: lows[i] > 0 ? parseFloat(((closes[i] - lows[i]) / lows[i]).toFixed(4)) : 0,
    });
  }

  return results;
}
