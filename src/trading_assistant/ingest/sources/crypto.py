from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import requests

from ..normalize.price_bars import normalize_bar

log = logging.getLogger(__name__)
BINANCE_URL = "https://api.binance.com/api/v3/klines"
COINBASE_URL = "https://api.exchange.coinbase.com/products/{product}/candles"
COINBASE_PRODUCTS = {"BTCUSDT": "BTC-USD", "ETHUSDT": "ETH-USD"}
COINBASE_GRANULARITY = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 21600, "1d": 86400}


def _normalize_coinbase(asset_id: int, interval: str, candles: list[list]) -> list[dict]:
    ordered = sorted(candles, key=lambda item: int(item[0]))
    rows = []
    for item in ordered:
        rows.append(normalize_bar(asset_id, interval, datetime.fromtimestamp(int(item[0]), tz=timezone.utc), {
            "open": item[3], "high": item[2], "low": item[1], "close": item[4], "volume": item[5],
        }, "coinbase"))
    return rows


def _weekly_from_daily(asset_id: int, candles: list[list]) -> list[dict]:
    daily = _normalize_coinbase(asset_id, "1d", candles)
    weeks: dict[str, list[dict]] = {}
    for row in daily:
        stamp = datetime.fromisoformat(row["timestamp"])
        week_start = (stamp - timedelta(days=stamp.weekday())).date().isoformat()
        weeks.setdefault(week_start, []).append(row)
    output = []
    for week_start, bars in sorted(weeks.items()):
        output.append({
            "asset_id": asset_id, "interval": "1wk", "timestamp": f"{week_start}T00:00:00+00:00",
            "open": bars[0]["open"], "high": max(item["high"] for item in bars),
            "low": min(item["low"] for item in bars), "close": bars[-1]["close"],
            "volume": sum(item["volume"] or 0.0 for item in bars), "source": "coinbase",
        })
    return output


def _fetch_coinbase(asset: dict, asset_id: int, interval: str, start: datetime | None, limit: int) -> list[dict]:
    product = asset.get("coinbase_product") or COINBASE_PRODUCTS.get(str(asset.get("pair", "")).upper())
    if not product:
        raise ValueError(f"no Coinbase product configured for {asset.get('symbol')}")
    requested_interval = "1d" if interval == "1wk" else interval
    granularity = COINBASE_GRANULARITY.get(requested_interval)
    if granularity is None:
        raise ValueError(f"Coinbase does not support crypto interval {interval}")
    end = datetime.now(timezone.utc)
    if start is None:
        start = end - timedelta(seconds=granularity * min(limit, 300))
    params = {"start": start.isoformat(), "end": end.isoformat(), "granularity": granularity}
    response = requests.get(COINBASE_URL.format(product=product), params=params, timeout=20, headers={"User-Agent": "Sentrune/0.1"})
    response.raise_for_status()
    candles = response.json()
    if not isinstance(candles, list):
        raise ValueError("unexpected Coinbase candles response")
    return _weekly_from_daily(asset_id, candles) if interval == "1wk" else _normalize_coinbase(asset_id, interval, candles)


def fetch(asset: dict, asset_id: int, interval: str = "1d", start: datetime | None = None, limit: int = 300) -> list[dict]:
    """Fetch crypto candles, using Binance first and Coinbase when Binance is blocked."""
    pair = asset.get("pair") or asset["symbol"]
    params = {"symbol": pair, "interval": interval, "limit": min(limit, 1000)}
    if start:
        params["startTime"] = int(start.timestamp() * 1000)
    try:
        response = requests.get(BINANCE_URL, params=params, timeout=20)
        response.raise_for_status()
        return [dict(row, source="binance") for row in _normalize_binance_compat(asset_id, interval, response.json())]
    except (requests.RequestException, ValueError, KeyError, TypeError) as exc:
        log.warning("Binance fetch failed for %s; trying Coinbase: %s", pair, exc)
    try:
        return _fetch_coinbase(asset, asset_id, interval, start, limit)
    except (requests.RequestException, ValueError, KeyError, TypeError) as exc:
        log.error("Coinbase fetch failed for %s: %s", pair, exc)
        return []


def _normalize_binance_compat(asset_id: int, interval: str, klines: list[list]) -> list[dict]:
    return [normalize_bar(asset_id, interval, datetime.fromtimestamp(item[0] / 1000, tz=timezone.utc), {
        "open": item[1], "high": item[2], "low": item[3], "close": item[4], "volume": item[5],
    }, "binance") for item in klines]
