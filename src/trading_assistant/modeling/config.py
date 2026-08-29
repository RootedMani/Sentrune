from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any
import yaml

@dataclass
class Settings:
    db_path: str = "data/trading_assistant.sqlite3"
    model_dir: str = "models"
    interval: str = "1d"
    assets: list[str] | None = None
    horizon_bars: int = 5
    dead_zone: float = 0.005
    folds: int = 3
    min_train_size: int = 50
    test_size: int = 20
    feature_columns: list[str] | None = None


def load_config(path: str = "config/modeling.yaml") -> Settings:
    with open(path, encoding="utf-8") as f:
        data: dict[str, Any] = yaml.safe_load(f) or {}
    # DB_PATH (used by run_pipeline.py) wins over the YAML so the three layers
    # always converge on one database regardless of CWD.
    data["db_path"] = os.getenv("DB_PATH") or data.get("db_path", "data/trading_assistant.sqlite3")
    return Settings(**data)
