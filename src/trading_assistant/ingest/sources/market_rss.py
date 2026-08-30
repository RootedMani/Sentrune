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
            items = root.findall("./channel/item")
            if not items:
                # A 200 with zero <item> elements almost always means Google
                # served a block/consent page instead of the feed rather than
                # a genuine "no news" result - log a snippet so this is
                # diagnosable instead of silently looking like "no new items".
                log.warning(
                    "Google News RSS returned 0 items for %s (status=%s, body starts: %r)",
                    symbol, response.status_code, response.text[:200],
                )
            skipped_stale = 0
            for item in items[:limit]:
                link = (item.findtext("link") or "").strip()
                title = (item.findtext("title") or "").strip()
                if not link or not title:
                    continue
                created_at = _published(item.findtext("pubDate"))
                if start and created_at <= start.isoformat():
                    skipped_stale += 1
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
            if items and skipped_stale == len(items):
                log.info("Google News RSS for %s: all %d items already seen (older than last run)", symbol, len(items))
        except (requests.RequestException, ET.ParseError, ValueError, TypeError) as exc:
            log.warning("Google News RSS fetch failed for %s: %s", symbol, exc)
    return rows


def fetch_news(assets: list[dict], start: datetime | None = None, limit: int = 20) -> list[dict]:
    """Fetch the same public RSS results using the news-table contract."""
    from ..normalize.news_items import normalize_news

    rows: list[dict] = []
    for asset in assets:
        symbol = str(asset["symbol"]).upper()
        name = str(asset.get("name") or symbol)
        params = {"q": f'"{symbol}" {name} market', "hl": "en-US", "gl": "US", "ceid": "US:en"}
        url = "https://news.google.com/rss/search?" + urlencode(params)
        try:
            response = requests.get(url, timeout=20, headers={"User-Agent": "Sentrune/0.1 market news reader"})
            response.raise_for_status()
            root = ET.fromstring(response.content)
            for item in root.findall("./channel/item")[:limit]:
                link = (item.findtext("link") or "").strip()
                title = (item.findtext("title") or "").strip()
                if not link or not title:
                    continue
                published = _published(item.findtext("pubDate"))
                if start and published <= start.isoformat():
                    continue
                source = (item.findtext("source") or "Google News").strip()
                rows.append(normalize_news({
                    "id": item.findtext("guid") or link,
                    "title": title,
                    "description": (item.findtext("description") or "").strip(),
                    "link": link,
                    "published_at": published,
                    "related": symbol,
                }, "google_news", source))
        except (requests.RequestException, ET.ParseError, ValueError, TypeError) as exc:
            log.warning("Google News RSS news fetch failed for %s: %s", symbol, exc)
    return rows
