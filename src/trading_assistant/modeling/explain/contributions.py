from __future__ import annotations

import numpy as np
import pandas as pd

# Class order the models in this package always use: down=0, flat=1, up=2.
CLASS_NAMES = ["down", "flat", "up"]


def feature_contributions(model, X: pd.DataFrame, predicted_class_index: int) -> pd.Series:
    """Per-feature contribution to a single prediction's log-odds for one class.

    Uses LightGBM's native `pred_contrib=True`, which returns SHAP-consistent
    contributions (TreeSHAP under the hood) without pulling in the `shap`
    package as a dependency. For a multiclass model with `n` features, the
    output row is laid out as `n+1` values per class (one contribution per
    feature, plus a trailing bias/expected-value term), concatenated class by
    class in class-index order. This function isolates the slice for
    `predicted_class_index` and drops the bias term, returning one signed
    contribution per feature in `X`'s column order.

    Positive values push *toward* the predicted class; negative values push
    away from it. Contributions are additive on the model's raw margin
    (log-odds) scale, not on the final probability - they should be read as
    relative "how much did this feature move the needle", not as a
    probability delta on their own.

    `model` is this package's `LightGBMClassifier` wrapper (must expose the
    fitted `.model` LGBMClassifier).
    """
    if len(X) != 1:
        raise ValueError("feature_contributions expects exactly one row (one prediction at a time)")
    n_features = X.shape[1]
    raw = model.model.predict(X, pred_contrib=True)
    raw = np.asarray(raw)[0]
    n_classes = len(CLASS_NAMES)
    per_class_width = n_features + 1  # +1 for the bias term LightGBM appends per class
    if raw.shape[0] != n_classes * per_class_width:
        raise ValueError(
            f"unexpected pred_contrib shape: got {raw.shape[0]} values for "
            f"{n_features} features x {n_classes} classes (expected {n_classes * per_class_width})"
        )
    start = predicted_class_index * per_class_width
    class_contrib = raw[start:start + n_features]  # drop the trailing bias term
    return pd.Series(class_contrib, index=X.columns).sort_values(key=abs, ascending=False)
