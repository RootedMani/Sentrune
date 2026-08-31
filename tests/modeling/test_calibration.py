import numpy as np
import pandas as pd
import pytest

pytest.importorskip("lightgbm")
from trading_assistant.modeling.validation.calibration import (
    CLASS_NAMES,
    calibration_curve,
    expected_calibration_error,
)


def _learnable_dataset(n=300, seed=0):
    rng = np.random.default_rng(seed)
    x0 = rng.normal(size=n)
    X = pd.DataFrame({"x0": x0, "x1": rng.normal(size=n), "noise": rng.normal(size=n)})
    y = pd.Series(np.where(x0 > 0.5, 2, np.where(x0 < -0.5, 0, 1)))
    return X, y


class TestCalibrationCurve:
    def test_returns_expected_columns(self):
        X, y = _learnable_dataset()
        curve = calibration_curve(X, y, min_train_size=150, test_size=30, folds=3, purge=1, n_bins=5)
        for col in ("class", "bin_low", "bin_high", "n", "mean_predicted", "actual_frequency", "gap"):
            assert col in curve.columns

    def test_only_known_class_names_appear(self):
        X, y = _learnable_dataset()
        curve = calibration_curve(X, y, min_train_size=150, test_size=30, folds=3, purge=1, n_bins=5)
        assert set(curve["class"].unique()) <= set(CLASS_NAMES)

    def test_bin_counts_sum_to_total_test_rows_per_class_prediction(self):
        # Every out-of-sample row contributes exactly one (predicted
        # probability, actual outcome) pair per class - so summed across all
        # bins for one class, n should equal the total number of test rows
        # pooled across folds (not per-class row counts, since every row has
        # a probability for every class).
        X, y = _learnable_dataset()
        folds, test_size = 3, 30
        curve = calibration_curve(X, y, min_train_size=150, test_size=test_size, folds=folds, purge=1, n_bins=5)
        total_test_rows = folds * test_size
        for class_name in CLASS_NAMES:
            assert curve[curve["class"] == class_name]["n"].sum() == total_test_rows

    def test_raises_when_no_folds_fit(self):
        X, y = _learnable_dataset(n=20)
        with pytest.raises(ValueError):
            calibration_curve(X, y, min_train_size=50, test_size=20, folds=3, purge=1)

    def test_gap_equals_predicted_minus_actual(self):
        X, y = _learnable_dataset()
        curve = calibration_curve(X, y, min_train_size=150, test_size=30, folds=3, purge=1, n_bins=5)
        pd.testing.assert_series_equal(
            curve["gap"], curve["mean_predicted"] - curve["actual_frequency"], check_names=False,
        )


class TestExpectedCalibrationError:
    def test_perfect_calibration_gives_zero_error(self):
        curve = pd.DataFrame({
            "class": ["up", "up"], "n": [50, 50],
            "mean_predicted": [0.2, 0.8], "actual_frequency": [0.2, 0.8],
            "gap": [0.0, 0.0],
        })
        result = expected_calibration_error(curve)
        assert result["up"] == pytest.approx(0.0)

    def test_weights_larger_bins_more(self):
        # A big miscalibrated bin should dominate the error over a tiny
        # well-calibrated one - this is what "n-weighted" means and is the
        # reason a naive unweighted mean-of-gaps would be misleading with
        # very uneven bin sizes (as seen on the real, thin dataset).
        curve = pd.DataFrame({
            "class": ["up", "up"], "n": [90, 10],
            "mean_predicted": [0.9, 0.5], "actual_frequency": [0.5, 0.5],
            "gap": [0.4, 0.0],
        })
        result = expected_calibration_error(curve)
        assert result["up"] == pytest.approx(0.4 * 0.9)

    def test_empty_curve_returns_nan_for_every_class(self):
        result = expected_calibration_error(pd.DataFrame())
        assert set(result.keys()) == set(CLASS_NAMES)
        assert all(np.isnan(v) for v in result.values())
