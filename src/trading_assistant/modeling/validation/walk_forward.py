from __future__ import annotations

import numpy as np
from sklearn.metrics import accuracy_score, log_loss, precision_recall_fscore_support


def splits(n_rows: int, min_train_size: int, test_size: int, folds: int, purge: int = 0):
    """Expanding walk-forward folds with an optional purge (embargo) gap.

    Labels are forward returns over `horizon_bars` bars, so training rows
    within `purge` of the train/test boundary have labels computed from prices
    inside the test window. Purging those rows prevents optimistic leakage;
    callers should pass purge=horizon_bars.
    """
    for fold in range(folds):
        train_end = min_train_size + fold * test_size
        test_end = train_end + test_size
        if test_end > n_rows:
            break
        clean_end = max(0, train_end - max(0, purge))
        if clean_end == 0:
            break
        yield fold, np.arange(0, clean_end), np.arange(train_end, test_end)


def metrics(y_true, probabilities, model_name: str, fold: int) -> dict:
    predicted = probabilities.argmax(axis=1)
    precision, recall, _, _ = precision_recall_fscore_support(y_true, predicted, labels=[0, 1, 2], zero_division=0)
    return {"fold": fold, "model_name": model_name, "accuracy": float(accuracy_score(y_true, predicted)), "log_loss": float(log_loss(y_true, probabilities, labels=[0, 1, 2])), "precision_down": float(precision[0]), "recall_down": float(recall[0]), "precision_flat": float(precision[1]), "recall_flat": float(recall[1]), "precision_up": float(precision[2]), "recall_up": float(recall[2])}
