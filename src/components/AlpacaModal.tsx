import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  TrendingUp,
  DollarSign,
  Briefcase,
  Key,
  X,
  RefreshCw,
  Send,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface AlpacaModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
}

export const AlpacaModal: React.FC<AlpacaModalProps> = ({
  isOpen,
  onClose,
  defaultSymbol = 'AAPL',
}) => {
  const { language } = useLanguage();
  const [statusData, setStatusData] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [orderSubmitting, setOrderSubmitting] = useState<boolean>(false);
  const [orderResult, setOrderResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Quick Order State
  const [orderSymbol, setOrderSymbol] = useState<string>(defaultSymbol.toUpperCase());
  const [orderQty, setOrderQty] = useState<number>(1);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadAlpacaData();
      setOrderSymbol(defaultSymbol.toUpperCase());
    }
  }, [isOpen, defaultSymbol]);

  const loadAlpacaData = async () => {
    setLoading(true);
    setOrderResult(null);
    try {
      const res = await fetch('/api/alpaca/status');
      const data = await res.json();
      setStatusData(data);

      if (data.configured) {
        const [posRes, ordRes] = await Promise.all([
          fetch('/api/alpaca/positions'),
          fetch('/api/alpaca/orders?limit=10'),
        ]);
        if (posRes.ok) {
          const p = await posRes.json();
          setPositions(p.positions || []);
        }
        if (ordRes.ok) {
          const o = await ordRes.json();
          setOrders(o.orders || []);
        }
      }
    } catch (err) {
      console.error('Failed to load Alpaca details:', err);
    } finally {
      setLoading(false);
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
          time_in_force: 'day',
          limit_price: orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrderResult({
          success: true,
          msg: language === 'fa'
            ? `سفارش ${orderSide === 'buy' ? 'خرید' : 'فروش'} ${orderQty} سهم ${orderSymbol} با موفقیت ثبت شد.`
            : `Order to ${orderSide.toUpperCase()} ${orderQty} ${orderSymbol} submitted successfully!`,
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

  if (!isOpen) return null;

  const isConfigured = statusData?.configured;
  const account = statusData?.account;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        dir={language === 'fa' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-black">
              🦙
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {language === 'fa' ? 'اتصال کارگزاری آلپاکا (Alpaca Brokerage)' : 'Alpaca Brokerage & Paper Trading'}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isConfigured
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {isConfigured
                    ? (statusData?.isPaper ? 'Paper Trading' : 'Live Trading')
                    : (language === 'fa' ? 'نیازمند تنظیم کلید' : 'Key Setup Required')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'fa'
                  ? 'اجرای سفارشات بدون ریسک و دریافت داده‌های دقیق بازارهای آمریکا'
                  : 'Zero-risk algorithmic execution & direct US equities market data'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAlpacaData}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={language === 'fa' ? 'بروزرسانی' : 'Refresh'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* If NOT Configured: Instructions */}
          {!isConfigured ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-start gap-3">
                  <Key className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {language === 'fa'
                        ? 'کلیدهای کارگزاری آلپاکا برای اتصال آماده است'
                        : 'Alpaca API credentials ready for deployment'}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {language === 'fa'
                        ? 'برای فعال‌سازی کامل معاملات شبیه‌سازی شده (Paper Trading) و دریافت داده‌های رسمی بورس نیویورک/نزدک، متغیرهای زیر را در بخش Environment داشبورد Render یا فایل .env قرار دهید:'
                        : 'To activate institutional paper trade execution and direct US equities market data, set the following environment variables in your Render Dashboard (or .env):'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-100 p-3.5 rounded-lg font-mono text-xs space-y-2 select-all overflow-x-auto">
                  <div className="text-emerald-400"># Alpaca Paper Trading Credentials</div>
                  <div><span className="text-cyan-300">ALPACA_API_KEY</span>=your_api_key_here</div>
                  <div><span className="text-cyan-300">ALPACA_API_SECRET</span>=your_secret_key_here</div>
                  <div><span className="text-cyan-300">ALPACA_PAPER</span>=true</div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>
                    {language === 'fa'
                      ? 'حالت پیش‌فرض روی حساب دمو/کاغذی (Paper Trading) تنظیم شده و هیچ سرمایه واقعی درگیر نخواهد شد.'
                      : 'Defaults to Paper Trading: 100% simulated liquidity with $100,000 zero-risk portfolio.'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* If Configured: Dashboard */
            <div className="space-y-6">
              {/* Account Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {language === 'fa' ? 'قدرت خرید' : 'Buying Power'}
                  </span>
                  <div className="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-slate-100">
                    ${account?.buying_power?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium block">
                    {language === 'fa' ? 'نقدینگی آزاد' : 'Available cash'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {language === 'fa' ? 'ارزش کل پرتفوی' : 'Portfolio Value'}
                  </span>
                  <div className="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-slate-100">
                    ${account?.portfolio_value?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    {language === 'fa' ? 'ارزش دارایی‌ها' : 'Total equity'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {language === 'fa' ? 'موجودی نقد' : 'Cash'}
                  </span>
                  <div className="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-slate-100">
                    ${account?.cash?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block">USD</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {language === 'fa' ? 'وضعیت حساب' : 'Status'}
                  </span>
                  <div className="text-base sm:text-lg font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase">
                    {account?.status || 'ACTIVE'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    {statusData?.keyPreview}
                  </span>
                </div>
              </div>

              {/* Quick Paper Order Form */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {language === 'fa' ? 'ارسال سفارش آنی در کارگزاری آلپاکا' : 'Quick Alpaca Paper Order'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">GTC / Day Execution</span>
                </div>

                <form onSubmit={handlePlaceOrder} className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        {language === 'fa' ? 'تعداد سهام' : 'Shares (Qty)'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={orderQty}
                        onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value || '1', 10)))}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        {language === 'fa' ? 'سمت معامله' : 'Side'}
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setOrderSide('buy')}
                          className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            orderSide === 'buy'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          BUY
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderSide('sell')}
                          className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            orderSide === 'sell'
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          SELL
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        {language === 'fa' ? 'نوع سفارش' : 'Type'}
                      </label>
                      <select
                        value={orderType}
                        onChange={(e: any) => setOrderType(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                      >
                        <option value="market">Market</option>
                        <option value="limit">Limit</option>
                      </select>
                    </div>
                  </div>

                  {orderType === 'limit' && (
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        {language === 'fa' ? 'قیمت لیمیت ($)' : 'Limit Price ($)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        placeholder="328.20"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                        required={orderType === 'limit'}
                      />
                    </div>
                  )}

                  {orderResult && (
                    <div
                      className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                        orderResult.success
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {orderResult.success ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      <span>{orderResult.msg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={orderSubmitting}
                    className={`w-full py-2 px-4 rounded-xl text-xs font-bold text-white shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      orderSide === 'buy' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                    } disabled:opacity-50`}
                  >
                    {orderSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {language === 'fa'
                        ? `ارسال سفارش شبیه‌سازی شده ${orderSide === 'buy' ? 'خرید' : 'فروش'} در آلپاکا`
                        : `Execute Paper ${orderSide.toUpperCase()} Order via Alpaca`}
                    </span>
                  </button>
                </form>
              </div>

              {/* Positions List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                    <span>{language === 'fa' ? 'موقعیت‌های باز آلپاکا' : 'Alpaca Active Positions'}</span>
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">{positions.length} holdings</span>
                </div>

                {positions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-250 dark:border-slate-800">
                    {language === 'fa' ? 'هیچ موقعیت بازی وجود ندارد. با فرم بالا اولین معامله خود را انجام دهید.' : 'No active positions yet. Use the quick order form above to test an execution.'}
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] text-slate-500 uppercase">
                        <tr>
                          <th className="p-2.5">Symbol</th>
                          <th className="p-2.5">Qty</th>
                          <th className="p-2.5">Market Val</th>
                          <th className="p-2.5">Avg Cost</th>
                          <th className="p-2.5">Unrealized P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {positions.map((p, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">{p.symbol}</td>
                            <td className="p-2.5">{p.qty}</td>
                            <td className="p-2.5">${p.market_value?.toFixed(2)}</td>
                            <td className="p-2.5">${p.cost_basis?.toFixed(2)}</td>
                            <td className={`p-2.5 font-bold ${p.unrealized_pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {p.unrealized_pl >= 0 ? '+' : ''}${p.unrealized_pl?.toFixed(2)} ({(p.unrealized_plpc * 100).toFixed(2)}%)
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
        </div>
      </div>
    </div>
  );
};
