import React from 'react';
import { Radio, RefreshCw, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { RealtimeConnectionStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface RealtimeIndicatorProps {
  connectionStatus: RealtimeConnectionStatus;
  isInitialSyncing: boolean;
  initialSyncDone: boolean;
  isRefreshing: boolean;
  lastTickTime: number;
  onManualRefresh: () => void;
}

export const RealtimeIndicator: React.FC<RealtimeIndicatorProps> = ({
  connectionStatus,
  isInitialSyncing,
  initialSyncDone,
  isRefreshing,
  lastTickTime,
  onManualRefresh,
}) => {
  const { language, t } = useLanguage();
  const [secondsAgo, setSecondsAgo] = React.useState<number>(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - lastTickTime) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastTickTime]);

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="flex items-center gap-2">
      {/* Initial Sync Notification Toast / Banner on First Visit */}
      {isInitialSyncing && (
        <div
          id="realtime-initial-sync-banner"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-semibold animate-pulse"
        >
          <RefreshCw className="w-3 h-3 animate-spin text-cyan-600 dark:text-cyan-400" />
          <span>
            {language === 'fa'
              ? 'در حال همگام‌سازی خودکار داده‌های زنده...'
              : 'Auto-syncing real-time market data...'}
          </span>
        </div>
      )}

      {/* Live Stream Status Pill */}
      <div
        id="realtime-stream-pill"
        title={
          isConnected
            ? `Real-time stream active • Updated ${secondsAgo}s ago`
            : connectionStatus === 'reconnecting'
            ? 'Reconnecting real-time stream...'
            : 'Polling fallback active'
        }
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition-all ${
          isConnected
            ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-400'
            : connectionStatus === 'reconnecting'
            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/70 text-amber-700 dark:text-amber-400'
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
        }`}
      >
        {isConnected ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold tracking-tight">
              {language === 'fa' ? 'فید زنده' : 'LIVE'}
            </span>
            <span className="hidden lg:inline text-[10px] text-emerald-600/80 dark:text-emerald-400/80 border-l border-emerald-300 dark:border-emerald-800 pl-1.5">
              {secondsAgo < 5
                ? language === 'fa'
                  ? 'هم‌اکنون'
                  : 'just now'
                : `${secondsAgo}s ago`}
            </span>
          </>
        ) : connectionStatus === 'reconnecting' ? (
          <>
            <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
            <span className="font-bold">
              {language === 'fa' ? 'اتصال مجدد' : 'RECONNECTING'}
            </span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 text-slate-400" />
            <span>{language === 'fa' ? 'پولینگ' : 'SYNCING'}</span>
          </>
        )}
      </div>
    </div>
  );
};
