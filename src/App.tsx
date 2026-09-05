import React, { useState, useEffect, useCallback } from 'react';
import {
  Asset,
  PriceBar,
  TechnicalFeature,
  SentimentAggregate,
  NewsItem,
  SocialItem,
  IngestionLog,
  ModelDataResponse,
} from './types';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { OverviewTab } from './components/tabs/OverviewTab';
import { PricesTab } from './components/tabs/PricesTab';
import { TechnicalsTab } from './components/tabs/TechnicalsTab';
import { SentimentTab } from './components/tabs/SentimentTab';
import { NewsTab } from './components/tabs/NewsTab';
import { SocialTab } from './components/tabs/SocialTab';
import { ModelTab } from './components/tabs/ModelTab';
import { AlpacaModal } from './components/AlpacaModal';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useRealtimeStream } from './hooks/useRealtimeStream';
import { LivePriceUpdate } from './types';

function getInitialState() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const tabFromUrl = params?.get('tab');
  const validTabs = ['overview', 'prices', 'technicals', 'sentiment', 'news', 'social', 'model', 'alpaca'];
  const initialTab =
    tabFromUrl && validTabs.includes(tabFromUrl)
      ? tabFromUrl
      : (typeof window !== 'undefined' ? localStorage.getItem('sentrune_active_tab') : null) || 'overview';

  const symbolFromUrl = params?.get('symbol') || params?.get('asset');
  const initialSymbol =
    symbolFromUrl ||
    (typeof window !== 'undefined' ? localStorage.getItem('sentrune_active_symbol') : null);

  const intervalFromUrl = params?.get('interval');
  const validIntervals = ['1h', '4h', '1d', '1w'];
  const initialInterval =
    intervalFromUrl && validIntervals.includes(intervalFromUrl)
      ? intervalFromUrl
      : (typeof window !== 'undefined' ? localStorage.getItem('sentrune_active_interval') : null) || '1d';

  return { initialTab, initialSymbol, initialInterval };
}

