import React, { useMemo } from 'react';
import { 
  MessageSquare, 
  ThumbsUp, 
  Share2, 
  ExternalLink, 
  Sparkles,
  Database
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';
import { MarketCacheService } from '../services/marketCache';

export const SocialPulse: React.FC = () => {
  const { selectedAsset, cacheMeta } = useWorkstation();

  // Instant retrieved from L1/L2 cache
  const discussions = useMemo(() => {
    return MarketCacheService.getDiscussions(selectedAsset.symbol);
  }, [selectedAsset.symbol, cacheMeta.lastUpdated]);

  return (
    <div id="community-social-view" className="space-y-4 p-4">
      {/* Top Banner */}
      <div className="bg-[#081322] p-4 rounded-xl border border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            Social & Community Discussion Pulse
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time chatter aggregated from Reddit, X, and specialized alpha trading rooms.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-[#050c17] px-2.5 py-1 rounded-md border border-slate-800">
          <Database className="w-3 h-3 text-cyan-400" />
          <span>Cache: <strong className="text-emerald-400 font-normal">Instant Hit</strong></span>
        </div>
      </div>

      {/* Discussion List */}
      <div className="space-y-3">
        {discussions.map((disc: any) => (
          <div 
            key={disc.id}
            className="p-4 rounded-xl bg-[#07111e] border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-200">{disc.author}</span>
                <span className="text-[10px] bg-[#0c1a2d] text-cyan-300 border border-cyan-800/40 px-2 py-0.5 rounded font-mono">
                  {disc.platform}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">{disc.time}</span>
              </div>

              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                disc.sentiment === 'bullish'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {disc.sentiment}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {disc.content}
            </p>

            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-800/60">
              <span className="flex items-center gap-1 text-slate-400">
                <ThumbsUp className="w-3 h-3 text-cyan-400" />
                <span>{disc.upvotes} Trader Upvotes</span>
              </span>
              <span className="text-cyan-400/80 font-mono">
                Asset: {disc.asset}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
