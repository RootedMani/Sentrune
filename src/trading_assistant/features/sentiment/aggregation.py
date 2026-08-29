from __future__ import annotations

from datetime import datetime, timedelta
import statistics
from typing import Iterable


def _stats(values: list[float]) -> tuple[float | None, int, float | None]:
    if not values:
        return None, 0, None
    return sum(values) / len(values), len(values), statistics.stdev(values) if len(values) > 1 else 0.0


def aggregate_items(items: Iterable[dict], asset_id: int, window_end: datetime, window_hours: int) -> dict:
    start = window_end - timedelta(hours=window_hours)
    selected = [item for item in items if start <= item["timestamp"] <= window_end and item.get("asset_id") == asset_id]
    all_values = [float(item["positive_prob"]) - float(item["negative_prob"]) for item in selected]
    followed = [v for v, item in zip(all_values, selected) if item.get("is_followed")]
    unattributed = [v for v, item in zip(all_values, selected) if not item.get("is_followed")]
    avg, volume, volatility = _stats(all_values)
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
    return {"asset_id": asset_id, "window_end": window_end.isoformat(), "window_hours": window_hours, "avg_sentiment": avg, "mention_volume": volume, "sentiment_volatility": volatility, "followed_avg_sentiment": favg, "followed_mention_volume": fvolume, "followed_sentiment_volatility": fvolatility, "unattributed_avg_sentiment": uavg, "unattributed_mention_volume": uvolume, "unattributed_sentiment_volatility": uvolatility}
