import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  Layers, 
  Maximize2, 
  Sliders, 
  Eye, 
  EyeOff,
  Activity,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';

export const PriceChart: React.FC = () => {
  const { selectedAsset, timeframe, appMode, bars, theme } = useWorkstation();
  const [chartType, setChartType] = useState<'candles' | 'area'>('candles');
  const [showSMA20, setShowSMA20] = useState(true);
  const [showEMA50, setShowEMA50] = useState(true);
  const [showBollinger, setShowBollinger] = useState(appMode === 'power');
  const [showVolume, setShowVolume] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const isLight = theme === 'light';
  const isPositive = selectedAsset.change >= 0;

  // Use bars from context or generate fallback bars
  const chartBars = useMemo(() => {
    if (bars && bars.length > 5) {
      return bars;
    }
    // Generate 35 realistic OHLCV bars based on selectedAsset.price
    const result = [];
    const base = selectedAsset.price;
    const now = Date.now();
    let current = base * 0.96;
    for (let i = 35; i >= 0; i--) {
      const time = new Date(now - i * (timeframe === '1h' ? 3600000 : timeframe === '1wk' ? 604800000 : 86400000)).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      const change = (Math.random() - 0.48) * (base * 0.018);
      const open = current;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * (base * 0.009);
      const low = Math.min(open, close) - Math.random() * (base * 0.009);
      const volume = Math.floor(base * (Math.random() * 40 + 20));
      result.push({
        timestamp: time,
        open,
        high,
        low,
        close,
        volume
      });
      current = close;
    }
    // Ensure the last bar matches the selectedAsset.price
    if (result.length > 0) {
      result[result.length - 1].close = selectedAsset.price;
    }
    return result;
  }, [bars, selectedAsset.price, timeframe]);

  // Calculate technical overlays (SMA 20, EMA 50, Bollinger Bands)
  const technicalOverlays = useMemo(() => {
    const sma20: (number | null)[] = [];
    const ema50: (number | null)[] = [];
    const bbUpper: (number | null)[] = [];
    const bbLower: (number | null)[] = [];

    // SMA 20
    for (let i = 0; i < chartBars.length; i++) {
      if (i < 10) {
        sma20.push(null);
        bbUpper.push(null);
        bbLower.push(null);
      } else {
        const slice = chartBars.slice(Math.max(0, i - 19), i + 1);
        const sum = slice.reduce((acc, b) => acc + b.close, 0);
        const avg = sum / slice.length;
        sma20.push(avg);

        // Standard deviation for Bollinger
        const variance = slice.reduce((acc, b) => acc + Math.pow(b.close - avg, 2), 0) / slice.length;
        const stdDev = Math.sqrt(variance);
        bbUpper.push(avg + stdDev * 2);
        bbLower.push(avg - stdDev * 2);
      }
    }

    // EMA 50
    let lastEma = chartBars[0]?.close || selectedAsset.price;
    const k = 2 / (25 + 1); // adapted period
    for (let i = 0; i < chartBars.length; i++) {
      if (i < 5) {
        ema50.push(null);
      } else {
        lastEma = chartBars[i].close * k + lastEma * (1 - k);
        ema50.push(lastEma);
      }
    }

    return { sma20, ema50, bbUpper, bbLower };
  }, [chartBars, selectedAsset.price]);

  // SVG Chart Geometry
  const svgWidth = 840;
  const svgHeight = 360;
  const volumeHeight = 65;
  const paddingLeft = 15;
  const paddingRight = 65;
  const paddingTop = 25;
  const paddingBottom = 40;
  const mainChartBottom = svgHeight - volumeHeight - paddingBottom;

  // Min and Max prices for scaling
  const allHighs = chartBars.map(b => b.high);
  const allLows = chartBars.map(b => b.low);
  const minPrice = Math.min(...allLows) * 0.994;
  const maxPrice = Math.max(...allHighs) * 1.006;
  const priceRange = maxPrice - minPrice || 1;

  // Max volume for scaling
  const maxVolume = Math.max(...chartBars.map(b => b.volume), 1);

  // Coordinate helpers
  const count = chartBars.length;
  const usableWidth = svgWidth - paddingLeft - paddingRight;
  const getX = (index: number) => paddingLeft + (index / (count - 1 || 1)) * usableWidth;
  const getY = (price: number) => {
    const ratio = (price - minPrice) / priceRange;
    return mainChartBottom - ratio * (mainChartBottom - paddingTop);
  };
  const getVolY = (vol: number) => {
    const ratio = vol / maxVolume;
    return svgHeight - paddingBottom - ratio * (volumeHeight - 5);
  };

  // Area path calculations
  const areaPath = useMemo(() => {
    if (chartBars.length === 0) return '';
    const points = chartBars.map((b, i) => `${getX(i)},${getY(b.close)}`);
    return `M ${points.join(' L ')}`;
  }, [chartBars, minPrice, priceRange]);

  const closedAreaPath = useMemo(() => {
    if (chartBars.length === 0) return '';
    const points = chartBars.map((b, i) => `${getX(i)},${getY(b.close)}`);
    return `M ${getX(0)},${mainChartBottom} L ${points.join(' L ')} L ${getX(count - 1)},${mainChartBottom} Z`;
  }, [chartBars, minPrice, priceRange, mainChartBottom]);

  // Overlay SVG paths
  const smaPath = useMemo(() => {
    const valid = technicalOverlays.sma20
      .map((val, i) => (val !== null ? `${getX(i)},${getY(val)}` : null))
      .filter(Boolean);
    return valid.length > 0 ? `M ${valid.join(' L ')}` : '';
  }, [technicalOverlays.sma20, minPrice, priceRange]);

  const emaPath = useMemo(() => {
    const valid = technicalOverlays.ema50
      .map((val, i) => (val !== null ? `${getX(i)},${getY(val)}` : null))
      .filter(Boolean);
    return valid.length > 0 ? `M ${valid.join(' L ')}` : '';
  }, [technicalOverlays.ema50, minPrice, priceRange]);

  const bbUpperPath = useMemo(() => {
    const valid = technicalOverlays.bbUpper
      .map((val, i) => (val !== null ? `${getX(i)},${getY(val)}` : null))
      .filter(Boolean);
    return valid.length > 0 ? `M ${valid.join(' L ')}` : '';
  }, [technicalOverlays.bbUpper, minPrice, priceRange]);

  const bbLowerPath = useMemo(() => {
    const valid = technicalOverlays.bbLower
      .map((val, i) => (val !== null ? `${getX(i)},${getY(val)}` : null))
      .filter(Boolean);
    return valid.length > 0 ? `M ${valid.join(' L ')}` : '';
  }, [technicalOverlays.bbLower, minPrice, priceRange]);

  // Active bar under crosshair
  const activeBar = hoveredIndex !== null && chartBars[hoveredIndex] 
    ? chartBars[hoveredIndex] 
    : chartBars[chartBars.length - 1];

  const activeBarChange = activeBar ? activeBar.close - activeBar.open : 0;
  const activeBarChangePct = activeBar && activeBar.open > 0 
    ? (activeBarChange / activeBar.open) * 100 
    : 0;

  return (
    <div id="price-history-view" className="space-y-4 p-4">
      {/* Top Asset & Bar Details Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 bg-white dark:bg-[#081322] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Current Valuation</div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
            ${selectedAsset.price.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">24h Price Change</div>
          <div className={`text-base font-bold font-mono mt-0.5 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isPositive ? '+' : ''}{selectedAsset.change.toFixed(2)} ({isPositive ? '+' : ''}{selectedAsset.changePercent.toFixed(2)}%)
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">24h High / Low</div>
          <div className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200 mt-1">
            ${selectedAsset.high24h.toLocaleString()} / ${selectedAsset.low24h.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">24h Trade Volume</div>
          <div className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200 mt-1">
            {selectedAsset.volume}
          </div>
        </div>

        <div className="hidden md:block">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Selected Candle Date</div>
          <div className="text-xs font-semibold font-mono text-cyan-600 dark:text-cyan-400 mt-1">
            {activeBar ? activeBar.timestamp : '--'}
          </div>
        </div>

        <div className="hidden md:block">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Bar Delta</div>
          <div className={`text-xs font-bold font-mono mt-1 ${activeBarChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {activeBarChange >= 0 ? '+' : ''}{activeBarChange.toFixed(2)} ({activeBarChangePct.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Interactive OHLC Bar Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-100 dark:bg-[#060e1a] rounded-lg border border-slate-200 dark:border-slate-800/80 text-xs font-mono">
        <div className="flex items-center gap-3 overflow-x-auto text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">O: <strong className="text-slate-900 dark:text-slate-200 font-normal">${activeBar ? activeBar.open.toFixed(2) : '--'}</strong></span>
          <span className="text-slate-500 dark:text-slate-400">H: <strong className="text-emerald-600 dark:text-emerald-400 font-normal">${activeBar ? activeBar.high.toFixed(2) : '--'}</strong></span>
          <span className="text-slate-500 dark:text-slate-400">L: <strong className="text-rose-600 dark:text-rose-400 font-normal">${activeBar ? activeBar.low.toFixed(2) : '--'}</strong></span>
          <span className="text-slate-500 dark:text-slate-400">C: <strong className="text-cyan-600 dark:text-cyan-400 font-normal">${activeBar ? activeBar.close.toFixed(2) : '--'}</strong></span>
          <span className="text-slate-500 dark:text-slate-400">Vol: <strong className="text-amber-600 dark:text-amber-400 font-normal">{activeBar ? activeBar.volume.toLocaleString() : '--'}</strong></span>
        </div>

        {/* Technical Indicators Pill Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowSMA20(!showSMA20)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
              showSMA20
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/60'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
            }`}
          >
            SMA-20
          </button>
          <button
            onClick={() => setShowEMA50(!showEMA50)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
              showEMA50
                ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800/60'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
            }`}
          >
            EMA-50
          </button>
          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
              showBollinger
                ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800/60'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
            }`}
          >
            Bollinger (20,2)
          </button>
          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
              showVolume
                ? 'bg-slate-300 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border-slate-400 dark:border-slate-600'
                : 'bg-slate-200 dark:bg-slate-900 text-slate-400 border-slate-300 dark:border-slate-800'
            }`}
          >
            Volume
          </button>
        </div>
      </div>

      {/* Main Chart Canvas Card */}
      <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {selectedAsset.symbol} / USD High-Precision Chart ({timeframe})
            </span>
            <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-800/50 px-2 py-0.5 rounded">
              Live Feed
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setChartType('candles')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
                  chartType === 'candles' 
                    ? 'bg-cyan-600 text-white shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Candlesticks
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
                  chartType === 'area' 
                    ? 'bg-cyan-600 text-white shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Line / Area
              </button>
            </div>
          </div>
        </div>

        {/* SVG Interactive Candlestick / Line Chart */}
        <div className="w-full relative select-none">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-80 overflow-visible cursor-crosshair"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="priceAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={isLight ? 0.35 : 0.45} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines and Price Axis */}
            {[0.1, 0.3, 0.5, 0.7, 0.9].map(ratio => {
              const y = paddingTop + ratio * (mainChartBottom - paddingTop);
              const priceLevel = (maxPrice - ratio * priceRange).toFixed(2);

              return (
                <g key={ratio}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke={isLight ? 'rgba(203, 213, 225, 0.8)' : 'rgba(51, 65, 85, 0.4)'}
                    strokeDasharray="3 3"
                  />
                  <text
                    x={svgWidth - paddingRight + 8}
                    y={y + 3.5}
                    fill={isLight ? '#64748b' : '#94a3b8'}
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    ${Number(priceLevel).toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Bollinger Bands Shaded Channel */}
            {showBollinger && bbUpperPath && bbLowerPath && (
              <g>
                <path
                  d={bbUpperPath}
                  fill="none"
                  stroke={isLight ? '#0284c7' : '#38bdf8'}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
                <path
                  d={bbLowerPath}
                  fill="none"
                  stroke={isLight ? '#0284c7' : '#38bdf8'}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
              </g>
            )}

            {/* Area Fill in Line Mode */}
            {chartType === 'area' && (
              <>
                <path d={closedAreaPath} fill="url(#priceAreaGrad)" />
                <path
                  d={areaPath}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Technical Moving Averages */}
            {showSMA20 && smaPath && (
              <path
                d={smaPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            )}
            {showEMA50 && emaPath && (
              <path
                d={emaPath}
                fill="none"
                stroke="#818cf8"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            )}

            {/* Candlesticks & Volume Rendering */}
            {chartBars.map((bar, i) => {
              const x = getX(i);
              const isBull = bar.close >= bar.open;
              const candleColor = isBull 
                ? (isLight ? '#059669' : '#10b981') 
                : (isLight ? '#e11d48' : '#f43f5e');
              
              const candleWidth = Math.max(5, (usableWidth / count) * 0.7);
              const openY = getY(bar.open);
              const closeY = getY(bar.close);
              const highY = getY(bar.high);
              const lowY = getY(bar.low);
              
              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.max(2.5, Math.abs(closeY - openY));

              // Volume calculations
              const volY = getVolY(bar.volume);
              const volHeight = svgHeight - paddingBottom - volY;

              return (
                <g 
                  key={i} 
                  className="transition-opacity"
                  onMouseEnter={() => setHoveredIndex(i)}
                >
                  {/* Volume Histogram Bar at Bottom */}
                  {showVolume && (
                    <rect
                      x={x - candleWidth / 2}
                      y={volY}
                      width={candleWidth}
                      height={volHeight}
                      fill={candleColor}
                      opacity={hoveredIndex === i ? 0.8 : 0.35}
                      rx="1"
                    />
                  )}

                  {/* Candlestick Drawing */}
                  {chartType === 'candles' && (
                    <>
                      {/* Upper & Lower Wicks */}
                      <line
                        x1={x}
                        y1={highY}
                        x2={x}
                        y2={lowY}
                        stroke={candleColor}
                        strokeWidth="1.2"
                      />
                      {/* Real Candle Body */}
                      <rect
                        x={x - candleWidth / 2}
                        y={bodyTop}
                        width={candleWidth}
                        height={bodyHeight}
                        fill={isBull && !isLight ? candleColor : candleColor}
                        stroke={candleColor}
                        strokeWidth="1"
                        rx="1"
                        className="cursor-pointer hover:opacity-80"
                      />
                    </>
                  )}

                  {/* Invisible wide hover detector zone */}
                  <rect
                    x={x - (usableWidth / count) / 2}
                    y={paddingTop}
                    width={usableWidth / count}
                    height={svgHeight - paddingTop - paddingBottom}
                    fill="transparent"
                    className="cursor-crosshair"
                  />
                </g>
              );
            })}

            {/* Interactive Crosshair & Tooltip */}
            {hoveredIndex !== null && chartBars[hoveredIndex] && (
              <g pointerEvents="none">
                {/* Vertical Crosshair line */}
                <line
                  x1={getX(hoveredIndex)}
                  y1={paddingTop}
                  x2={getX(hoveredIndex)}
                  y2={svgHeight - paddingBottom}
                  stroke={isLight ? '#0284c7' : '#38bdf8'}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                {/* Horizontal Crosshair line */}
                <line
                  x1={paddingLeft}
                  y1={getY(chartBars[hoveredIndex].close)}
                  x2={svgWidth - paddingRight}
                  y2={getY(chartBars[hoveredIndex].close)}
                  stroke={isLight ? '#0284c7' : '#38bdf8'}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                {/* Price Marker on Axis */}
                <rect
                  x={svgWidth - paddingRight + 4}
                  y={getY(chartBars[hoveredIndex].close) - 9}
                  width="54"
                  height="18"
                  rx="3"
                  fill="#0284c7"
                />
                <text
                  x={svgWidth - paddingRight + 31}
                  y={getY(chartBars[hoveredIndex].close) + 3.5}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  ${chartBars[hoveredIndex].close.toFixed(1)}
                </text>
              </g>
            )}

            {/* Time Axis at bottom */}
            {chartBars.filter((_, idx) => idx % Math.ceil(count / 7) === 0).map((bar) => {
              const originalIdx = chartBars.indexOf(bar);
              return (
                <text
                  key={originalIdx}
                  x={getX(originalIdx)}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  fill={isLight ? '#64748b' : '#94a3b8'}
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {bar.timestamp}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Legend Footer */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
              Bullish Candle (Close &gt; Open)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span>
              Bearish Candle (Close &lt; Open)
            </span>
            {showSMA20 && (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="w-3 h-0.5 bg-amber-500"></span>
                SMA-20 Trend
              </span>
            )}
            {showEMA50 && (
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <span className="w-3 h-0.5 bg-indigo-500"></span>
                EMA-50 Trend
              </span>
            )}
          </div>
          <div className="text-cyan-700 dark:text-cyan-400 font-mono text-[10px]">
            Tick Frequency: Real-Time Stream
          </div>
        </div>
      </div>
    </div>
  );
};
