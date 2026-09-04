import React, { useState } from 'react';
import {
  AiTournamentResponse,
  ModelBenchmarkResult,
  Asset,
} from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  Zap,
  Award,
  Clock,
  Gauge,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  Flame,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface AiTournamentProps {
  asset: Asset | null;
  interval: string;
  tournamentData: AiTournamentResponse | null;
  isLoading: boolean;
  onRunTournament: () => Promise<void>;
}

export const AiTournament: React.FC<AiTournamentProps> = ({
  asset,
  interval,
  tournamentData,
  isLoading,
  onRunTournament,
}) => {
  const { language, t, isRtl, toPersianDigits, formatDigits, formatNumber, formatPercent, formatCurrency } = useLanguage();
  const { isDark } = useTheme();
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);
  const [activeReasoningLang, setActiveReasoningLang] = useState<'fa' | 'en'>(language);

  const toggleExpand = (id: string) => {
    setExpandedModelId(expandedModelId === id ? null : id);
  };

  const tournament = tournamentData?.tournament;
  const winner = tournament?.winner;
  const models = tournament?.models || [];
  const consensus = tournament?.consensus;

  return (
    <div className="space-y-6" id="ai-tournament-container">
      {/* Header Banner & Run Action */}
      <div className="p-5 sm:p-6 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-xs relative">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
              <span>{language === 'fa' ? 'ارزیابی چندمدلی هوش مصنوعی و سیگنال‌های کمّی' : 'Multi-Model Inference & Quantitative Benchmark'}</span>
              <span className="px-1.5 py-0.5 bg-slate-700/60 rounded text-[10px] font-mono text-cyan-300">Groq LPU + Gemini Flash</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{language === 'fa' ? `تحلیل همزمان چند مدلی ${asset?.name || ''}` : `${asset?.name || 'Asset'} Multi-Model Consensus`}</span>
              <span className="text-cyan-400 font-mono text-base font-semibold">({asset?.symbol})</span>
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              {language === 'fa'
                ? 'ارزیابی همزمان بازار توسط مدل‌های پیشرفته Llama 3.3 70B، Llama 3.1 8B و Gemma 2 9B روی پردازنده‌های LPU شرکت Groq و Google Gemini 3.8 Flash همراه با استخراج سیگنال‌های کمّی.'
                : 'Live multi-model inference benchmarking across Llama 3.3 70B, Llama 3.1 8B, and Gemma 2 9B on Groq LPUs alongside Google Gemini 3.8 Flash and quantitative ensembles.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={onRunTournament}
              disabled={isLoading}
              id="btn-run-ai-tournament"
              className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>
                {isLoading
                  ? (language === 'fa' ? 'در حال اجرای ارزیابی چندمدلی...' : 'Benchmarking Models...')
                  : (language === 'fa' ? 'اجرای ارزیابی زنده مدل‌ها' : 'Run Live Inference Benchmark')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Consensus & Winning Model Showcase */}
      {consensus && winner && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Consensus Overview Card */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-500" />
                {language === 'fa' ? 'اجماع مدل‌های هوش مصنوعی' : 'AI Model Consensus'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
                {toPersianDigits(consensus.agreementScorePct)}% {language === 'fa' ? 'توافق' : 'Agreement'}
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-center gap-2">
                <span
                  className={`p-2 rounded-xl text-lg font-black flex items-center gap-1.5 ${
                    consensus.action === 'BUY'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : consensus.action === 'SELL'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                  }`}
                >
                  {consensus.action === 'BUY' && <ArrowUpRight className="w-5 h-5" />}
                  {consensus.action === 'SELL' && <ArrowDownRight className="w-5 h-5" />}
                  {consensus.action === 'HOLD' && <MinusCircle className="w-5 h-5" />}
                  <span>{consensus.action === 'BUY' ? (language === 'fa' ? 'خرید' : 'BUY') : consensus.action === 'SELL' ? (language === 'fa' ? 'فروش' : 'SELL') : (language === 'fa' ? 'نگهداری' : 'HOLD')}</span>
                </span>
              </div>
              <div className="text-right">
                <div className="text-xl font-mono font-black text-slate-900 dark:text-slate-100">
                  {toPersianDigits(consensus.avgConfidence)}%
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {language === 'fa' ? 'میانگین اطمینان' : 'Avg Confidence'}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {consensus.syntheticConviction}
            </p>
          </div>

          {/* Efficiency Winner Card */}
          <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 shadow-xs space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-amber-500 text-slate-950 font-bold">
                  <Award className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  {language === 'fa' ? 'مدل برنده تورنمنت (بالاترین بازدهی و سرعت)' : 'Tournament Efficiency Winner'}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40">
                {language === 'fa' ? 'امتیاز: ' : 'Score: '}
                {toPersianDigits(winner.efficiencyScore)} / {toPersianDigits(100)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{winner.modelName}</span>
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    {toPersianDigits(winner.latencyMs)} ms
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-cyan-500" />
                    {toPersianDigits(winner.tokensPerSecond)} tok/s
                  </span>
                  <span>·</span>
                  <span>
                    {winner.action === 'BUY' ? (language === 'fa' ? 'خرید' : 'BUY') : winner.action === 'SELL' ? (language === 'fa' ? 'فروش' : 'SELL') : (language === 'fa' ? 'نگهداری' : 'HOLD')} ({toPersianDigits(winner.confidence)}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-left sm:text-right px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {language === 'fa' ? 'حد سود / حد ضرر' : 'TP / SL Target'}
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(winner.suggestedPosition.takeProfit, 2)} / {formatCurrency(winner.suggestedPosition.stopLoss, 2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model Benchmark Leaderboard Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-500" />
              <span>{language === 'fa' ? 'جدول رتبه‌بندی و مقایسه مدل‌ها' : 'AI Model Benchmark Leaderboard'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'fa'
                ? 'مقایسه زنده سرعت پردازش (LPU)، اطمینان سیگنال، و استراتژی موقعیت‌یابی'
                : 'Real-time performance comparison on inference speed, throughput, signal conviction, and risk bounds'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveReasoningLang('en')}
              className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                activeReasoningLang === 'en'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              English Reasoning
            </button>
            <button
              onClick={() => setActiveReasoningLang('fa')}
              className={`px-2 py-1 rounded text-xs font-semibold transition-all font-vazir ${
                activeReasoningLang === 'fa'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              استدلال فارسی
            </button>
          </div>
        </div>

        {/* Models List */}
        <div className="space-y-3">
          {models.map((model, idx) => {
            const isExpanded = expandedModelId === model.modelId || (idx === 0 && expandedModelId === null);
            const isBuy = model.action === 'BUY';
            const isSell = model.action === 'SELL';

            return (
              <div
                key={model.modelId}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  model.isWinner
                    ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/[0.03]'
                    : 'border-slate-200 dark:border-slate-800/90 bg-slate-50/50 dark:bg-slate-950/40'
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(model.modelId)}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg font-mono font-bold text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                      #{toPersianDigits(idx + 1)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {model.modelName}
                        </span>
                        {model.isWinner && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 flex items-center gap-1">
                            <Flame className="w-3 h-3 fill-slate-950" />
                            {language === 'fa' ? 'بهترین کارایی' : 'Top Efficiency'}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {model.provider}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                        <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                          <Clock className="w-3 h-3" />
                          {toPersianDigits(model.latencyMs)} ms
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3 h-3" />
                          {toPersianDigits(model.tokensPerSecond)} tok/sec
                        </span>
                        <span>·</span>
                        <span>{language === 'fa' ? 'امتیاز: ' : 'Score: '}{toPersianDigits(model.efficiencyScore)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/60 dark:border-slate-800">
                    {/* Action Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1.5 ${
                          isBuy
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : isSell
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                        }`}
                      >
                        {isBuy && <TrendingUp className="w-3.5 h-3.5" />}
                        {isSell && <TrendingDown className="w-3.5 h-3.5" />}
                        {!isBuy && !isSell && <MinusCircle className="w-3.5 h-3.5" />}
                        <span>{model.action === 'BUY' ? (language === 'fa' ? 'خرید' : 'BUY') : model.action === 'SELL' ? (language === 'fa' ? 'فروش' : 'SELL') : (language === 'fa' ? 'نگهداری' : 'HOLD')}</span>
                        <span className="text-[11px] opacity-85">({toPersianDigits(model.confidence)}%)</span>
                      </span>
                    </div>

                    {/* Expand Arrow */}
                    <div className="text-slate-400 dark:text-slate-500">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details: Rationale, SL/TP, Factors */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-200/70 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 space-y-3 text-xs">
                    {/* Reasoning Box */}
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                        <span>{language === 'fa' ? 'استدلال زنجیره تفکر مدل (Chain of Thought):' : 'AI Chain of Thought Rationale:'}</span>
                      </div>
                      <p className={`text-slate-700 dark:text-slate-200 leading-relaxed ${activeReasoningLang === 'fa' ? 'font-vazir' : ''}`}>
                        {activeReasoningLang === 'fa' ? model.reasoningFa : model.reasoningEn}
                      </p>
                    </div>

                    {/* Position and Risk Parameters */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/60">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{language === 'fa' ? 'حجم پیشنهادی' : 'Suggested Size'}</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{toPersianDigits(model.suggestedPosition.sizePct)}% {language === 'fa' ? 'از نقدینگی' : 'of Cash'}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/60">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{language === 'fa' ? 'هدف حد سود (TP)' : 'Take Profit'}</div>
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(model.suggestedPosition.takeProfit, 2)}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/60">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{language === 'fa' ? 'حد ضرر (SL)' : 'Stop Loss'}</div>
                        <div className="font-mono font-bold text-rose-600 dark:text-rose-400">{formatCurrency(model.suggestedPosition.stopLoss, 2)}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/60">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{language === 'fa' ? 'نسبت ریسک به ریوارد' : 'Risk : Reward'}</div>
                        <div className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{toPersianDigits(model.suggestedPosition.riskRewardRatio)}:1</div>
                      </div>
                    </div>

                    {/* Key Driving Factors */}
                    {model.drivers && model.drivers.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {language === 'fa' ? 'عوامل پیشران:' : 'Key Drivers:'}
                        </span>
                        {model.drivers.map((drv, dIdx) => (
                          <span
                            key={dIdx}
                            className="px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-[11px] font-medium"
                          >
                            {drv.factor} ({drv.impact})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
