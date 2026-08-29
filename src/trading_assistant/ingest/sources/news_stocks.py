from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone

import requests

from ..normalize.news_items import normalize_news

log = logging.getLogger(__name__)


def fetch_finnhub(symbol: str, api_key: str, start: datetime | None = None) -> list[dict]:
    end = datetime.now(timezone.utc)
    begin = start or (end - timedelta(days=2))
    try:
        response = requests.get("https://finnhub.io/api/v1/company-news", params={"symbol": symbol, "from": begin.date().isoformat(), "to": end.date().isoformat(), "token": api_key}, timeout=20)
        if response.status_code == 429:
            log.warning("Finnhub rate limit reached for %s", symbol)
            return []
        response.raise_for_status()
        time.sleep(1.05)
        return [normalize_news(item, "finnhub") for item in response.json()]
    except (requests.RequestException, ValueError, TypeError) as exc:
        log.warning("Finnhub fetch failed for %s: %s", symbol, exc)
        return []


def fetch_alpha_vantage(symbol: str, api_key: str, limit: int = 50) -> list[dict]:
    try:
        response = requests.get("https://www.alphavantage.co/query", params={"function": "NEWS_SENTIMENT", "tickers": symbol, "limit": limit, "apikey": api_key}, timeout=20)
        response.raise_for_status()
        payload = response.json()
        if "Note" in payload or "Information" in payload:
            log.warning("Alpha Vantage rate limit or informational response for %s", symbol)
            return []
        time.sleep(4.1)
        return [normalize_news(item, "alpha_vantage") for item in payload.get("feed", [])]
    except (requests.RequestException, ValueError, TypeError) as exc:
        log.warning("Alpha Vantage fetch failed for %s: %s", symbol, exc)
        return []
