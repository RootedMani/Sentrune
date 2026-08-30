from __future__ import annotations

from typing import Sequence

import numpy as np
import pandas as pd
from sklearn.metrics import log_loss


def permutation_importance(
    model,
    X: pd.DataFrame,
    y: pd.Series,
    n_repeats: int = 5,
    random_state: int | None = None,
    labels: Sequence[int] = (0, 1, 2),
) -> dict[str, float]:
    """Column-permutation importance scored by log-loss degradation.

    For each feature, shuffle that column `n_repeats` times, re-score with
    the already-fitted model, and average how much worse (higher) log-loss
    gets versus the unpermuted baseline. A feature the model actually relies
    on will make predictions much worse once its values are scrambled; a
    feature it ignores won't move the score. This is model-agnostic (only
    needs `predict_proba`), unlike LightGBM's built-in gain importance,
    which can overweight high-cardinality features and says nothing about
    out-of-sample reliance.

    Deliberately hand-rolled rather than sklearn.inspection.permutation_importance,
    since that helper expects a full scikit-learn estimator (`.fit`/`.score`)
    and the project's model wrappers (LightGBMClassifier, the baselines) only
    implement `predict_proba`.
    """
    rng = np.random.default_rng(random_state)
    baseline_loss = log_loss(y, model.predict_proba(X), labels=list(labels))

    importances: dict[str, float] = {}
    for column in X.columns:
        degradations = []
        for _ in range(n_repeats):
            shuffled = X.copy()
            shuffled[column] = rng.permutation(shuffled[column].to_numpy())
            permuted_loss = log_loss(y, model.predict_proba(shuffled), labels=list(labels))
            degradations.append(permuted_loss - baseline_loss)
        importances[column] = float(np.mean(degradations))
    return importances


def stability_report(per_fold_importances: list[dict[str, float]]) -> dict[str, dict[str, float]]:
    """Summarize how consistent feature importance is across walk-forward folds.

    A single fold's importances can look convincing by chance on a small
    dataset; this checks whether the *same* features stay important across
    folds rather than the ranking reshuffling every time. For each feature:
    mean and std of its importance across folds, the coefficient of
    variation (std/|mean|, lower = more stable), and the mean rank it held
    across folds (1 = most important that fold).
    """
    if not per_fold_importances:
        return {}
    frame = pd.DataFrame(per_fold_importances)  # rows = folds, columns = features
    ranks = frame.rank(axis=1, ascending=False)  # rank 1 = most important within that fold

    summary: dict[str, dict[str, float]] = {}
    for column in frame.columns:
        values = frame[column]
        mean_importance = float(values.mean())
        std_importance = float(values.std(ddof=0))
        cv = float(std_importance / abs(mean_importance)) if mean_importance != 0 else float("nan")
        summary[column] = {
            "mean_importance": mean_importance,
            "std_importance": std_importance,
            "coefficient_of_variation": cv,
            "mean_rank": float(ranks[column].mean()),
        }
    return summary


def mean_pairwise_rank_correlation(per_fold_importances: list[dict[str, float]]) -> float | None:
    """Average Spearman rank correlation between every pair of folds' importance
    rankings — a single number for "how much does the important-feature set
    reshuffle fold to fold" (1.0 = identical ranking every fold, 0 = no
    relationship, negative = folds actively disagree)."""
    if len(per_fold_importances) < 2:
        return None
    frame = pd.DataFrame(per_fold_importances)
    correlations = frame.T.corr(method="spearman")
    n = len(correlations)
    off_diagonal = [
        correlations.iloc[i, j] for i in range(n) for j in range(n) if i < j
    ]
    off_diagonal = [value for value in off_diagonal if not np.isnan(value)]
    if not off_diagonal:
        return None
    return float(np.mean(off_diagonal))
