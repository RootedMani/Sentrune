import React from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BarChart, 
  ShieldCheck,
  Compass
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';

export const TechnicalAnalysis: React.FC = () => {
  const { selectedAsset, appMode, showTechnicalMetadata } = useWorkstation();

  const indicators = [
    {
      name: 'RSI (14-Period)',
      value: selectedAsset.rsi || 52.4,
      status: (selectedAsset.rsi || 52) > 70 ? 'bearish' : (selectedAsset.rsi || 52) < 30 ? 'bullish' : 'neutral',
      casualSummary: (selectedAsset.rsi || 52) > 70 ? 'Overbought - Consider taking profit' : (selectedAsset.rsi || 52) < 30 ? 'Oversold - Potential bargain entry' : 'Balanced momentum - No extreme panic or euphoria',
      powerTelemetry: 'Oscillator reading within optimal channel. RSI delta +1.4 over last 3 candles.'
    },
    {
      name: 'MACD (12, 26, 9)',
      value: selectedAsset.macd || '+1.24 (Bullish)',
      status: 'bullish',
      casualSummary: 'Positive trend momentum continuing in current timeframe.',
      powerTelemetry: 'Signal line crossover observed 2 bars ago with expanding histogram divergence (+0.38).'
    },
    {
      name: 'Bollinger Bands (20, 2)',
      value: 'Middle Band Support',
      status: 'neutral',
      casualSummary: 'Price is trading comfortably in standard historical volatility range.',
      powerTelemetry: 'Upper: $' + ((selectedAsset.price * 1.04).toFixed(2)) + ' | Lower: $' + ((selectedAsset.price * 0.96).toFixed(2)) + ' | Squeeze factor: 0.12'
    },
    {
      name: '200-Day Simple Moving Average',
      value: `$${(selectedAsset.price * 0.94).toFixed(2)} (Above Trend)`,
      status: 'bullish',
      casualSummary: 'Strong long-term institutional support remains firmly intact.',
      powerTelemetry: 'Current delta +6.3% above 200-SMA. Golden cross structural support verified.'
    }
  ];

  return (
    <div id="technical-analysis-view" className="space-y-4 p-4">
      <div className="bg-[#081322] p-4 rounded-xl border border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            {selectedAsset.name} ({selectedAsset.symbol}) Technical Indicators
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {appMode === 'casual' 
              ? 'Plain-English technical interpretation for clear, confident decision-making.'
              : 'Full quantitative oscillator readings and moving average matrix.'}
          </p>
        </div>

        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
          OVERALL: BULLISH BIAS
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {indicators.map((ind, i) => (
          <div 
            key={i}
            className="p-4 rounded-xl bg-[#07111e] border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">{ind.name}</span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                ind.status === 'bullish' 
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                  : ind.status === 'bearish'
                  ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {ind.status}
              </span>
            </div>

            <div className="text-base font-bold font-mono text-cyan-300">
              {ind.value}
            </div>

            <div className="text-xs text-slate-300 bg-[#050c17] p-2.5 rounded-lg border border-slate-800/80">
              {appMode === 'casual' && !showTechnicalMetadata ? ind.casualSummary : ind.powerTelemetry}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
