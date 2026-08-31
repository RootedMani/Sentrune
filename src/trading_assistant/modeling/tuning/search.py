from __future__ import annotations

import itertools
import logging
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from ..models.classifiers import LightGBMClassifier
from ..validation.walk_forward import metrics, splits

log = logging.getLogger(__name__)

# A deliberately modest grid, not an exhaustive one. With ~300-800 rows per
# asset (see compute.py's logged row counts) and only 3-5 walk-forward
# folds, a wide/exhaustive search would mostly be fitting noise in the
# validation score itself - more candidates does not mean a more reliable
# pick when each candidate is only evaluated on a handful of folds. This
# grid varies the three knobs most likely to matter at this data size:
# how many trees, how deep each tree can grow, and how strongly small/noisy
# splits are penalized (regularization matters more than usual here because
# the model can otherwise memorize a few hundred rows easily).
DEFAULT_GRID: dict[str, list] = {
    "n_estimators": [50, 100, 200],
    "max_depth": [3, 5, -1],  # -1 = LightGBM's "no limit" (bounded indirectly by num_leaves)
    "num_leaves": [7, 15, 31],
    "min_child_samples": [5, 10, 20],
    "learning_rate": [0.05, 0.1],
    "reg_lambda": [0.0, 1.0],
}


@dataclass
class CandidateResult:
    params: dict
    mean_log_loss: float
    mean_accuracy: float
    fold_metrics: list[dict] = field(default_factory=list)


@dataclass
class TuningResult:
    best_params: dict
    best_mean_log_loss: float
    default_mean_log_loss: float
    candidates_evaluated: int
    all_candidates: list[CandidateResult] = field(default_factory=list)

    @property
    def improved_over_default(self) -> bool:
        return self.best_mean_log_loss < self.default_mean_log_loss


def _iter_candidates(grid: dict[str, list], max_candidates: int, seed: int):
    """Random sample from the full grid rather than a full grid search - the
    grid above has 3*3*3*3*2*2=324 combinations, which at even 3-5 folds
    each is far more model fits than a few hundred training rows justify.
    Sampling without replacement keeps the search proportional to the data
    available while still covering the space broadly."""
    keys = list(grid.keys())
    all_combos = list(itertools.product(*grid.values()))
    rng = np.random.default_rng(seed)
    rng.shuffle(all_combos)
    for combo in all_combos[:max_candidates]:
        yield dict(zip(keys, combo))


def search_hyperparameters(
    X: pd.DataFrame,
    y: pd.Series,
    min_train_size: int,
    test_size: int,
    folds: int,
    purge: int,
    grid: dict[str, list] | None = None,
    max_candidates: int = 25,
    random_state: int = 42,
    default_params: dict | None = None,
) -> TuningResult:
    """Search LightGBM hyperparameters using the same purged, expanding
    walk-forward splits used for validation - never a shuffled/random K-fold,
    which would let a model trained partly on future rows be scored on past
    ones and silently inflate every candidate's apparent quality.

    Candidates are ranked by mean log loss across folds (not accuracy):
    log loss rewards well-calibrated probabilities and punishes confident
    wrong answers, which matters much more here than raw hit rate once the
    predictions feed a threshold-based strategy (modeling/strategy) that
    acts directly on the probability values, not just the argmax class.
    """
    grid = grid or DEFAULT_GRID
    default_params = default_params or {"n_estimators": 100, "random_state": random_state}
    fold_indices = list(splits(len(X), min_train_size, test_size, folds, purge=purge))
    if not fold_indices:
        raise ValueError("no walk-forward folds available for the given min_train_size/test_size/folds - check dataset length")

    def _score(params: dict) -> CandidateResult:
        fold_metrics = []
        for fold, train_idx, test_idx in fold_indices:
            model = LightGBMClassifier(random_state=random_state, **params)
            model.fit(X.iloc[train_idx], y.iloc[train_idx])
            proba = model.predict_proba(X.iloc[test_idx])
            fold_metrics.append(metrics(y.iloc[test_idx], proba, "lightgbm", fold))
        return CandidateResult(
            params=params,
            mean_log_loss=float(np.mean([m["log_loss"] for m in fold_metrics])),
            mean_accuracy=float(np.mean([m["accuracy"] for m in fold_metrics])),
            fold_metrics=fold_metrics,
        )

    default_result = _score({k: v for k, v in default_params.items() if k != "random_state"})
    candidates = [default_result]
    for params in _iter_candidates(grid, max_candidates, random_state):
        candidates.append(_score(params))

    best = min(candidates, key=lambda c: c.mean_log_loss)
    log.info(
        "Hyperparameter search: %d candidates, default log_loss=%.4f, best log_loss=%.4f (%s)",
        len(candidates), default_result.mean_log_loss, best.mean_log_loss, best.params,
    )
    return TuningResult(
        best_params=best.params,
        best_mean_log_loss=best.mean_log_loss,
        default_mean_log_loss=default_result.mean_log_loss,
        candidates_evaluated=len(candidates),
        all_candidates=candidates,
    )
