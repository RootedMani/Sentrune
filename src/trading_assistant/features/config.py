from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass
class FeatureSettings:
    db_path: str
    intervals: list[str]
    assets: list[str]
    indicators: list[str]
    sentiment_windows_hours: list[int]
    finbert_model: str
    sentiment_batch_size: int


def load_config(path: str = "config/features.yaml") -> FeatureSettings:
    with open(path, "r", encoding="utf-8") as handle:
        raw: dict[str, Any] = yaml.safe_load(handle) or {}
    return FeatureSettings(
        # DB_PATH (used by run_pipeline.py) wins over the YAML so the three
        # layers always converge on one database regardless of CWD.
        db_path=os.getenv("DB_PATH") or raw.get("db_path", "data/trading_assistant.sqlite3"),
        intervals=[value.strip() for value in os.getenv("PRICE_INTERVALS", ",".join(raw.get("intervals", ["1d"]))).split(",") if value.strip()],
        assets=raw.get("assets", []),
        indicators=raw.get("indicators", ["sma", "ema", "macd", "rsi", "stoch", "bollinger", "atr", "obv", "volume_sma"]),
        sentiment_windows_hours=raw.get("sentiment_windows_hours", [24]),
        finbert_model=raw.get("finbert_model", "ProsusAI/finbert"),
        sentiment_batch_size=int(raw.get("sentiment_batch_size", 16)),
    )
