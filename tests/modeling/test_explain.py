import numpy as np
import pandas as pd
import pytest

from trading_assistant.modeling.explain import explain_prediction, feature_contributions
from trading_assistant.modeling.models.classifiers import LightGBMClassifier


def _fit_model(n=200, seed=0):
    pytest.importorskip("lightgbm")
    rng = np.random.default_rng(seed)
    # A feature the model can actually learn from: high values of x0 push
    # toward class 2 (up), low values push toward class 0 (down).
    X = pd.DataFrame({
        "x0": rng.normal(size=n),
        "x1": rng.normal(size=n),
        "x2": rng.normal(size=n),
    })
    y = pd.Series(np.where(X["x0"] > 0.5, 2, np.where(X["x0"] < -0.5, 0, 1)))
    model = LightGBMClassifier(n_estimators=50, random_state=seed)
    model.fit(X, y)
    return model, X


class TestFeatureContributions:
    def test_returns_one_value_per_feature(self):
        model, X = _fit_model()
        row = X.iloc[[0]]
        contributions = feature_contributions(model, row, predicted_class_index=2)
        assert set(contributions.index) == set(X.columns)
        assert len(contributions) == 3

    def test_rejects_multi_row_input(self):
        model, X = _fit_model()
        with pytest.raises(ValueError):
            feature_contributions(model, X.iloc[:2], predicted_class_index=0)

    def test_dominant_feature_has_largest_absolute_contribution_for_its_class(self):
        # x0 is the only feature with real signal for this label scheme, so
        # for a clearly-"up" row it should dominate the "up"-class contributions.
        model, X = _fit_model()
        up_row = pd.DataFrame({"x0": [3.0], "x1": [0.0], "x2": [0.0]})
        contributions = feature_contributions(model, up_row, predicted_class_index=2)
        assert contributions.abs().idxmax() == "x0"
        assert contributions["x0"] > 0  # a strongly positive x0 should push toward "up"


class TestExplainPrediction:
    def test_sentence_names_predicted_label_and_confidence(self):
        model, X = _fit_model()
        up_row = pd.DataFrame({"x0": [3.0], "x1": [0.0], "x2": [0.0]})
        probabilities = {"down": 0.05, "flat": 0.05, "up": 0.9}
        result = explain_prediction(model, up_row, probabilities)
        assert result["predicted_label"] == "up"
        assert result["confidence"] == pytest.approx(0.9)
        assert "90%" in result["sentence"]
        assert "rising" in result["sentence"]

    def test_top_factors_respects_top_n(self):
        model, X = _fit_model()
        row = X.iloc[[0]]
        probabilities = {"down": 0.2, "flat": 0.3, "up": 0.5}
        result = explain_prediction(model, row, probabilities, top_n=2)
        assert len(result["top_factors"]) <= 2

    def test_unknown_column_falls_back_to_readable_name(self):
        # A feature name that isn't in the known technical/sentiment
        # dictionaries should still produce a sentence, not crash - it just
        # falls back to a de-underscored version of the raw column name.
        from trading_assistant.modeling.explain.narrative import _describe_feature
        label, meaning = _describe_feature("some_unlisted_feature")
        assert label == "some unlisted feature"
        assert meaning == "a model input"

    def test_sentiment_column_name_is_humanized_with_window(self):
        from trading_assistant.modeling.explain.narrative import _describe_feature
        label, meaning = _describe_feature("avg_sentiment_24h")
        assert "1-day" in label
        assert "sentiment" in label.lower()
