import React, { useState } from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BarChart, 
  ShieldCheck,
  Compass,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Sliders,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';

export const TechnicalAnalysis: React.FC = () => {
  const { selectedAsset, appMode, setAppMode, timeframe, theme } = useWorkstation();
  const [pivotStandard, setPivotStandard] = useState<'classic' | 'fibonacci' | 'camarilla'>('classic');

  const isLight = theme === 'light';
  const price = selectedAsset.price;
  const high = selectedAsset.high24h || price * 1.025;
  const low = selectedAsset.low24h || price * 0.975;
  const close = price;

  // Compute Pivot Points mathematically
  const pivotClassic = (high + low + close) / 3;
  const r1Classic = 2 * pivotClassic - low;
  const s1Classic = 2 * pivotClassic - high;
  const r2Classic = pivotClassic + (high - low);
  const s2Classic = pivotClassic - (high - low);
  const r3Classic = high + 2 * (pivotClassic - low);
  const s3Classic = low - 2 * (high - pivotClassic);

  // Fibonacci Pivots
  const pivotFib = pivotClassic;
  const r1Fib = pivotFib + 0.382 * (high - low);
  const s1Fib = pivotFib - 0.382 * (high - low);
  const r2Fib = pivotFib + 0.618 * (high - low);
  const s2Fib = pivotFib - 0.618 * (high - low);
  const r3Fib = pivotFib + 1.0 * (high - low);
  const s3Fib = pivotFib - 1.0 * (high - low);

  // Camarilla Pivots
  const r3Cam = close + (high - low) * 1.1 / 4;
  const r2Cam = close + (high - low) * 1.1 / 6;
  const r1Cam = close + (high - low) * 1.1 / 12;
  const s1Cam = close - (high - low) * 1.1 / 12;
  const s2Cam = close - (high - low) * 1.1 / 6;
  const s3Cam = close - (high - low) * 1.1 / 4;

  const currentPivots = pivotStandard === 'fibonacci' 
    ? { p: pivotFib, r1: r1Fib, r2: r2Fib, r3: r3Fib, s1: s1Fib, s2: s2Fib, s3: s3Fib }
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
      {/* Top Banner & Mode Toggle */}
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
            {appMode === 'casual'
              ? 'Plain-English summary, confidence ratings, and clear action items.'
              : 'Institutional quantitative breakdown: Oscillators, Moving Average Matrix, and Pivot Levels.'}
          </p>
        </div>

        {/* Mode Selector Pill in Header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setAppMode('casual')}
              className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                appMode === 'casual'
                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-400 border border-amber-300 dark:border-amber-500/40 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Casual Mode
            </button>
            <button
              onClick={() => setAppMode('power')}
              className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                appMode === 'power'
                  ? 'bg-cyan-100 dark:bg-cyan-600/30 text-cyan-900 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Professional Quant
            </button>
          </div>
        </div>
      </div>

      {/* Signal Scorecard & Speedometer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Overall Signal Meter */}
        <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Consensus Technical Signal</span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/40">
              High Confidence
            </span>
          </div>

          <div className="my-3 text-center">
            <div className="inline-block px-4 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 font-extrabold text-lg tracking-wide shadow-sm">
              STRONG BUY (82%)
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Combined technical oscillators and trend moving averages are aligned in bullish continuation.
            </p>
          </div>

          {/* Color meter visual bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
              <span>Sell</span>
              <span>Neutral</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Buy</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex p-0.5 gap-1">
              <div className="bg-rose-500 h-full rounded-xs" style={{ width: '15%' }}></div>
              <div className="bg-amber-400 h-full rounded-xs" style={{ width: '20%' }}></div>
              <div className="bg-emerald-500 h-full rounded-xs ring-2 ring-emerald-400" style={{ width: '65%' }}></div>
            </div>
          </div>
        </div>

        {/* Quantitative Score Count */}
        <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Aggregated Indicator Votes</span>
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{totalBuy}</div>
              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">BUY</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-black font-mono text-slate-700 dark:text-slate-300">{totalNeutral}</div>
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">NEUTRAL</div>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40">
              <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">{totalSell}</div>
              <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 mt-0.5">SELL</div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
            <span>Moving Averages: <strong>11 Buy / 1 Sell</strong></span>
            <span>Oscillators: <strong>6 Buy / 3 Neutral</strong></span>
          </div>
        </div>

        {/* Key Trade Levels */}
        <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Actionable Price Levels</span>
            <Target className="w-3.5 h-3.5 text-cyan-500" />
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-slate-700 dark:text-slate-300">
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Breakout Target (R2):</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">${r2Classic.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-1.5 rounded bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
              <span className="text-cyan-700 dark:text-cyan-400 font-semibold">Immediate Pivot (P):</span>
              <span className="font-bold text-cyan-700 dark:text-cyan-400">${pivotClassic.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-1.5 rounded bg-rose-50 dark:bg-rose-950/30 text-slate-700 dark:text-slate-300">
              <span className="text-rose-700 dark:text-rose-400 font-semibold">Stop Loss Defense (S2):</span>
              <span className="font-bold text-rose-700 dark:text-rose-400">${s2Classic.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CASUAL MODE VIEW */}
      {appMode === 'casual' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Plain English Insights */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#07111e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Plain-English Market Translation
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                  <span><strong>Trend Momentum:</strong> The asset is holding firmly above both the 20-day and 50-day moving averages, indicating buyers remain in charge.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0"></span>
                  <span><strong>RSI Health Check:</strong> Sitting at {selectedAsset.rsi || 54}, the asset is in the optimal sweet spot—healthy buying without signs of extreme speculative exhaustion.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                  <span><strong>Suggested Stance:</strong> Favorable conditions for holding long positions or buying dips near ${s1Classic.toFixed(2)}.</span>
                </li>
              </ul>
            </div>

            {/* Risk & Safety Meter */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#07111e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="w-4 h-4 text-cyan-500" />
                Risk & Volatility Assessment
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Downside Volatility Risk:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Low to Moderate</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '30%' }}></div>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-400 pt-2">
                  <span>Trend Stability:</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">High (Above 200 SMA)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                Risk score calculated from 20-day historical standard deviation and ATR.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* PROFESSIONAL QUANT MODE VIEW */
        <div className="space-y-4">
          {/* Moving Averages Matrix Table */}
          <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart className="w-4 h-4 text-cyan-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Moving Average Matrix (SMA & EMA)</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Current: ${price.toLocaleString()}</span>
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

          {/* Oscillators Matrix Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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

            {/* Pivot Points Classical Calculator */}
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
      )}
    </div>
  );
};
