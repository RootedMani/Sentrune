from __future__ import annotations
import argparse
import logging
import sqlite3
from datetime import datetime, timedelta, timezone
import pandas as pd

from .config import load_config
from .db.connection import connect, initialize, upsert_aggregate, upsert_sentiment, upsert_technical
from .sentiment.aggregation import aggregate_items
from .sentiment.finbert_scorer import FinBERTScorer
from .technical.indicators import compute_indicators
from .technical.lag_momentum import compute_lag_momentum
from .technical.regime import compute_regime

TECHNICAL_COLUMNS = (
    "sma_20", "sma_50", "sma_200", "ema_12", "ema_26", "macd", "macd_signal", "macd_histogram",
    "rsi_14", "stoch_k", "stoch_d", "bb_lower", "bb_middle", "bb_upper", "atr_14", "obv", "volume_sma_20",
    "adx_14", "plus_di_14", "minus_di_14",
    "ichimoku_tenkan", "ichimoku_kijun", "ichimoku_senkou_a", "ichimoku_senkou_b", "ichimoku_chikou",
    "volatility_20", "return_autocorr_20", "volume_price_divergence",
    "candle_body_ratio", "candle_doji", "candle_hammer", "candle_bullish_engulfing", "candle_bearish_engulfing",
    "return_1", "return_3", "return_5", "return_10", "zscore_20",
    "volatility_regime", "day_of_week", "dist_from_high", "dist_from_low",
)

log = logging.getLogger(__name__)

def _state_get(conn: sqlite3.Connection, feature_name: str, entity_key: str) -> str | None:
    row = conn.execute("SELECT last_processed_at FROM feature_state WHERE feature_name=? AND entity_key=?", (feature_name, entity_key)).fetchone()
    return row[0] if row else None

def _state_mark(conn: sqlite3.Connection, feature_name: str, entity_key: str, processed_at: str) -> None:
    conn.execute("INSERT INTO feature_state(feature_name,entity_key,last_processed_at) VALUES(?,?,?) ON CONFLICT(feature_name,entity_key) DO UPDATE SET last_processed_at=excluded.last_processed_at", (feature_name, entity_key, processed_at))

def _timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))

def compute_technical(conn: sqlite3.Connection, settings) -> int:
    total = 0
    asset_query = "SELECT * FROM assets WHERE is_active=1" + (" AND symbol IN (%s)" % ",".join("?" for _ in settings.assets) if settings.assets else "")
    assets = conn.execute(asset_query, settings.assets).fetchall()
    
    for asset in assets:
        for interval in settings.intervals:
            try:
                rows = conn.execute("SELECT timestamp,open,high,low,close,volume FROM price_bars WHERE asset_id=? AND interval=? ORDER BY timestamp", (asset["id"], interval)).fetchall()
                if not rows:
                    log.warning("No price history for %s %s", asset["symbol"], interval)
                    continue
                
                frame = pd.DataFrame([dict(r) for r in rows])
                frame["timestamp"] = pd.to_datetime(frame["timestamp"], utc=True)
                frame = frame.drop_duplicates(subset=["timestamp"], keep="last").sort_values("timestamp").set_index("timestamp")
                
                result = compute_indicators(frame, settings.indicators)
                result = compute_lag_momentum(result, horizons=settings.lag_horizons, zscore_window=settings.zscore_window)
                high_low_window = settings.high_low_window_crypto if asset["asset_type"] == "crypto" else settings.high_low_window_stock
                result = compute_regime(
                    result, vol_window=settings.vol_window, vol_rank_window=settings.vol_rank_window,
                    high_low_window=high_low_window,
                )
                
                state_key = f"{asset['id']}:{interval}"
                last_processed = _state_get(conn, "technical", state_key)
                for timestamp, row in result.iterrows():
                    if last_processed and str(timestamp) <= last_processed:
                        continue
                    values = {"asset_id": asset["id"], "interval": interval, "timestamp": str(timestamp)}
                    for column in TECHNICAL_COLUMNS:
                        value = row.get(column)
                        values[column] = None if pd.isna(value) else float(value)
                    if any(values[c] is not None for c in values if c not in {"asset_id", "interval", "timestamp"}):
                        upsert_technical(conn, values)
                    total += 1
                
                if len(result.index):
                    _state_mark(conn, "technical", state_key, str(result.index[-1]))
                conn.commit()
                log.info("Computed technical features for %s %s, %d source rows", asset["symbol"], interval, len(result))
            except Exception as exc:
                log.error("Technical feature computation failed for %s %s: %s", asset["symbol"], interval, exc, exc_info=True)
                continue
                
    return total

