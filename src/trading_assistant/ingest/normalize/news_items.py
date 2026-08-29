from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

_AV_TIME_PATTERN = re.compile(r"^\d{8}T\d{6}$")


def _time(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    if value is None:
        return datetime.now(timezone.utc).isoformat()
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()
    text = str(value)
    # Alpha Vantage formats publish times as compact UTC stamps: 20240101T130000.
    if _AV_TIME_PATTERN.match(text):
        parsed = datetime.strptime(text, "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc)
        return parsed.isoformat()
    return text.replace("Z", "+00:00")


def _related_symbols(raw: dict) -> list[str]:
    """Extract explicit related symbols when a provider offers them.

    Finnhub ships a comma-separated `related` field, CryptoPanic a `currencies`
    list of {code, ...} objects, and Alpha Vantage a `ticker_sentiment` list of
    {ticker, ...} objects. Explicit symbols are far more reliable for asset
    attribution than text matching, so they are surfaced as related_symbols.
    """
    related = raw.get("related")
    if isinstance(related, str) and related.strip():
        return [part.strip().upper() for part in related.split(",") if part.strip()]
    currencies = raw.get("currencies")
    if isinstance(currencies, list):
        return [str(item.get("code")).upper() for item in currencies if isinstance(item, dict) and item.get("code")]
    tickers = raw.get("ticker_sentiment")
    if isinstance(tickers, list):
        return [str(item.get("ticker")).upper() for item in tickers if isinstance(item, dict) and item.get("ticker")]
    return []


def normalize_news(raw: dict, source_type: str, source_name: str | None = None) -> dict:
    return {
        "source_type": source_type,
        "source_name": source_name or raw.get("source") or raw.get("source_name") or raw.get("publisher"),
        "external_id": str(raw.get("id")) if raw.get("id") is not None else raw.get("uuid"),
        "headline": raw.get("headline") or raw.get("title") or "",
        "body": raw.get("summary") or raw.get("body") or raw.get("description"),
        "url": raw.get("url") or raw.get("link"),
        "published_at": _time(raw.get("datetime") or raw.get("published_at") or raw.get("time_published")),
        "raw_sentiment": raw.get("sentiment") if raw.get("sentiment") is not None else raw.get("sentiment_score"),
        "raw_payload": raw,
        "related_symbols": _related_symbols(raw),
    }
