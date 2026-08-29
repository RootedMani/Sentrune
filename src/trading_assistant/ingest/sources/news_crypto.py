from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

import requests

from ..normalize.news_items import normalize_news

log = logging.getLogger(__name__)


def fetch(assets: list[dict], api_key: str | None, start: datetime | None = None) -> list[dict]:
    if not api_key:
        log.info("CryptoPanic skipped: CRYPTOPANIC_API_KEY is not configured")
        return []
    currencies = ",".join(a["symbol"].replace("USDT", "") for a in assets)
    params = {"auth_token": api_key, "currencies": currencies, "kind": "news", "public": "true"}
    if start:
        # Incremental boundary: only posts published after the last successful run.
        params["published_after"] = start.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        response = requests.get("https://cryptopanic.com/api/v1/posts/", params=params, timeout=20)
        if response.status_code == 429:
            log.warning("CryptoPanic rate limit reached")
            return []
        response.raise_for_status()
        time.sleep(1)
        return [normalize_news(item, "cryptopanic", (item.get("source") or {}).get("title")) for item in response.json().get("results", [])]
    except (requests.RequestException, ValueError, TypeError) as exc:
        log.warning("CryptoPanic fetch failed: %s", exc)
        return []
