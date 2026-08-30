from datetime import datetime, timedelta, timezone

import pandas as pd
import pytest

from trading_assistant.modeling.features import assemble_features, make_labels, select_feature_columns
from trading_assistant.modeling.models.classifiers import BuyAndHoldBaseline, MovingAverageCrossoverBaseline
from trading_assistant.modeling.validation.walk_forward import splits


def test_forward_return_labels_use_configured_dead_zone():
    prices = pd.DataFrame({"asset_id": [1] * 4, "interval": ["1d"] * 4, "timestamp": pd.date_range("2024-01-01", periods=4), "close": [100.0, 101.0, 99.0, 100.4]})
    labels = make_labels(prices, horizon_bars=1, dead_zone=0.005)
    assert labels["label"].tolist() == [2, 0, 2]


def test_asof_join_never_uses_future_sentiment_window():
    base = pd.DataFrame({"asset_id": [1, 1], "interval": ["1d", "1d"], "timestamp": ["2024-01-02T00:00:00+00:00", "2024-01-03T00:00:00+00:00"], "sma_20": [1.0, 2.0]})
    labels = pd.DataFrame({"asset_id": [1, 1], "interval": ["1d", "1d"], "timestamp": base["timestamp"], "label": [0, 2], "forward_return": [-.01, .01]})
    sentiment = pd.DataFrame({"asset_id": [1, 1], "window_end": ["2024-01-01T00:00:00+00:00", "2024-01-04T00:00:00+00:00"], "window_hours": [24, 24], "avg_sentiment": [-.5, .9], "avg_sentiment_decayed": [-.5, .9], "mention_volume": [1, 1], "sentiment_volatility": [0.0, 0.0], "followed_avg_sentiment": [0.0, 0.0], "followed_mention_volume": [0, 0], "followed_sentiment_volatility": [0.0, 0.0], "unattributed_avg_sentiment": [-.5, .9], "unattributed_mention_volume": [1, 1], "unattributed_sentiment_volatility": [0.0, 0.0]})
    result = assemble_features(base, sentiment, labels, ["sma_20", "avg_sentiment_24h"])
    assert result.loc[result.timestamp == pd.Timestamp("2024-01-02", tz="UTC"), "avg_sentiment_24h"].iloc[0] == -.5
    assert result.loc[result.timestamp == pd.Timestamp("2024-01-03", tz="UTC"), "avg_sentiment_24h"].iloc[0] == -.5


def test_two_windows_never_get_mixed_together():
    # Regression: a single merge_asof across both a 24h and a 168h aggregate
    # row (sharing the same window_end) used to pick whichever was nearest,
    # silently blending short- and long-window values row to row.
    base = pd.DataFrame({"asset_id": [1], "interval": ["1d"], "timestamp": ["2024-01-02T00:00:00+00:00"], "sma_20": [1.0]})
    labels = pd.DataFrame({"asset_id": [1], "interval": ["1d"], "timestamp": base["timestamp"], "label": [1], "forward_return": [0.0]})
    common = {"avg_sentiment_decayed": None, "sentiment_volatility": 0.0, "followed_avg_sentiment": 0.0, "followed_mention_volume": 0, "followed_sentiment_volatility": 0.0, "unattributed_avg_sentiment": 0.0, "unattributed_mention_volume": 0, "unattributed_sentiment_volatility": 0.0}
    sentiment = pd.DataFrame([
        {"asset_id": 1, "window_end": "2024-01-01T00:00:00+00:00", "window_hours": 24, "avg_sentiment": -0.5, "mention_volume": 1, **common},
        {"asset_id": 1, "window_end": "2024-01-01T00:00:00+00:00", "window_hours": 168, "avg_sentiment": 0.9, "mention_volume": 20, **common},
    ])
    result = assemble_features(base, sentiment, labels, ["sma_20", "avg_sentiment_24h", "avg_sentiment_168h"])
    row = result.iloc[0]
    assert row["avg_sentiment_24h"] == -0.5
    assert row["avg_sentiment_168h"] == 0.9


def test_baselines_return_three_class_probabilities():
    X = pd.DataFrame({"sma_20": [2.0, 1.0, 1.0], "sma_50": [1.0, 2.0, 1.0]})
    buy_hold = BuyAndHoldBaseline().fit(X, [0, 1, 2])
    assert buy_hold.predict_proba(X).tolist() == [[0.0, 0.0, 1.0]] * 3
    crossover = MovingAverageCrossoverBaseline().fit(X)
    assert crossover.predict_proba(X).argmax(axis=1).tolist() == [2, 0, 1]


def test_empty_sentiment_falls_back_to_technical_only_features():
    # Regression: a fresh install without news/social API keys has an empty
    # sentiment_aggregates table; keeping sentiment columns dropped every row
    # via dropna and made training impossible for every asset.
    empty = pd.DataFrame(columns=["asset_id", "window_end", "avg_sentiment", "mention_volume"])
    usable, dropped = select_feature_columns(empty, ["sma_20", "rsi_14", "avg_sentiment_24h", "mention_volume_24h"])
    assert usable == ["sma_20", "rsi_14"]
    assert dropped == ["avg_sentiment_24h", "mention_volume_24h"]
    # With sentiment data present nothing is dropped.
    populated = pd.DataFrame({"asset_id": [1], "window_end": ["2024-01-01T00:00:00+00:00"], "avg_sentiment": [0.1], "mention_volume": [3]})
    usable, dropped = select_feature_columns(populated, ["sma_20", "avg_sentiment_24h"])
    assert usable == ["sma_20", "avg_sentiment_24h"]
    assert dropped == []


def test_assemble_features_with_empty_sentiment_does_not_crash():
    # Regression: an empty sentiment table reads back from SQLite with object
    # dtypes, so merge_asof(by="asset_id") raised "incompatible merge keys"
    # and training failed for every asset on a fresh no-API-key install.
    technical = pd.DataFrame({"asset_id": [1, 1], "interval": ["1d", "1d"], "timestamp": ["2024-01-02T00:00:00+00:00", "2024-01-03T00:00:00+00:00"], "sma_20": [1.0, 2.0], "rsi_14": [55.0, 61.0]})
    labels = pd.DataFrame({"asset_id": [1, 1], "interval": ["1d", "1d"], "timestamp": technical["timestamp"], "label": [2, 0], "forward_return": [.01, -.01]})
    empty_object_dtype = pd.DataFrame({"asset_id": pd.Series([], dtype=object), "window_end": pd.Series([], dtype=object), "avg_sentiment": pd.Series([], dtype=object)})
    result = assemble_features(technical, empty_object_dtype, labels, ["sma_20", "rsi_14"])
    assert len(result) == 2
    assert result["label"].tolist() == [2, 0]


def test_walk_forward_training_indices_are_earlier_than_test_indices():
    previous_test_end = 0
    for _, train, test in splits(100, 20, 10, 5):
        assert train[-1] < test[0]
        assert train[0] == 0
        assert test[0] >= previous_test_end
        previous_test_end = test[-1] + 1


def test_walk_forward_purge_removes_label_leakage_window():
    # Regression: labels are forward returns over horizon bars, so the last
    # `purge` training rows previously had labels computed from prices inside
    # the test window. Purged training sets must end at least horizon rows
    # before the test window starts.
    horizon = 3
    for _, train, test in splits(100, 20, 10, 5, purge=horizon):
        assert len(train) > 0
        assert train[-1] <= test[0] - horizon


def test_walk_forward_without_purge_keeps_original_folds():
    folds = list(splits(100, 20, 10, 5))
    assert len(folds) == 5
    for _, train, test in folds:
        assert train[-1] < test[0]
