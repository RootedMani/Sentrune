import numpy as np
import pandas as pd
import pytest

from trading_assistant.modeling.validation.importance import (
    mean_pairwise_rank_correlation,
    permutation_importance,
    stability_report,
)


class _StubModel:
    """Predicts almost entirely from `informative`; `noise` should score near zero."""

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        score = X["informative"].to_numpy()
        up = 1.0 / (1.0 + np.exp(-score))
        down = 1.0 - up
        flat = np.zeros_like(up)
        return np.column_stack([down, flat, up])


def test_permutation_importance_ranks_informative_feature_above_noise():
    rng = np.random.default_rng(0)
    n = 200
    informative = rng.normal(size=n)
    noise = rng.normal(size=n)
    X = pd.DataFrame({"informative": informative, "noise": noise})
    y = (informative > 0).astype(int) * 2  # 0 or 2, matching down/up classes
    result = permutation_importance(_StubModel(), X, y, n_repeats=5, random_state=1, labels=[0, 1, 2])
    assert result["informative"] > result["noise"]


def test_stability_report_flags_a_consistently_important_feature():
    per_fold = [
        {"a": 0.5, "b": 0.01},
        {"a": 0.48, "b": 0.02},
        {"a": 0.52, "b": -0.01},
    ]
    report = stability_report(per_fold)
    assert report["a"]["mean_rank"] < report["b"]["mean_rank"]
    assert report["a"]["coefficient_of_variation"] < 1.0


def test_stability_report_empty_input_returns_empty_dict():
    assert stability_report([]) == {}


def test_mean_pairwise_rank_correlation_is_high_for_consistent_folds():
    per_fold = [{"a": 0.9, "b": 0.1, "c": 0.05}, {"a": 0.8, "b": 0.2, "c": 0.03}]
    correlation = mean_pairwise_rank_correlation(per_fold)
    assert correlation is not None
    assert correlation > 0.9


def test_mean_pairwise_rank_correlation_needs_at_least_two_folds():
    assert mean_pairwise_rank_correlation([{"a": 0.5}]) is None
