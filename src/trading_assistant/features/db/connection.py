from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA = Path(__file__).with_name("schema_additions.sql")

# Columns added after the initial technical_features table shipped. Kept as
# an explicit (name, sql_type) list so existing databases (created before
# these features existed) can be migrated in place with ALTER TABLE, rather
# than requiring a destructive re-create. CREATE TABLE IF NOT EXISTS in
# schema_additions.sql already covers fresh databases.
_TECHNICAL_FEATURE_MIGRATIONS: list[tuple[str, str]] = [
    ("adx_14", "REAL"), ("plus_di_14", "REAL"), ("minus_di_14", "REAL"),
    ("ichimoku_tenkan", "REAL"), ("ichimoku_kijun", "REAL"),
    ("ichimoku_senkou_a", "REAL"), ("ichimoku_senkou_b", "REAL"), ("ichimoku_chikou", "REAL"),
    ("volatility_20", "REAL"), ("return_autocorr_20", "REAL"), ("volume_price_divergence", "REAL"),
    ("candle_body_ratio", "REAL"), ("candle_doji", "INTEGER"), ("candle_hammer", "INTEGER"),
    ("candle_bullish_engulfing", "INTEGER"), ("candle_bearish_engulfing", "INTEGER"),
    ("return_1", "REAL"), ("return_3", "REAL"), ("return_5", "REAL"), ("return_10", "REAL"),
    ("zscore_20", "REAL"), ("volatility_regime", "INTEGER"), ("day_of_week", "INTEGER"),
    ("dist_from_high", "REAL"), ("dist_from_low", "REAL"),
]


def connect(path: str) -> sqlite3.Connection:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _migrate_technical_features(conn: sqlite3.Connection) -> None:
    existing = {row[1] for row in conn.execute("PRAGMA table_info(technical_features)")}
    if not existing:
        return  # table doesn't exist yet; CREATE TABLE above already has every column
    for name, sql_type in _TECHNICAL_FEATURE_MIGRATIONS:
        if name not in existing:
            conn.execute(f"ALTER TABLE technical_features ADD COLUMN {name} {sql_type}")


def initialize(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA.read_text(encoding="utf-8"))
    _migrate_technical_features(conn)
    conn.commit()


def upsert_technical(conn: sqlite3.Connection, row: dict) -> None:
    cols = [
        "asset_id", "interval", "timestamp", "sma_20", "sma_50", "sma_200", "ema_12", "ema_26",
        "macd", "macd_signal", "macd_histogram", "rsi_14", "stoch_k", "stoch_d", "bb_lower",
        "bb_middle", "bb_upper", "atr_14", "obv", "volume_sma_20",
        "adx_14", "plus_di_14", "minus_di_14",
        "ichimoku_tenkan", "ichimoku_kijun", "ichimoku_senkou_a", "ichimoku_senkou_b", "ichimoku_chikou",
        "volatility_20", "return_autocorr_20", "volume_price_divergence",
        "candle_body_ratio", "candle_doji", "candle_hammer", "candle_bullish_engulfing", "candle_bearish_engulfing",
        "return_1", "return_3", "return_5", "return_10", "zscore_20",
        "volatility_regime", "day_of_week", "dist_from_high", "dist_from_low",
    ]
    conn.execute(f"INSERT INTO technical_features({','.join(cols)}) VALUES({','.join(':'+c for c in cols)}) ON CONFLICT(asset_id,interval,timestamp) DO UPDATE SET " + ','.join(f"{c}=excluded.{c}" for c in cols[3:]), {c: row.get(c) for c in cols})


def upsert_sentiment(conn: sqlite3.Connection, row: dict) -> None:
    conn.execute("""INSERT INTO text_sentiment(item_type,item_id,positive_prob,negative_prob,neutral_prob,label,computed_at)
        VALUES(:item_type,:item_id,:positive_prob,:negative_prob,:neutral_prob,:label,:computed_at)
        ON CONFLICT(item_type,item_id) DO UPDATE SET positive_prob=excluded.positive_prob,negative_prob=excluded.negative_prob,neutral_prob=excluded.neutral_prob,label=excluded.label,computed_at=excluded.computed_at""", row)


def upsert_aggregate(conn: sqlite3.Connection, row: dict) -> None:
    cols = list(row)
    conn.execute(f"INSERT INTO sentiment_aggregates({','.join(cols)}) VALUES({','.join(':'+c for c in cols)}) ON CONFLICT(asset_id,window_end,window_hours) DO UPDATE SET " + ','.join(f"{c}=excluded.{c}" for c in cols if c not in {"asset_id", "window_end", "window_hours"}), row)
