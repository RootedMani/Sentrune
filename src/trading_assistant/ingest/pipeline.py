from __future__ import annotations

import argparse
import logging
from datetime import datetime, timezone
from pathlib import Path

from . import state
from .config import load_settings
from .db.connection import connect, initialize, insert_news, insert_price_bars, insert_social, seed_assets, seed_followed_sources, utc_now
from .sources import crypto, news_crypto, news_stocks, reddit, stocks

log = logging.getLogger(__name__)


def _dt(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


def _run_logged(conn, source: str, fn):
    started = utc_now()
    cur = conn.execute("INSERT INTO ingestion_log(source,started_at,status) VALUES(?,?,?)", (source, started, "running"))
    run_id = cur.lastrowid
    try:
        count = fn()
        conn.execute("UPDATE ingestion_log SET ended_at=?,status='success',records_fetched=? WHERE id=?", (utc_now(), count, run_id))
        conn.commit()
        return count
    except Exception as exc:
        log.error("%s failed: %s", source, exc)
        conn.execute("UPDATE ingestion_log SET ended_at=?,status='failure',error_message=? WHERE id=?", (utc_now(), str(exc), run_id))
        conn.commit()
        return None


def run(assets_path="config/assets.yaml", sources_path="config/sources.yaml", env_path=None) -> dict[str, int]:
    settings = load_settings(assets_path, sources_path, env_path)
    conn = connect(settings.db_path)
    initialize(conn)
    seed_assets(conn, settings.assets)
    seed_followed_sources(conn, settings.subreddits, settings.usernames)
    asset_rows = {row["symbol"] + ":" + row["asset_type"]: row for row in conn.execute("SELECT * FROM assets WHERE is_active=1")}
    totals: dict[str, int] = {}
    for asset in settings.assets:
        key = asset["symbol"] + ":" + asset["asset_type"]
        db_asset = asset_rows.get(key)
        if not db_asset:
            continue
        fetcher = stocks.fetch if asset["asset_type"] == "stock" else crypto.fetch
        for interval in settings.intervals:
            source = "prices:" + key + ":" + interval
            last = _dt(state.get_last_success(conn, source, key))
            result = _run_logged(conn, source, lambda a=asset, d=db_asset, l=last, f=fetcher, i=interval: insert_price_bars(conn, f(a, d["id"], i, l)))
            if result is not None:
                totals[source] = result
                state.mark_success(conn, source, key)
    stock_assets = [a for a in settings.assets if a["asset_type"] == "stock"]
    if settings.finnhub_api_key:
        for asset in stock_assets:
            key = "finnhub:" + asset["symbol"]
            last = _dt(state.get_last_success(conn, "finnhub", key))
            result = _run_logged(conn, key, lambda a=asset, l=last: insert_news(conn, news_stocks.fetch_finnhub(a["symbol"], settings.finnhub_api_key, l)))
            if result is not None:
                totals[key] = result
                state.mark_success(conn, "finnhub", key)
    elif settings.alpha_vantage_api_key:
        # Documented source substitution: Alpha Vantage runs only when no
        # Finnhub key is configured, so the two free news providers never
        # double-fetch the same headlines.
        for asset in stock_assets:
            key = "alpha_vantage:" + asset["symbol"]
            result = _run_logged(conn, key, lambda a=asset: insert_news(conn, news_stocks.fetch_alpha_vantage(a["symbol"], settings.alpha_vantage_api_key)))
            if result is not None:
                totals[key] = result
                state.mark_success(conn, "alpha_vantage", key)
    crypto_assets = [a for a in settings.assets if a["asset_type"] == "crypto"]
    crypto_last = _dt(state.get_last_success(conn, "cryptopanic", "all"))
    result = _run_logged(conn, "cryptopanic", lambda: insert_news(conn, news_crypto.fetch(crypto_assets, settings.cryptopanic_api_key, crypto_last)))
    if result is not None:
        totals["cryptopanic"] = result
        state.mark_success(conn, "cryptopanic", "all")
    result = _run_logged(conn, "reddit", lambda: insert_social(conn, reddit.fetch(settings.reddit_client_id, settings.reddit_client_secret, settings.reddit_user_agent, settings.subreddits, settings.usernames, delay_seconds=settings.reddit_delay_seconds, max_subreddits=settings.reddit_max_subreddits, max_usernames=settings.reddit_max_usernames)))
    if result is not None:
        totals["reddit"] = result
        state.mark_success(conn, "reddit", "all")
    conn.close()
    return totals


def main() -> None:
    parser = argparse.ArgumentParser(description="Run one incremental Sentrune data ingestion cycle")
    parser.add_argument("--assets", default="config/assets.yaml")
    parser.add_argument("--sources", default="config/sources.yaml")
    parser.add_argument("--env", default=None)
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level.upper(), logging.INFO), format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    run(args.assets, args.sources, args.env)


if __name__ == "__main__":
    main()
