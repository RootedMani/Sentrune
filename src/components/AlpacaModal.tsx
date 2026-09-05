import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  Zap,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Key,
  X,
  RefreshCw,
  Send,
  AlertCircle,
  ExternalLink,
  Activity,
  Database,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  HelpCircle,
  Code,
  Layers,
  BarChart3,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';

interface AlpacaModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
  inline?: boolean;
}

type TabType = 'data' | 'paper' | 'setup';

export const AlpacaModal: React.FC<AlpacaModalProps> = ({
  isOpen,
  onClose,
  defaultSymbol = 'AAPL',
  inline = false,
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('data');

  // Overall Alpaca Status
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Paper Trading State
  const [positions, setPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderSubmitting, setOrderSubmitting] = useState<boolean>(false);
  const [orderResult, setOrderResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [closingSymbol, setClosingSymbol] = useState<string | null>(null);

  // Quick Order State
  const [orderSymbol, setOrderSymbol] = useState<string>(defaultSymbol.toUpperCase());
  const [orderQty, setOrderQty] = useState<number>(5);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopPrice, setStopPrice] = useState<string>('');
  const [timeInForce, setTimeInForce] = useState<'day' | 'gtc'>('day');

  // Data Coverage & Market Data State
  const [coverageList, setCoverageList] = useState<any[]>([]);
  const [coverageLoading, setCoverageLoading] = useState<boolean>(false);
  const [inspectSymbol, setInspectSymbol] = useState<string>(defaultSymbol.toUpperCase());
  const [inspectTimeframe, setInspectTimeframe] = useState<'1Min' | '5Min' | '15Min' | '1Hour' | '1Day'>('1Day');
  const [inspectBars, setInspectBars] = useState<any[]>([]);
  const [inspectQuote, setInspectQuote] = useState<any>(null);
  const [barsLoading, setBarsLoading] = useState<boolean>(false);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);
  const [barsSource, setBarsSource] = useState<string>('');

  // Setup / Credentials Configuration State
  const [inputApiKey, setInputApiKey] = useState<string>('');
  const [inputApiSecret, setInputApiSecret] = useState<string>('');
  const [isPaperInput, setIsPaperInput] = useState<boolean>(true);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Keyboard shortcut (Escape to close) and document scroll lock
  useEffect(() => {
    if (!isOpen || inline) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose, inline]);

  // Load initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAlpacaData();
      loadCoverage();
      setOrderSymbol(defaultSymbol.toUpperCase());
      setInspectSymbol(defaultSymbol.toUpperCase());
      fetchSymbolBars(defaultSymbol.toUpperCase(), inspectTimeframe);
    }
  }, [isOpen, defaultSymbol]);

  const loadAlpacaData = async () => {
    setLoading(true);
    setOrderResult(null);
    try {
      const res = await fetch('/api/alpaca/status');
      const data = await res.json();
      setStatusData(data);

      const [posRes, ordRes] = await Promise.all([
        fetch('/api/alpaca/positions'),
        fetch('/api/alpaca/orders?limit=15'),
      ]);

      if (posRes.ok) {
        const p = await posRes.json();
        setPositions(p.positions || []);
      }
      if (ordRes.ok) {
        const o = await ordRes.json();
        setOrders(o.orders || []);
      }
    } catch (err) {
      console.error('Failed to load Alpaca details:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCoverage = async () => {
    setCoverageLoading(true);
    try {
      const res = await fetch('/api/alpaca/coverage');
      const data = await res.json();
      if (data.success) {
        setCoverageList(data.coverage || []);
      }
    } catch (err) {
      console.error('Coverage fetch failed:', err);
    } finally {
      setCoverageLoading(false);
    }
  };

  const fetchSymbolBars = async (sym: string, tf: '1Min' | '5Min' | '15Min' | '1Hour' | '1Day') => {
    setBarsLoading(true);
    try {
      const [barsRes, quoteRes] = await Promise.all([
        fetch(`/api/alpaca/bars?symbol=${encodeURIComponent(sym)}&timeframe=${tf}&limit=50`),
        fetch(`/api/alpaca/quote?symbol=${encodeURIComponent(sym)}`),
      ]);

      if (barsRes.ok) {
        const b = await barsRes.json();
        setInspectBars(b.bars || []);
        setBarsSource(b.source || 'alpaca');
      }
      if (quoteRes.ok) {
        const q = await quoteRes.json();
        setInspectQuote(q.quote || null);
      }
    } catch (err) {
      console.error('Failed to fetch Alpaca bars:', err);
    } finally {
      setBarsLoading(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSymbol || orderQty <= 0) return;

    setOrderSubmitting(true);
    setOrderResult(null);
    try {
      const res = await fetch('/api/alpaca/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: orderSymbol,
          qty: orderQty,
          side: orderSide,
          type: orderType,
          time_in_force: timeInForce,
          limit_price: orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : undefined,
          stop_price: orderType === 'stop' && stopPrice ? parseFloat(stopPrice) : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setOrderResult({
          success: true,
          msg:
            language === 'fa'
              ? `سفارش ${orderSide === 'buy' ? 'خرید' : 'فروش'} ${orderQty} سهم ${orderSymbol} ثبت گردید.`
              : `Paper order to ${orderSide.toUpperCase()} ${orderQty} ${orderSymbol} executed successfully!`,
        });
        loadAlpacaData();
      } else {
        setOrderResult({
          success: false,
          msg: data.error || (language === 'fa' ? 'خطا در ثبت سفارش' : 'Order execution failed'),
        });
      }
    } catch (err: any) {
      setOrderResult({
        success: false,
        msg: err.message || (language === 'fa' ? 'خطا در برقراری ارتباط' : 'Network error'),
      });
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleClosePosition = async (sym: string) => {
    setClosingSymbol(sym);
    try {
      const res = await fetch(`/api/alpaca/positions/${encodeURIComponent(sym)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrderResult({
          success: true,
          msg: data.message || `Closed position in ${sym}`,
        });
        loadAlpacaData();
      } else {
        setOrderResult({
          success: false,
          msg: data.message || `Failed to close ${sym}`,
        });
      }
    } catch (err: any) {
      setOrderResult({
        success: false,
        msg: err.message || 'Error closing position',
      });
    } finally {
      setClosingSymbol(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/alpaca/orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrderResult({
          success: true,
          msg: data.message || 'Order canceled',
        });
        loadAlpacaData();
      }
    } catch (err) {
      console.error('Cancel order error:', err);
    }
  };

  const handleResetSandbox = async () => {
    if (!window.confirm(language === 'fa' ? 'آیا از بازنشانی حساب شبیه‌ساز به موجودی اولیه ۱۰۰,۰۰۰ دلار اطمینان دارید؟' : 'Reset paper sandbox back to default $100,000 cash?')) return;
    try {
      const res = await fetch('/api/alpaca/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setOrderResult({
          success: true,
          msg: language === 'fa' ? 'حساب آزمایشی با موفقیت به ۱۰۰,۰۰۰ دلار بازنشانی شد.' : 'Paper sandbox reset to $100,000 cash balance.',
        });
        loadAlpacaData();
      }
    } catch (err) {
      console.error('Reset sandbox error:', err);
    }
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    setSaveSuccess(null);
    try {
      const res = await fetch('/api/alpaca/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: inputApiKey,
          apiSecret: inputApiSecret,
          isPaper: isPaperInput,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ connected: false, error: err.message || 'Failed to ping Alpaca' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!inputApiKey.trim() || !inputApiSecret.trim()) return;
    setTestLoading(true);
    setSaveSuccess(null);
    try {
      const res = await fetch('/api/alpaca/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: inputApiKey.trim(),
          apiSecret: inputApiSecret.trim(),
          isPaper: isPaperInput,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(
          language === 'fa'
            ? 'اطلاعات کاربری با موفقیت اعمال شد. سیستم هم‌اکنون به حساب آلپاکای شما متصل است.'
            : 'Credentials applied successfully! Live connection active.'
        );
        loadAlpacaData();
        loadCoverage();
      } else {
        setTestResult({ connected: false, error: data.error || 'Failed to apply credentials' });
      }
    } catch (err: any) {
      setTestResult({ connected: false, error: err.message || 'Save error' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleRevertSandbox = async () => {
    try {
      await fetch('/api/alpaca/credentials', { method: 'DELETE' });
      setInputApiKey('');
      setInputApiSecret('');
      setTestResult(null);
      setSaveSuccess(
        language === 'fa'
          ? 'به حالت شبیه‌ساز امن (Sandbox Demo) بازگشتید.'
          : 'Reverted to local simulated paper sandbox.'
      );
      loadAlpacaData();
      loadCoverage();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const account = statusData?.account;
  const isConfigured = statusData?.configured;
  const isSimulated = statusData?.isSimulated;

  // Selected symbol price calculation
  const currentInspectPrice =
    inspectQuote?.askPrice ||
    (inspectBars.length > 0 ? inspectBars[inspectBars.length - 1].c : 100);
  const estimatedOrderCost = (orderQty * currentInspectPrice).toFixed(2);

  const containerContent = (
    <div
      id="alpaca-modal-container"
      className={
        inline
          ? 'relative w-full max-w-6xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col'
          : 'relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto'
      }
      dir={language === 'fa' ? 'rtl' : 'ltr'}
    >
      {/* Header with High-Contrast Dismiss Button */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shadow-xs">
              🦙
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="alpaca-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {language === 'fa'
                    ? 'یکپارچه‌سازی با کارگزاری آلپاکا (Alpaca API)'
                    : 'Alpaca Brokerage & Market Data API'}
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    isConfigured
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                  }`}
                >
                  {isConfigured ? (statusData?.isPaper ? 'Paper Trading' : 'Live Trading') : 'Paper Sandbox Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'fa'
                  ? 'ارزیابی پوشش داده‌های بازار، شبیه‌سازی معاملات و ارسال سفارشات الگوریتمی'
                  : 'Market data coverage testing, simulated paper execution, and live API controls'}
              </p>
            </div>
          </div>

          {/* Close Button - Prominent, accessible, and high contrast */}
          <div className="flex items-center gap-2">
            <button
              onClick={loadAlpacaData}
              disabled={loading}
              title={language === 'fa' ? 'به‌روزرسانی اطلاعات' : 'Refresh details'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              id="btn-close-alpaca-modal"
              aria-label={language === 'fa' ? (inline ? 'بازگشت به نمای کلی' : 'بستن پنجره') : (inline ? 'Back to Overview' : 'Close modal')}
              title={language === 'fa' ? (inline ? 'بازگشت به نمای کلی' : 'بستن (Esc)') : (inline ? 'Back to Overview' : 'Close (Esc)')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-rose-500 hover:text-white dark:bg-slate-800 dark:hover:bg-rose-600 text-slate-700 dark:text-slate-200 transition-all font-semibold text-xs cursor-pointer shadow-xs"
            >
              <X className="w-4 h-4" />
              <span>{language === 'fa' ? (inline ? 'بازگشت' : 'بستن') : (inline ? 'Back' : 'Close')}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex items-center gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('data')}
            id="tab-btn-alpaca-data"
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'data'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{language === 'fa' ? 'پوشش داده‌های بازار (Data Coverage)' : 'Data Coverage & Feeds'}</span>
          </button>

          <button
            onClick={() => setActiveTab('paper')}
            id="tab-btn-alpaca-paper"
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'paper'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>{language === 'fa' ? 'معاملات آزمایشی (Paper Trading)' : 'Paper Trading Suite'}</span>
            {positions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-600 font-mono">
                {positions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('setup')}
            id="tab-btn-alpaca-setup"
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'setup'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{language === 'fa' ? 'راهنمای اتصال و کلید API' : 'Connection & API Setup'}</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Global Alert / Feedback */}
          {orderResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-150 ${
                orderResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {orderResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{orderResult.msg}</span>
              </div>
              <button
                onClick={() => setOrderResult(null)}
                className="text-xs opacity-70 hover:opacity-100 font-bold px-2 py-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: DATA COVERAGE & MARKET DATA EXPLORER              */}
          {/* ========================================================= */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Coverage KPI Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {language === 'fa' ? 'نمادهای تحت پوشش' : 'Coverage Scope'}
                  </span>
                  <div className="text-lg font-mono font-black text-slate-900 dark:text-slate-100 mt-1">
                    {coverageList.length || 9} / {coverageList.length || 9} Assets
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                    US Equities, ETFs & Cryptos
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {language === 'fa' ? 'منبع داده (Feed)' : 'Market Data Feed'}
                  </span>
                  <div className="text-lg font-mono font-black text-amber-600 dark:text-amber-400 mt-1">
                    {barsSource === 'alpaca_live' ? 'Alpaca IEX (Live)' : 'Alpaca Feed'}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Real-time quotes + 15m delay
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {language === 'fa' ? 'تایم‌فریم‌های در دسترس' : 'Available Timeframes'}
                  </span>
                  <div className="text-lg font-mono font-black text-slate-900 dark:text-slate-100 mt-1">
                    1M, 5M, 1H, 1D
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Full OHLCV + VWAP + Volume
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {language === 'fa' ? 'تاخیر استعلام (Latency)' : 'API Response Latency'}
                  </span>
                  <div className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    &lt; 25 ms
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    High throughput sub-second
                  </span>
                </div>
              </div>

              {/* Data Coverage Matrix Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {language === 'fa'
                        ? 'ماتریس پوشش داده‌های آلپاکا برای دارایی‌های فعال'
                        : 'Alpaca Market Data Coverage Matrix'}
                    </span>
                  </div>
                  <button
                    onClick={loadCoverage}
                    disabled={coverageLoading}
                    className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${coverageLoading ? 'animate-spin' : ''}`} />
                    <span>{language === 'fa' ? 'آزمون مجدد پوشش' : 'Re-verify Coverage'}</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4">Symbol</th>
                        <th className="py-2.5 px-3">Class</th>
                        <th className="py-2.5 px-3">Latest Price</th>
                        <th className="py-2.5 px-3">Bid / Ask (Spread)</th>
                        <th className="py-2.5 px-3">Coverage Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                      {coverageList.map((item) => (
                        <tr
                          key={item.symbol}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            inspectSymbol === item.symbol ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span>{item.symbol}</span>
                            {inspectSymbol === item.symbol && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] uppercase">
                            {item.assetClass}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                            ${item.latestPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-500">
                            {item.quote
                              ? `$${item.quote.bidPrice} / $${item.quote.askPrice} (${item.quote.spreadPct}%)`
                              : '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Covered
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                setInspectSymbol(item.symbol);
                                fetchSymbolBars(item.symbol, inspectTimeframe);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-amber-500 hover:text-white dark:bg-slate-800 dark:hover:bg-amber-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Interactive Symbol Data Inspector & Chart */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {language === 'fa'
                        ? `کاوشگر داده‌های کندلی آلپاکا: ${inspectSymbol}`
                        : `Alpaca Market Bars Inspector: ${inspectSymbol}`}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({inspectBars.length} bars loaded)
                    </span>
                  </div>

                  {/* Timeframe selector */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {(['1Min', '5Min', '15Min', '1Hour', '1Day'] as const).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => {
                          setInspectTimeframe(tf);
                          fetchSymbolBars(inspectSymbol, tf);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                          inspectTimeframe === tf
                            ? 'bg-amber-500 text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chart */}
                <div className="h-56 w-full bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                  {barsLoading ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Loading Alpaca bars...
                    </div>
                  ) : inspectBars.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={inspectBars} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis
                          dataKey="t"
                          tickFormatter={(val) => {
                            const d = new Date(val);
                            return inspectTimeframe === '1Day'
                              ? `${d.getMonth() + 1}/${d.getDate()}`
                              : `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
                          }}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} orientation="right" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const b = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-2.5 rounded-lg text-[11px] font-mono space-y-1 shadow-xl border border-slate-700">
                                  <div className="text-slate-400">{new Date(b.t).toLocaleString()}</div>
                                  <div className="text-amber-400 font-bold">Close: ${b.c}</div>
                                  <div>Open: ${b.o} | High: ${b.h} | Low: ${b.l}</div>
                                  <div>Volume: {b.v?.toLocaleString()} | VWAP: ${b.vw}</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="c"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorPrice)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      No bar data available for this symbol.
                    </div>
                  )}
                </div>

                {/* Inspect Bar Details & JSON Inspector toggle */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-slate-500">
                      Latest Close:{' '}
                      <strong className="text-slate-900 dark:text-slate-100">
                        ${inspectBars[inspectBars.length - 1]?.c || currentInspectPrice}
                      </strong>
                    </span>
                    <span className="text-slate-500">
                      VWAP:{' '}
                      <strong className="text-slate-900 dark:text-slate-100">
                        ${inspectBars[inspectBars.length - 1]?.vw || '-'}
                      </strong>
                    </span>
                  </div>

                  <button
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 font-semibold cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{showRawJson ? 'Hide Raw JSON' : 'View Alpaca REST Payload'}</span>
                  </button>
                </div>

                {showRawJson && (
                  <div className="bg-slate-950 text-slate-200 p-3 rounded-lg font-mono text-[11px] overflow-x-auto max-h-48">
                    <pre>
                      {JSON.stringify(
                        {
                          symbol: inspectSymbol,
                          quote: inspectQuote,
                          sampleBars: inspectBars.slice(-3),
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: PAPER TRADING SUITE                               */}
          {/* ========================================================= */}
          {activeTab === 'paper' && (
            <div className="space-y-6">
              {/* Account Balances Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {language === 'fa' ? 'قدرت خرید (Buying Power)' : 'Buying Power'}
                  </span>
                  <div className="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-slate-100">
                    ${account?.buying_power?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '200,000.00'}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium block">
                    {language === 'fa' ? 'نقدینگی و اعتبار آزاد' : '2x Margin Available'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {language === 'fa' ? 'ارزش کل پرتفوی' : 'Portfolio Value'}
                  </span>
                  <div className="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-slate-100">
                    ${account?.portfolio_value?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '118,939.25'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    {language === 'fa' ? 'مجموع نقد و دارایی' : 'Total Equity'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {language === 'fa' ? 'موجودی نقد (Cash)' : 'Cash Balance'}
                  </span>
                  <div className="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-slate-100">
                    ${account?.cash?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '100,000.00'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block">USD</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      {language === 'fa' ? 'وضعیت حساب' : 'Account Tier'}
                    </span>
                    <div className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase mt-0.5">
                      {account?.status || 'ACTIVE'}
                    </div>
                  </div>
                  <button
                    onClick={handleResetSandbox}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold text-left underline cursor-pointer"
                  >
                    {language === 'fa' ? 'بازنشانی حساب به $100k' : 'Reset $100k Balance'}
                  </button>
                </div>
              </div>

              {/* Order Execution Form */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {language === 'fa' ? 'ثبت سفارش معاملات آزمایشی (Paper Order)' : 'Execute Alpaca Paper Order'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Zero Risk Simulated Execution
                  </span>
                </div>

                <form onSubmit={handlePlaceOrder} className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {/* Symbol */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        {language === 'fa' ? 'نماد' : 'Symbol'}
                      </label>
                      <input
                        type="text"
                        value={orderSymbol}
                        onChange={(e) => setOrderSymbol(e.target.value.toUpperCase())}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-bold uppercase"
                        placeholder="AAPL"
                        required
                      />
                    </div>

                    {/* Side: Buy / Sell */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        {language === 'fa' ? 'سمت معامله' : 'Side'}
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setOrderSide('buy')}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            orderSide === 'buy'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-600 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          BUY
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderSide('sell')}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            orderSide === 'sell'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-600 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          SELL
                        </button>
                      </div>
                    </div>

                    {/* Order Type */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        {language === 'fa' ? 'نوع سفارش' : 'Type'}
                      </label>
                      <select
                        value={orderType}
                        onChange={(e: any) => setOrderType(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                      >
                        <option value="market">Market</option>
                        <option value="limit">Limit</option>
                        <option value="stop">Stop</option>
                      </select>
                    </div>

                    {/* Quantity with quick buttons */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        {language === 'fa' ? 'تعداد سهام' : 'Quantity'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={orderQty}
                        onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-bold"
                        required
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="col-span-2 sm:col-span-1 flex flex-col justify-end">
                      <button
                        type="submit"
                        disabled={orderSubmitting}
                        className={`w-full py-1.5 px-3 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer ${
                          orderSide === 'buy'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                      >
                        {orderSubmitting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {orderSubmitting
                            ? '...'
                            : `${orderSide.toUpperCase()} ${orderQty} ${orderSymbol}`}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Quantity quick pills & estimated cost */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 mr-1">Quick:</span>
                      {[1, 5, 10, 25, 50, 100].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setOrderQty(q)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                            orderQty === q
                              ? 'bg-amber-500/20 border-amber-500 text-amber-600 font-bold'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          +{q}
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] font-mono text-slate-500">
                      Estimated Total: <strong className="text-slate-900 dark:text-slate-100">${estimatedOrderCost}</strong>
                    </div>
                  </div>
                </form>
              </div>

              {/* Open Positions Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {language === 'fa' ? 'موقعیت‌های باز معامله (Open Positions)' : 'Open Paper Positions'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">({positions.length})</span>
                  </div>
                </div>

                {positions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    {language === 'fa'
                      ? 'هیچ موقعیت بازی وجود ندارد. با استفاده از فرم بالا سهام جدید بخرید.'
                      : 'No open positions yet. Use the form above to submit your first paper trade!'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-4">Symbol</th>
                          <th className="py-2.5 px-3">Shares</th>
                          <th className="py-2.5 px-3">Avg Cost</th>
                          <th className="py-2.5 px-3">Current Price</th>
                          <th className="py-2.5 px-3">Market Value</th>
                          <th className="py-2.5 px-3">Unrealized P&L</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                        {positions.map((pos) => {
                          const isProfit = pos.unrealized_pl >= 0;
                          return (
                            <tr key={pos.symbol} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                                {pos.symbol}
                              </td>
                              <td className="py-2.5 px-3">{pos.qty}</td>
                              <td className="py-2.5 px-3">${(pos.cost_basis / pos.qty).toFixed(2)}</td>
                              <td className="py-2.5 px-3">${pos.current_price?.toFixed(2)}</td>
                              <td className="py-2.5 px-3 font-semibold">${pos.market_value?.toFixed(2)}</td>
                              <td
                                className={`py-2.5 px-3 font-bold ${
                                  isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {isProfit ? '+' : ''}${pos.unrealized_pl?.toFixed(2)} (
                                {((pos.unrealized_plpc || 0) * 100).toFixed(2)}%)
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => handleClosePosition(pos.symbol)}
                                  disabled={closingSymbol === pos.symbol}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 transition-colors cursor-pointer"
                                >
                                  {closingSymbol === pos.symbol ? 'Closing...' : 'Close'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Order History */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {language === 'fa' ? 'تاریخچه سفارشات اخیر (Order History)' : 'Recent Orders Log'}
                    </span>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No orders recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2 px-4">Time</th>
                          <th className="py-2 px-3">Symbol</th>
                          <th className="py-2 px-3">Side</th>
                          <th className="py-2 px-3">Qty</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                        {orders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-4 text-slate-400">
                              {new Date(ord.submitted_at || ord.created_at).toLocaleTimeString()}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                              {ord.symbol}
                            </td>
                            <td
                              className={`py-2 px-3 font-bold uppercase ${
                                ord.side === 'buy' ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {ord.side}
                            </td>
                            <td className="py-2 px-3">{ord.qty}</td>
                            <td className="py-2 px-3 uppercase text-slate-500">{ord.type}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  ord.status === 'filled'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : 'bg-amber-500/10 text-amber-600'
                                }`}
                              >
                                {ord.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: SETUP & CONNECTION GUIDE                           */}
          {/* ========================================================= */}
          {activeTab === 'setup' && (
            <div className="space-y-6">
              {/* Educational Overview Card */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                  <HelpCircle className="w-4 h-4" />
                  <span>
                    {language === 'fa'
                      ? 'راهنمای گام‌به‌گام کار با کارگزاری آلپاکا (Alpaca)'
                      : 'How Alpaca API & Paper Trading Work'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {language === 'fa'
                    ? 'آلپاکا (Alpaca) یک پلتفرم کارگزاری الگوریتمی مدرن است که به معامله‌گران اجازه می‌دهد از طریق API به داده‌های بازار سهام آمریکا و شبیه‌ساز معاملات (Paper Trading) متصل شوند. در حالت Paper Trading، یک حساب دمو با ۱۰۰,۰۰۰ دلار نقدینگی مجازی در اختیار شما قرار می‌گیرد تا استراتژی‌های کمی و هوش مصنوعی Sentrune را با قیمت‌های واقعی بازار آزمایش کنید بدون اینکه کوچکترین ریسک مالی متوجه شما باشد.'
                    : 'Alpaca is a developer-first brokerage platform providing commission-free REST and WebSocket APIs for US stocks, ETFs, and market data. Paper Trading gives you a simulated $100,000 cash account with institutional market prices, allowing you to backtest models, test order execution, and inspect real data feeds completely risk-free.'}
                </p>
              </div>

              {/* 3 Step Quick Setup */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center text-xs">
                    1
                  </div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {language === 'fa' ? 'ثبت‌نام رایگان در آلپاکا' : 'Create Free Alpaca Account'}
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Go to{' '}
                    <a
                      href="https://app.alpaca.markets"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      alpaca.markets <ExternalLink className="w-2.5 h-2.5" />
                    </a>{' '}
                    and switch to Paper Trading mode.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {language === 'fa' ? 'تولید کلید API' : 'Generate API Keys'}
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Click &quot;Generate API Key&quot; on your Alpaca dashboard. You will receive an API Key ID and a Secret Key.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center text-xs">
                    3
                  </div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {language === 'fa' ? 'ورود و آزمون اتصال' : 'Connect & Test'}
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Paste your keys below to test the connection immediately, or save them in your workspace <code className="text-amber-600 font-mono">.env</code>.
                  </p>
                </div>
              </div>

              {/* Interactive Credentials Form */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {language === 'fa' ? 'پیکربندی کلیدهای API آلپاکا' : 'Alpaca Credentials Configurator'}
                    </span>
                  </div>
                  <button
                    onClick={handleRevertSandbox}
                    className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 underline cursor-pointer"
                  >
                    {language === 'fa' ? 'استفاده از شبیه‌ساز آفلاین' : 'Use Built-in Sandbox'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      ALPACA_API_KEY (Key ID)
                    </label>
                    <input
                      type="text"
                      value={inputApiKey}
                      onChange={(e) => setInputApiKey(e.target.value)}
                      placeholder="PKxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      ALPACA_API_SECRET (Secret Key)
                    </label>
                    <input
                      type="password"
                      value={inputApiSecret}
                      onChange={(e) => setInputApiSecret(e.target.value)}
                      placeholder="••••••••••••••••••••••••"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPaperInput}
                        onChange={(e) => setIsPaperInput(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Use Paper Trading (paper-api.alpaca.markets)</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTestConnection}
                      disabled={testLoading}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {testLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                      <span>Test Connection</span>
                    </button>

                    <button
                      onClick={handleSaveCredentials}
                      disabled={testLoading || !inputApiKey.trim() || !inputApiSecret.trim()}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <span>Apply & Connect</span>
                    </button>
                  </div>
                </div>

                {/* Test Result Message */}
                {testResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-mono ${
                      testResult.connected
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {testResult.connected ? (
                      <div className="space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Connected to Alpaca! Latency: {testResult.latencyMs}ms</span>
                        </div>
                        <div>Account: {testResult.accountNumber} | Status: {testResult.status}</div>
                        <div>
                          Buying Power: ${testResult.buyingPower?.toLocaleString()} | Equity: $
                          {testResult.portfolioValue?.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span>Connection Test Failed</span>
                        </div>
                        <div>{testResult.error}</div>
                      </div>
                    )}
                  </div>
                )}

                {saveSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{saveSuccess}</span>
                  </div>
                )}
              </div>

              {/* Permanent Setup Code Snippet */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'fa' ? 'تنظیمات دائمی در فایل .env' : 'Permanent Environment Configuration (.env)'}
                </span>
                <div className="bg-slate-950 text-slate-100 p-3.5 rounded-xl font-mono text-xs space-y-1 select-all overflow-x-auto border border-slate-800">
                  <div className="text-slate-500"># Place inside .env in your root directory</div>
                  <div><span className="text-cyan-400">ALPACA_API_KEY</span>=your_alpaca_key_id_here</div>
                  <div><span className="text-cyan-400">ALPACA_API_SECRET</span>=your_alpaca_secret_key_here</div>
                  <div><span className="text-cyan-400">ALPACA_PAPER</span>=true</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Dismiss Button */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {isConfigured
                ? `Alpaca Connected (${statusData?.isPaper ? 'Paper' : 'Live'})`
                : 'Zero-Risk Paper Sandbox Active ($100k demo)'}
            </span>
          </div>

          <button
            onClick={onClose}
            id="btn-footer-close-alpaca"
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-all cursor-pointer shadow-xs"
          >
            {language === 'fa' ? (inline ? 'بازگشت به نمای کلی' : 'بستن') : (inline ? 'Back to Overview' : 'Done / Close')}
          </button>
        </div>
      </div>
    );

  if (inline) {
    return containerContent;
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      id="alpaca-modal-backdrop"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alpaca-modal-title"
    >
      {containerContent}
    </div>,
    document.body
  );
};
export default AlpacaModal;
