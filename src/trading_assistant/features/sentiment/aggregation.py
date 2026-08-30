from __future__ import annotations

from datetime import datetime, timedelta
import statistics
from typing import Iterable


def _stats(values: list[float]) -> tuple[float | None, int, float | None]:
    if not values:
        return None, 0, None
    return sum(values) / len(values), len(values), statistics.stdev(values) if len(values) > 1 else 0.0


def _decay_weighted_mean(values: list[float], ages_hours: list[float], half_life_hours: float) -> float | None:
    """Recency-weighted mean: each item's weight halves every half_life_hours of age.

    With a 6h half-life a 30-minute-old headline weighs ~0.94 while a
    23-hour-old one weighs ~0.07. Falls back to the unweighted mean when
    half_life_hours is not positive so a bad config value degrades instead
    of dividing by zero.
    """
    if not values:
        return None
    if half_life_hours <= 0:
        return sum(values) / len(values)
    weighted_sum = 0.0
    total_weight = 0.0
    for value, age in zip(values, ages_hours):
        weight = 0.5 ** (age / half_life_hours)
        weighted_sum += weight * value
        total_weight += weight
    return weighted_sum / total_weight


def aggregate_items(
    items: Iterable[dict],
    asset_id: int,
    window_end: datetime,
    window_hours: int,
    sentiment_half_life_hours: float = 6.0,
) -> dict:
    start = window_end - timedelta(hours=window_hours)
    selected = [item for item in items if start <= item["timestamp"] <= window_end and item.get("asset_id") == asset_id]
    all_values = [float(item["positive_prob"]) - float(item["negative_prob"]) for item in selected]
    # Age is measured against window_end — the as-of time downstream joins
    # use — not wall-clock now, so aggregates stay reproducible when recomputed.
    ages_hours = [(window_end - item["timestamp"]).total_seconds() / 3600.0 for item in selected]
    followed = [v for v, item in zip(all_values, selected) if item.get("is_followed")]
    unattributed = [v for v, item in zip(all_values, selected) if not item.get("is_followed")]
    avg, volume, volatility = _stats(all_values)
    decayed_avg = _decay_weighted_mean(all_values, ages_hours, sentiment_half_life_hours)
    favg, fvolume, fvolatility = _stats(followed)
    uavg, uvolume, uvolatility = _stats(unattributed)
    # A subgroup with zero mentions is a zero-count fact, not missing data:
    # report a neutral scalar so downstream consumers can distinguish "no
    # followed source posted" from "row not covered". Only a fully empty
    # window keeps NULL avg_sentiment, which honestly marks no coverage.
    if fvolume == 0:
        favg, fvolatility = 0.0, 0.0
    if uvolume == 0:
        uavg, uvolatility = 0.0, 0.0
    return {"asset_id": asset_id, "window_end": window_end.isoformat(), "window_hours": window_hours, "avg_sentiment": avg, "avg_sentiment_decayed": decayed_avg, "mention_volume": volume, "sentiment_volatility": volatility, "followed_avg_sentiment": favg, "followed_mention_volume": fvolume, "followed_sentiment_volatility": fvolatility, "unattributed_avg_sentiment": uavg, "unattributed_mention_volume": uvolume, "unattributed_sentiment_volatility": uvolatility}
