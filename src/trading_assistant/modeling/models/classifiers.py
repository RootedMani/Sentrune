from __future__ import annotations

import numpy as np


class LightGBMClassifier:
    """Primary probabilistic 3-class model; LightGBM is imported only on construction."""
    def __init__(self, **kwargs):
        try:
            from lightgbm import LGBMClassifier
        except ImportError as exc:
            raise RuntimeError("lightgbm is required for the primary model") from exc
        self.model = LGBMClassifier(objective="multiclass", num_class=3, verbosity=-1, **kwargs)

    def fit(self, X, y):
        self.model.fit(X, y)
        return self

    def predict_proba(self, X):
        return self.model.predict_proba(X)

    def feature_importances(self):
        return self.model.feature_importances_


class BuyAndHoldBaseline:
    """Naive placeholder: always assigns probability 1 to the up class."""
    def fit(self, X, y):
        self.n_features_in_ = X.shape[1]
        return self

    def predict_proba(self, X):
        out = np.zeros((len(X), 3), dtype=float)
        out[:, 2] = 1.0
        return out


class MovingAverageCrossoverBaseline:
    """SMA20>SMA50 predicts up, SMA20<SMA50 predicts down, otherwise flat."""
    def fit(self, X, y=None):
        self.sma20_index = list(X.columns).index("sma_20")
        self.sma50_index = list(X.columns).index("sma_50")
        return self

    def predict_proba(self, X):
        values = X.to_numpy()
        out = np.zeros((len(X), 3), dtype=float)
        for i, row in enumerate(values):
            label = 2 if row[self.sma20_index] > row[self.sma50_index] else 0 if row[self.sma20_index] < row[self.sma50_index] else 1
            out[i, label] = 1.0
        return out
