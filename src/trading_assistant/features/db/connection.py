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


def initialize(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA.read_text(encoding="utf-8"))
    conn.commit()


def upsert_technical(conn: sqlite3.Connection, row: dict) -> None:
    cols = ["asset_id", "interval", "timestamp", "sma_20", "sma_50", "sma_200", "ema_12", "ema_26", "macd", "macd_signal", "macd_histogram", "rsi_14", "stoch_k", "stoch_d", "bb_lower", "bb_middle", "bb_upper", "atr_14", "obv", "volume_sma_20"]
    conn.execute(f"INSERT INTO technical_features({','.join(cols)}) VALUES({','.join(':'+c for c in cols)}) ON CONFLICT(asset_id,interval,timestamp) DO UPDATE SET " + ','.join(f"{c}=excluded.{c}" for c in cols[3:]), {c: row.get(c) for c in cols})


def upsert_sentiment(conn: sqlite3.Connection, row: dict) -> None:
    conn.execute("""INSERT INTO text_sentiment(item_type,item_id,positive_prob,negative_prob,neutral_prob,label,computed_at)
        VALUES(:item_type,:item_id,:positive_prob,:negative_prob,:neutral_prob,:label,:computed_at)
        ON CONFLICT(item_type,item_id) DO UPDATE SET positive_prob=excluded.positive_prob,negative_prob=excluded.negative_prob,neutral_prob=excluded.neutral_prob,label=excluded.label,computed_at=excluded.computed_at""", row)


def upsert_aggregate(conn: sqlite3.Connection, row: dict) -> None:
    cols = list(row)
    conn.execute(f"INSERT INTO sentiment_aggregates({','.join(cols)}) VALUES({','.join(':'+c for c in cols)}) ON CONFLICT(asset_id,window_end,window_hours) DO UPDATE SET " + ','.join(f"{c}=excluded.{c}" for c in cols if c not in {"asset_id", "window_end", "window_hours"}), row)
