import React, { createContext, useContext, useState, useEffect } from 'react';
import { Asset, AppMode, Language, CacheMetadata, NewsletterAlert } from '../types';
import { INITIAL_ASSETS } from '../data/mockMarketData';
import { MarketCacheService } from '../services/marketCache';

interface WorkstationContextType {
  selectedAsset: Asset;
  setSelectedAsset: (asset: Asset) => void;
  timeframe: '1d' | '1h' | '1wk';
  setTimeframe: (tf: '1d' | '1h' | '1wk') => void;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  showTechnicalMetadata: boolean;
  setShowTechnicalMetadata: (show: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cacheMeta: CacheMetadata;
  isRefreshing: boolean;
  refreshFeeds: () => Promise<void>;
  alerts: NewsletterAlert[];
  addAlert: (alert: Omit<NewsletterAlert, 'id' | 'createdAt' | 'dispatchCount'>) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  simulateDispatchAlert: (id: string) => Promise<string>;
  openAlertsModal: boolean;
  setOpenAlertsModal: (open: boolean) => void;
  openSettingsModal: boolean;
  setOpenSettingsModal: (open: boolean) => void;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
}

const ALERTS_STORAGE_KEY = 'sentrune_newsletter_alerts_v1';
const PREFS_STORAGE_KEY = 'sentrune_user_prefs_v1';

const WorkstationContext = createContext<WorkstationContextType | undefined>(undefined);

export const WorkstationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset>(INITIAL_ASSETS[0]);
  const [timeframe, setTimeframe] = useState<'1d' | '1h' | '1wk'>('1h');
  const [appMode, setAppMode] = useState<AppMode>('casual');
  const [showTechnicalMetadata, setShowTechnicalMetadata] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<string>('news');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [openAlertsModal, setOpenAlertsModal] = useState(false);
  const [openSettingsModal, setOpenSettingsModal] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.appMode) setAppMode(parsed.appMode);
        if (typeof parsed.showTechnicalMetadata === 'boolean') {
          setShowTechnicalMetadata(parsed.showTechnicalMetadata);
        }
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.theme) setTheme(parsed.theme);
      }
    } catch {}
  }, []);

  // Sync preferences
  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_STORAGE_KEY,
        JSON.stringify({
          appMode,
          showTechnicalMetadata,
          language,
          theme
        })
      );
    } catch {}
  }, [appMode, showTechnicalMetadata, language, theme]);

  // When switching to power mode, auto-enable technical metadata if desired, but respect user toggle
  useEffect(() => {
    if (appMode === 'power') {
      setShowTechnicalMetadata(true);
    }
  }, [appMode]);

  // Initialize Cache Metadata with instant L1 lookup (0ms latency!)
  const [cacheMeta, setCacheMeta] = useState<CacheMetadata>(() => {
    const { meta } = MarketCacheService.getNews(selectedAsset.symbol);
    return meta;
  });

  // Newsletter & Asset Alerts
  const [alerts, setAlerts] = useState<NewsletterAlert[]>(() => {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'alert_default_1',
        email: 'trader@sentrune.internal',
        assetSymbol: 'BTC',
        condition: 'pct_change',
        threshold: 3.0,
        frequency: 'instant',
        active: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        lastDispatched: '2 hours ago',
        dispatchCount: 4
      },
      {
        id: 'alert_default_2',
        email: 'trader@sentrune.internal',
        assetSymbol: 'AAPL',
        condition: 'high_impact_news',
        frequency: 'daily_morning',
        active: true,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        lastDispatched: 'Today at 08:00 AM',
        dispatchCount: 7
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    } catch {}
  }, [alerts]);

  const addAlert = (alertData: Omit<NewsletterAlert, 'id' | 'createdAt' | 'dispatchCount'>) => {
    const newAlert: NewsletterAlert = {
      ...alertData,
      id: `alert_${Date.now()}`,
      createdAt: new Date().toISOString(),
      dispatchCount: 0
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const toggleAlert = (id: string) => {
    setAlerts(prev =>
      prev.map(a => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const simulateDispatchAlert = async (id: string): Promise<string> => {
    const target = alerts.find(a => a.id === id);
    if (!target) return 'Alert not found';
    
    // Simulate instantaneous dispatch
    await new Promise(r => setTimeout(r, 400));
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setAlerts(prev =>
      prev.map(a =>
        a.id === id
          ? {
              ...a,
              dispatchCount: a.dispatchCount + 1,
              lastDispatched: `Just now (${nowStr})`
            }
          : a
      )
    );
    return `Automated newsletter dispatched successfully to ${target.email} for ${target.assetSymbol}!`;
  };

  const refreshFeeds = async () => {
    setIsRefreshing(true);
    try {
      const { meta } = await MarketCacheService.revalidate(selectedAsset.symbol);
      setCacheMeta(meta);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <WorkstationContext.Provider
      value={{
        selectedAsset,
        setSelectedAsset,
        timeframe,
        setTimeframe,
        appMode,
        setAppMode,
        showTechnicalMetadata,
        setShowTechnicalMetadata,
        language,
        setLanguage,
        activeTab,
        setActiveTab,
        cacheMeta,
        isRefreshing,
        refreshFeeds,
        alerts,
        addAlert,
        removeAlert,
        toggleAlert,
        simulateDispatchAlert,
        openAlertsModal,
        setOpenAlertsModal,
        openSettingsModal,
        setOpenSettingsModal,
        theme,
        setTheme
      }}
    >
      {children}
    </WorkstationContext.Provider>
  );
};

export const useWorkstation = () => {
  const ctx = useContext(WorkstationContext);
  if (!ctx) throw new Error('useWorkstation must be used within WorkstationProvider');
  return ctx;
};
