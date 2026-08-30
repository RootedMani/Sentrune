from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA = Path(__file__).with_name("schema_additions.sql")


def connect(path: str) -> sqlite3.Connection:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def ensure_columns(conn: sqlite3.Connection, table: str, columns: dict[str, str]) -> None:
    """Add any of `columns` (name -> SQL type) missing from `table`, skipping
    ones that already exist. CREATE TABLE IF NOT EXISTS in schema_additions.sql
    only helps a brand-new database; an existing table (the shipped demo DB,
    or any already-deployed database) needs new columns added explicitly, and
    a bare ALTER TABLE ADD COLUMN crashes on every run after the first one
    that actually adds it - which is exactly what happened with
    avg_sentiment_decayed. Always add a new column to an existing table
    through this function, never a raw ALTER TABLE in the .sql file.
    """
    existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
    for name, sql_type in columns.items():
        if name not in existing:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}")


def initialize(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA.read_text(encoding="utf-8"))
    ensure_columns(conn, "sentiment_aggregates", {"avg_sentiment_decayed": "REAL"})
    ensure_columns(conn, "technical_features", {
        "adx_14": "REAL", "plus_di_14": "REAL", "minus_di_14": "REAL",
        "ichimoku_tenkan": "REAL", "ichimoku_kijun": "REAL", "ichimoku_senkou_a": "REAL",
        "ichimoku_senkou_b": "REAL", "ichimoku_chikou": "REAL",
        "volatility_20": "REAL", "return_autocorr_20": "REAL", "volume_price_divergence": "REAL",
        "candle_body_ratio": "REAL", "candle_doji": "REAL", "candle_hammer": "REAL",
        "candle_bullish_engulfing": "REAL", "candle_bearish_engulfing": "REAL",
        "return_1": "REAL", "return_3": "REAL", "return_5": "REAL", "return_10": "REAL", "zscore_20": "REAL",
        "volatility_regime": "INTEGER", "day_of_week": "INTEGER", "dist_from_high": "REAL", "dist_from_low": "REAL",
    })
    conn.commit()


def upsert_technical(conn: sqlite3.Connection, row: dict) -> None:
    # Column list comes from the row itself (as upsert_aggregate already
    # does), not a hardcoded list here - a hardcoded list silently drops any
    # indicator added later unless this function is remembered and edited
    # too, which is how return_1/zscore_20/regime/ichimoku/candle columns
    # ended up computed but never persisted.
    cols = list(row)
    conn.execute(f"INSERT INTO technical_features({','.join(cols)}) VALUES({','.join(':'+c for c in cols)}) ON CONFLICT(asset_id,interval,timestamp) DO UPDATE SET " + ','.join(f"{c}=excluded.{c}" for c in cols if c not in {"asset_id", "interval", "timestamp"}), row)


def upsert_sentiment(conn: sqlite3.Connection, row: dict) -> None:
    conn.execute("""INSERT INTO text_sentiment(item_type,item_id,positive_prob,negative_prob,neutral_prob,label,computed_at)
        VALUES(:item_type,:item_id,:positive_prob,:negative_prob,:neutral_prob,:label,:computed_at)
        ON CONFLICT(item_type,item_id) DO UPDATE SET positive_prob=excluded.positive_prob,negative_prob=excluded.negative_prob,neutral_prob=excluded.neutral_prob,label=excluded.label,computed_at=excluded.computed_at""", row)


def upsert_aggregate(conn: sqlite3.Connection, row: dict) -> None:
    cols = list(row)
    conn.execute(f"INSERT INTO sentiment_aggregates({','.join(cols)}) VALUES({','.join(':'+c for c in cols)}) ON CONFLICT(asset_id,window_end,window_hours) DO UPDATE SET " + ','.join(f"{c}=excluded.{c}" for c in cols if c not in {"asset_id", "window_end", "window_hours"}), row)
