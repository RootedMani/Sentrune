from __future__ import annotations

import pandas as pd

# Aggregate columns produced by the feature-engineering layer. A fresh install
# without news/social API keys has an empty sentiment_aggregates table, and
# keeping these columns would make dropna discard every row.
SENTIMENT_FEATURES = {
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
}


def select_feature_columns(sentiment: pd.DataFrame, feature_columns: list[str]) -> tuple[list[str], list[str]]:
    """Return (usable, dropped) feature columns for training.

    Sentiment features require sentiment_aggregates rows; when none exist the
    honest fallback is technical-only training, and the dropped columns are
    reported so the caller can log them.
    """
    has_sentiment = sentiment is not None and len(sentiment) > 0
    usable: list[str] = []
    dropped: list[str] = []
    for column in feature_columns:
        if column in SENTIMENT_FEATURES and not has_sentiment:
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
    """As-of join sentiment: only the latest aggregate with window_end <= feature timestamp is eligible."""
    base = technical.merge(labels[["asset_id", "interval", "timestamp", "label", "forward_return"]], on=["asset_id", "interval", "timestamp"], how="inner")
    base["timestamp"] = pd.to_datetime(base["timestamp"], utc=True)
    base = base.sort_values(["timestamp", "asset_id"])
    # An empty sentiment table reads back with object dtypes, which would make
    # merge_asof raise on the int64 asset_id key; skip the join instead. The
    # caller prunes sentiment feature columns in that case.
    if sentiment is not None and not sentiment.empty and not base.empty:
        sentiment = sentiment.copy()
        sentiment["window_end"] = pd.to_datetime(sentiment["window_end"], utc=True)
        sentiment["asset_id"] = sentiment["asset_id"].astype("int64")
        # merge_asof requires the as-of key to be globally sorted; `by` still
        # restricts matches to the same asset.
        sentiment = sentiment.sort_values(["window_end", "asset_id"])
        base = pd.merge_asof(base, sentiment, left_on="timestamp", right_on="window_end", by="asset_id", direction="backward", suffixes=("", "_sentiment"))
    missing = [c for c in feature_columns if c not in base.columns]
    if missing:
        raise ValueError(f"Configured feature columns missing from inputs: {missing}")
    base = base.dropna(subset=feature_columns + ["label"]).reset_index(drop=True)
    base["label"] = base["label"].astype(int)
    return base
