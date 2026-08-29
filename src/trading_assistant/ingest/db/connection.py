from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect(path: str) -> sqlite3.Connection:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def initialize(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.commit()


def seed_assets(conn: sqlite3.Connection, assets: Iterable[dict]) -> None:
    for asset in assets:
        conn.execute(
            "INSERT INTO assets(symbol,name,asset_type,exchange,pair) VALUES(?,?,?,?,?) "
            "ON CONFLICT(symbol,asset_type) DO UPDATE SET name=excluded.name, exchange=excluded.exchange, pair=excluded.pair",
            (asset["symbol"], asset.get("name", asset["symbol"]), asset["asset_type"], asset.get("exchange"), asset.get("pair")),
        )
    conn.commit()


def seed_followed_sources(conn: sqlite3.Connection, subreddits: Iterable[str], usernames: Iterable[str]) -> None:
    for subreddit in subreddits:
        identifier = subreddit.removeprefix("r/")
        conn.execute("INSERT OR IGNORE INTO followed_sources(source_type,source_identifier,is_curated_default) VALUES('reddit_subreddit',?,1)", (identifier,))
    for username in usernames:
        identifier = username.removeprefix("u/").removeprefix("/")
        conn.execute("INSERT OR IGNORE INTO followed_sources(source_type,source_identifier,is_curated_default) VALUES('reddit_user',?,1)", (identifier,))
    conn.commit()


def _asset_ids(conn: sqlite3.Connection, text: str, explicit: Iterable[str] = ()) -> list[int]:
    """Match assets by explicit symbols first, then by whole-word occurrences in text.

    Whole-word boundaries matter: a plain substring check would tag ETH for any
    text containing the word "together". Explicit related_symbols from the
    source payload always win when present.
    """
    symbols = {str(s).upper() for s in explicit}
    haystack = (text or "").upper()
    rows = conn.execute("SELECT id,symbol FROM assets WHERE is_active=1").fetchall()
    matched = []
    for row in rows:
        symbol = row["symbol"].upper()
        if symbol in symbols or re.search(rf"\b{re.escape(symbol)}\b", haystack):
            matched.append(row["id"])
    return matched


def insert_price_bars(conn: sqlite3.Connection, rows: Iterable[dict]) -> int:
    """Insert bars; returns the number of rows actually stored (duplicates ignored)."""
    count = 0
    for row in rows:
        cur = conn.execute("""INSERT OR IGNORE INTO price_bars(asset_id,interval,timestamp,open,high,low,close,volume,source)
            VALUES(:asset_id,:interval,:timestamp,:open,:high,:low,:close,:volume,:source)""", row)
        if cur.rowcount:
            count += 1
    conn.commit()
    return count


def insert_news(conn: sqlite3.Connection, rows: Iterable[dict]) -> int:
    """Insert news; returns the number of rows actually stored (duplicates ignored).

    cursor.lastrowid is stale after INSERT OR IGNORE, so junction rows are only
    ever linked from a freshly inserted row. A duplicate is a pure no-op: its
    asset tags were already written by the first insert, and re-linking a
    changed payload would silently corrupt the stored item's attribution.
    """
    count = 0
    for row in rows:
        cur = conn.execute("""INSERT OR IGNORE INTO news_items(source_type,source_name,external_id,headline,body,url,published_at,raw_sentiment,raw_payload)
            VALUES(:source_type,:source_name,:external_id,:headline,:body,:url,:published_at,:raw_sentiment,:raw_payload)""", {**row, "raw_payload": json.dumps(row.get("raw_payload")) if not isinstance(row.get("raw_payload"), str) else row.get("raw_payload")})
        if not cur.rowcount:
            continue
        count += 1
        text = f"{row.get('headline', '')} {row.get('body', '')}"
        for asset_id in _asset_ids(conn, text, row.get("related_symbols", ())):
            conn.execute("INSERT OR IGNORE INTO news_item_assets(news_item_id,asset_id) VALUES(?,?)", (cur.lastrowid, asset_id))
    conn.commit()
    return count


def insert_social(conn: sqlite3.Connection, rows: Iterable[dict]) -> int:
    """Insert social items; returns the number actually stored (duplicates ignored).

    Same no-op duplicate discipline as insert_news.
    """
    count = 0
    for row in rows:
        cur = conn.execute("""INSERT OR IGNORE INTO social_items(platform,external_id,author_username,subreddit,is_followed_account,title,body,url,created_at,score,comment_count,raw_payload)
            VALUES(:platform,:external_id,:author_username,:subreddit,:is_followed_account,:title,:body,:url,:created_at,:score,:comment_count,:raw_payload)""", {**row, "raw_payload": json.dumps(row.get("raw_payload")) if not isinstance(row.get("raw_payload"), str) else row.get("raw_payload")})
        if not cur.rowcount:
            continue
        count += 1
        text = f"{row.get('title', '')} {row.get('body', '')} {row.get('subreddit', '')}"
        for asset_id in _asset_ids(conn, text, row.get("related_symbols", ())):
            conn.execute("INSERT OR IGNORE INTO social_item_assets(social_item_id,asset_id) VALUES(?,?)", (cur.lastrowid, asset_id))
    conn.commit()
    return count
