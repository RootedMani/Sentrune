import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ModelDataResponse,
  AiTournamentResponse,
  SimulationResults,
  Asset,
} from '../../types';
import {
  BrainCircuit,
  TrendingDown,
  Minus,
  TrendingUp,
  Award,
  Sparkles,
  ChevronDown,
  Table,
  CheckCircle2,
  AlertTriangle,
  Layers,
  HelpCircle,
  Sliders,
  Percent,
  RefreshCw,
  Cpu,
  Zap,
  DollarSign,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { AiTournament } from '../AiTournament';
import { AiSimulationReport } from '../AiSimulationReport';
import { ArchitectureLab } from '../ArchitectureLab';

interface ModelTabProps {
  modelData: ModelDataResponse | null;
  symbol: string;
  interval: string;
  asset?: Asset | null;
}

export const ModelTab: React.FC<ModelTabProps> = ({
  modelData,
  symbol,
  interval,
  asset,
}) => {
  const { isDark } = useTheme();
  const { t, language, isRtl, toPersianDigits, formatNumber, formatPercent, formatDate } = useLanguage();

  // Sub-tab selection: 'quant_matrix' | 'simulation' | 'tournament' | 'architecture_lab'
  const [activeSubMode, setActiveSubMode] = useState<'quant_matrix' | 'simulation' | 'tournament' | 'architecture_lab'>('quant_matrix');

  // AI Tournament state
  const [tournamentData, setTournamentData] = useState<AiTournamentResponse | null>(null);
  const [isTournamentLoading, setIsTournamentLoading] = useState<boolean>(false);

  // $10,000 Portfolio Simulation state
  const [simulationData, setSimulationData] = useState<SimulationResults | null>(null);
  const [comparisonData, setComparisonData] = useState<SimulationResults[] | null>(null);
  const [isSimulationLoading, setIsSimulationLoading] = useState<boolean>(false);

  // Original Quant state
  const [showRecentRuns, setShowRecentRuns] = useState(false);
  const [interactiveThreshold, setInteractiveThreshold] = useState<number>(55);
  const [interactiveFeeBps, setInteractiveFeeBps] = useState<number>(10);
  const [interactiveSlippageBps, setInteractiveSlippageBps] = useState<number>(5);

  const activeAsset = asset || modelData?.asset || null;

  // Run AI Tournament
  const handleRunTournament = useCallback(async () => {
    if (!activeAsset) return;
    setIsTournamentLoading(true);
    try {
      const res = await fetch('/api/ai/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_id: activeAsset.id,
          interval,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTournamentData(data);
      }
    } catch (err) {
      console.error('Failed to run AI Tournament:', err);
    } finally {
      setIsTournamentLoading(false);
    }
  }, [activeAsset, interval]);

  // Run $10k Simulation for a single model
  const handleRunSimulation = useCallback(
    async (modelId: string = 'openai/gpt-oss-120b', budget: number = 10000) => {
      if (!activeAsset) return;
      setIsSimulationLoading(true);
      try {
        const res = await fetch('/api/ai/simulation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asset_id: activeAsset.id,
            interval,
            model_id: modelId,
            budget,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSimulationData(data.simulation);
        }
      } catch (err) {
        console.error('Failed to run simulation:', err);
      } finally {
        setIsSimulationLoading(false);
      }
    },
    [activeAsset, interval]
  );

  // Run $10k Tournament Comparison for all models
  const handleRunComparison = useCallback(
    async (budget: number = 10000) => {
      if (!activeAsset) return;
      setIsSimulationLoading(true);
      try {
        const res = await fetch('/api/ai/simulation-compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asset_id: activeAsset.id,
            interval,
            budget,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setComparisonData(data.comparisons);
          if (data.best_model) {
            setSimulationData(data.best_model);
          }
        }
      } catch (err) {
        console.error('Failed to run comparison:', err);
      } finally {
        setIsSimulationLoading(false);
      }
    },
    [activeAsset, interval]
  );

  // Initial load: automatically populate $10,000 simulation on asset change
  useEffect(() => {
    if (activeAsset) {
      handleRunSimulation('openai/gpt-oss-120b', 10000);
      handleRunTournament();
    }
  }, [activeAsset?.id, interval]);

  if (!modelData || !modelData.has_models || !modelData.prediction) {
    return (
      <div
        id="model-tab-content"
        className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-500 dark:text-slate-400 shadow-xs"
      >
        <BrainCircuit className="w-10 h-10 text-cyan-600 dark:text-cyan-400 mx-auto mb-3" />
        <p className="font-bold text-slate-800 dark:text-slate-200 text-base">
          {language === 'fa' ? 'هیچ ارزیابی مدل آموزش‌دیده‌ای در دسترس نیست' : 'No trained model evaluation available yet'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          {modelData?.message ||
            (language === 'fa' ? 'برای اجرای پایپ‌لاین داده‌ها و محاسبه احتمالات مدل یادگیری ماشین روی "به‌روزرسانی قیمت‌ها و اخبار" کلیک کنید.' : 'Click "Refresh Prices & News" to execute the data pipeline and compute ML model probabilities.')}
        </p>
      </div>
    );
  }

  const {
    prediction,
    model_run,
    as_of,
    validation_summary,
    strategy_backtests,
    recent_runs,
  } = modelData;
  const probs = prediction.probabilities;

  const probChartData = [
    {
      name: language === 'fa' ? 'نزولی' : 'DOWN',
      prob: parseFloat((probs.down * 100).toFixed(1)),
      color: '#f43f5e',
      labelEn: 'DOWN / BEARISH',
      labelFa: 'نزولی (افت قیمت)',
    },
    {
      name: language === 'fa' ? 'خنثی' : 'FLAT',
      prob: parseFloat((probs.flat * 100).toFixed(1)),
      color: isDark ? '#94a3b8' : '#64748b',
      labelEn: 'FLAT / RANGE',
      labelFa: 'خنثی (بدون تغییر عمده)',
    },
    {
      name: language === 'fa' ? 'صعودی' : 'UP',
      prob: parseFloat((probs.up * 100).toFixed(1)),
      color: '#10b981',
      labelEn: 'UP / BULLISH',
      labelFa: 'صعودی (رشد قیمت)',
    },
  ];

  // Custom high-contrast Tooltip for dark and light modes
  const CustomProbTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-slate-950 border border-slate-700 dark:border-slate-700 shadow-2xl text-xs space-y-1.5 z-50">
          <div className="flex items-center gap-2 font-bold text-white">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs"
              style={{ backgroundColor: data.color }}
            />
            <span className={language === 'fa' ? 'font-vazir' : 'font-sans'}>
              {language === 'fa' ? data.labelFa : data.labelEn}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-300 font-mono text-[11px] pt-1 border-t border-slate-800">
            <span className="text-slate-400">
              {language === 'fa' ? 'احتمال برآورد‌شده:' : 'Probability:'}
            </span>
            <span className="font-extrabold text-white text-sm" dir="ltr">
              {formatPercent(data.prob, 1, false)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Dynamic backtest estimation based on user sliders
  const simulatedRoi = useMemo(() => {
    const baseSharpe = strategy_backtests?.[0]?.sharpe || 1.45;
    const baseReturn = strategy_backtests?.[0]?.total_return || 0.185;
    const feeImpact = ((interactiveFeeBps + interactiveSlippageBps) * 2 * 12) / 10000;
    const thresholdBonus = (interactiveThreshold - 50) * 0.008;
    const netReturn = Math.max(-0.5, baseReturn + thresholdBonus - feeImpact);
    const netSharpe = Math.max(0.1, baseSharpe - feeImpact * 2);
    return {
      returnPct: (netReturn * 100).toFixed(2),
      sharpe: netSharpe.toFixed(2),
      winRate: Math.min(85, Math.max(45, 52 + (interactiveThreshold - 50) * 0.6)).toFixed(1),
    };
  }, [strategy_backtests, interactiveThreshold, interactiveFeeBps, interactiveSlippageBps]);

  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div id="model-tab-content" className="space-y-6">
      {/* Sub-Navigation: Quantitative Workstation Modes */}
      <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => setActiveSubMode('quant_matrix')}
            id="subtab-btn-quant"
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubMode === 'quant_matrix'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>{language === 'fa' ? 'پیش‌بینی کمّی و رژیم بازار' : 'Quantitative Regime & Signals'}</span>
          </button>

          <button
            onClick={() => setActiveSubMode('simulation')}
            id="subtab-btn-simulation"
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubMode === 'simulation'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'fa' ? 'تحلیل عملکرد و آزمون استراتژی' : 'Strategy Performance & Ledger'}</span>
          </button>

          <button
            onClick={() => setActiveSubMode('tournament')}
            id="subtab-btn-tournament"
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubMode === 'tournament'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>{language === 'fa' ? 'اجماع مدل‌های تحلیلی' : 'Multi-Strategy Consensus'}</span>
          </button>

          <button
            onClick={() => setActiveSubMode('architecture_lab')}
            id="subtab-btn-architecture"
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubMode === 'architecture_lab'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <BrainCircuit className="w-4 h-4 text-purple-500" />
            <span>{language === 'fa' ? 'استودیوی تنظیم الگوریتم' : 'Algorithmic Studio'}</span>
          </button>
        </div>
      </div>

      {/* Sub-view 0: Custom Model Architecture Studio & Deep Diagnostic Lab */}
      {activeSubMode === 'architecture_lab' && (
        <ArchitectureLab
          asset={activeAsset}
          interval={interval}
          onSelectModelForSimulation={(modelId) => {
            setActiveSubMode('simulation');
            handleRunSimulation(modelId, 10000);
          }}
        />
      )}

      {/* Sub-view 1: $10,000 Portfolio Simulation & Report */}
      {activeSubMode === 'simulation' && (
        <AiSimulationReport
          asset={activeAsset}
          interval={interval}
          simulationData={simulationData}
          comparisonData={comparisonData}
          isLoading={isSimulationLoading}
          onRunSimulation={handleRunSimulation}
          onRunComparison={handleRunComparison}
        />
      )}

      {/* Sub-view 2: Multi-Model AI Tournament on Groq LPUs */}
      {activeSubMode === 'tournament' && (
        <AiTournament
          asset={activeAsset}
          interval={interval}
          tournamentData={tournamentData}
          isLoading={isTournamentLoading}
          onRunTournament={handleRunTournament}
        />
      )}

      {/* Sub-view 3: LightGBM Quant Matrix & Walk-Forward Validation */}
      {activeSubMode === 'quant_matrix' && (
        <div className="space-y-6">
          {/* Latest Prediction Card */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  {language === 'fa' ? `پیش‌بینی گروهی یادگیری ماشین — ${symbol}` : `Machine Learning Ensemble Prediction — ${symbol}`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === 'fa' ? 'درخت‌های تصمیم تقویت گرادیان LightGBM با اعتبارسنجی رو به جلو ۵ قسمتی' : 'LightGBM Gradient Boosted Decision Trees with 5-Fold Walk-Forward Validation'}
                </p>
              </div>
              <div className="text-left sm:text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                <div>
                  {language === 'fa' ? 'زمان محاسبه: ' : 'As of: '}
                  <span className="text-slate-800 dark:text-slate-200 font-semibold" dir="ltr">
                    {as_of ? formatDate(as_of) : 'Recent'}
                  </span>
                </div>
                <div>
                  {language === 'fa' ? 'موتور مدل: ' : 'Engine: '}
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                    {model_run?.model_name || 'LightGBM Ensemble'}
                  </span>
                </div>
              </div>
            </div>

            {/* Prediction Direction Hero Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {language === 'fa' ? 'رژیم حرکتی پیش‌بینی‌شده' : 'Predicted Movement Regime'}
                  </span>
                  <div className="mt-2 flex items-center gap-2.5">
                    {prediction.predicted_label === 'up' && (
                      <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-xl flex items-center gap-1.5 border border-emerald-500/20">
                        <TrendingUp className="w-6 h-6" />
                        {language === 'fa' ? 'صعودی (UP)' : 'UP / BULLISH'}
                      </span>
                    )}
                    {prediction.predicted_label === 'down' && (
                      <span className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold text-xl flex items-center gap-1.5 border border-rose-500/20">
                        <TrendingDown className="w-6 h-6" />
                        {language === 'fa' ? 'نزولی (DOWN)' : 'DOWN / BEARISH'}
                      </span>
                    )}
                    {prediction.predicted_label === 'flat' && (
                      <span className="p-2 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 font-extrabold text-xl flex items-center gap-1.5 border border-slate-500/20">
                        <Minus className="w-6 h-6" />
                        {language === 'fa' ? 'خنثی (FLAT)' : 'FLAT / RANGE'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    {language === 'fa' ? 'ضریب اطمینان مدل:' : 'Confidence Score:'}
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {formatPercent(prediction.confidence * 100, 1, false)}
                  </span>
                </div>
              </div>

              {/* Probabilities Distribution Bar Chart */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 md:col-span-2 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {language === 'fa' ? 'توزیع احتمالات کلاس‌ها (Probabilities)' : 'Probability Breakdown (UP / FLAT / DOWN)'}
                  </span>
                  <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                    Σ = 100%
                  </span>
                </div>

                <div className="h-28 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={probChartData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} stroke={textColor} fontSize={10} unit="%" />
                      <YAxis type="category" dataKey="name" stroke={textColor} fontSize={11} width={45} tickLine={false} />
                      <Tooltip content={<CustomProbTooltip />} cursor={{ fill: isDark ? '#33415520' : '#f1f5f980' }} />
                      <Bar dataKey="prob" radius={[0, 4, 4, 0]} barSize={16}>
                        {probChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Natural Language Synthesis Box */}
            <div className="p-4 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/60 text-xs leading-relaxed space-y-1.5">
              <div className="flex items-center gap-1.5 text-cyan-800 dark:text-cyan-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>{language === 'fa' ? 'گزارش تحلیلی پیش‌بینی مدل' : 'Model Reasoning Synthesis'}</span>
              </div>
              <p className="text-cyan-950 dark:text-cyan-100 font-medium">
                {prediction.sentence}
              </p>
            </div>
          </div>

          {/* Validation Metrics & Cross-Validation Table */}
          {validation_summary && validation_summary.length > 0 && (
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>{language === 'fa' ? 'ماتریس اعتبارسنجی متقاطع رو به جلو (Walk-Forward CV)' : 'Walk-Forward Cross Validation Summary'}</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left" dir={isRtl ? 'rtl' : 'ltr'}>
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">{language === 'fa' ? 'نام مدل' : 'Model Name'}</th>
                      <th className="p-3 text-right">{language === 'fa' ? 'مراحل اعتبارسنجی' : 'Validation Folds'}</th>
                      <th className="p-3 text-right">{language === 'fa' ? 'دقت خارج از نمونه' : 'Out-of-Fold Accuracy'}</th>
                      <th className="p-3 text-right">{language === 'fa' ? 'تابع زیان (Log Loss)' : 'Log Loss'}</th>
                      <th className="p-3 text-right">{language === 'fa' ? 'وضعیت' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {validation_summary.map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{v.model_name}</td>
                        <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-300">
                          {toPersianDigits(v.folds)} {language === 'fa' ? 'مرحله' : 'Folds'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatPercent(v.accuracy * 100, 1, false)}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-300">
                          {toPersianDigits(v.log_loss)}
                        </td>
                        <td className="p-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                            {language === 'fa' ? 'معتبر' : 'Valid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
