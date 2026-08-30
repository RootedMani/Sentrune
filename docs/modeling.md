# Sentrune Modeling Layer

> Restructured 2026-08-29: this layer now lives at `src/trading_assistant/modeling`,
> its config at `config/modeling.yaml`, artifacts under `models/` at the project
> root, and every command runs from the project root (`python -m
> trading_assistant.modeling` or `python run_pipeline.py train`). The setup snippets
> below predate the restructure; the root README quickstart is authoritative.

This package is the additive modeling layer for Sentrune. It reads the upstream SQLite tables and writes only new `model_runs` and `validation_metrics` tables. It never modifies `price_bars`, `technical_features`, `sentiment_aggregates`, or other upstream tables.

## Label formula

For each `(asset_id, interval)` independently, the forward return at timestamp `t` is:

```text
forward_return(t) = close(t + horizon_bars) / close(t) - 1
```

The label is `down` (class `0`) when the return is below `-dead_zone`, `flat` (class `1`) when it lies between and including the two thresholds, and `up` (class `2`) when it is above `dead_zone`. Rows without a future close are dropped. This is a classification target, not a promise of future price behavior.

## Feature timing and missing values

Technical features and labels are joined on asset, interval, and timestamp. Sentiment aggregates use a strict backward as-of join: for a feature timestamp `t`, only the latest aggregate whose `window_end <= t` is eligible. An aggregate ending after `t` can never enter the row, preventing forward leakage. Technical warm-up NaNs are not silently filled; rows missing any configured feature are dropped explicitly before training.

The default feature set includes the wide technical columns produced by the feature-engineering layer and all source-attributed sentiment aggregate columns. Set `feature_columns` in `config/modeling.yaml` to select a smaller matrix. Set `assets` to a list of ticker symbols to restrict training; `null` trains every active asset in the upstream database.

## Models

The primary model is a three-class LightGBM classifier using the scikit-learn API. It returns `{down, flat, up}` probabilities. Two required baselines are included: `BuyAndHoldBaseline`, which always predicts `up`, and `MovingAverageCrossoverBaseline`, which predicts from SMA20 versus SMA50. These baselines are intentionally simple comparison points, not trading recommendations.

The optional `ExperimentalLSTM` module is isolated under `modeling/models/experimental_torch.py`. When installed, it is a proper `torch.nn.Module`; PyTorch is optional and is not needed for the LightGBM path, baselines, or tests. Install `pip install -e '.[research]'` only for research comparison work. It is not the shipped model.

## Walk-forward validation and persistence

Validation uses expanding training windows followed by strictly later test windows; random train/test splits are not used. Because labels are forward returns over `horizon_bars` bars, the last `horizon_bars` training rows of each fold would otherwise be labeled from prices inside the test window; the splitter purges those rows (an embargo gap equal to the horizon) so no training label sees the test period. Each fold stores accuracy, multiclass log loss, and per-class precision and recall in `validation_metrics`. Versioned LightGBM artifacts are stored below `model_dir/<asset_id>/`. After fold evaluation, the persisted LightGBM artifact is refit on all usable rows so the saved predictor includes the latest available training data. The `Predictor.predict(artifact_path, features)` method returns the simple probability interface needed by future reporting and alerting layers.

The primary model exposes LightGBM feature importances through `feature_importances()`, which is the documented low-cost explainability fallback for prototype compute. SHAP can be added by a later layer without changing the persisted model interface.

## Setup and execution

The data layer and feature-engineering layer must run first so the shared SQLite database contains price bars, technical features, sentiment aggregates, and their asset junctions. Then run:

```bash
cd modeling
python -m venv .venv
source .venv/bin/activate
pip install -e .
cp config/modeling.example.yaml config/modeling.yaml
model-train --config config/modeling.yaml
```

Run tests with:

```bash
pytest -q
```

The package uses no paid APIs or live downloads in tests. Real training requires an adequately populated local database and the LightGBM dependency. Results are historical walk-forward diagnostics only; they do not predict black-swan events, guarantee returns, or establish that a model will outperform in the future.
