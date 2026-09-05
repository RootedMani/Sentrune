import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Maximize2, 
  BarChart2, 
  Layers, 
  Target
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';

export const PriceChart: React.FC = () => {
  const { selectedAsset, timeframe, appMode, showTechnicalMetadata } = useWorkstation();
  const [chartType, setChartType] = useState<'area' | 'candles'>('area');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Generate responsive chart points based on asset price
  const basePrice = selectedAsset.price;
  const isPositive = selectedAsset.change >= 0;

  // 16 points data series
  const points = [
    basePrice * 0.97,
    basePrice * 0.982,
    basePrice * 0.975,
    basePrice * 0.99,
    basePrice * 0.985,
    basePrice * 1.005,
    basePrice * 0.998,
    basePrice * 1.012,
    basePrice * 1.008,
    basePrice * 1.02,
    basePrice * 1.015,
    basePrice * 1.025,
    basePrice * 1.01,
    basePrice * 1.005,
    basePrice * 0.995,
    basePrice
  ];

  const min = Math.min(...points) * 0.995;
  const max = Math.max(...points) * 1.005;
  const range = max - min || 1;

  // SVG dimensions
  const svgWidth = 700;
  const svgHeight = 260;
  const paddingX = 20;
  const paddingY = 25;

  const getCoordinates = (val: number, idx: number) => {
    const x = paddingX + (idx / (points.length - 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - ((val - min) / range) * (svgHeight - paddingY * 2);
    return { x, y };
  };

  const pathD = points.reduce((acc, val, i) => {
    const { x, y } = getCoordinates(val, i);
    return i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
  }, '');

  const areaD = `${pathD} L ${svgWidth - paddingX},${svgHeight - paddingY} L ${paddingX},${svgHeight - paddingY} Z`;

  return (
    <div id="price-history-view" className="space-y-4 p-4">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#081322] p-4 rounded-xl border border-slate-800">
        <div>
          <div className="text-[11px] text-slate-400">Current Valuation</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">
            ${selectedAsset.price.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">24h Price Change</div>
          <div className={`text-base font-bold font-mono mt-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}{selectedAsset.change.toFixed(2)} ({isPositive ? '+' : ''}{selectedAsset.changePercent.toFixed(2)}%)
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">24h High / Low</div>
          <div className="text-xs font-semibold font-mono text-slate-200 mt-1">
            ${selectedAsset.high24h.toLocaleString()} / ${selectedAsset.low24h.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">24h Trade Volume</div>
          <div className="text-xs font-semibold font-mono text-slate-200 mt-1">
            {selectedAsset.volume}
          </div>
        </div>
      </div>

      {/* Chart Canvas Card */}
      <div className="bg-[#07111e] p-4 rounded-xl border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-200">
              {selectedAsset.symbol} Price Action ({timeframe})
            </span>
            <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/70 border border-cyan-800/50 px-2 py-0.5 rounded">
              High Definition
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setChartType('area')}
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  chartType === 'area' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Line / Area
              </button>
              <button
                onClick={() => setChartType('candles')}
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  chartType === 'candles' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Candlesticks
              </button>
            </div>
          </div>
        </div>

        {/* SVG Interactive Chart */}
        <div className="w-full overflow-hidden relative">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-64 select-none overflow-visible"
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0.25, 0.5, 0.75].map(ratio => {
              const y = paddingY + ratio * (svgHeight - paddingY * 2);
              const priceAtLevel = (max - ratio * range).toFixed(2);
              return (
                <g key={ratio}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={svgWidth - paddingX}
                    y2={y}
                    stroke="rgba(51, 65, 85, 0.3)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={svgWidth - paddingX + 5}
                    y={y + 3}
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="JetBrains Mono"
                  >
                    ${priceAtLevel}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            {chartType === 'area' && (
              <>
                <path d={areaD} fill="url(#areaGradient)" />
                <path
                  d={pathD}
                  fill="none"
                  stroke={isPositive ? '#10b981' : '#06b6d4'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Candlesticks view */}
            {chartType === 'candles' && (
              <g>
                {points.map((val, idx) => {
                  const { x, y } = getCoordinates(val, idx);
                  const isUp = idx % 2 === 0;
                  const candleHeight = 16 + (idx % 4) * 8;
                  const candleWidth = 14;

                  return (
                    <g key={idx}>
                      {/* Wick */}
                      <line
                        x1={x}
                        y1={y - candleHeight / 2 - 6}
                        x2={x}
                        y2={y + candleHeight / 2 + 6}
                        stroke={isUp ? '#10b981' : '#f43f5e'}
                        strokeWidth="1.5"
                      />
                      {/* Body */}
                      <rect
                        x={x - candleWidth / 2}
                        y={y - candleHeight / 2}
                        width={candleWidth}
                        height={candleHeight}
                        fill={isUp ? '#10b981' : '#f43f5e'}
                        rx="2"
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* Interactive Data Nodes */}
            {chartType === 'area' &&
              points.map((val, idx) => {
                const { x, y } = getCoordinates(val, idx);
                const isHovered = hoveredPoint === idx;

                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : 3}
                    fill={isHovered ? '#38bdf8' : '#0891b2'}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2 : 1}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredPoint(idx)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
          </svg>
        </div>

        {/* Power Trader Metadata Panel if active */}
        {showTechnicalMetadata && (
          <div className="pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 bg-[#050c17] rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Orderbook Spread</span>
              <span className="text-cyan-400 font-bold">$0.02 (0.006%)</span>
            </div>
            <div className="p-2 bg-[#050c17] rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Bollinger Width</span>
              <span className="text-slate-200 font-bold">4.82% (Normal)</span>
            </div>
            <div className="p-2 bg-[#050c17] rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">20-Day VWAP</span>
              <span className="text-slate-200 font-bold">${(basePrice * 0.99).toFixed(2)}</span>
            </div>
            <div className="p-2 bg-[#050c17] rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Quant Volatility</span>
              <span className="text-amber-400 font-bold">{selectedAsset.volatility || '22.1%'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
