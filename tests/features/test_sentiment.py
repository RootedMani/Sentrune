import builtins
from datetime import datetime, timezone

import pytest

from trading_assistant.features.sentiment.aggregation import aggregate_items
from trading_assistant.features.sentiment.finbert_scorer import FinBERTScorer


def test_aggregation_average_volume_and_volatility():
    end = datetime(2024, 1, 2, tzinfo=timezone.utc)
    items = [
        {"asset_id": 1, "timestamp": end, "positive_prob": 0.8, "negative_prob": 0.1, "is_followed": 1},
        {"asset_id": 1, "timestamp": end, "positive_prob": 0.2, "negative_prob": 0.5, "is_followed": 0},
        {"asset_id": 1, "timestamp": end, "positive_prob": 0.6, "negative_prob": 0.2, "is_followed": 1},
    ]
    result = aggregate_items(items, 1, end, 24)
    assert result["mention_volume"] == 3
    assert result["avg_sentiment"] == pytest.approx((0.7 - 0.3 + 0.4) / 3)
    assert result["followed_mention_volume"] == 2
    assert result["unattributed_mention_volume"] == 1
    assert result["unattributed_sentiment_volatility"] == 0.0


def test_injected_factory_does_not_import_transformers(monkeypatch):
    def blocked_import(name, *args, **kwargs):
        if name == "transformers" or name.startswith("transformers."):
            raise ModuleNotFoundError("transformers intentionally blocked")
        return original_import(name, *args, **kwargs)

    original_import = builtins.__import__
    monkeypatch.setattr(builtins, "__import__", blocked_import)
    scorer = FinBERTScorer(pipeline_factory=lambda *args, **kwargs: lambda batch: [[{"label": "neutral", "score": 1.0}] for _ in batch])
    assert scorer.score(["no external import"])[0]["neutral"] == 1.0


def test_finbert_scorer_batches_and_keeps_three_probabilities():
    calls = []

    def fake_pipeline(*args, **kwargs):
        def classify(batch):
            calls.append(batch)
            return [[{"label": "positive", "score": 0.7}, {"label": "negative", "score": 0.2}, {"label": "neutral", "score": 0.1}] for _ in batch]
        return classify

    scorer = FinBERTScorer(batch_size=2, pipeline_factory=fake_pipeline)
    result = scorer.score(["a", "b", "c"])
    assert len(calls) == 2
    assert len(result) == 3
    assert result[0]["positive"] == 0.7
    assert result[0]["negative"] == 0.2
    assert result[0]["neutral"] == 0.1


def test_empty_followed_subgroup_is_neutral_not_null():
    # Regression: windows with zero followed mentions previously stored NULL,
    # which silently dropped most rows from model training. Zero coverage is a
    # fact (neutral scalar), not missing data.
    end = datetime(2024, 1, 2, tzinfo=timezone.utc)
    items = [{"asset_id": 1, "timestamp": end, "positive_prob": 0.8, "negative_prob": 0.2, "is_followed": 0}]
    result = aggregate_items(items, 1, end, 24)
    assert result["followed_mention_volume"] == 0
    assert result["followed_avg_sentiment"] == 0.0
    assert result["unattributed_avg_sentiment"] == pytest.approx(0.6)
    assert result["avg_sentiment"] == pytest.approx(0.6)
    empty = aggregate_items([], 1, end, 24)
    assert empty["avg_sentiment"] is None and empty["mention_volume"] == 0
