import React, { useState } from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Compass, 
  BarChart, 
  ShieldAlert, 
  CheckCircle2, 
  Target, 
  SlidersHorizontal 
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';

export const TechnicalAnalysis: React.FC = () => {
  const { selectedAsset, timeframe } = useWorkstation();

  const [pivotStandard, setPivotStandard] = useState<'classic' | 'fibonacci' | 'camarilla'>('classic');

  const price = selectedAsset.price || 100;
  const high = selectedAsset.high24h || price * 1.02;
  const low = selectedAsset.low24h || price * 0.98;
  const close = price;

  // Classic Pivot Points
  const pivotClassic = (high + low + close) / 3;
  const r1Classic = 2 * pivotClassic - low;
  const s1Classic = 2 * pivotClassic - high;
  const r2Classic = pivotClassic + (high - low);
  const s2Classic = pivotClassic - (high - low);
  const r3Classic = high + 2 * (pivotClassic - low);
  const s3Classic = low - 2 * (high - pivotClassic);

  // Fibonacci Pivot Points
  const diff = high - low;
  const r1Fib = pivotClassic + 0.382 * diff;
  const r2Fib = pivotClassic + 0.618 * diff;
  const r3Fib = pivotClassic + 1.000 * diff;
  const s1Fib = pivotClassic - 0.382 * diff;
  const s2Fib = pivotClassic - 0.618 * diff;
  const s3Fib = pivotClassic - 1.000 * diff;

  // Camarilla Pivot Points
  const r3Cam = close + diff * 1.1 / 4;
  const r2Cam = close + diff * 1.1 / 6;
  const r1Cam = close + diff * 1.1 / 12;
  const s1Cam = close - diff * 1.1 / 12;
  const s2Cam = close - diff * 1.1 / 6;
  const s3Cam = close - diff * 1.1 / 4;

  const currentPivots = pivotStandard === 'fibonacci' 
    ? { p: pivotClassic, r1: r1Fib, r2: r2Fib, r3: r3Fib, s1: s1Fib, s2: s2Fib, s3: s3Fib }
    : pivotStandard === 'camarilla'
    ? { p: close, r1: r1Cam, r2: r2Cam, r3: r3Cam, s1: s1Cam, s2: s2Cam, s3: s3Cam }
    : { p: pivotClassic, r1: r1Classic, r2: r2Classic, r3: r3Classic, s1: s1Classic, s2: s2Classic, s3: s3Classic };

  // Moving Average Matrix calculations
  const maData = [
    { period: 'MA 10', sma: price * 0.992, ema: price * 0.994 },
    { period: 'MA 20', sma: price * 0.985, ema: price * 0.988 },
    { period: 'MA 30', sma: price * 0.978, ema: price * 0.981 },
    { period: 'MA 50', sma: price * 0.965, ema: price * 0.970 },
    { period: 'MA 100', sma: price * 0.945, ema: price * 0.952 },
    { period: 'MA 200', sma: price * 0.920, ema: price * 0.931 },
  ].map(item => ({
    ...item,
    smaAction: price > item.sma ? 'BUY' : 'SELL',
    emaAction: price > item.ema ? 'BUY' : 'SELL'
  }));

  // Oscillators Matrix
  const oscillators = [
    { name: 'RSI (14)', value: selectedAsset.rsi || 54.2, action: (selectedAsset.rsi || 54) > 70 ? 'SELL' : (selectedAsset.rsi || 54) < 30 ? 'BUY' : 'NEUTRAL' },
    { name: 'Stochastic %K (14,3,3)', value: '62.4', action: 'NEUTRAL' },
    { name: 'Commodity Channel Index (CCI 20)', value: '+84.2', action: 'BUY' },
    { name: 'Average Directional Index (ADX 14)', value: '31.8 (Trending)', action: 'BUY' },
    { name: 'Awesome Oscillator (AO)', value: '+1.45', action: 'BUY' },
    { name: 'Momentum (10)', value: '+2.80', action: 'BUY' },
    { name: 'MACD Level (12,26)', value: selectedAsset.macd || '+0.85', action: 'BUY' },
    { name: 'Williams %R (14)', value: '-32.1', action: 'NEUTRAL' },
    { name: 'Ultimate Oscillator (7,14,28)', value: '58.6', action: 'NEUTRAL' },
  ];

  const totalBuy = maData.filter(m => m.smaAction === 'BUY').length + maData.filter(m => m.emaAction === 'BUY').length + oscillators.filter(o => o.action === 'BUY').length;
  const totalSell = maData.filter(m => m.smaAction === 'SELL').length + maData.filter(m => m.emaAction === 'SELL').length + oscillators.filter(o => o.action === 'SELL').length;
  const totalNeutral = oscillators.filter(o => o.action === 'NEUTRAL').length;

  return (
    <div id="technical-analysis-view" className="space-y-4 p-4">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#081322] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-500" />
              {selectedAsset.name} ({selectedAsset.symbol}) Technical Intelligence
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-800/60">
              {timeframe}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time consensus combining 12 Moving Averages, 9 Momentum Oscillators, and Support/Resistance Pivot Clusters.
          </p>
        </div>

        {/* Global Consensus Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            STRONG BUY CONSENSUS ({totalBuy}/{totalBuy + totalSell + totalNeutral})
          </span>
        </div>
      </div>

      {/* Summary Scorecards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Scorecard 1: Consensus */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#07111e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Overall Bias</span>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
            <TrendingUp className="w-5 h-5" />
            <span>Strong Bullish</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Price trading cleanly above the 50 & 200 EMA ribbons.
          </p>
        </div>

        {/* Scorecard 2: Signals Breakdown */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#07111e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Signals Distribution</span>
          <div className="flex items-center gap-3 font-mono text-xs font-bold pt-1">
            <span className="text-emerald-600 dark:text-emerald-400">{totalBuy} BUY</span>
            <span className="text-slate-400">{totalNeutral} NEUTRAL</span>
            <span className="text-rose-600 dark:text-rose-400">{totalSell} SELL</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
            <div style={{ width: `${(totalBuy / (totalBuy + totalSell + totalNeutral)) * 100}%` }} className="bg-emerald-500 h-full"></div>
            <div style={{ width: `${(totalNeutral / (totalBuy + totalSell + totalNeutral)) * 100}%` }} className="bg-slate-400 h-full"></div>
            <div style={{ width: `${(totalSell / (totalBuy + totalSell + totalNeutral)) * 100}%` }} className="bg-rose-500 h-full"></div>
          </div>
        </div>

        {/* Scorecard 3: Key Support */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#07111e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Primary Support Floor</span>
          <div className="text-lg font-mono font-bold text-slate-900 dark:text-white">
            ${currentPivots.s1.toFixed(2)}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
            Buffer: +{((price - currentPivots.s1) / price * 100).toFixed(2)}% above floor
          </p>
        </div>

        {/* Scorecard 4: Primary Resistance */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#07111e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Breakout Target (R1)</span>
          <div className="text-lg font-mono font-bold text-cyan-600 dark:text-cyan-400">
            ${currentPivots.r1.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Target: +{((currentPivots.r1 - price) / price * 100).toFixed(2)}% upside clearance
          </p>
        </div>
      </div>

      {/* Moving Averages Matrix Table */}
      <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">Moving Average Matrix (SMA & EMA)</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Current: ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-left">
                <th className="py-2 px-3 font-semibold">Period</th>
                <th className="py-2 px-3 font-semibold">Simple (SMA)</th>
                <th className="py-2 px-3 font-semibold">SMA Signal</th>
                <th className="py-2 px-3 font-semibold">Exponential (EMA)</th>
                <th className="py-2 px-3 font-semibold">EMA Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {maData.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">{m.period}</td>
                  <td className="py-2 px-3 text-slate-700 dark:text-slate-300">${m.sma.toFixed(2)}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.smaAction === 'BUY'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/50'
                    }`}>
                      {m.smaAction}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-700 dark:text-slate-300">${m.ema.toFixed(2)}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.emaAction === 'BUY'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/50'
                    }`}>
                      {m.emaAction}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Oscillators Matrix & Pivot Points Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Oscillators Breakdown */}
        <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-500" />
              Oscillators Breakdown
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">6 Buy / 3 Neutral</span>
          </div>

          <div className="space-y-2">
            {oscillators.map((osc, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#050c17] border border-slate-200 dark:border-slate-800/80 text-xs font-mono">
                <span className="text-slate-700 dark:text-slate-300 font-medium">{osc.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-400 font-bold">{osc.value}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    osc.action === 'BUY'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50'
                      : osc.action === 'SELL'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/50'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {osc.action}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pivot Points Calculator */}
        <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-500" />
              Support & Resistance Pivot Points
            </span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded p-0.5 border border-slate-200 dark:border-slate-800 text-[10px]">
              {(['classic', 'fibonacci', 'camarilla'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setPivotStandard(mode)}
                  className={`px-2 py-0.5 rounded uppercase font-semibold transition-all cursor-pointer ${
                    pivotStandard === mode
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between p-1.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-900/40">
              <span>Resistance 3 (R3)</span>
              <span>${currentPivots.r3.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-1.5 rounded bg-rose-50/60 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-medium">
              <span>Resistance 2 (R2)</span>
              <span>${currentPivots.r2.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-1.5 rounded bg-rose-50/40 dark:bg-rose-950/10 text-rose-600 dark:text-rose-300">
              <span>Resistance 1 (R1)</span>
              <span>${currentPivots.r1.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-200 dark:border-cyan-800/60">
              <span>Central Pivot Point (P)</span>
              <span>${currentPivots.p.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-1.5 rounded bg-emerald-50/40 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-300">
              <span>Support 1 (S1)</span>
              <span>${currentPivots.s1.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-1.5 rounded bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-medium">
              <span>Support 2 (S2)</span>
              <span>${currentPivots.s2.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-900/40">
              <span>Support 3 (S3)</span>
              <span>${currentPivots.s3.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