def compute_sentiment(conn: sqlite3.Connection, settings) -> int:
    scorer = FinBERTScorer(settings.finbert_model, settings.sentiment_batch_size)
    records = []
    for item_type, table, text_columns in [("news", "news_items", ("headline", "body")), ("social", "social_items", ("title", "body"))]:
        query = f"SELECT t.id, t.{text_columns[0]}, t.{text_columns[1]} FROM {table} t LEFT JOIN text_sentiment s ON s.item_type=? AND s.item_id=t.id WHERE s.id IS NULL"
        pending = conn.execute(query, (item_type,)).fetchall()
        texts = [" ".join(str(r[c] or "") for c in text_columns).strip() for r in pending]
        for row, scored in zip(pending, scorer.score(texts)):
            upsert_sentiment(conn, {"item_type": item_type, "item_id": row["id"], "positive_prob": scored["positive"], "negative_prob": scored["negative"], "neutral_prob": scored["neutral"], "label": scored["label"], "computed_at": scored["computed_at"]})
            records.append((item_type, row["id"]))
        conn.commit()
        log.info("Scored %d %s items", len(pending), item_type)
    return len(records)

def _window_grid(item_timestamps: list[datetime], window_hours: int) -> list[datetime]:
    if not item_timestamps:
        return []
    step = timedelta(hours=window_hours)
    first, last = item_timestamps[0], item_timestamps[-1]
    anchor = first.replace(minute=0, second=0, microsecond=0)
    grid = []
    end = anchor + step
    while end <= last + step:
        grid.append(end)
        end += step
    return grid

def compute_aggregates(conn: sqlite3.Connection, settings) -> int:
    items = []
    for row in conn.execute("""SELECT n.id item_id, nia.asset_id, n.published_at timestamp, s.positive_prob, s.negative_prob, 0 is_followed
FROM news_items n JOIN news_item_assets nia ON nia.news_item_id=n.id JOIN text_sentiment s ON s.item_type='news' AND s.item_id=n.id"""):
        items.append(dict(row))
    for row in conn.execute("""SELECT x.id item_id, sia.asset_id, x.created_at timestamp, s.positive_prob, s.negative_prob, x.is_followed_account is_followed
FROM social_items x JOIN social_item_assets sia ON sia.social_item_id=x.id JOIN text_sentiment s ON s.item_type='social' AND s.item_id=x.id"""):
        items.append(dict(row))
        
    for item in items:
        item["timestamp"] = _timestamp(item["timestamp"])
        
    total = 0
    assets = conn.execute("SELECT id,symbol FROM assets WHERE is_active=1").fetchall()
    for asset in assets:
        asset_items = [x for x in items if x["asset_id"] == asset["id"]]
        if not asset_items:
            continue
        asset_items.sort(key=lambda x: x["timestamp"])
        timestamps = [x["timestamp"] for x in asset_items]
        for hours in settings.sentiment_windows_hours:
            grid = _window_grid(timestamps, hours)
            start_index = 0
            computed = 0
            for window_end in grid:
                window_start = window_end - timedelta(hours=hours)
                while start_index < len(asset_items) and asset_items[start_index]["timestamp"] < window_start:
                    start_index += 1
                end_index = start_index
                while end_index < len(asset_items) and asset_items[end_index]["timestamp"] <= window_end:
                    end_index += 1
                upsert_aggregate(conn, aggregate_items(asset_items[start_index:end_index], asset["id"], window_end, hours, sentiment_half_life_hours=settings.sentiment_half_life_hours))
                computed += 1
            if grid:
                _state_mark(conn, "aggregate", state_key := f"{asset['id']}:{hours}", grid[-1].isoformat())
            total += computed
    conn.commit()
    log.info("Computed %d sentiment aggregate rows", total)
    return total

def run(config_path: str = "config/features.yaml", force_technical: bool = False) -> dict[str, int]:
    settings = load_config(config_path)
    conn = connect(settings.db_path)
    initialize(conn)
    
    if force_technical:
        conn.execute("DELETE FROM feature_state WHERE feature_name='technical'")
        conn.execute("DELETE FROM technical_features")
        conn.commit()
        log.info("--force-technical: cleared technical_features and its watermark for full recompute")
    
    totals = {"technical": 0, "sentiment": 0, "aggregates": 0}
    
    # FIX: Separate steps with try/except so one failure doesn't block the others
    try:
        totals["technical"] = compute_technical(conn, settings)
    except Exception as exc:
        log.error("Technical feature computation step failed: %s", exc, exc_info=True)
        
    try:
        totals["sentiment"] = compute_sentiment(conn, settings)
    except Exception as exc:
        log.error("Sentiment feature computation step failed: %s", exc, exc_info=True)
        
    try:
        totals["aggregates"] = compute_aggregates(conn, settings)
    except Exception as exc:
        log.error("Aggregate feature computation step failed: %s", exc, exc_info=True)
        
    conn.close()
    return totals

def main() -> None:
    parser = argparse.ArgumentParser(description="Compute technical and sentiment features from the data-layer SQLite database")
    parser.add_argument("--config", default="config/features.yaml")
    parser.add_argument("--log-level", default="INFO")
    parser.add_argument("--force-technical", action="store_true", help="Recompute all technical features from scratch, ignoring the incremental watermark")
    args = parser.parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level.upper(), logging.INFO), format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    run(args.config, force_technical=args.force_technical)

if __name__ == "__main__":
    main()
