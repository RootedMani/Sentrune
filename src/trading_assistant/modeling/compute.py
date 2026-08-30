from __future__ import annotations

import argparse
import json
import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from .config import load_config
from .features import assemble_features, make_labels, select_feature_columns, sentiment_feature_columns
from .models.classifiers import BuyAndHoldBaseline, LightGBMClassifier, MovingAverageCrossoverBaseline
from .predict import Predictor
from .validation.walk_forward import metrics, splits

log = logging.getLogger(__name__)

# Must match features/compute.py's TECHNICAL_COLUMNS - that's the full set of
# indicators actually computed and persisted per bar. Kept as a separate
# constant here (rather than importing that module) to avoid a modeling ->
# features import edge; if you add an indicator there, add its column name
# here too or the model will never see it despite it being in the database.
TECHNICAL_FEATURES = [
    "sma_20", "sma_50", "sma_200", "ema_12", "ema_26", "macd", "macd_signal", "macd_histogram",
    "rsi_14", "stoch_k", "stoch_d", "bb_lower", "bb_middle", "bb_upper", "atr_14", "obv", "volume_sma_20",
    "adx_14", "plus_di_14", "minus_di_14",
    "ichimoku_tenkan", "ichimoku_kijun", "ichimoku_senkou_a", "ichimoku_senkou_b", "ichimoku_chikou",
    "volatility_20", "return_autocorr_20", "volume_price_divergence",
    "candle_body_ratio", "candle_doji", "candle_hammer", "candle_bullish_engulfing", "candle_bearish_engulfing",
    "return_1", "return_3", "return_5", "return_10", "zscore_20",
    "volatility_regime", "day_of_week", "dist_from_high", "dist_from_low",
]


def default_features(sentiment_windows_hours: list[int]) -> list[str]:
    return TECHNICAL_FEATURES + sentiment_feature_columns(sentiment_windows_hours)


def read_inputs(conn: sqlite3.Connection, settings) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    prices = pd.read_sql_query("SELECT * FROM price_bars WHERE interval=? ORDER BY asset_id,timestamp", conn, params=(settings.interval,))
    technical = pd.read_sql_query("SELECT * FROM technical_features WHERE interval=? ORDER BY asset_id,timestamp", conn, params=(settings.interval,))
    sentiment = pd.read_sql_query("SELECT * FROM sentiment_aggregates ORDER BY asset_id,window_end", conn)
    return prices, technical, sentiment


def train_asset(conn, asset_id: int, settings) -> dict:
    prices, technical, sentiment = read_inputs(conn, settings)
    prices = prices[prices.asset_id == asset_id]
    technical = technical[technical.asset_id == asset_id]
    sentiment = sentiment[sentiment.asset_id == asset_id]
    labels = make_labels(prices, settings.horizon_bars, settings.dead_zone)
    feature_columns = settings.feature_columns or default_features(settings.sentiment_windows_hours)
    feature_columns, dropped = select_feature_columns(sentiment, feature_columns)
    if dropped:
        log.warning("Asset %s: no sentiment aggregates available; training technical-only, dropped %s", asset_id, dropped)
    dataset = assemble_features(technical, sentiment, labels, feature_columns)
    dataset = dataset.sort_values("timestamp").reset_index(drop=True)
    X, y = dataset[feature_columns], dataset["label"]
    if len(dataset) < settings.min_train_size + settings.test_size:
        raise ValueError(f"asset {asset_id} has only {len(dataset)} usable rows; more history is required")
    models = {"lightgbm": LightGBMClassifier(n_estimators=100, random_state=42), "buy_and_hold": BuyAndHoldBaseline(), "moving_average_crossover": MovingAverageCrossoverBaseline()}
    trained_at = datetime.now(timezone.utc).isoformat()
    predictor = Predictor(settings.model_dir)
    output = {"asset_id": asset_id, "metrics": []}
    for model_name, model in models.items():
        fold_metrics = []
        for fold, train_idx, test_idx in splits(len(dataset), settings.min_train_size, settings.test_size, settings.folds, purge=settings.horizon_bars):
            model.fit(X.iloc[train_idx], y.iloc[train_idx])
            fold_metrics.append(metrics(y.iloc[test_idx], model.predict_proba(X.iloc[test_idx]), model_name, fold))
        output["metrics"].extend(fold_metrics)
        if model_name == "lightgbm":
            # Validation uses historical folds; the persisted predictor is
            # refit on every usable row so it does not discard recent data.
            model.fit(X, y)
            model_path = predictor.save(model, asset_id, trained_at, feature_columns)
            output["model_path"] = model_path
    output["feature_columns"] = feature_columns
    log.info("Trained asset %s with %d rows, %d features", asset_id, len(dataset), len(feature_columns))
    return output


def run(config_path: str = "config/modeling.yaml") -> dict:
    settings = load_config(config_path)
    conn = sqlite3.connect(settings.db_path)
    conn.row_factory = sqlite3.Row
    conn.executescript(Path(__file__).with_name("storage").joinpath("schema.sql").read_text())
    assets = conn.execute("SELECT id FROM assets WHERE is_active=1" + (" AND symbol IN (%s)" % ",".join("?" for _ in settings.assets) if settings.assets else ""), settings.assets or ()).fetchall()
    results = {}
    for asset in assets:
        try:
            result = train_asset(conn, asset["id"], settings)
            results[str(asset["id"])] = result
            run_id = conn.execute("INSERT INTO model_runs(asset_id,interval,model_name,trained_at,model_path,feature_columns) VALUES(?,?,?,?,?,?)", (asset["id"], settings.interval, "lightgbm", datetime.now(timezone.utc).isoformat(), result.get("model_path", ""), json.dumps(result.get("feature_columns", [])))).lastrowid
            for item in result["metrics"]:
                conn.execute("INSERT INTO validation_metrics(model_run_id,fold,model_name,accuracy,log_loss,precision_down,recall_down,precision_flat,recall_flat,precision_up,recall_up) VALUES(?,?,?,?,?,?,?,?,?,?,?)", (run_id, item["fold"], item["model_name"], item["accuracy"], item["log_loss"], item["precision_down"], item["recall_down"], item["precision_flat"], item["recall_flat"], item["precision_up"], item["recall_up"]))
            conn.commit()
        except Exception as exc:
            log.error("Modeling failed for asset %s: %s", asset["id"], exc)
    conn.close()
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Train and walk-forward validate the Sentrune modeling layer")
    parser.add_argument("--config", default="config/modeling.yaml")
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level.upper(), logging.INFO), format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    run(args.config)


if __name__ == "__main__":
    main()
