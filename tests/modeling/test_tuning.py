import numpy as np
import pandas as pd
import pytest

pytest.importorskip("lightgbm")
from trading_assistant.modeling.tuning.search import DEFAULT_GRID, TuningResult, search_hyperparameters


def _learnable_dataset(n=200, seed=0):
    rng = np.random.default_rng(seed)
    x0 = rng.normal(size=n)
    X = pd.DataFrame({
        "x0": x0,
        "x1": rng.normal(size=n),
        "noise": rng.normal(size=n),
    })
    y = pd.Series(np.where(x0 > 0.5, 2, np.where(x0 < -0.5, 0, 1)))
    return X, y


class TestSearchHyperparameters:
    def test_returns_tuning_result_with_expected_shape(self):
        X, y = _learnable_dataset()
        result = search_hyperparameters(X, y, min_train_size=80, test_size=20, folds=3, purge=1, max_candidates=5)
        assert isinstance(result, TuningResult)
        assert result.candidates_evaluated == 6  # 5 sampled + 1 default
        assert isinstance(result.best_params, dict)
        assert result.best_mean_log_loss <= result.default_mean_log_loss + 1e-9  # best is min by definition

    def test_never_evaluates_more_than_available_folds_allow(self):
        # Too little data for the requested folds should raise a clear error
        # rather than silently evaluating on zero folds.
        X, y = _learnable_dataset(n=20)
        with pytest.raises(ValueError):
            search_hyperparameters(X, y, min_train_size=50, test_size=20, folds=3, purge=1)

    def test_custom_grid_is_respected(self):
        X, y = _learnable_dataset()
        tiny_grid = {"n_estimators": [10], "max_depth": [3]}
        result = search_hyperparameters(X, y, min_train_size=80, test_size=20, folds=2, purge=1, grid=tiny_grid, max_candidates=10)
        # Only one combination exists in this grid, so at most 1 sampled
        # candidate plus the always-included default.
        assert result.candidates_evaluated <= 2
        for candidate in result.all_candidates:
            if candidate.params.get("n_estimators") == 10:
                assert candidate.params.get("max_depth") == 3

    def test_default_grid_has_no_empty_option_lists(self):
        # A grid entry with an empty list would make the whole cartesian
        # product empty and silently produce zero candidates.
        for key, options in DEFAULT_GRID.items():
            assert len(options) > 0, f"{key} has no options"

    def test_improved_over_default_flag_matches_comparison(self):
        X, y = _learnable_dataset()
        result = search_hyperparameters(X, y, min_train_size=80, test_size=20, folds=3, purge=1, max_candidates=5)
        assert result.improved_over_default == (result.best_mean_log_loss < result.default_mean_log_loss)

    def test_reproducible_with_same_random_state(self):
        X, y = _learnable_dataset()
        result_a = search_hyperparameters(X, y, min_train_size=80, test_size=20, folds=3, purge=1, max_candidates=5, random_state=7)
        result_b = search_hyperparameters(X, y, min_train_size=80, test_size=20, folds=3, purge=1, max_candidates=5, random_state=7)
        assert result_a.best_params == result_b.best_params