function DashboardContent() {
  const { t, language } = useLanguage();
  const initialState = getInitialState();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<string>(initialState.initialInterval);
  const [activeTab, setActiveTab] = useState<string>(initialState.initialTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Status & Provider info
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [lastRefreshAt, setLastRefreshAt] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Tab Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Overview Data
  const [overviewCounts, setOverviewCounts] = useState({
    price_bars: 0,
    news_items: 0,
    social_items: 0,
    technical_features: 0,
    model_runs: 0,
    sentiment_aggregates: 0,
  });
  const [ingestionLogs, setIngestionLogs] = useState<IngestionLog[]>([]);
  const [systemHints, setSystemHints] = useState<string[]>([]);

  // Prices Data
  const [priceBars, setPriceBars] = useState<PriceBar[]>([]);
  const [lastClose, setLastClose] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePct, setPriceChangePct] = useState<number>(0);

  // Technicals Data
  const [technicals, setTechnicals] = useState<TechnicalFeature[]>([]);

  // Sentiment Data
  const [sentimentAggs, setSentimentAggs] = useState<SentimentAggregate[]>([]);
  const [availableWindows, setAvailableWindows] = useState<number[]>([24, 72, 168]);
  const [selectedWindow, setSelectedWindow] = useState<number>(24);

  // News & Social Data
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [socialList, setSocialList] = useState<SocialItem[]>([]);

  // Model Data
  const [modelData, setModelData] = useState<ModelDataResponse | null>(null);

  // Initial load of assets and status
  useEffect(() => {
    async function init() {
      try {
        const [assetsRes, statusRes] = await Promise.all([
          fetch('/api/assets'),
          fetch('/api/status'),
        ]);

        if (assetsRes.ok) {
          const assetsData: Asset[] = await assetsRes.json();
          setAssets(assetsData);
          if (assetsData.length > 0) {
            const targetSymbol = initialState.initialSymbol?.toUpperCase();
            const matchedAsset = targetSymbol
              ? assetsData.find((a) => a.symbol.toUpperCase() === targetSymbol)
              : null;
            setSelectedAsset(matchedAsset || assetsData[0]);
          }
        }

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.configured_providers) {
            setConfiguredProviders(statusData.configured_providers);
          }
          if (statusData.last_refresh_at) {
            setLastRefreshAt(statusData.last_refresh_at);
          }
        }
      } catch (err: any) {
        console.error('Failed to initialize applet:', err);
        setError('Failed to connect to Sentrune local server');
      }
    }

    init();
  }, []);

  // Sync state to URL search params and localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem('sentrune_active_tab', activeTab);
    localStorage.setItem('sentrune_active_interval', selectedInterval);
    if (selectedAsset) {
      localStorage.setItem('sentrune_active_symbol', selectedAsset.symbol);
    }

    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    params.set('interval', selectedInterval);
    if (selectedAsset) {
      params.set('symbol', selectedAsset.symbol);
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    if (window.location.search !== `?${params.toString()}`) {
      window.history.replaceState(null, '', newUrl);
    }
  }, [activeTab, selectedAsset, selectedInterval]);

  // Handle browser back/forward button navigation
  useEffect(() => {
    const handlePopState = () => {
      const { initialTab, initialSymbol, initialInterval } = getInitialState();
      setActiveTab(initialTab);
      setSelectedInterval(initialInterval);
      if (initialSymbol && assets.length > 0) {
        const found = assets.find((a) => a.symbol.toUpperCase() === initialSymbol.toUpperCase());
        if (found) setSelectedAsset(found);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [assets]);

  // Fetch prices summary always for header badge
  const fetchPriceSummary = useCallback(async (assetId: number, interval: string) => {
    try {
      const res = await fetch(`/api/prices?asset_id=${assetId}&interval=${interval}`);
      if (res.ok) {
        const data = await res.json();
        if (data.last_close && data.last_close > 0) {
          setLastClose(data.last_close);
          setPriceChange(data.change ?? 0);
          setPriceChangePct(data.change_pct ?? 0);
        }
        if (Array.isArray(data.bars) && data.bars.length > 0) {
          setPriceBars(data.bars);
        }
      }
    } catch (err) {
      console.error('Error fetching price summary:', err);
    }
  }, []);

  // Fetch data for the current active tab and asset
  const fetchActiveTabData = useCallback(async () => {
    if (!selectedAsset) return;
    setLoading(true);
    setError(null);

    const assetId = selectedAsset.id;
    try {
      // Always keep price summary fresh
      fetchPriceSummary(assetId, selectedInterval);

      if (activeTab === 'overview') {
        const [res, modelRes, priceRes] = await Promise.all([
          fetch(`/api/overview?asset_id=${assetId}`),
          fetch(`/api/model?asset_id=${assetId}&interval=${selectedInterval}`),
          fetch(`/api/prices?asset_id=${assetId}&interval=${selectedInterval}`),
        ]);
        if (res.ok) {
          const data = await res.json();
          setOverviewCounts(data.counts || overviewCounts);
          setIngestionLogs(data.ingestion_log || []);
          setSystemHints(data.hints || []);
        }
        if (modelRes.ok) {
          const mData = await modelRes.json();
          setModelData(mData);
        }
        if (priceRes.ok) {
          const pData = await priceRes.json();
          if (Array.isArray(pData.bars) && pData.bars.length > 0) {
            setPriceBars(pData.bars);
          }
          if (pData.last_close && pData.last_close > 0) {
            setLastClose(pData.last_close);
            setPriceChange(pData.change ?? 0);
            setPriceChangePct(pData.change_pct ?? 0);
          }
        }
      } else if (activeTab === 'prices') {
        const res = await fetch(`/api/prices?asset_id=${assetId}&interval=${selectedInterval}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.bars)) {
            setPriceBars(data.bars);
          }
          if (data.last_close && data.last_close > 0) {
            setLastClose(data.last_close);
            setPriceChange(data.change ?? 0);
            setPriceChangePct(data.change_pct ?? 0);
          }
        }
      } else if (activeTab === 'technicals') {
        const [techRes, priceRes] = await Promise.all([
          fetch(`/api/technicals?asset_id=${assetId}&interval=${selectedInterval}`),
          fetch(`/api/prices?asset_id=${assetId}&interval=${selectedInterval}`),
        ]);
        if (techRes.ok) {
          const tData = await techRes.json();
          const techList = Array.isArray(tData) ? tData : tData.technical_features || [];
          setTechnicals(techList);
        }
        if (priceRes.ok) {
          const pData = await priceRes.json();
          if (Array.isArray(pData.bars) && pData.bars.length > 0) {
            setPriceBars(pData.bars);
          }
          if (pData.last_close && pData.last_close > 0) {
            setLastClose(pData.last_close);
            setPriceChange(pData.change ?? 0);
            setPriceChangePct(pData.change_pct ?? 0);
          }
        }
      } else if (activeTab === 'sentiment') {
        const res = await fetch(`/api/sentiment?asset_id=${assetId}`);
        if (res.ok) {
          const data = await res.json();
          setSentimentAggs(data.aggregates || []);
          if (data.available_windows && data.available_windows.length > 0) {
            setAvailableWindows(data.available_windows);
            if (!data.available_windows.includes(selectedWindow)) {
              setSelectedWindow(data.available_windows[0]);
            }
          }
        }
      } else if (activeTab === 'news') {
        const res = await fetch(`/api/news?asset_id=${assetId}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          setNewsList(data || []);
        }
      } else if (activeTab === 'social') {
        const res = await fetch(`/api/social?asset_id=${assetId}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          setSocialList(data || []);
        }
      } else if (activeTab === 'model') {
        const res = await fetch(`/api/model?asset_id=${assetId}&interval=${selectedInterval}`);
        if (res.ok) {
          const data = await res.json();
          setModelData(data);
        }
      }
    } catch (err: any) {
      console.error('Error fetching tab data:', err);
      setError(err.message || 'Error loading market data');
    } finally {
      setLoading(false);
    }
  }, [selectedAsset, selectedInterval, activeTab, selectedWindow, fetchPriceSummary]);

  // Real-time SSE and Fast Ticker streaming hook
  const handlePriceTick = useCallback(
    (assetId: number, update: LivePriceUpdate) => {
      if (selectedAsset && selectedAsset.id === assetId) {
        setLastClose(update.last_close);
        setPriceChange(update.change);
        setPriceChangePct(update.change_pct);

        setPriceBars((prevBars) => {
          if (!prevBars || prevBars.length === 0) return prevBars;
          const updated = [...prevBars];
          const lastIndex = updated.length - 1;
          const lastBar = { ...updated[lastIndex] };
          lastBar.close = update.last_close;
          lastBar.high = Math.max(lastBar.high, update.high, update.last_close);
          lastBar.low = Math.min(lastBar.low, update.low, update.last_close);
          updated[lastIndex] = lastBar;
          return updated;
        });
      }
    },
    [selectedAsset]
  );

  const handlePipelineRefresh = useCallback(() => {
    fetchActiveTabData();
    fetch('/api/status')
      .then((res) => res.json())
      .then((s) => {
        if (s.last_refresh_at) setLastRefreshAt(s.last_refresh_at);
      })
      .catch(() => {});
  }, [fetchActiveTabData]);

  const {
    connectionStatus,
    livePrices,
    isInitialSyncing,
    initialSyncDone,
    lastTickTime,
    priceFlashes,
  } = useRealtimeStream({
    activeAssetId: selectedAsset?.id ?? null,
    onPriceTick: handlePriceTick,
    onPipelineRefresh: handlePipelineRefresh,
  });

  // When selectedAsset changes, if live price is already cached, immediately sync quote
  useEffect(() => {
    if (selectedAsset && livePrices[selectedAsset.id]) {
      const lp = livePrices[selectedAsset.id];
      setLastClose(lp.last_close);
      setPriceChange(lp.change);
      setPriceChangePct(lp.change_pct);
    }
  }, [selectedAsset, livePrices]);

  useEffect(() => {
    fetchActiveTabData();
  }, [fetchActiveTabData]);

  // Handle pipeline refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      if (res.ok) {
        setLastRefreshAt(Date.now());
        await fetchActiveTabData();
      }
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        assets={assets}
        selectedAsset={selectedAsset}
        onSelectAsset={(asset) => setSelectedAsset(asset)}
        selectedInterval={selectedInterval}
        onSelectInterval={(inv) => setSelectedInterval(inv)}
        configuredProviders={configuredProviders}
        lastRefreshAt={lastRefreshAt}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        livePrices={livePrices}
        connectionStatus={connectionStatus}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          selectedAsset={selectedAsset}
          selectedInterval={selectedInterval}
          assets={assets}
          onSelectAsset={(asset) => setSelectedAsset(asset)}
          lastClose={lastClose}
          priceChange={priceChange}
          priceChangePct={priceChangePct}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          connectionStatus={connectionStatus}
          isInitialSyncing={isInitialSyncing}
          initialSyncDone={initialSyncDone}
          lastTickTime={lastTickTime}
          priceFlash={selectedAsset ? priceFlashes[selectedAsset.id] : null}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-3 text-sm text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-cyan-600 dark:text-cyan-400 animate-spin" />
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {language === 'fa' ? `در حال بارگذاری داده‌های ${t(`tab_${activeTab}` as any) || activeTab}...` : `Loading ${activeTab} data...`}
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewTab
                  asset={selectedAsset}
                  counts={overviewCounts}
                  ingestionLog={ingestionLogs}
                  hints={systemHints}
                  lastClose={lastClose}
                  priceChange={priceChange}
                  priceChangePct={priceChangePct}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  prediction={modelData?.prediction}
                  bars={priceBars}
                  technicals={technicals}
                  sentimentAggs={sentimentAggs}
                />
              )}

              {activeTab === 'prices' && selectedAsset && (
                <PricesTab
                  symbol={selectedAsset.symbol}
                  interval={selectedInterval}
                  bars={priceBars}
                  lastClose={lastClose}
                  change={priceChange}
                  changePct={priceChangePct}
                />
              )}

              {activeTab === 'technicals' && selectedAsset && (
                <TechnicalsTab
                  technicals={technicals}
                  bars={priceBars}
                  symbol={selectedAsset.symbol}
                />
              )}

              {activeTab === 'sentiment' && selectedAsset && (
                <SentimentTab
                  aggregates={sentimentAggs}
                  availableWindows={availableWindows}
                  selectedWindow={selectedWindow}
                  onSelectWindow={(w) => setSelectedWindow(w)}
                  symbol={selectedAsset.symbol}
                />
              )}

              {activeTab === 'news' && selectedAsset && (
                <NewsTab
                  news={newsList}
                  symbol={selectedAsset.symbol}
                  onRefresh={handleRefresh}
                  isRefreshing={isRefreshing}
                />
              )}

              {activeTab === 'social' && selectedAsset && (
                <SocialTab
                  social={socialList}
                  symbol={selectedAsset.symbol}
                  onRefresh={handleRefresh}
                  isRefreshing={isRefreshing}
                />
              )}

              {activeTab === 'model' && selectedAsset && (
                <ModelTab
                  modelData={modelData}
                  symbol={selectedAsset.symbol}
                  interval={selectedInterval}
                  asset={selectedAsset}
                />
              )}

              {activeTab === 'alpaca' && (
                <AlpacaModal
                  isOpen={true}
                  onClose={() => setActiveTab('overview')}
                  defaultSymbol={selectedAsset?.symbol || 'AAPL'}
                  inline={true}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <DashboardContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
