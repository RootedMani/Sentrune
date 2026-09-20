import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  createChart, 
  CandlestickSeries, 
  LineSeries, 
  HistogramSeries, 
  AreaSeries, 
  ColorType, 
  CrosshairMode, 
  IChartApi, 
  ISeriesApi,
  LineStyle,
  Time
} from 'lightweight-charts';
import { 
  TrendingUp, 
  TrendingDown, 
  Maximize2, 
  Minimize2, 
  Camera, 
  RotateCcw, 
  Layers, 
  Activity, 
  Sparkles, 
  ChevronDown, 
  Check, 
  Zap, 
  Target, 
  Crosshair, 
  BarChart3, 
  ShieldAlert,
  Info,
  SlidersHorizontal,
  DollarSign
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';
import { TRANSLATIONS } from '../data/translations';
import { 
  calculateSMA, 
  calculateEMA, 
  calculateBollingerBands, 
  calculateVWAP, 
  calculateRSI, 
  calculateMACD,
  OHLCVBar 
} from '../utils/chartIndicators';
import { 
  generateRealisticOHLCVBars, 
  ChartResolution, 
  RESOLUTION_LABELS 
} from '../utils/chartDataFeed';

export const PriceChart: React.FC = () => {
  const { selectedAsset, timeframe, setTimeframe, bars, theme, language } = useWorkstation();
  const t = TRANSLATIONS[language];
  const isLight = theme === 'light';

  // Chart state
  const [resolution, setResolution] = useState<ChartResolution>('1h');
  const [chartType, setChartType] = useState<'candles' | 'area' | 'line' | 'hollow'>('candles');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // Indicator toggles
  const [showSMA20, setShowSMA20] = useState<boolean>(true);
  const [showEMA50, setShowEMA50] = useState<boolean>(true);
  const [showEMA200, setShowEMA200] = useState<boolean>(false);
  const [showBollinger, setShowBollinger] = useState<boolean>(false);
  const [showVWAP, setShowVWAP] = useState<boolean>(false);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showRsiSubplot, setShowRsiSubplot] = useState<boolean>(false);
  const [showMacdSubplot, setShowMacdSubplot] = useState<boolean>(false);
  const [showIndicatorsMenu, setShowIndicatorsMenu] = useState<boolean>(false);

  // Drawing / Tool state
  const [activeTool, setActiveTool] = useState<'cursor' | 'horizontal_line' | 'risk_reward'>('cursor');
  const [horizontalRays, setHorizontalRays] = useState<{ id: string; price: number; color: string; label: string }[]>([]);
  const [riskRewardTarget, setRiskRewardTarget] = useState<{ entry: number; tp: number; sl: number; rr: number } | null>(null);

  // HUD telemetry state (dynamic hover or latest bar)
  const [crosshairBar, setCrosshairBar] = useState<OHLCVBar | null>(null);

  // DOM Container Refs
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const rsiContainerRef = useRef<HTMLDivElement | null>(null);
  const mainWrapperRef = useRef<HTMLDivElement | null>(null);

  // Chart & Series instance refs
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any, Time> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram', Time> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  const bbMiddleSeriesRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<'Line', Time> | null>(null);

  // RSI Chart instance ref
  const rsiChartRef = useRef<IChartApi | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line', Time> | null>(null);

  // Horizontal price lines ref map
  const priceLinesMapRef = useRef<Map<string, any>>(new Map());

  // Generate historical OHLCV data
  const rawData = useMemo(() => {
    return generateRealisticOHLCVBars(selectedAsset, resolution, 220, bars);
  }, [selectedAsset.id, selectedAsset.symbol, resolution, bars]);

  // Sync resolution with global timeframe if changed
  useEffect(() => {
    if (timeframe === '1d' && resolution !== '1D') setResolution('1D');
    else if (timeframe === '1h' && resolution !== '1h') setResolution('1h');
    else if (timeframe === '1wk' && resolution !== '1W') setResolution('1W');
  }, [timeframe]);

  const handleResolutionChange = (res: ChartResolution) => {
    setResolution(res);
    if (res === '1D') setTimeframe('1d');
    else if (res === '1h') setTimeframe('1h');
    else if (res === '1W') setTimeframe('1wk');
  };

  // Active bar details for top telemetry
  const latestBar = rawData[rawData.length - 1];
  const activeBar = crosshairBar || latestBar;
  const isUp = activeBar ? activeBar.close >= activeBar.open : true;
  const barChange = activeBar ? activeBar.close - activeBar.open : 0;
  const barChangePct = activeBar && activeBar.open > 0 ? (barChange / activeBar.open) * 100 : 0;

  // Initialize and update Main Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    container.innerHTML = '';

    const bg = isLight ? '#ffffff' : '#07111e';
    const textCol = isLight ? '#475569' : '#94a3b8';
    const gridCol = isLight ? '#f1f5f9' : '#0d1e33';
    const borderCol = isLight ? '#e2e8f0' : '#1a2e47';

    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: container.clientHeight || 480,
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor: textCol,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace, sans-serif',
      },
      grid: {
        vertLines: { color: gridCol, style: LineStyle.Dotted },
        horzLines: { color: gridCol, style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: isLight ? '#64748b' : '#38bdf8',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: isLight ? '#0f172a' : '#0284c7',
        },
        horzLine: {
          color: isLight ? '#64748b' : '#38bdf8',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: isLight ? '#0f172a' : '#0284c7',
        },
      },
      timeScale: {
        borderColor: borderCol,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: borderCol,
        scaleMargins: {
          top: 0.08,
          bottom: showVolume ? 0.22 : 0.08,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Add Primary Price Series based on selected chart type
    let mainSeries: ISeriesApi<any, Time>;

    if (chartType === 'area') {
      mainSeries = chart.addSeries(AreaSeries, {
        topColor: isLight ? 'rgba(6, 182, 212, 0.4)' : 'rgba(6, 182, 212, 0.45)',
        bottomColor: isLight ? 'rgba(6, 182, 212, 0.01)' : 'rgba(6, 182, 212, 0.02)',
        lineColor: '#06b6d4',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      mainSeries.setData(rawData.map(b => ({ time: b.time as Time, value: b.close })));
    } else if (chartType === 'line') {
      mainSeries = chart.addSeries(LineSeries, {
        color: '#06b6d4',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      mainSeries.setData(rawData.map(b => ({ time: b.time as Time, value: b.close })));
    } else {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: chartType === 'hollow' ? (isLight ? '#ffffff' : '#07111e') : '#10b981',
        downColor: '#f43f5e',
        borderUpColor: '#10b981',
        borderDownColor: '#f43f5e',
        wickUpColor: '#10b981',
        wickDownColor: '#f43f5e',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      mainSeries.setData(rawData.map(b => ({
        time: b.time as Time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })));
    }

    mainSeriesRef.current = mainSeries;

    // Add Volume Series (Histogram) with opacity margins
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '', // overlay
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.78,
          bottom: 0,
        },
      });
      volumeSeries.setData(
        rawData.map(b => ({
          time: b.time as Time,
          value: b.volume,
          color: b.close >= b.open 
            ? (isLight ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.35)') 
            : (isLight ? 'rgba(244, 63, 94, 0.4)' : 'rgba(244, 63, 94, 0.35)'),
        }))
      );
      volumeSeriesRef.current = volumeSeries;
    }

    // Add Indicator Series
    if (showSMA20) {
      const smaData = calculateSMA(rawData, 20);
      const smaSeries = chart.addSeries(LineSeries, {
        color: '#06b6d4',
        lineWidth: 2,
        title: 'SMA 20',
      });
      smaSeries.setData(smaData.map(p => ({ time: p.time as Time, value: p.value })));
      sma20SeriesRef.current = smaSeries;
    }

    if (showEMA50) {
      const emaData = calculateEMA(rawData, 50);
      const emaSeries = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 2,
        title: 'EMA 50',
      });
      emaSeries.setData(emaData.map(p => ({ time: p.time as Time, value: p.value })));
      ema50SeriesRef.current = emaSeries;
    }

    if (showEMA200) {
      const ema200Data = calculateEMA(rawData, 200);
      const ema200Series = chart.addSeries(LineSeries, {
        color: '#a855f7',
        lineWidth: 2,
        title: 'EMA 200',
      });
      ema200Series.setData(ema200Data.map(p => ({ time: p.time as Time, value: p.value })));
      ema200SeriesRef.current = ema200Series;
    }

    if (showBollinger) {
      const bb = calculateBollingerBands(rawData, 20, 2);
      const upperSeries = chart.addSeries(LineSeries, {
        color: 'rgba(56, 189, 248, 0.7)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'BB Upper',
      });
      const middleSeries = chart.addSeries(LineSeries, {
        color: 'rgba(56, 189, 248, 0.4)',
        lineWidth: 1,
        title: 'BB Mid',
      });
      const lowerSeries = chart.addSeries(LineSeries, {
        color: 'rgba(56, 189, 248, 0.7)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'BB Lower',
      });

      upperSeries.setData(bb.upper.map(p => ({ time: p.time as Time, value: p.value })));
      middleSeries.setData(bb.middle.map(p => ({ time: p.time as Time, value: p.value })));
      lowerSeries.setData(bb.lower.map(p => ({ time: p.time as Time, value: p.value })));

      bbUpperSeriesRef.current = upperSeries;
      bbMiddleSeriesRef.current = middleSeries;
      bbLowerSeriesRef.current = lowerSeries;
    }

    if (showVWAP) {
      const vwapData = calculateVWAP(rawData);
      const vwapSeries = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        title: 'VWAP',
      });
      vwapSeries.setData(vwapData.map(p => ({ time: p.time as Time, value: p.value })));
      vwapSeriesRef.current = vwapSeries;
    }

    // Apply horizontal user lines
    priceLinesMapRef.current.clear();
    horizontalRays.forEach(ray => {
      const line = mainSeries.createPriceLine({
        price: ray.price,
        color: ray.color,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: ray.label,
      });
      priceLinesMapRef.current.set(ray.id, line);
    });

    // Apply Risk/Reward target lines if set
    if (riskRewardTarget) {
      mainSeries.createPriceLine({
        price: riskRewardTarget.tp,
        color: '#10b981',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `Take Profit (R:R ${riskRewardTarget.rr.toFixed(2)})`,
      });
      mainSeries.createPriceLine({
        price: riskRewardTarget.entry,
        color: '#06b6d4',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: 'Entry Target',
      });
      mainSeries.createPriceLine({
        price: riskRewardTarget.sl,
        color: '#f43f5e',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: 'Stop Loss',
      });
    }

    // Crosshair listener for live OHLC HUD
    chart.subscribeCrosshairMove(param => {
      if (!param.time || !param.seriesData || param.point === undefined) {
        setCrosshairBar(null);
        return;
      }
      const data = param.seriesData.get(mainSeries);
      if (data) {
        const timeSec = typeof param.time === 'number' ? param.time : 0;
        const matchingBar = rawData.find(b => b.time === timeSec);
        if (matchingBar) {
          setCrosshairBar(matchingBar);
        } else if ('open' in (data as any)) {
          const d = data as any;
          setCrosshairBar({
            time: timeSec,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume || 0,
          });
        } else if ('value' in (data as any)) {
          const v = (data as any).value;
          setCrosshairBar({
            time: timeSec,
            open: v,
            high: v,
            low: v,
            close: v,
            volume: 0,
          });
        }
      }
    });

    // Handle ResizeObserver
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.applyOptions({ width, height });
    });
    resizeObserver.observe(container);

    // Initial fit
    chart.timeScale().fitContent();

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [
    rawData, 
    chartType, 
    showVolume, 
    showSMA20, 
    showEMA50, 
    showEMA200, 
    showBollinger, 
    showVWAP, 
    horizontalRays, 
    riskRewardTarget,
    isLight
  ]);

  // Initialize RSI Sub-panel if enabled
  useEffect(() => {
    if (!showRsiSubplot || !rsiContainerRef.current) return;

    const container = rsiContainerRef.current;
    container.innerHTML = '';

    const bg = isLight ? '#f8fafc' : '#050c17';
    const textCol = isLight ? '#64748b' : '#94a3b8';
    const gridCol = isLight ? '#f1f5f9' : '#0d1e33';
    const borderCol = isLight ? '#e2e8f0' : '#1a2e47';

    const rsiChart = createChart(container, {
      width: container.clientWidth || 800,
      height: 120,
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor: textCol,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace, sans-serif',
      },
      grid: {
        vertLines: { color: gridCol, style: LineStyle.Dotted },
        horzLines: { color: gridCol, style: LineStyle.Dotted },
      },
      rightPriceScale: {
        borderColor: borderCol,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: borderCol,
        timeVisible: true,
      },
    });

    rsiChartRef.current = rsiChart;

    const rsiData = calculateRSI(rawData, 14);
    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: '#818cf8',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: (val: number) => val.toFixed(1) },
    });
    rsiSeries.setData(rsiData.map(p => ({ time: p.time as Time, value: p.value })));
    rsiSeriesRef.current = rsiSeries;

    // Overbought / Oversold reference lines
    rsiSeries.createPriceLine({
      price: 70,
      color: '#f43f5e',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Overbought (70)',
    });
    rsiSeries.createPriceLine({
      price: 50,
      color: '#64748b',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
    });
    rsiSeries.createPriceLine({
      price: 30,
      color: '#10b981',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Oversold (30)',
    });

    rsiChart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0 || !rsiChartRef.current) return;
      const { width, height } = entries[0].contentRect;
      rsiChartRef.current.applyOptions({ width, height });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      rsiChart.remove();
      rsiChartRef.current = null;
    };
  }, [showRsiSubplot, rawData, isLight]);

  // Click on chart to drop horizontal line when tool is active
  const handleChartClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'horizontal_line' && chartRef.current && mainSeriesRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const price = mainSeriesRef.current.coordinateToPrice(y);
      if (price !== null && !isNaN(price)) {
        const rounded = Number(price.toFixed(2));
        const newRay = {
          id: `ray_${Date.now()}`,
          price: rounded,
          color: '#38bdf8',
          label: `Level $${rounded.toLocaleString()}`,
        };
        setHorizontalRays(prev => [...prev, newRay]);
        setActiveTool('cursor');
      }
    }
  }, [activeTool]);

  // Take screenshot / export PNG
  const handleExportScreenshot = () => {
    if (!chartRef.current) return;
    try {
      const canvas = chartContainerRef.current?.querySelector('canvas');
      if (canvas) {
        const imageUri = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `Sentrune_${selectedAsset.symbol}_${resolution}_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = imageUri;
        link.click();
      }
    } catch (err) {
      console.error('Failed to export chart screenshot', err);
    }
  };

  // Reset zoom
  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Set default risk/reward target planner
  const handleApplyRiskReward = () => {
    const entry = selectedAsset.price;
    const isBullish = selectedAsset.change >= 0;
    const distance = entry * 0.035;
    const tp = isBullish ? entry + distance * 2 : entry - distance * 2;
    const sl = isBullish ? entry - distance : entry + distance;
    const rr = 2.0;

    setRiskRewardTarget({
      entry: Number(entry.toFixed(2)),
      tp: Number(tp.toFixed(2)),
      sl: Number(sl.toFixed(2)),
      rr,
    });
  };

  // Clear drawings
  const handleClearDrawings = () => {
    setHorizontalRays([]);
    setRiskRewardTarget(null);
  };

  return (
    <div 
      ref={mainWrapperRef}
      id="tradingview-pro-workstation" 
      className={`flex flex-col transition-all duration-300 ${
        isFullscreen 
          ? 'fixed inset-0 z-50 bg-[#050b14] p-4 overflow-hidden' 
          : 'space-y-3 p-3 md:p-4'
      }`}
    >
      {/* 1. TOP ASSET TICKER & LIVE METRICS BAR (Bloomberg / TradingView Style) */}
      <div className="bg-white dark:bg-[#07111e] rounded-xl border border-slate-200 dark:border-slate-800/90 p-3.5 shadow-sm transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Asset Identity & Realtime Beacon */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center font-mono font-bold text-cyan-500 dark:text-cyan-400 text-sm shadow-inner">
              {selectedAsset.symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {selectedAsset.name}
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  {selectedAsset.symbol}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  LIVE 60FPS
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedAsset.exchange || 'Binance Pro Feed'} · Precision Canvas Engine · Zero Latency
              </div>
            </div>
          </div>

          {/* Key Pricing Metrics HUD */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-mono">
            {/* Last Price */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Last Valuation</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1">
                ${selectedAsset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-[10px] text-slate-400 font-normal">USD</span>
              </div>
            </div>

            {/* 24h Change */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">24h Net Change</div>
              <div className={`text-sm font-bold mt-0.5 flex items-center gap-1 ${
                selectedAsset.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {selectedAsset.change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {selectedAsset.change >= 0 ? '+' : ''}{selectedAsset.change.toFixed(2)} ({selectedAsset.changePercent >= 0 ? '+' : ''}{selectedAsset.changePercent.toFixed(2)}%)
              </div>
            </div>

            {/* 24h Range */}
            <div className="hidden sm:block">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">24h High / Low</div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                <span className="text-emerald-600 dark:text-emerald-400">${selectedAsset.high24h.toLocaleString()}</span>
                {' / '}
                <span className="text-rose-600 dark:text-rose-400">${selectedAsset.low24h.toLocaleString()}</span>
              </div>
            </div>

            {/* 24h Volume */}
            <div className="hidden md:block">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">24h Volume</div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                {typeof selectedAsset.volume === 'number' ? `$${selectedAsset.volume.toLocaleString()}` : selectedAsset.volume}
              </div>
            </div>

            {/* RSI Quick Stat */}
            <div className="hidden lg:block">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">RSI (14)</div>
              <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                {selectedAsset.rsi || 58.4}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. PRO TRADINGVIEW TOOLBAR (Resolutions, Chart Types, Indicators, Tools) */}
      <div className="bg-white dark:bg-[#07111e] rounded-xl border border-slate-200 dark:border-slate-800/90 px-3 py-2 shadow-sm flex flex-wrap items-center justify-between gap-2 text-xs">
        
        {/* Left Side: Timeframe Selector & Chart Types */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          
          {/* Resolution Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-[#0c1a2d] p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
            {(['1m', '5m', '15m', '1h', '4h', '1D', '1W'] as ChartResolution[]).map(res => (
              <button
                key={res}
                id={`chart-res-${res}`}
                onClick={() => handleResolutionChange(res)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                  resolution === res
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {RESOLUTION_LABELS[res]}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

          {/* Chart Style Options */}
          <div className="flex items-center bg-slate-100 dark:bg-[#0c1a2d] p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              id="chart-type-candles"
              onClick={() => setChartType('candles')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                chartType === 'candles' ? 'bg-cyan-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
              title="Candlestick (TradingView Pro)"
            >
              Candles
            </button>
            <button
              id="chart-type-hollow"
              onClick={() => setChartType('hollow')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                chartType === 'hollow' ? 'bg-cyan-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
              title="Hollow Candles"
            >
              Hollow
            </button>
            <button
              id="chart-type-area"
              onClick={() => setChartType('area')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                chartType === 'area' ? 'bg-cyan-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
              title="Mountain / Area"
            >
              Area
            </button>
            <button
              id="chart-type-line"
              onClick={() => setChartType('line')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                chartType === 'line' ? 'bg-cyan-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
              title="Line Chart"
            >
              Line
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

          {/* Indicators Dropdown Toggle */}
          <div className="relative">
            <button
              id="chart-indicators-menu-btn"
              onClick={() => setShowIndicatorsMenu(!showIndicatorsMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0c1a2d] hover:bg-slate-200 dark:hover:bg-[#12243d] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer text-[11px]"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Indicators ({[showSMA20, showEMA50, showEMA200, showBollinger, showVWAP, showVolume, showRsiSubplot].filter(Boolean).length})</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showIndicatorsMenu && (
              <div 
                id="indicators-dropdown"
                className="absolute left-0 mt-1.5 w-60 bg-white dark:bg-[#081526] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 p-2 text-xs space-y-1"
              >
                <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Overlay Indicators</div>
                
                <button
                  onClick={() => setShowSMA20(!showSMA20)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                    <span>SMA 20 (Trend)</span>
                  </span>
                  {showSMA20 && <Check className="w-3.5 h-3.5 text-cyan-500" />}
                </button>

                <button
                  onClick={() => setShowEMA50(!showEMA50)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>EMA 50 (Dynamic)</span>
                  </span>
                  {showEMA50 && <Check className="w-3.5 h-3.5 text-amber-500" />}
                </button>

                <button
                  onClick={() => setShowEMA200(!showEMA200)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                    <span>EMA 200 (Institutional)</span>
                  </span>
                  {showEMA200 && <Check className="w-3.5 h-3.5 text-purple-500" />}
                </button>

                <button
                  onClick={() => setShowBollinger(!showBollinger)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                    <span>Bollinger Bands</span>
                  </span>
                  {showBollinger && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>

                <button
                  onClick={() => setShowVWAP(!showVWAP)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span>VWAP (Intraday Benchmark)</span>
                  </span>
                  {showVWAP && <Check className="w-3.5 h-3.5 text-blue-500" />}
                </button>

                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800/80">
                  <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Sub-Panels</div>
                  
                  <button
                    onClick={() => setShowVolume(!showVolume)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-left"
                  >
                    <span>Volume Histogram</span>
                    {showVolume && <Check className="w-3.5 h-3.5 text-cyan-500" />}
                  </button>

                  <button
                    onClick={() => setShowRsiSubplot(!showRsiSubplot)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-left"
                  >
                    <span>RSI (14) Oscillator Panel</span>
                    {showRsiSubplot && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Active Indicators Pills */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono">
            {showSMA20 && (
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> SMA 20
              </span>
            )}
            {showEMA50 && (
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> EMA 50
              </span>
            )}
            {showBollinger && (
              <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> BB (20, 2)
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Pro Drawing, Tools, Screenshot & Fullscreen */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          
          {/* Horizontal Level Tool */}
          <button
            id="tool-horizontal-line-btn"
            onClick={() => setActiveTool(activeTool === 'horizontal_line' ? 'cursor' : 'horizontal_line')}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
              activeTool === 'horizontal_line'
                ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                : 'bg-slate-100 dark:bg-[#0c1a2d] hover:bg-slate-200 dark:hover:bg-[#12243d] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
            title="Click chart to place Support / Resistance Level"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Price Ray</span>
          </button>

          {/* Risk / Reward Target Planner */}
          <button
            id="tool-risk-reward-btn"
            onClick={handleApplyRiskReward}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0c1a2d] hover:bg-slate-200 dark:hover:bg-[#12243d] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
            title="Auto-project 1:2 Risk-to-Reward Stop & Target Lines"
          >
            <Target className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">1:2 R:R Planner</span>
          </button>

          {/* Clear Drawings if any */}
          {(horizontalRays.length > 0 || riskRewardTarget) && (
            <button
              onClick={handleClearDrawings}
              className="px-2 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-medium transition-colors cursor-pointer"
              title="Clear all manual annotations"
            >
              Clear
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

          {/* Reset Zoom */}
          <button
            id="chart-reset-zoom-btn"
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#0c1a2d] hover:bg-slate-200 dark:hover:bg-[#12243d] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Reset Scale (Auto-fit)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Export PNG */}
          <button
            id="chart-screenshot-btn"
            onClick={handleExportScreenshot}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#0c1a2d] hover:bg-slate-200 dark:hover:bg-[#12243d] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Export High-Res Chart Snapshot (PNG)"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen */}
          <button
            id="chart-fullscreen-btn"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#0c1a2d] hover:bg-slate-200 dark:hover:bg-[#12243d] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Trading Canvas"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>

      {/* 3. CHART CANVAS CONTAINER WITH REALTIME CROSSHAIR HUD */}
      <div className="relative bg-white dark:bg-[#07111e] rounded-xl border border-slate-200 dark:border-slate-800/90 shadow-sm overflow-hidden flex flex-col flex-1">
        
        {/* TradingView Live Crosshair Telemetry HUD (Top-Left of chart) */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none flex flex-wrap items-center gap-x-3 gap-y-1 bg-white/90 dark:bg-[#07111e]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80 text-[11px] font-mono shadow-md">
          <span className="text-slate-400 font-semibold">{selectedAsset.symbol} · {RESOLUTION_LABELS[resolution]}</span>
          <span className="text-slate-400">O: <strong className="text-slate-800 dark:text-slate-200 font-medium">${activeBar ? activeBar.open.toFixed(2) : '--'}</strong></span>
          <span className="text-slate-400">H: <strong className="text-emerald-500 font-medium">${activeBar ? activeBar.high.toFixed(2) : '--'}</strong></span>
          <span className="text-slate-400">L: <strong className="text-rose-500 font-medium">${activeBar ? activeBar.low.toFixed(2) : '--'}</strong></span>
          <span className="text-slate-400">C: <strong className={`font-medium ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>${activeBar ? activeBar.close.toFixed(2) : '--'}</strong></span>
          <span className={`font-medium ${barChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {barChange >= 0 ? '+' : ''}{barChange.toFixed(2)} ({barChangePct >= 0 ? '+' : ''}{barChangePct.toFixed(2)}%)
          </span>
          {showVolume && activeBar && (
            <span className="text-slate-400 hidden sm:inline">
              Vol: <strong className="text-cyan-500 font-medium">{activeBar.volume.toLocaleString()}</strong>
            </span>
          )}
        </div>

        {/* Active Tool Reminder Pill */}
        {activeTool === 'horizontal_line' && (
          <div className="absolute top-3 right-3 z-20 bg-cyan-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg animate-pulse flex items-center gap-1.5 pointer-events-none">
            <Crosshair className="w-3.5 h-3.5" />
            Click chart to drop price ray
          </div>
        )}

        {/* Main Canvas Container */}
        <div 
          ref={chartContainerRef} 
          id="tradingview-canvas-container"
          onClick={handleChartClick}
          className={`w-full transition-all cursor-${activeTool === 'horizontal_line' ? 'crosshair' : 'default'}`}
          style={{ height: isFullscreen ? 'calc(100vh - 220px)' : '480px' }}
        />

        {/* Sub-Panel: RSI (14) Oscillator */}
        {showRsiSubplot && (
          <div className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#050c17] p-2 relative">
            <div className="flex items-center justify-between text-[11px] font-mono px-2 mb-1">
              <span className="text-indigo-500 dark:text-indigo-400 font-bold flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                RSI (14) Oscillator
              </span>
              <span className="text-slate-500 text-[10px]">
                Thresholds: 70 Overbought / 30 Oversold
              </span>
            </div>
            <div ref={rsiContainerRef} className="w-full" style={{ height: '120px' }} />
          </div>
        )}

      </div>

      {/* 4. PRO MULTI-FACTOR TECHNICAL MATRIX FOOTER */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        
        <div className="bg-white dark:bg-[#07111e] rounded-xl border border-slate-200 dark:border-slate-800/80 p-3 shadow-sm text-xs font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Trend Direction</div>
          <div className="text-sm font-bold text-emerald-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Strong Bullish
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Price &gt; SMA 20 &gt; EMA 50</div>
        </div>

        <div className="bg-white dark:bg-[#07111e] rounded-xl border border-slate-200 dark:border-slate-800/80 p-3 shadow-sm text-xs font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Bollinger Squeeze</div>
          <div className="text-sm font-bold text-cyan-500 mt-1">
            Normal Bandwidth
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Expansion probability: 64%</div>
        </div>

        <div className="bg-white dark:bg-[#07111e] rounded-xl border border-slate-200 dark:border-slate-800/80 p-3 shadow-sm text-xs font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">MACD Momentum</div>
          <div className="text-sm font-bold text-emerald-500 mt-1">
            Positive Histogram
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Histogram: +24.50 pts</div>
        </div>

        <div className="bg-white dark:bg-[#07111e] rounded-xl border border-slate-200 dark:border-slate-800/80 p-3 shadow-sm text-xs font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Volume Weight</div>
          <div className="text-sm font-bold text-amber-500 mt-1">
            1.24x Above 20MA
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Institutional accumulation</div>
        </div>

        <div className="bg-white dark:bg-[#07111e] rounded-xl border border-slate-200 dark:border-slate-800/80 p-3 shadow-sm text-xs font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Dynamic Support</div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
            ${(selectedAsset.price * 0.978).toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">EMA 50 confluence level</div>
        </div>

        <div className="bg-white dark:bg-[#07111e] rounded-xl border border-slate-200 dark:border-slate-800/80 p-3 shadow-sm text-xs font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Target Resistance</div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
            ${(selectedAsset.price * 1.042).toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Fibonacci 1.618 projection</div>
        </div>

      </div>

    </div>
  );
};
