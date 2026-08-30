from __future__ import annotations

import pandas as pd

# Base aggregate columns produced by the feature-engineering layer, before the
# per-window suffix (see sentiment_feature_columns below). A fresh install
# without news/social API keys has an empty sentiment_aggregates table, and
# keeping these columns would make dropna discard every row.
SENTIMENT_BASE_COLUMNS = [
    "avg_sentiment",
    "avg_sentiment_decayed",
    "mention_volume",
    "sentiment_volatility",
    "followed_avg_sentiment",
    "followed_mention_volume",
    "followed_sentiment_volatility",
    "unattributed_avg_sentiment",
    "unattributed_mention_volume",
    "unattributed_sentiment_volatility",
]


def sentiment_feature_columns(window_hours_list: list[int]) -> list[str]:
    """Full list of sentiment-derived feature column names for a given set of
    configured aggregate windows (e.g. [24, 168] -> avg_sentiment_24h,
    avg_sentiment_168h, avg_sentiment_decayed_24h, ...)."""
    windows = sorted(set(window_hours_list))
    return [f"{base}_{hours}h" for hours in windows for base in SENTIMENT_BASE_COLUMNS]


def select_feature_columns(sentiment: pd.DataFrame, feature_columns: list[str]) -> tuple[list[str], list[str]]:
    """Return (usable, dropped) feature columns for training.

    Sentiment features require sentiment_aggregates rows; when none exist the
    honest fallback is technical-only training, and the dropped columns are
    reported so the caller can log them.
    """
    has_sentiment = sentiment is not None and len(sentiment) > 0
    is_sentiment_column = {c for c in feature_columns if c.endswith("h") and c.rsplit("_", 1)[0] in SENTIMENT_BASE_COLUMNS}
    usable: list[str] = []
    dropped: list[str] = []
    for column in feature_columns:
        if column in is_sentiment_column and not has_sentiment:
            dropped.append(column)
        else:
            usable.append(column)
    return usable, dropped


def make_labels(prices: pd.DataFrame, horizon_bars: int, dead_zone: float) -> pd.DataFrame:
    """Label each row by forward return: down if r < -dead_zone, flat if |r| <= dead_zone, else up."""
    result = prices.sort_values(["asset_id", "interval", "timestamp"]).copy()
    result["future_close"] = result.groupby(["asset_id", "interval"])["close"].shift(-horizon_bars)
    result["forward_return"] = result["future_close"] / result["close"] - 1.0
    result["label"] = result["forward_return"].map(lambda r: None if pd.isna(r) else (0 if r < -dead_zone else 1 if r <= dead_zone else 2))
    return result.dropna(subset=["label"]).drop(columns=["future_close"])


def assemble_features(technical: pd.DataFrame, sentiment: pd.DataFrame, labels: pd.DataFrame, feature_columns: list[str]) -> pd.DataFrame:
    """As-of join sentiment: only the latest aggregate with window_end <= feature timestamp is eligible.

    sentiment_aggregates holds one row per (asset, window_end, window_hours) -
    e.g. a 24h and a 168h row can share (or nearly share) the same window_end.
    Joining them all in one merge_asof would non-deterministically pick
    whichever window happened to have the latest window_end for that
    timestamp, silently mixing short- and long-window values row to row (this
    previously broke avg_sentiment/avg_sentiment_decayed the same way). Each
    configured window is pivoted into its own suffixed columns
    (avg_sentiment_24h, avg_sentiment_168h, ...) and joined separately so both
    are always present together, never blended.
    """
    base = technical.merge(labels[["asset_id", "interval", "timestamp", "label", "forward_return"]], on=["asset_id", "interval", "timestamp"], how="inner")
    base["timestamp"] = pd.to_datetime(base["timestamp"], utc=True)
    base = base.sort_values(["timestamp", "asset_id"])
    if sentiment is not None and not sentiment.empty and not base.empty:
        sentiment = sentiment.copy()
        sentiment["window_end"] = pd.to_datetime(sentiment["window_end"], utc=True)
        sentiment["asset_id"] = sentiment["asset_id"].astype("int64")
        for hours in sorted(sentiment["window_hours"].unique()):
            window_frame = sentiment[sentiment["window_hours"] == hours][["asset_id", "window_end"] + SENTIMENT_BASE_COLUMNS].copy()
            window_frame = window_frame.rename(columns={c: f"{c}_{int(hours)}h" for c in SENTIMENT_BASE_COLUMNS})
            # merge_asof requires the as-of key to be globally sorted; `by`
            # still restricts matches to the same asset.
            window_frame = window_frame.sort_values(["window_end", "asset_id"])
            base = pd.merge_asof(base, window_frame, left_on="timestamp", right_on="window_end", by="asset_id", direction="backward")
            base = base.drop(columns=["window_end"])
    missing = [c for c in feature_columns if c not in base.columns]
    if missing:
        raise ValueError(f"Configured feature columns missing from inputs: {missing}")
    base = base.dropna(subset=feature_columns + ["label"]).reset_index(drop=True)
    base["label"] = base["label"].astype(int)
    return base
