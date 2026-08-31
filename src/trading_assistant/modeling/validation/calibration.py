from __future__ import annotations

import numpy as np
import pandas as pd

from ..models.classifiers import LightGBMClassifier
from .walk_forward import splits

CLASS_NAMES = ["down", "flat", "up"]


def calibration_curve(
    X: pd.DataFrame,
    y: pd.Series,
    min_train_size: int,
    test_size: int,
    folds: int,
    purge: int,
    model_params: dict | None = None,
    n_bins: int = 5,
) -> pd.DataFrame:
    """Reliability curve for each class, pooled across all walk-forward test
    folds - never scored on training data, since a model can look perfectly
    calibrated in-sample while being badly overconfident out-of-sample.

    For each class, out-of-sample predicted probabilities are grouped into
    `n_bins` equal-width bins; within each bin this reports the mean
    predicted probability against the actual fraction of rows that were
    that class. A well-calibrated model has predicted ≈ actual in every
    bin (points near the diagonal). Systematic gaps mean the raw
    probabilities should not be read at face value - which matters directly
    here since modeling/strategy's ThresholdStrategy sizes and gates trades
    off exactly these probabilities.
    """
    model_params = model_params or {"n_estimators": 100, "random_state": 42}
    fold_indices = list(splits(len(X), min_train_size, test_size, folds, purge=purge))
    if not fold_indices:
        raise ValueError("no walk-forward folds available for calibration check - check dataset length")

    all_proba, all_true = [], []
    for _, train_idx, test_idx in fold_indices:
        model = LightGBMClassifier(**{k: v for k, v in model_params.items() if k != "random_state"}, random_state=model_params.get("random_state", 42))
        model.fit(X.iloc[train_idx], y.iloc[train_idx])
        all_proba.append(model.predict_proba(X.iloc[test_idx]))
        all_true.append(y.iloc[test_idx].to_numpy())
    proba = np.concatenate(all_proba, axis=0)
    true = np.concatenate(all_true, axis=0)

    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    rows = []
    for class_index, class_name in enumerate(CLASS_NAMES):
        class_proba = proba[:, class_index]
        is_class = (true == class_index).astype(float)
        bin_ids = np.digitize(class_proba, bin_edges[1:-1], right=True)
        for b in range(n_bins):
            mask = bin_ids == b
            if not mask.any():
                continue
            rows.append({
                "class": class_name,
                "bin_low": float(bin_edges[b]),
                "bin_high": float(bin_edges[b + 1]),
                "n": int(mask.sum()),
                "mean_predicted": float(class_proba[mask].mean()),
                "actual_frequency": float(is_class[mask].mean()),
            })
    result = pd.DataFrame(rows)
    if not result.empty:
        result["gap"] = result["mean_predicted"] - result["actual_frequency"]
    return result


def expected_calibration_error(curve: pd.DataFrame) -> dict[str, float]:
    """Per-class Expected Calibration Error: the n-weighted average absolute
    gap between predicted and actual frequency across bins. Lower is better;
    0 is perfect calibration, and there's no universal "good" threshold, but
    values noticeably above ~0.1 mean the raw probability should not be
    trusted as a real-world frequency without adjustment."""
    if curve.empty:
        return {name: float("nan") for name in CLASS_NAMES}
    out = {}
    for class_name, group in curve.groupby("class"):
        weights = group["n"] / group["n"].sum()
        out[class_name] = float((group["gap"].abs() * weights).sum())
    return out
