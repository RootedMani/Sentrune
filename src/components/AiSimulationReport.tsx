import React, { useState, useEffect } from 'react';
import {
  SimulationResults,
  SimulationTrade,
  Asset,
} from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  ShieldAlert,
  Activity,
  Award,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Sliders,
  CheckCircle,
  XCircle,
  HelpCircle,
  BarChart2,
  Lock,
} from 'lucide-react';

interface AiSimulationReportProps {
  asset: Asset | null;
  interval: string;
  simulationData: SimulationResults | null;
  comparisonData: SimulationResults[] | null;
  isLoading: boolean;
  onRunSimulation: (modelId: string, budget: number) => Promise<void>;
  onRunComparison: (budget: number) => Promise<void>;
}

export const AiSimulationReport: React.FC<AiSimulationReportProps> = ({
  asset,
  interval,
  simulationData,
  comparisonData,
  isLoading,
  onRunSimulation,
  onRunComparison,
}) => {
  const { language, t, isRtl, toPersianDigits, formatNumber, formatCurrency, formatPercent } = useLanguage();
  const { isDark } = useTheme();

  const [selectedModelId, setSelectedModelId] = useState<string>('openai/gpt-oss-120b');
  const [budget, setBudget] = useState<number>(10000);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'BUY' | 'SELL' | 'WIN' | 'LOSS'>('ALL');
  const [activeLang, setActiveLang] = useState<'fa' | 'en'>(language);
  const [customModels, setCustomModels] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/custom-models')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.models) {
          setCustomModels(data.models);
        }
      })
      .catch(() => {});
  }, []);

  const baseModels = [
    { id: 'openai/gpt-oss-120b', name: 'OpenAI GPT OSS 120B (Groq LPU)', tag: 'Deep Reasoning' },
    { id: 'gemini-flash', name: 'Google Gemini Flash', tag: 'Multi-Modal Synthesis' },
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B Fast Reasoning (Groq)', tag: 'Chain-of-Thought Quant' },
    { id: 'openai/gpt-oss-20b', name: 'OpenAI GPT OSS 20B High-Velocity (Groq)', tag: 'Ultra Low Latency' },
    { id: 'lightgbm-quant', name: 'LightGBM Multi-Factor Ensemble', tag: 'Mathematical Quant' },
  ];

  const availableModels = [
    ...customModels.map((cm) => ({
      id: cm.id,
      name: `${cm.name}`,
      tag: cm.metrics?.status === 'profitable' ? (language === 'fa' ? 'سودده' : 'Custom: Profitable') : (language === 'fa' ? 'در زیان' : 'Custom: In Loss'),
    })),
    ...baseModels,
  ];

  const handleRun = () => {
    onRunSimulation(selectedModelId, budget);
  };

  const handleCompare = () => {
    onRunComparison(budget);
  };

  const sim = simulationData;
  const isProfit = (sim?.totalProfit || 0) >= 0;
  const isAlphaPositive = (sim?.alphaPct || 0) >= 0;

  // Filtered trade list
  const filteredTrades = (sim?.trades || []).filter((trade) => {
    if (tradeFilter === 'ALL') return true;
    if (tradeFilter === 'BUY') return trade.action === 'BUY';
    if (tradeFilter === 'SELL') return trade.action === 'SELL';
    if (tradeFilter === 'WIN') return trade.action === 'SELL' && trade.realizedPnl > 0;
    if (tradeFilter === 'LOSS') return trade.action === 'SELL' && trade.realizedPnl <= 0;
    return true;
  });

  const chartData = (sim?.equityCurve || []).map((pt) => ({
    timestamp: pt.timestamp.split('T')[0] || pt.timestamp,
    price: pt.price,
    portfolioEquity: pt.portfolioEquity,
    benchmarkEquity: pt.benchmarkEquity,
    cash: pt.cash,
    holdingsValue: pt.holdingsValue,
    drawdownPct: -Math.abs(pt.drawdownPct),
    action: pt.actionTaken,
  }));

  const formatUsd = (val: number) => {
    return formatCurrency(val, 2);
  };

  return (
    <div className="space-y-6" id="ai-simulation-module">
      {/* Simulation Command Center */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
              <DollarSign className="w-3.5 h-3.5" />
              <span>{language === 'fa' ? 'ارزیابی و شبیه‌سازی عملکرد استراتژی پورتفوی' : 'Portfolio Strategy Performance Engine'}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{language === 'fa' ? `تحلیل الگوریتمی تخصیص سرمایه و مدیریت معاملات ${asset?.name || ''}` : `Algorithmic Buy & Sell Simulation for ${asset?.name || 'Asset'}`}</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-mono text-sm font-semibold">({asset?.symbol})</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {language === 'fa'
                ? 'اجرای خودکار سفارش‌های خرید و فروش الگوریتمی با سرمایه اولیه، محاسبه کارمزد، اسلیپیج و گزارش جامع سودآوری و مدیریت ریسک.'
                : 'Autonomous execution of algorithmic buy, sell, and risk management signals with simulated slippage and execution costs.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-auto">
            {sim && (
              <button
                onClick={() => setShowReportModal(true)}
                id="btn-open-executive-report"
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <FileText className="w-4 h-4 text-cyan-500" />
                <span>{language === 'fa' ? 'گزارش تحلیلی جامع' : 'Institutional Report'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Model Selection & Capital Configuration Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* AI Model Selector */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-500" />
              <span>{language === 'fa' ? 'مدل تحلیلی ارزیابی استراتژی:' : 'Strategy AI Engine:'}</span>
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} [{m.tag}]
                </option>
              ))}
            </select>
          </div>

          {/* Starting Budget Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span>{language === 'fa' ? 'سرمایه اولیه آزمون ($):' : 'Starting Capital ($):'}</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1000"
                step="1000"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value) || 10000)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">USD</span>
            </div>
          </div>

          {/* Execution Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRun}
              disabled={isLoading}
              id="btn-run-simulation"
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>
                {isLoading
                  ? (language === 'fa' ? 'در حال محاسبه استراتژی...' : 'Evaluating...')
                  : (language === 'fa' ? 'ارزیابی استراتژی' : 'Evaluate Strategy')}
              </span>
            </button>

            <button
              onClick={handleCompare}
              disabled={isLoading}
              id="btn-compare-all-models"
              title={language === 'fa' ? 'مقایسه همزمان عملکرد تمام مدل‌ها' : 'Compare all AI models'}
              className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-500" />
              <span className="hidden sm:inline">{language === 'fa' ? 'مقایسه مدل‌ها' : 'Compare All'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Performance Metrics Grid */}
      {sim && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Final Equity */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {language === 'fa' ? 'ارزش نهایی پورتفوی' : 'Final Portfolio Equity'}
            </span>
            <div className="text-lg sm:text-xl font-mono font-black text-slate-900 dark:text-slate-100">
              {formatUsd(sim.finalEquity)}
            </div>
            <div className={`text-xs font-mono font-bold flex items-center gap-0.5 ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{isProfit ? '+' : ''}{formatNumber(sim.totalProfit, { decimals: 2 })} ({formatPercent(sim.totalReturnPct, 2, true)})</span>
            </div>
          </div>

          {/* Card 2: Alpha vs Benchmark */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {language === 'fa' ? 'بازدهی مازاد (آلفا)' : 'Alpha vs Benchmark'}
            </span>
            <div className={`text-lg sm:text-xl font-mono font-black ${isAlphaPositive ? 'text-cyan-600 dark:text-cyan-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatPercent(sim.alphaPct, 2, true)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              B&H: {formatPercent(sim.benchmarkReturnPct, 2, true)}
            </div>
          </div>

          {/* Card 3: Win Rate & Trades */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {language === 'fa' ? 'نرخ برد معاملات' : 'Win Rate (% Wins)'}
            </span>
            <div className="text-lg sm:text-xl font-mono font-black text-slate-900 dark:text-slate-100">
              {formatPercent(sim.winRatePct, 1, false)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {toPersianDigits(sim.winningTrades)}W / {toPersianDigits(sim.losingTrades)}L ({toPersianDigits(sim.totalTrades)} {language === 'fa' ? 'معامله' : 'trades'})
            </div>
          </div>

          {/* Card 4: Profit Factor */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {language === 'fa' ? 'فاکتور سودآوری' : 'Profit Factor'}
            </span>
            <div className="text-lg sm:text-xl font-mono font-black text-emerald-600 dark:text-emerald-400">
              {formatNumber(sim.profitFactor, { decimals: 2 })}x
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {language === 'fa' ? 'نسبت کل سود به زیان' : 'Gross Win / Loss ratio'}
            </div>
          </div>

          {/* Card 5: Max Drawdown */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {language === 'fa' ? 'حداکثر افت سرمایه' : 'Max Drawdown'}
            </span>
            <div className="text-lg sm:text-xl font-mono font-black text-rose-600 dark:text-rose-400">
              -{formatPercent(sim.maxDrawdownPct, 2, false)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {language === 'fa' ? 'کنترل دقیق ریسک' : 'Tight risk containment'}
            </div>
          </div>

          {/* Card 6: Sharpe Ratio */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {language === 'fa' ? 'نسبت شارپ سالانه' : 'Sharpe Ratio'}
            </span>
            <div className="text-lg sm:text-xl font-mono font-black text-slate-900 dark:text-slate-100">
              {formatNumber(sim.sharpeRatio, { decimals: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Sortino: {formatNumber(sim.sortinoRatio, { decimals: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Multi-Model Tournament Comparison Table (If comparisonData available) */}
      {comparisonData && comparisonData.length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>{language === 'fa' ? 'مقایسه عملکرد ۴ مدل روی سرمایه ۱۰,۰۰۰ دلاری' : '$10,000 Multi-Model Tournament Results'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'fa'
                  ? 'رتبه‌بندی مدل‌های هوش مصنوعی بر اساس بیشترین سودآوری خالص و ضریب شارپ'
                  : 'Direct head-to-head comparison on the exact same price dataset & execution parameters'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left" dir={isRtl ? 'rtl' : 'ltr'}>
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">{language === 'fa' ? 'رتبه و مدل' : 'Rank & Model'}</th>
                  <th className="p-3 text-right">{language === 'fa' ? 'ارزش نهایی پورتفوی' : 'Final Equity ($)'}</th>
                  <th className="p-3 text-right">{language === 'fa' ? 'بازده کل' : 'Total Return (%)'}</th>
                  <th className="p-3 text-right">{language === 'fa' ? 'آلفا' : 'Alpha (%)'}</th>
                  <th className="p-3 text-right">{language === 'fa' ? 'نرخ برد' : 'Win Rate (%)'}</th>
                  <th className="p-3 text-right">{language === 'fa' ? 'حداکثر افت' : 'Max DD (%)'}</th>
                  <th className="p-3 text-right">{language === 'fa' ? 'شارپ' : 'Sharpe'}</th>
                  <th className="p-3 text-right">{language === 'fa' ? 'عملیات' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {comparisonData.map((res, idx) => (
                  <tr
                    key={res.modelId}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      idx === 0 ? 'bg-amber-500/5 font-semibold' : ''
                    }`}
                  >
                    <td className="p-3 flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                        idx === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        #{toPersianDigits(idx + 1)}
                      </span>
                      <span>{res.modelName}</span>
                      {idx === 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                          {language === 'fa' ? 'برترین بازده' : 'Best ROI'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatUsd(res.finalEquity)}
                    </td>
                    <td className={`p-3 text-right font-mono font-bold ${res.totalReturnPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatPercent(res.totalReturnPct, 2, true)}
                    </td>
                    <td className="p-3 text-right font-mono text-cyan-600 dark:text-cyan-400">
                      {formatPercent(res.alphaPct, 2, true)}
                    </td>
                    <td className="p-3 text-right font-mono">{formatPercent(res.winRatePct, 1, false)}</td>
                    <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">-{formatPercent(res.maxDrawdownPct, 2, false)}</td>
                    <td className="p-3 text-right font-mono">{formatNumber(res.sharpeRatio, { decimals: 2 })}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedModelId(res.modelId);
                          onRunSimulation(res.modelId, budget);
                        }}
                        className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        {language === 'fa' ? 'انتخاب مدل' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comparative Equity Curve Chart */}
      {sim && chartData.length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-500" />
                <span>{language === 'fa' ? 'نمودار رشد سرمایه و مقایسه با خرید و نگهداری (Buy & Hold)' : 'Portfolio Equity Growth vs Buy & Hold Benchmark'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'fa'
                  ? 'روند ارزش حساب ۱۰,۰۰۰ دلاری تحت مدیریت الگوریتمی هوش مصنوعی'
                  : 'Track balance evolution and risk drawdown over time on the historical dataset'}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-bold">
                <span className="w-3 h-0.5 bg-cyan-500 inline-block" />
                AI Portfolio
              </span>
              <span className="flex items-center gap-1.5 text-slate-400 font-bold">
                <span className="w-3 h-0.5 bg-slate-400 inline-block" />
                Buy & Hold
              </span>
            </div>
          </div>

          <div className="h-72 sm:h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#33415540' : '#e2e8f080'} vertical={false} />
                <XAxis dataKey="timestamp" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={10} minTickGap={35} />
                <YAxis
                  yAxisId="equity"
                  domain={['auto', 'auto']}
                  stroke={isDark ? '#94a3b8' : '#64748b'}
                  fontSize={10}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-xs space-y-1 text-white font-mono z-50">
                          <div className="text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                            Date: {data.timestamp}
                          </div>
                          <div className="flex justify-between gap-4 text-cyan-400 font-bold">
                            <span>AI Equity:</span>
                            <span>{formatUsd(data.portfolioEquity)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-slate-300">
                            <span>Benchmark B&H:</span>
                            <span>{formatUsd(data.benchmarkEquity)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-slate-400">
                            <span>Asset Price:</span>
                            <span>${data.price.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-rose-400">
                            <span>Drawdown:</span>
                            <span>{data.drawdownPct.toFixed(1)}%</span>
                          </div>
                          {data.action && (
                            <div className="pt-1 mt-1 border-t border-slate-800 text-amber-400 font-bold flex items-center gap-1">
                              <span>Action Executed: {data.action}</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  yAxisId="equity"
                  type="monotone"
                  dataKey="portfolioEquity"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={false}
                  name="AI Portfolio"
                />
                <Line
                  yAxisId="equity"
                  type="monotone"
                  dataKey="benchmarkEquity"
                  stroke={isDark ? '#64748b' : '#94a3b8'}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Benchmark Buy & Hold"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Trade Execution Ledger */}
      {sim && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span>{language === 'fa' ? 'دفتر ثبت معاملات و استدلال‌های هوش مصنوعی' : 'Executed Trade Ledger & Audit Log'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'fa'
                  ? `${sim.trades.length} معامله ثبت شده همراه با دلیل ورود/خروج و سود تحقق‌یافته`
                  : `${sim.trades.length} trades executed with explicit rationale and realized P&L records`}
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start sm:self-auto text-xs font-semibold">
              {(['ALL', 'BUY', 'SELL', 'WIN', 'LOSS'] as const).map((f) => {
                const label =
                  f === 'ALL'
                    ? (language === 'fa' ? 'همه' : 'ALL')
                    : f === 'BUY'
                    ? (language === 'fa' ? 'خرید' : 'BUY')
                    : f === 'SELL'
                    ? (language === 'fa' ? 'فروش' : 'SELL')
                    : f === 'WIN'
                    ? (language === 'fa' ? 'معاملات سودده' : 'WIN')
                    : (language === 'fa' ? 'معاملات در زیان' : 'LOSS');
                return (
                  <button
                    key={f}
                    onClick={() => setTradeFilter(f)}
                    className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                      tradeFilter === f
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trade Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left" dir={isRtl ? 'rtl' : 'ltr'}>
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">{language === 'fa' ? 'شناسه و تاریخ' : 'ID & Date'}</th>
                  <th className="p-3">{language === 'fa' ? 'نوع سفارش' : 'Action'}</th>
                  <th className="p-3 text-right">{language === 'fa' ? 'قیمت اجرا' : 'Exec Price'}</th>
                  <th className="p-3 text-right">{language === 'fa' ? 'حجم' : 'Volume'}</th>
                  <th className="p-3 text-right">{language === 'fa' ? 'ارزش معامله و کارمزد' : 'Trade Cost / Fee'}</th>
                  <th className="p-3 text-right">{language === 'fa' ? 'سود/زیان تحقق‌یافته' : 'Realized PnL'}</th>
                  <th className="p-3 text-right">{language === 'fa' ? 'موجودی کل' : 'Account Balance'}</th>
                  <th className="p-3 text-center">{language === 'fa' ? 'استدلال مدل' : 'AI Rationale'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      {language === 'fa' ? 'هیچ معامله‌ای با این فیلتر یافت نشد.' : 'No trades matched the filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map((trade) => {
                    const isBuy = trade.action === 'BUY';
                    const isWin = trade.realizedPnl > 0;
                    const isExpanded = expandedTradeId === trade.id;

                    return (
                      <React.Fragment key={trade.id}>
                        <tr
                          onClick={() => setExpandedTradeId(isExpanded ? null : trade.id)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        >
                          <td className="p-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                            <div>{toPersianDigits(trade.id)}</div>
                            <div className="text-[10px] text-slate-400">{trade.timestamp.split('T')[0]}</div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded font-bold font-mono text-[11px] inline-flex items-center gap-1 ${
                                isBuy
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {isBuy ? (language === 'fa' ? 'خرید' : 'BUY') : (language === 'fa' ? 'فروش' : 'SELL')}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatUsd(trade.price)}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-300">
                            {toPersianDigits(trade.shares)}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-300">
                            <div>{formatUsd(trade.tradeCost)}</div>
                            <div className="text-[10px] text-slate-400">
                              {language === 'fa' ? 'کارمزد: ' : 'fee: '}
                              {formatUsd(trade.fee)}
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {isBuy ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span className={isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                {isWin ? '+' : ''}{formatNumber(trade.realizedPnl, { decimals: 2 })} ({formatPercent(trade.pnlPct, 1, true)})
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatUsd(trade.portfolioEquityAfter)}
                          </td>
                          <td className="p-3 text-center text-slate-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/70 dark:bg-slate-950/40">
                            <td colSpan={8} className="p-4 space-y-2 text-xs">
                              <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                                <Zap className="w-3.5 h-3.5 text-cyan-500" />
                                <span>AI Trade Execution Rationale:</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">English:</div>
                                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-mono text-[11px]">
                                    {trade.reasonEn}
                                  </p>
                                </div>
                                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" dir="rtl">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 font-sans">استدلال فارسی:</div>
                                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-vazir text-xs">
                                    {trade.reasonFa}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Institutional Printable Executive Report Modal */}
      {showReportModal && sim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-500" />
                <h3 className="text-base font-bold">
                  {language === 'fa' ? 'گزارش ممیزی استراتژی معاملاتی هوش مصنوعی' : 'Executive AI Trading Strategy Tear-Sheet'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{language === 'fa' ? 'چاپ گزارش / PDF' : 'Print / Export PDF'}</span>
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content / Printable Document */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm" id="printable-tear-sheet">
              {/* Document Letterhead */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-900 dark:border-slate-100 pb-4">
                <div>
                  <h1 className="text-2xl font-black tracking-tight uppercase">Sentrune Institutional Alpha</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    Quantitative Intelligence & High-Frequency Multi-Model Audit
                  </p>
                </div>
                <div className="text-left sm:text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                  <div>Target: <strong className="text-slate-900 dark:text-slate-100">{asset?.name} ({asset?.symbol})</strong></div>
                  <div>Model: <strong>{sim.modelName}</strong></div>
                  <div>Date: <strong>{new Date().toLocaleDateString()}</strong></div>
                </div>
              </div>

              {/* High-Level Synthesis */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                    {language === 'fa' ? 'سرمایه اولیه' : 'Initial Budget'}
                  </span>
                  <div className="text-base font-mono font-bold">{formatUsd(sim.initialCapital)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                    {language === 'fa' ? 'ارزش نهایی پورتفوی' : 'Final Portfolio'}
                  </span>
                  <div className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatUsd(sim.finalEquity)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                    {language === 'fa' ? 'بازده کل استراتژی' : 'Strategy Return'}
                  </span>
                  <div className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatPercent(sim.totalReturnPct, 2, true)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                    {language === 'fa' ? 'بازدهی مازاد (آلفا)' : 'Alpha vs Benchmark'}
                  </span>
                  <div className="text-base font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    {formatPercent(sim.alphaPct, 2, true)}
                  </div>
                </div>
              </div>

              {/* Quantitative Metrics Matrix */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {language === 'fa' ? 'شاخص‌های سنجش عملکرد و ریسک' : 'Risk & Performance Attribution Metrics'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-slate-500">{language === 'fa' ? 'نسبت شارپ:' : 'Sharpe Ratio:'}</span>
                    <span className="font-mono font-bold">{formatNumber(sim.sharpeRatio, { decimals: 2 })}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-slate-500">{language === 'fa' ? 'نسبت سورتینو:' : 'Sortino Ratio:'}</span>
                    <span className="font-mono font-bold">{formatNumber(sim.sortinoRatio, { decimals: 2 })}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-slate-500">{language === 'fa' ? 'فاکتور سودآوری:' : 'Profit Factor:'}</span>
                    <span className="font-mono font-bold text-emerald-600">{formatNumber(sim.profitFactor, { decimals: 2 })}x</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-slate-500">{language === 'fa' ? 'نرخ برد:' : 'Win Rate:'}</span>
                    <span className="font-mono font-bold">
                      {formatPercent(sim.winRatePct, 1, false)} ({toPersianDigits(sim.winningTrades)}/{toPersianDigits(sim.totalTrades)})
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-slate-500">{language === 'fa' ? 'حداکثر افت سرمایه:' : 'Max Drawdown:'}</span>
                    <span className="font-mono font-bold text-rose-600">-{formatPercent(sim.maxDrawdownPct, 2, false)}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-slate-500">{language === 'fa' ? 'میانگین برد / باخت:' : 'Avg Win / Avg Loss:'}</span>
                    <span className="font-mono font-bold">
                      +{formatPercent(sim.avgWinPct, 1, false)} / -{formatPercent(sim.avgLossPct, 1, false)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Execution Summary Certification */}
              <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/80 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-cyan-800 dark:text-cyan-300">
                  <CheckCircle className="w-4 h-4 text-cyan-600" />
                  <span>{language === 'fa' ? 'تأییدیه ممیزی محاسباتی و شفافیت کارمزد و اسلیپیج' : 'Mathematical Proof & Slippage Integrity Audit'}</span>
                </div>
                <p className="text-cyan-900/80 dark:text-cyan-200/80 leading-relaxed">
                  {language === 'fa'
                    ? 'این آزمون الگوریتمی با کسر ۰.۱۰٪ کارمزد معاملاتی و ۰.۰۵٪ اسلیپیج تخمینی اجرا شده است. استراتژی بر اساس داده‌های دقیق تاریخی مدل‌سازی شده و آلفای تولیدشده نمایانگر برتری استراتژی نسبت به خرید و نگهداری بدون تحلیل است.'
                    : 'This algorithmic execution was computed using 0.10% commission fees and 0.05% execution slippage per order. The model demonstrated superior capital preservation, generating positive alpha over the baseline buy & hold index.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
