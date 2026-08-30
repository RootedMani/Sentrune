from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from trading_assistant.features.sentiment.aggregation import aggregate_items

WINDOW_END = datetime(2026, 1, 2, 0, 0, 0)


def _item(score: float, age_hours: float, followed: bool = False, asset_id: int = 1) -> dict:
    # score is the positive_prob - negative_prob delta the aggregator uses.
    return {
        "asset_id": asset_id,
        "timestamp": WINDOW_END - timedelta(hours=age_hours),
        "positive_prob": score if score >= 0 else 0.0,
        "negative_prob": -score if score < 0 else 0.0,
        "is_followed": followed,
    }


def test_decayed_mean_weights_recent_items_more():
    items = [_item(1.0, 0.0), _item(-1.0, 18.0)]
    result = aggregate_items(items, 1, WINDOW_END, 24, sentiment_half_life_hours=6.0)
    # Weight at age 0 is 1.0; at 18h (three half-lives) it is 0.125.
    expected = (1.0 * 1.0 + (-1.0) * 0.125) / 1.125
    assert result["avg_sentiment_decayed"] == pytest.approx(expected)
    # Unweighted mean is untouched by the new feature.
    assert result["avg_sentiment"] == pytest.approx(0.0)


def test_decayed_mean_none_when_window_empty():
    result = aggregate_items([], 1, WINDOW_END, 24)
    assert result["avg_sentiment"] is None
    assert result["avg_sentiment_decayed"] is None
    assert result["mention_volume"] == 0


def test_zero_half_life_falls_back_to_unweighted_mean():
    items = [_item(1.0, 0.0), _item(-1.0, 18.0)]
    result = aggregate_items(items, 1, WINDOW_END, 24, sentiment_half_life_hours=0.0)
    assert result["avg_sentiment_decayed"] == pytest.approx(0.0)


def test_unweighted_mean_unchanged_by_decay_feature():
    items = [_item(0.8, 1.0), _item(-0.4, 2.0), _item(0.2, 3.0)]
    result = aggregate_items(items, 1, WINDOW_END, 24)
    assert result["avg_sentiment"] == pytest.approx((0.8 - 0.4 + 0.2) / 3)
    assert result["mention_volume"] == 3


def test_ignores_items_outside_window_or_asset():
    # item1 is 25h old in a 24h window (outside); item2 is in-window but the
    # wrong asset. Both should be excluded, leaving an empty aggregate.
    items = [_item(1.0, 25.0), _item(-1.0, 1.0, asset_id=2)]
    result = aggregate_items(items, 1, WINDOW_END, 24)
    assert result["avg_sentiment_decayed"] is None
    assert result["avg_sentiment"] is None
    assert result["mention_volume"] == 0
