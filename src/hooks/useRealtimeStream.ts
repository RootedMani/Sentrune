import { useState, useEffect, useRef, useCallback } from 'react';
import { LivePriceUpdate, RealtimeConnectionStatus } from '../types';

interface UseRealtimeStreamOptions {
  activeAssetId: number | null;
  onPriceTick?: (assetId: number, update: LivePriceUpdate) => void;
  onPipelineRefresh?: () => void;
  enabled?: boolean;
}

export function useRealtimeStream({
  activeAssetId,
  onPriceTick,
  onPipelineRefresh,
  enabled = true,
}: UseRealtimeStreamOptions) {
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>('connecting');
  const [livePrices, setLivePrices] = useState<Record<number, LivePriceUpdate>>({});
  const [isInitialSyncing, setIsInitialSyncing] = useState<boolean>(false);
  const [initialSyncDone, setInitialSyncDone] = useState<boolean>(false);
  const [lastTickTime, setLastTickTime] = useState<number>(Date.now());
  const [priceFlashes, setPriceFlashes] = useState<Record<number, 'up' | 'down' | null>>({});

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flashTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
  const prevPricesRef = useRef<Record<number, number>>({});

  // Trigger brief visual flash animation on price change
  const triggerFlash = useCallback((assetId: number, direction: 'up' | 'down') => {
    if (flashTimeoutsRef.current[assetId]) {
      clearTimeout(flashTimeoutsRef.current[assetId]);
    }
    setPriceFlashes((prev) => ({ ...prev, [assetId]: direction }));
    flashTimeoutsRef.current[assetId] = setTimeout(() => {
      setPriceFlashes((prev) => ({ ...prev, [assetId]: null }));
    }, 1200);
  }, []);

  // Process incoming price update dictionary
  const handleIncomingPrices = useCallback(
    (prices: Record<number, LivePriceUpdate>) => {
      setLivePrices((prev) => ({ ...prev, ...prices }));
      setLastTickTime(Date.now());

      Object.entries(prices).forEach(([idStr, update]) => {
        const id = parseInt(idStr, 10);
        const prevPrice = prevPricesRef.current[id];
        if (prevPrice !== undefined && update.last_close !== prevPrice) {
          const dir = update.last_close > prevPrice ? 'up' : 'down';
          triggerFlash(id, dir);
        }
        prevPricesRef.current[id] = update.last_close;

        if (activeAssetId === id && onPriceTick) {
          onPriceTick(id, update);
        }
      });
    },
    [activeAssetId, onPriceTick, triggerFlash]
  );

  // Fallback polling mechanism if SSE fails or disconnects
  const pollPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/live/prices');
      if (res.ok) {
        const data = await res.json();
        if (data.prices) {
          handleIncomingPrices(data.prices);
        }
        if (data.is_refreshing !== undefined) {
          setIsInitialSyncing(data.is_refreshing && !data.initial_sync_completed);
        }
        if (data.initial_sync_completed) {
          setInitialSyncDone(true);
        }
      }
    } catch (err) {
      console.warn('Fallback price poll error:', err);
    }
  }, [handleIncomingPrices]);

  // Establish SSE Connection
  const connectSSE = useCallback(() => {
    if (typeof window === 'undefined' || !enabled) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionStatus('connecting');

    try {
      const es = new EventSource('/api/live/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnectionStatus('connected');
      };

      // Initial Handshake
      es.addEventListener('init', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setConnectionStatus('connected');
          if (data.prices) {
            handleIncomingPrices(data.prices);
          }
          if (data.is_refreshing && !data.initial_sync_completed) {
            setIsInitialSyncing(true);
          }
          if (data.initial_sync_completed) {
            setInitialSyncDone(true);
          }
        } catch (err) {
          console.error('SSE init parse error:', err);
        }
      });

      // Live Price Tick
      es.addEventListener('price_tick', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.prices) {
            handleIncomingPrices(data.prices);
          }
        } catch (err) {
          console.error('SSE price_tick parse error:', err);
        }
      });

      // Pipeline Refresh Completed
      es.addEventListener('pipeline_refresh', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.prices) {
            handleIncomingPrices(data.prices);
          }
          setIsInitialSyncing(false);
          setInitialSyncDone(true);
          if (onPipelineRefresh) {
            onPipelineRefresh();
          }
        } catch (err) {
          console.error('SSE pipeline_refresh parse error:', err);
        }
      });

      // Status updates
      es.addEventListener('status', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.is_refreshing !== undefined) {
            setIsInitialSyncing(data.is_refreshing && !data.initial_sync_completed);
          }
          if (data.initial_sync_completed) {
            setInitialSyncDone(true);
          }
        } catch (err) {
          console.error('SSE status parse error:', err);
        }
      });

      es.onerror = () => {
        // SSE connection dropped - close and switch to polling fallback while attempting reconnect
        setConnectionStatus('reconnecting');
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        // Run fallback poll immediately
        pollPrices();

        // Retry SSE in 4 seconds
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE();
        }, 4000);
      };
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      setConnectionStatus('fallback_polling');
    }
  }, [enabled, handleIncomingPrices, onPipelineRefresh, pollPrices]);

  // Main lifecycle
  useEffect(() => {
    if (!enabled) return;

    connectSSE();

    // Secondary fallback polling timer every 15s to guarantee fresh prices
    // even if the tab is inactive/backgrounded by the browser
    pollingTimerRef.current = setInterval(() => {
      pollPrices();
    }, 15000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
      Object.keys(flashTimeoutsRef.current).forEach((key) => {
        const tid = flashTimeoutsRef.current[Number(key)];
        if (tid) clearTimeout(tid);
      });
    };
  }, [enabled, connectSSE, pollPrices]);

  return {
    connectionStatus,
    livePrices,
    isInitialSyncing,
    initialSyncDone,
    lastTickTime,
    priceFlashes,
    reconnect: connectSSE,
    pollNow: pollPrices,
  };
}
