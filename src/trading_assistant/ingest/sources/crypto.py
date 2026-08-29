from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

import requests

from ..normalize.price_bars import normalize_binance_klines

log = logging.getLogger(__name__)
BASE_URL = "https://api.binance.com/api/v3/klines"


def fetch(asset: dict, asset_id: int, interval: str = "1d", start: datetime | None = None, limit: int = 1000) -> list[dict]:
    params = {"symbol": asset.get("pair") or asset["symbol"], "interval": interval, "limit": min(limit, 1000)}
    if start:
        params["startTime"] = int(start.timestamp() * 1000)
    try:
        response = requests.get(BASE_URL, params=params, timeout=20)
        response.raise_for_status()
        time.sleep(0.1)
        return normalize_binance_klines(asset_id, interval, response.json())
    except (requests.RequestException, ValueError, KeyError, TypeError) as exc:
        log.warning("Binance fetch failed for %s: %s", params["symbol"], exc)
        return []
