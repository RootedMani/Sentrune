import React from 'react';
import { 
  HeartHandshake, 
  TrendingUp, 
  TrendingDown, 
  Gauge, 
  ShieldCheck, 
  PieChart,
  BarChart3
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';

export const SentimentPulse: React.FC = () => {
  const { selectedAsset, showTechnicalMetadata } = useWorkstation();

  return (
    <div id="market-sentiment-view" className="space-y-4 p-4">
      {/* Top Sentiment Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Fear & Greed Index */}
        <div className="p-4 rounded-xl bg-[#07111e] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Fear & Greed Index</span>
            <span className="text-[10px] text-cyan-400 font-mono">Aggregated</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-400">68</span>
            <span className="text-xs font-bold uppercase text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              Greed
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div className="bg-rose-500 w-1/4 h-full"></div>
            <div className="bg-amber-500 w-1/4 h-full"></div>
            <div className="bg-emerald-500 w-1/2 h-full"></div>
          </div>
          <p className="text-[11px] text-slate-400">
            Market participant confidence is elevated with consistent dip-buying activity.
          </p>
        </div>

        {/* FinBERT Multi-Source Consensus */}
        <div className="p-4 rounded-xl bg-[#07111e] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Financial News FinBERT</span>
            <span className="text-[10px] text-emerald-400 font-mono">+0.58 Bullish</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-1">
            <span>Bullish News Ratio:</span>
            <span className="text-emerald-400 font-bold">64%</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-300">
            <span>Neutral / Informational:</span>
            <span className="text-slate-400 font-bold">22%</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-300">
            <span>Bearish / Risk Catalysts:</span>
            <span className="text-rose-400 font-bold">14%</span>
          </div>
        </div>

        {/* Social Momentum */}
        <div className="p-4 rounded-xl bg-[#07111e] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Social Discussion Velocity</span>
            <span className="text-[10px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800/50">
              +18% Today
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            14,280 Mentions
          </div>
          <p className="text-[11px] text-slate-400">
            Retail sentiment across Twitter/X and Reddit skews strongly positive over the last 6 hours.
          </p>
        </div>
      </div>

      {/* Breakdown Bar */}
      <div className="p-4 rounded-xl bg-[#07111e] border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-200">
          Sentiment Trajectory for {selectedAsset.name} ({selectedAsset.symbol})
        </h4>

        <div className="space-y-2 text-xs">
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Institutional Media (Bloomberg, Reuters, Forbes)</span>
              <span className="text-emerald-400 font-mono font-semibold">+0.62 Bullish</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: '68%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Crypto Native News (CoinDesk, Cointelegraph)</span>
              <span className="text-emerald-400 font-mono font-semibold">+0.48 Moderate</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="bg-cyan-500 h-full" style={{ width: '56%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Retail Communities (Reddit, Telegram)</span>
              <span className="text-emerald-400 font-mono font-semibold">+0.74 High Optimism</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full" style={{ width: '74%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
