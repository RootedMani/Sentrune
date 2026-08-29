from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import pandas as pd


def iso_timestamp(value: Any) -> str:
    if isinstance(value, datetime):
        stamp = value
    else:
        stamp = pd.Timestamp(str(value)).to_pydatetime()
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=timezone.utc)
    return stamp.astimezone(timezone.utc).isoformat()


def normalize_bar(asset_id: int, interval: str, timestamp: Any, values: dict[str, Any], source: str) -> dict:
    return {
        "asset_id": asset_id, "interval": interval, "timestamp": iso_timestamp(timestamp),
        "open": float(values["open"]), "high": float(values["high"]), "low": float(values["low"]),
        "close": float(values["close"]), "volume": float(values["volume"]) if values.get("volume") is not None else None,
        "source": source,
    }


def normalize_yfinance_frame(asset_id: int, interval: str, frame: Any) -> list[dict]:
    # yfinance >= 0.2.x returns MultiIndex columns (Price, Ticker) even for a
    # single ticker and a tz-naive Date index; flatten and localize to UTC so
    # stock bars match the UTC convention used for Binance klines.
    if isinstance(frame.columns, pd.MultiIndex):
        frame = frame.copy()
        frame.columns = frame.columns.get_level_values(0)
    frame = frame.dropna(subset=["Open", "High", "Low", "Close"])
    rows = []
    for timestamp, row in frame.iterrows():
        values = {"open": row["Open"], "high": row["High"], "low": row["Low"], "close": row["Close"], "volume": row.get("Volume")}
        rows.append(normalize_bar(asset_id, interval, timestamp, values, "yfinance"))
    return rows


def normalize_binance_klines(asset_id: int, interval: str, klines: list[list]) -> list[dict]:
    """Binance open times are epoch milliseconds in UTC; store them as UTC, not local wall time."""
    return [normalize_bar(asset_id, interval, datetime.fromtimestamp(item[0] / 1000, tz=timezone.utc), {"open": item[1], "high": item[2], "low": item[3], "close": item[4], "volume": item[5]}, "binance") for item in klines]
