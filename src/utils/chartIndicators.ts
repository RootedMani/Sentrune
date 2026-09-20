export interface OHLCVBar {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LinePoint {
  time: number;
  value: number;
}

export interface HistogramPoint {
  time: number;
  value: number;
  color?: string;
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(bars: OHLCVBar[], period: number): LinePoint[] {
  const result: LinePoint[] = [];
  if (bars.length < period) return result;

  for (let i = period - 1; i < bars.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += bars[i - j].close;
    }
    result.push({
      time: bars[i].time,
      value: Number((sum / period).toFixed(2)),
    });
  }
  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(bars: OHLCVBar[], period: number): LinePoint[] {
  const result: LinePoint[] = [];
  if (bars.length < period) return result;

  const k = 2 / (period + 1);

  // Initial SMA as first EMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += bars[i].close;
  }
  let prevEma = sum / period;
  result.push({
    time: bars[period - 1].time,
    value: Number(prevEma.toFixed(2)),
  });

  for (let i = period; i < bars.length; i++) {
    const currentEma = bars[i].close * k + prevEma * (1 - k);
    result.push({
      time: bars[i].time,
      value: Number(currentEma.toFixed(2)),
    });
    prevEma = currentEma;
  }
  return result;
}

/**
 * Calculate Bollinger Bands (Middle SMA, Upper, Lower)
 */
export function calculateBollingerBands(
  bars: OHLCVBar[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: LinePoint[]; middle: LinePoint[]; lower: LinePoint[] } {
  const upper: LinePoint[] = [];
  const middle: LinePoint[] = [];
  const lower: LinePoint[] = [];

  if (bars.length < period) return { upper, middle, lower };

  for (let i = period - 1; i < bars.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += bars[i - j].close;
    }
    const sma = sum / period;

    let variance = 0;
    for (let j = 0; j < period; j++) {
      variance += Math.pow(bars[i - j].close - sma, 2);
    }
    const stdDev = Math.sqrt(variance / period);

    const time = bars[i].time;
    middle.push({ time, value: Number(sma.toFixed(2)) });
    upper.push({ time, value: Number((sma + stdDev * stdDevMultiplier).toFixed(2)) });
    lower.push({ time, value: Number((sma - stdDev * stdDevMultiplier).toFixed(2)) });
  }

  return { upper, middle, lower };
}

/**
 * Calculate Volume-Weighted Average Price (VWAP)
 */
export function calculateVWAP(bars: OHLCVBar[]): LinePoint[] {
  const result: LinePoint[] = [];
  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    cumulativeTypicalVolume += typicalPrice * bar.volume;
    cumulativeVolume += bar.volume;

    const vwap = cumulativeVolume > 0 ? cumulativeTypicalVolume / cumulativeVolume : bar.close;
    result.push({
      time: bar.time,
      value: Number(vwap.toFixed(2)),
    });
  }
  return result;
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(bars: OHLCVBar[], period: number = 14): LinePoint[] {
  const result: LinePoint[] = [];
  if (bars.length <= period) return result;

  let gains = 0;
  let losses = 0;

  // First period average gain & loss
  for (let i = 1; i <= period; i++) {
    const diff = bars[i].close - bars[i - 1].close;
    if (diff >= 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - 100 / (1 + rs);

  result.push({
    time: bars[period].time,
    value: Number(rsi.toFixed(2)),
  });

  // Smoothed RS
  for (let i = period + 1; i < bars.length; i++) {
    const diff = bars[i].close - bars[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - 100 / (1 + rs);

    result.push({
      time: bars[i].time,
      value: Number(rsi.toFixed(2)),
    });
  }

  return result;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  bars: OHLCVBar[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macdLine: LinePoint[];
  signalLine: LinePoint[];
  histogram: HistogramPoint[];
} {
  const fastEMA = calculateEMA(bars, fastPeriod);
  const slowEMA = calculateEMA(bars, slowPeriod);

  // Map slowEMA times to fastEMA
  const fastMap = new Map<number, number>(fastEMA.map(p => [p.time, p.value]));
  const macdBars: { time: number; close: number }[] = [];

  for (const slow of slowEMA) {
    const fastVal = fastMap.get(slow.time);
    if (fastVal !== undefined) {
      macdBars.push({
        time: slow.time,
        close: fastVal - slow.value,
      });
    }
  }

  const macdLine: LinePoint[] = macdBars.map(b => ({ time: b.time, value: Number(b.close.toFixed(2)) }));

  // Calculate signal line as EMA of macdLine
  const signalLine: LinePoint[] = [];
  const k = 2 / (signalPeriod + 1);

  if (macdBars.length >= signalPeriod) {
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) {
      sum += macdBars[i].close;
    }
    let prevSignal = sum / signalPeriod;
    signalLine.push({
      time: macdBars[signalPeriod - 1].time,
      value: Number(prevSignal.toFixed(2)),
    });

    for (let i = signalPeriod; i < macdBars.length; i++) {
      const currentSignal = macdBars[i].close * k + prevSignal * (1 - k);
      signalLine.push({
        time: macdBars[i].time,
        value: Number(currentSignal.toFixed(2)),
      });
      prevSignal = currentSignal;
    }
  }

  const signalMap = new Map<number, number>(signalLine.map(s => [s.time, s.value]));
  const histogram: HistogramPoint[] = [];

  for (const m of macdLine) {
    const sVal = signalMap.get(m.time);
    if (sVal !== undefined) {
      const histVal = Number((m.value - sVal).toFixed(2));
      histogram.push({
        time: m.time,
        value: histVal,
        color: histVal >= 0 ? '#10b981' : '#f43f5e',
      });
    }
  }

  return { macdLine, signalLine, histogram };
}
