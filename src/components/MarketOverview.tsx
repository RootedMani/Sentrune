import React from 'react';
import { 
  Briefcase, 
  TrendingUp, 
  ShieldAlert, 
  FileText, 
  Download, 
  CheckCircle2,
  Compass,
  Zap,
  Target
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';

export const MarketOverview: React.FC = () => {
  const { selectedAsset, appMode } = useWorkstation();

  const handleExportSummary = () => {
    const data = {
      asset: selectedAsset.symbol,
      price: selectedAsset.price,
      generatedAt: new Date().toISOString(),
      regime: 'Consolidation with Upside Bias',
      support: (selectedAsset.price * 0.96).toFixed(2),
      resistance: (selectedAsset.price * 1.04).toFixed(2),
      status: 'Clean Institutional Briefing'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sentrune_Brief_${selectedAsset.symbol}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="executive-market-overview-view" className="space-y-4 p-4">
      {/* Top Banner with Clean Financial Title */}
      <div className="bg-[#081322] p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-cyan-400" />
            Executive Market Intelligence Briefing
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Synthesized quantitative takeaways and macro catalysts for {selectedAsset.name} ({selectedAsset.symbol}).
          </p>
        </div>

        <button
          id="export-market-report-btn"
          onClick={handleExportSummary}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0c1a2d] hover:bg-[#122642] border border-cyan-800/60 text-cyan-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer self-start sm:self-center"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Dossier (JSON)</span>
        </button>
      </div>

      {/* Strategic Highlights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Core Catalyst Breakdown */}
        <div className="p-4 rounded-xl bg-[#07111e] border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Target className="w-4 h-4 text-cyan-400" />
            <span>Key Institutional Catalysts</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-[#050c17] border border-slate-800/80 space-y-1">
              <span className="font-semibold text-slate-200 block">
                1. Monetary Liquidity & Macro Policy Alignment
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Central bank rate expectations have stabilized, easing dollar index pressures and improving multi-asset risk appetite.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#050c17] border border-slate-800/80 space-y-1">
              <span className="font-semibold text-slate-200 block">
                2. Orderflow & Capital Influx
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Spot volume and derivative open interest demonstrate steady accumulation without reckless leverage build-up.
              </p>
            </div>
          </div>
        </div>

        {/* Risk & Key Levels */}
        <div className="p-4 rounded-xl bg-[#07111e] border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Risk Boundaries & Price Targets</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-[#050c17] border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Primary Resistance Ceiling</span>
                <span className="font-bold text-rose-400 font-mono text-sm">
                  ${(selectedAsset.price * 1.045).toFixed(2)}
                </span>
              </div>
              <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800/50 px-2 py-0.5 rounded">
                Heavy Ask Cluster
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#050c17] border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Primary Support Floor</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  ${(selectedAsset.price * 0.955).toFixed(2)}
                </span>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded">
                Bid Wall Defense
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#050c17] border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Risk/Reward Profile</span>
                <span className="font-bold text-cyan-300 font-mono text-xs">
                  1 : 2.4 (Favorable Asymmetric Long)
                </span>
              </div>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800/50 px-2 py-0.5 rounded">
                Quant Metric
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Takeaways Box */}
      <div className="p-4 rounded-xl bg-[#07111e] border border-slate-800 space-y-2">
        <h4 className="text-xs font-bold text-slate-200">
          Executive Market Synthesis
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          The prevailing quantitative regime for {selectedAsset.symbol} favors strategic patience and dip accumulation near support bands. 
          Both institutional news flow and social sentiment momentum reflect moderate accumulation, provided benchmark volatility does not break through primary risk corridors.
        </p>
      </div>
    </div>
  );
};
