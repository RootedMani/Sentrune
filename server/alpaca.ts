/**
 * Alpaca Markets API Integration Module
 * Supports Paper Trading & Live Brokerage Execution and Real-time Market Data
 */

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  buying_power: number;
  cash: number;
  portfolio_value: number;
  equity: number;
  last_equity: number;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  qty: number;
  side: 'long' | 'short';
  market_value: number;
  cost_basis: number;
  unrealized_pl: number;
  unrealized_plpc: number;
  current_price: number;
  lastday_price: number;
  change_today: number;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at?: string;
  symbol: string;
  qty: number;
  filled_qty: number;
  type: string;
  side: 'buy' | 'sell';
  time_in_force: string;
  limit_price?: number;
  stop_price?: number;
  status: string;
  extended_hours: boolean;
}

export interface AlpacaBar {
  t: string; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  n?: number; // trade count
  vw?: number; // vwap
}

function getCredentials() {
  const rawKey = (process.env.ALPACA_API_KEY || process.env.APCA_API_KEY_ID || '').trim().replace(/^["']|["']$/g, '');
  const rawSecret = (process.env.ALPACA_API_SECRET || process.env.APCA_API_SECRET_KEY || '').trim().replace(/^["']|["']$/g, '');
  const isPaper = process.env.ALPACA_PAPER !== 'false';
  const baseUrl = isPaper
    ? (process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets')
    : (process.env.ALPACA_BASE_URL || 'https://api.alpaca.markets');
  const dataUrl = process.env.ALPACA_DATA_URL || 'https://data.alpaca.markets';

  return {
    apiKey: rawKey,
    apiSecret: rawSecret,
    isPaper,
    baseUrl: baseUrl.replace(/\/$/, ''),
    dataUrl: dataUrl.replace(/\/$/, ''),
    isConfigured: Boolean(rawKey && rawSecret),
  };
}

export function isAlpacaConfigured(): boolean {
  const { isConfigured } = getCredentials();
  return isConfigured;
}

export function getAlpacaConfig() {
  const creds = getCredentials();
  return {
    isConfigured: creds.isConfigured,
    isPaper: creds.isPaper,
    baseUrl: creds.baseUrl,
    keyPreview: creds.apiKey ? `${creds.apiKey.slice(0, 4)}...${creds.apiKey.slice(-4)}` : undefined,
  };
}

function getHeaders() {
  const { apiKey, apiSecret } = getCredentials();
  return {
    'APCA-API-KEY-ID': apiKey,
    'APCA-API-SECRET-KEY': apiSecret,
    'Content-Type': 'application/json',
  };
}

/**
 * Fetch Alpaca Account details
 */
export async function getAlpacaAccount(): Promise<AlpacaAccount | null> {
  const { isConfigured, baseUrl } = getCredentials();
  if (!isConfigured) return null;

  try {
    const res = await fetch(`${baseUrl}/v2/account`, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`Alpaca getAccount HTTP ${res.status}:`, err);
      return null;
    }

    const data = await res.json() as any;
    return {
      id: data.id,
      account_number: data.account_number,
      status: data.status,
      currency: data.currency,
      buying_power: parseFloat(data.buying_power || '0'),
      cash: parseFloat(data.cash || '0'),
      portfolio_value: parseFloat(data.portfolio_value || '0'),
      equity: parseFloat(data.equity || '0'),
      last_equity: parseFloat(data.last_equity || '0'),
      pattern_day_trader: Boolean(data.pattern_day_trader),
      trading_blocked: Boolean(data.trading_blocked),
      transfers_blocked: Boolean(data.transfers_blocked),
      account_blocked: Boolean(data.account_blocked),
    };
  } catch (err: any) {
    console.error('Alpaca getAccount failed:', err.message);
    return null;
  }
}

/**
 * Fetch open positions
 */
export async function getAlpacaPositions(): Promise<AlpacaPosition[]> {
  const { isConfigured, baseUrl } = getCredentials();
  if (!isConfigured) return [];

  try {
    const res = await fetch(`${baseUrl}/v2/positions`, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`Alpaca getPositions HTTP ${res.status}:`, err);
      return [];
    }

    const data = await res.json() as any[];
    return data.map((pos) => ({
      asset_id: pos.asset_id,
      symbol: pos.symbol,
      exchange: pos.exchange,
      asset_class: pos.asset_class,
      qty: parseFloat(pos.qty || '0'),
      side: pos.side,
      market_value: parseFloat(pos.market_value || '0'),
      cost_basis: parseFloat(pos.cost_basis || '0'),
      unrealized_pl: parseFloat(pos.unrealized_pl || '0'),
      unrealized_plpc: parseFloat(pos.unrealized_plpc || '0'),
      current_price: parseFloat(pos.current_price || '0'),
      lastday_price: parseFloat(pos.lastday_price || '0'),
      change_today: parseFloat(pos.change_today || '0'),
    }));
  } catch (err: any) {
    console.error('Alpaca getPositions failed:', err.message);
    return [];
  }
}

/**
 * Place a new paper or live order
 */
export async function placeAlpacaOrder(params: {
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type?: 'market' | 'limit';
  time_in_force?: 'gtc' | 'day' | 'ioc';
  limit_price?: number;
}): Promise<{ success: boolean; order?: AlpacaOrder; error?: string }> {
  const { isConfigured, baseUrl } = getCredentials();
  if (!isConfigured) {
    return { success: false, error: 'Alpaca credentials are not configured in environment (ALPACA_API_KEY, ALPACA_API_SECRET).' };
  }

  try {
    const body: Record<string, any> = {
      symbol: params.symbol.toUpperCase(),
      qty: params.qty.toString(),
      side: params.side.toLowerCase(),
      type: params.type || 'market',
      time_in_force: params.time_in_force || 'gtc',
    };

    if (params.type === 'limit' && params.limit_price) {
      body.limit_price = params.limit_price.toFixed(2);
    }

    const res = await fetch(`${baseUrl}/v2/orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    const data = await res.json() as any;

    if (!res.ok) {
      return {
        success: false,
        error: data.message || `Order rejected with status ${res.status}`,
      };
    }

    return {
      success: true,
      order: {
        id: data.id,
        client_order_id: data.client_order_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        submitted_at: data.submitted_at,
        filled_at: data.filled_at,
        symbol: data.symbol,
        qty: parseFloat(data.qty),
        filled_qty: parseFloat(data.filled_qty || '0'),
        type: data.type,
        side: data.side,
        time_in_force: data.time_in_force,
        limit_price: data.limit_price ? parseFloat(data.limit_price) : undefined,
        status: data.status,
        extended_hours: Boolean(data.extended_hours),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Alpaca order execution error' };
  }
}

/**
 * Fetch recent orders
 */
export async function getAlpacaOrders(status: 'open' | 'closed' | 'all' = 'all', limit: number = 20): Promise<AlpacaOrder[]> {
  const { isConfigured, baseUrl } = getCredentials();
  if (!isConfigured) return [];

  try {
    const res = await fetch(`${baseUrl}/v2/orders?status=${status}&limit=${limit}&nested=true`, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json() as any[];
    return data.map((o) => ({
      id: o.id,
      client_order_id: o.client_order_id,
      created_at: o.created_at,
      updated_at: o.updated_at,
      submitted_at: o.submitted_at,
      filled_at: o.filled_at,
      symbol: o.symbol,
      qty: parseFloat(o.qty || '0'),
      filled_qty: parseFloat(o.filled_qty || '0'),
      type: o.type,
      side: o.side,
      time_in_force: o.time_in_force,
      limit_price: o.limit_price ? parseFloat(o.limit_price) : undefined,
      status: o.status,
      extended_hours: Boolean(o.extended_hours),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch real historical stock bars from Alpaca Market Data v2
 */
export async function getAlpacaStockBars(
  symbol: string,
  timeframe: '1Day' | '1Hour' | '1Week' = '1Day',
  limit: number = 100
): Promise<AlpacaBar[]> {
  const { isConfigured, dataUrl } = getCredentials();
  if (!isConfigured) return [];

  try {
    const res = await fetch(
      `${dataUrl}/v2/stocks/${encodeURIComponent(symbol.toUpperCase())}/bars?timeframe=${timeframe}&limit=${limit}&adjustment=all&feed=iex`,
      {
        headers: getHeaders(),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.warn(`Alpaca getStockBars HTTP ${res.status}:`, err);
      return [];
    }

    const json = await res.json() as any;
    const bars = json.bars || [];
    return bars.map((b: any) => ({
      t: b.t,
      o: b.o,
      h: b.h,
      l: b.l,
      c: b.c,
      v: b.v,
      n: b.n,
      vw: b.vw,
    }));
  } catch (err: any) {
    console.error(`Alpaca getStockBars for ${symbol} failed:`, err.message);
    return [];
  }
}
