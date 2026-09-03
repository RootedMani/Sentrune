from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone

import requests

from ..normalize.news_items import normalize_news

log = logging.getLogger(__name__)


def _parse_keys(api_key_str: str | None) -> list[str]:
    if not api_key_str:
        return []
    raw = [k.strip() for k in api_key_str.replace(";", ",").split(",") if k.strip()]
    return raw


def fetch_finnhub(symbol: str, api_key: str, start: datetime | None = None) -> list[dict]:
    keys = _parse_keys(api_key)
    if not keys:
        return []

    end = datetime.now(timezone.utc)
    begin = start or (end - timedelta(days=2))

    for current_key in keys:
        try:
            response = requests.get(
                "https://finnhub.io/api/v1/company-news",
                params={"symbol": symbol, "from": begin.date().isoformat(), "to": end.date().isoformat(), "token": current_key},
                timeout=20,
            )
            if response.status_code == 429:
                log.warning("Finnhub rate limit reached for key %s... on symbol %s, trying next key if available", current_key[:6], symbol)
                continue
            response.raise_for_status()
            time.sleep(1.05)
            return [normalize_news(item, "finnhub") for item in response.json()]
        except (requests.RequestException, ValueError, TypeError) as exc:
            log.warning("Finnhub fetch failed for %s with key %s...: %s", symbol, current_key[:6], exc)
            continue
    return []


def fetch_alpha_vantage(symbol: str, api_key: str, limit: int = 50) -> list[dict]:
    keys = _parse_keys(api_key)
    if not keys:
        return []

    for current_key in keys:
        try:
            response = requests.get(
                "https://www.alphavantage.co/query",
                params={"function": "NEWS_SENTIMENT", "tickers": symbol, "limit": limit, "apikey": current_key},
                timeout=20,
            )
            response.raise_for_status()
            payload = response.json()
            if "Note" in payload or "Information" in payload:
                log.warning("Alpha Vantage rate limit for key %s... on symbol %s, trying next key if available", current_key[:6], symbol)
                continue
            time.sleep(4.1)
            return [normalize_news(item, "alpha_vantage") for item in payload.get("feed", [])]
        except (requests.RequestException, ValueError, TypeError) as exc:
            log.warning("Alpha Vantage fetch failed for %s with key %s...: %s", symbol, current_key[:6], exc)
            continue
    return []
