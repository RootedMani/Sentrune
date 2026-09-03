from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv


@dataclass
class Settings:
    assets: list[dict[str, Any]] = field(default_factory=list)
    subreddits: list[str] = field(default_factory=list)
    usernames: list[str] = field(default_factory=list)
    db_path: str = "data/trading_assistant.sqlite3"
    interval: str = "1d"
    intervals: list[str] = field(default_factory=lambda: ["1d"])
    finnhub_api_key: str | None = None
    alpha_vantage_api_key: str | None = None
    cryptopanic_api_key: str | None = None
    reddit_client_id: str | None = None
    reddit_client_secret: str | None = None
    reddit_user_agent: str = "sentrune-data-layer/0.1"
    reddit_delay_seconds: float = 1.0
    reddit_max_subreddits: int = 10
    reddit_max_usernames: int = 20


def _load_yaml(path: str | Path) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def load_settings(assets_path: str = "config/assets.yaml", sources_path: str = "config/sources.yaml", env_path: str | None = None) -> Settings:
    load_dotenv(env_path or ".env")
    assets_cfg = _load_yaml(assets_path) if Path(assets_path).exists() else {}
    sources_cfg = _load_yaml(sources_path) if Path(sources_path).exists() else {}
    return Settings(
        assets=assets_cfg.get("assets", []),
        subreddits=sources_cfg.get("reddit", {}).get("subreddits", []),
        usernames=sources_cfg.get("reddit", {}).get("usernames", []),
        db_path=os.getenv("DB_PATH", "data/trading_assistant.sqlite3"),
        interval=os.getenv("PRICE_INTERVAL", "1d"),
        intervals=[value.strip() for value in os.getenv("PRICE_INTERVALS", os.getenv("PRICE_INTERVAL", "1d")).split(",") if value.strip()],
        finnhub_api_key=os.getenv("FINNHUB_API_KEYS") or os.getenv("FINNHUB_API_KEY"),
        alpha_vantage_api_key=os.getenv("ALPHA_VANTAGE_API_KEYS") or os.getenv("ALPHA_VANTAGE_API_KEY"),
        cryptopanic_api_key=os.getenv("CRYPTOPANIC_API_KEYS") or os.getenv("CRYPTOPANIC_API_KEY"),
        reddit_client_id=os.getenv("REDDIT_CLIENT_ID"),
        reddit_client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
        reddit_user_agent=os.getenv("REDDIT_USER_AGENT", "sentrune-data-layer/0.1"),
        reddit_delay_seconds=float(os.getenv("REDDIT_DELAY_SECONDS", "1.0")),
        reddit_max_subreddits=int(os.getenv("REDDIT_MAX_SUBREDDITS", "10")),
        reddit_max_usernames=int(os.getenv("REDDIT_MAX_USERNAMES", "20")),
    )
