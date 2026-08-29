from __future__ import annotations

import logging
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlencode
import xml.etree.ElementTree as ET

import requests

log = logging.getLogger(__name__)


def _published(value: str | None) -> str:
    if not value:
        return datetime.now(timezone.utc).isoformat()
    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError, OverflowError):
        return value


def fetch(assets: list[dict], start: datetime | None = None, limit: int = 20) -> list[dict]:
    """Fetch public Google News RSS results for each configured asset.

    This is a lightweight market-discussion fallback that needs no API key. It
    keeps the article URL and publisher attribution, and marks the queried
    asset explicitly so the existing social junction logic links it reliably.
    """
    rows: list[dict] = []
    for asset in assets:
        symbol = str(asset["symbol"]).upper()
        name = str(asset.get("name") or symbol)
        query = f'"{symbol}" {name} market'
        params = {"q": query, "hl": "en-US", "gl": "US", "ceid": "US:en"}
        url = "https://news.google.com/rss/search?" + urlencode(params)
        try:
            response = requests.get(url, timeout=20, headers={"User-Agent": "Sentrune/0.1 market discussion reader"})
            response.raise_for_status()
            root = ET.fromstring(response.content)
            for item in root.findall("./channel/item")[:limit]:
                link = (item.findtext("link") or "").strip()
                title = (item.findtext("title") or "").strip()
                if not link or not title:
                    continue
                created_at = _published(item.findtext("pubDate"))
                if start and created_at <= start.isoformat():
                    continue
                source = (item.findtext("source") or "Google News").strip()
                description = (item.findtext("description") or "").strip()
                rows.append({
                    "platform": "google_news",
                    "external_id": item.findtext("guid") or link,
                    "author_username": source,
                    "subreddit": f"market:{symbol}",
                    "is_followed_account": 0,
                    "title": title,
                    "body": description,
                    "url": link,
                    "created_at": created_at,
                    "score": None,
                    "comment_count": None,
                    "related_symbols": [symbol],
                    "raw_payload": {"asset": symbol, "source": source, "title": title, "link": link},
                })
        except (requests.RequestException, ET.ParseError, ValueError, TypeError) as exc:
            log.warning("Google News RSS fetch failed for %s: %s", symbol, exc)
    return rows
