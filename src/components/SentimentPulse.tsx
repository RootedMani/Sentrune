import React, { useState } from 'react';
import { 
  HeartHandshake, 
  TrendingUp, 
  TrendingDown, 
  Gauge, 
  ShieldCheck, 
  PieChart,
  BarChart3,
  Flame,
  Globe2,
  MessageCircle,
  Share2,
  Layers,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';

export const SentimentPulse: React.FC = () => {
  const { selectedAsset, theme, sentimentAggs } = useWorkstation();
  const [activeTimeRange, setActiveTimeRange] = useState<'7d' | '30d'>('30d');
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);

  const isLight = theme === 'light';

  // 30-day historical Fear & Greed / Sentiment data series
  const historicalSentiment = [
    { day: 'Day 1', score: 48, price: selectedAsset.price * 0.94 },
    { day: 'Day 4', score: 52, price: selectedAsset.price * 0.948 },
    { day: 'Day 8', score: 49, price: selectedAsset.price * 0.942 },
    { day: 'Day 12', score: 56, price: selectedAsset.price * 0.958 },
    { day: 'Day 16', score: 62, price: selectedAsset.price * 0.97 },
    { day: 'Day 20', score: 59, price: selectedAsset.price * 0.965 },
    { day: 'Day 24', score: 67, price: selectedAsset.price * 0.985 },
    { day: 'Day 27', score: 71, price: selectedAsset.price * 0.992 },
    { day: 'Day 30', score: 74, price: selectedAsset.price }
  ];

  const currentScore = historicalSentiment[historicalSentiment.length - 1].score;
  const currentLabel = currentScore >= 75 ? 'Extreme Greed' : currentScore >= 55 ? 'Greed' : currentScore >= 45 ? 'Neutral' : currentScore >= 25 ? 'Fear' : 'Extreme Fear';

  // Multi-source breakdown data
  const sources = [
    { name: 'FinBERT Institutional News (Reuters, Bloomberg)', score: 76, positive: 72, neutral: 18, negative: 10, count: '4,280 articles' },
    { name: 'Twitter / X Crypto & Stock Retail Pulse', score: 82, positive: 78, neutral: 12, negative: 10, count: '64,120 tweets' },
    { name: 'Reddit (r/WallStreetBets, r/CryptoCurrency)', score: 69, positive: 65, neutral: 21, negative: 14, count: '12,940 posts' },
    { name: 'Discord & Telegram Alpha Groups', score: 78, positive: 74, neutral: 16, negative: 10, count: '18,300 messages' },
    { name: 'YouTube Video Transcripts & Titles', score: 71, positive: 68, neutral: 20, negative: 12, count: '1,420 videos' }
  ];

  // Key Narratives
  const narratives = [
    { topic: 'Institutional ETF Inflows & Staking', sentiment: 'Strong Bullish', impact: '+92%', status: 'high' },
    { topic: 'Federal Reserve Interest Rate Policy', sentiment: 'Mild Bullish', impact: '+58%', status: 'moderate' },
    { topic: 'Whale Wallet Accumulation Patterns', sentiment: 'Strong Bullish', impact: '+84%', status: 'high' },
    { topic: 'Regulatory Clearances & Global Adoption', sentiment: 'Neutral / Cautious', impact: '+49%', status: 'neutral' },
    { topic: 'Exchange Stablecoin Liquidity Reserves', sentiment: 'Bullish', impact: '+71%', status: 'high' }
  ];

  // Trend Graph SVG Dimensions
  const svgWidth = 720;
  const svgHeight = 220;
  const padX = 25;
  const padY = 30;
  const graphW = svgWidth - padX * 2;
  const graphH = svgHeight - padY * 2;

  const minScore = 40;
  const maxScore = 90;
  const scoreRange = maxScore - minScore;

  const getCoord = (score: number, idx: number) => {
    const x = padX + (idx / (historicalSentiment.length - 1)) * graphW;
    const y = padY + graphH - ((score - minScore) / scoreRange) * graphH;
    return { x, y };
  };

  const trendPath = historicalSentiment.map((d, i) => {
    const { x, y } = getCoord(d.score, i);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const closedTrendPath = `${trendPath} L ${padX + graphW} ${padY + graphH} L ${padX} ${padY + graphH} Z`;

  // Speedometer angle (-90deg to +90deg for 0 to 100 score)
  const needleAngle = -90 + (currentScore / 100) * 180;

  return (
    <div id="market-sentiment-view" className="space-y-4 p-4">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#081322] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-cyan-500" />
            {selectedAsset.name} ({selectedAsset.symbol}) Deep Market Sentiment
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-source Natural Language Processing (FinBERT), social velocity graphs, and crowd psychology metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60 shadow-xs">
            INDEX: {currentScore}/100 ({currentLabel.toUpperCase()})
          </span>
        </div>
      </div>

      {/* Row 1: Fear & Greed Speedometer + Consensus Overview + Mentions Velocity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Speedometer Radial Arc Gauge */}
        <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Fear & Greed Speedometer</span>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">Real-Time Weight</span>
          </div>

          {/* SVG Semi-Circle Gauge */}
          <div className="flex flex-col items-center justify-center my-2">
            <svg viewBox="0 0 200 115" className="w-44 overflow-visible">
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="35%" stopColor="#f59e0b" />
                  <stop offset="65%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              {/* Outer Arc Path */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke={isLight ? '#e2e8f0' : '#1e293b'}
                strokeWidth="16"
                strokeLinecap="round"
              />
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#gaugeGrad)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray="251"
                strokeDashoffset="0"
              />
              {/* Needle pivot */}
              <g transform={`rotate(${needleAngle}, 100, 100)`}>
                <line
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="30"
                  stroke={isLight ? '#0f172a' : '#ffffff'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx="100" cy="100" r="6" fill={isLight ? '#0f172a' : '#ffffff'} />
              </g>
            </svg>

            <div className="text-center mt-1">
              <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {currentScore}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {currentLabel}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-center font-mono text-slate-500 dark:text-slate-400">
            <div>Yesterday: <strong className="text-slate-700 dark:text-slate-300 font-normal">68</strong></div>
            <div>Last Wk: <strong className="text-slate-700 dark:text-slate-300 font-normal">61</strong></div>
            <div>Last Mo: <strong className="text-slate-700 dark:text-slate-300 font-normal">48</strong></div>
          </div>
        </div>

        {/* Bull vs Bear Ratio & Velocity */}
        <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Crowd Sentiment Consensus</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">+14% vs 24h ago</span>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Bullish: 74%</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Neutral: 16%</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">Bearish: 10%</span>
            </div>

            {/* Segmented Bar */}
            <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex p-0.5 gap-0.5">
              <div className="bg-emerald-500 h-full rounded-xs" style={{ width: '74%' }}></div>
              <div className="bg-amber-400 h-full rounded-xs" style={{ width: '16%' }}></div>
              <div className="bg-rose-500 h-full rounded-xs" style={{ width: '10%' }}></div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 pt-2 leading-relaxed">
              Retail sentiment is driven by strong continuous accumulation. Bearish discussions have shrunk to 30-day lows.
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>FinBERT Confidence:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">0.86 / 1.00</span>
          </div>
        </div>

        {/* Social Volume & Virality Score */}
        <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Social Velocity & Reach</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>

          <div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              101,060
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Mentions Analyzed (Last 24h)</div>
          </div>

          <div className="space-y-1.5 text-xs font-mono text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span>Viral Retweet Velocity:</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">+28%</span>
            </div>
            <div className="flex justify-between">
              <span>Reddit Karma Ratio:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">89% Upvoted</span>
            </div>
            <div className="flex justify-between">
              <span>Whale Alert Ping Count:</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">14 Transfers</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            Spike detected during US Opening Bell session.
          </div>
        </div>
      </div>

      {/* Row 2: 30-Day Sentiment Trend Chart (SVG Graph) */}
      <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              30-Day Historical Sentiment Trajectory vs Asset Price
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-medium">
              <span className="w-3 h-0.5 bg-cyan-500"></span>
              Sentiment Score Index
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-mono">
              Range: 40 - 90
            </span>
          </div>
        </div>

        {/* SVG Line Graph */}
        <div className="w-full relative select-none">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-56 overflow-visible cursor-crosshair"
            onMouseLeave={() => setHoveredTrendIdx(null)}
          >
            <defs>
              <linearGradient id="sentimentAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={isLight ? 0.35 : 0.45} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[50, 60, 70, 80].map(val => {
              const y = padY + graphH - ((val - minScore) / scoreRange) * graphH;
              return (
                <g key={val}>
                  <line
                    x1={padX}
                    y1={y}
                    x2={padX + graphW}
                    y2={y}
                    stroke={isLight ? 'rgba(203, 213, 225, 0.7)' : 'rgba(51, 65, 85, 0.4)'}
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padX + graphW + 6}
                    y={y + 3.5}
                    fill={isLight ? '#64748b' : '#94a3b8'}
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Filled Area */}
            <path d={closedTrendPath} fill="url(#sentimentAreaGrad)" />

            {/* Trend Line */}
            <path
              d={trendPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {historicalSentiment.map((pt, i) => {
              const { x, y } = getCoord(pt.score, i);
              const isHovered = hoveredTrendIdx === i;

              return (
                <g key={i} onMouseEnter={() => setHoveredTrendIdx(i)}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : 3.5}
                    fill={isHovered ? '#38bdf8' : '#0891b2'}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2 : 1}
                    className="cursor-pointer transition-all"
                  />
                  {/* Day label */}
                  <text
                    x={x}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fill={isLight ? '#64748b' : '#94a3b8'}
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {pt.day}
                  </text>
                </g>
              );
            })}

            {/* Hover Tooltip Card */}
            {hoveredTrendIdx !== null && (
              <g pointerEvents="none">
                {(() => {
                  const pt = historicalSentiment[hoveredTrendIdx];
                  const { x, y } = getCoord(pt.score, hoveredTrendIdx);
                  return (
                    <>
                      <line
                        x1={x}
                        y1={padY}
                        x2={x}
                        y2={svgHeight - 25}
                        stroke="#0284c7"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                      <rect
                        x={Math.min(x - 55, svgWidth - 120)}
                        y={Math.max(y - 45, 5)}
                        width="110"
                        height="38"
                        rx="5"
                        fill={isLight ? '#0f172a' : '#1e293b'}
                        className="shadow-lg"
                      />
                      <text
                        x={Math.min(x, svgWidth - 65)}
                        y={Math.max(y - 30, 20)}
                        textAnchor="middle"
                        fill="#38bdf8"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        Score: {pt.score}/100
                      </text>
                      <text
                        x={Math.min(x, svgWidth - 65)}
                        y={Math.max(y - 15, 35)}
                        textAnchor="middle"
                        fill="#cbd5e1"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        Price: ${pt.price.toFixed(1)}
                      </text>
                    </>
                  );
                })()}
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Row 3: Multi-Source Sentiment Breakdown & Narratives */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Source Breakdown Bars */}
        <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-cyan-500" />
              Multi-Source NLP Sentiment Breakdown
            </span>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">Channel Scores</span>
          </div>

          <div className="space-y-3">
            {sources.map((src, i) => (
              <div key={i} className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">{src.name}</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{src.score}% Bullish</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${src.positive}%` }}></div>
                  <div className="bg-amber-400 h-full" style={{ width: `${src.neutral}%` }}></div>
                  <div className="bg-rose-500 h-full" style={{ width: `${src.negative}%` }}></div>
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Sample: {src.count}</span>
                  <span>{src.positive}% Pos / {src.neutral}% Neu / {src.negative}% Neg</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Major Market Narratives & Catalysts */}
        <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-500" />
              Key Catalyst & Narrative Impact
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Top Market Movers</span>
          </div>

          <div className="space-y-2">
            {narratives.map((nar, idx) => (
              <div 
                key={idx} 
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#050c17] border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs transition-colors"
              >
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{nar.topic}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Consensus: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{nar.sentiment}</span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{nar.impact}</div>
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-800/50">
                    {nar.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
