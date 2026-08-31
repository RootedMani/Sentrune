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
from .strategy import StrategyConfig, ThresholdStrategy, run_backtest
from .tuning import search_hyperparameters
from .validation.walk_forward import metrics, splits

BARS_PER_YEAR = {"1d": 252.0, "1h": 252.0 * 6.5, "1wk": 52.0}
log = logging.getLogger(__name__)

TECHNICAL_FEATURES = [
    "sma_20", "sma_50", "sma_200", "ema_12", "ema_26", "macd", "macd_signal", "macd_histogram",
    "rsi_14", "stoch_k", "stoch_d", "bb_lower", "bb_middle", "bb_upper", "atr_14", "obv", "volume_sma_20",
    "adx_14", "plus_di_14", "minus_di_14",
    "ichimoku_tenkan", "ichimoku_kijun", "ichimoku_senkou_a", "ichimoku_senkou_b",
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
        
    lightgbm_params = {"n_estimators": 100, "random_state": 42}
    tuning_result = None
    if settings.tune_hyperparameters:
        tuning_result = search_hyperparameters(
            X, y, settings.min_train_size, settings.test_size, settings.folds,
            purge=settings.horizon_bars, max_candidates=settings.tuning_candidates, random_state=42,
        )
        if tuning_result.improved_over_default:
            lightgbm_params = {**tuning_result.best_params, "random_state": 42}
            log.info("Asset %s: tuning improved mean log loss %.4f -> %.4f, using %s", asset_id, tuning_result.default_mean_log_loss, tuning_result.best_mean_log_loss, tuning_result.best_params)
        else:
            log.info("Asset %s: tuning found nothing better than defaults (log loss %.4f); keeping defaults", asset_id, tuning_result.default_mean_log_loss)
            
    models = {"lightgbm": LightGBMClassifier(**lightgbm_params), "buy_and_hold": BuyAndHoldBaseline(), "moving_average_crossover": MovingAverageCrossoverBaseline()}
    trained_at = datetime.now(timezone.utc).isoformat()
    predictor = Predictor(settings.model_dir)
    strategy = ThresholdStrategy(StrategyConfig(
        long_threshold=settings.strategy_long_threshold,
        short_threshold=settings.strategy_short_threshold,
        allow_short=settings.strategy_allow_short,
    ))
    bars_per_year = BARS_PER_YEAR.get(settings.interval, 252.0)
    output = {"asset_id": asset_id, "metrics": [], "backtests": []}
    
    for model_name, model in models.items():
        fold_metrics = []
        for fold, train_idx, test_idx in splits(len(dataset), settings.min_train_size, settings.test_size, settings.folds, purge=settings.horizon_bars):
            model.fit(X.iloc[train_idx], y.iloc[train_idx])
            test_proba = model.predict_proba(X.iloc[test_idx])
            fold_metrics.append(metrics(y.iloc[test_idx], test_proba, model_name, fold))
            if model_name == "lightgbm":
                positions = strategy.positions_for_batch(test_proba)
                result = run_backtest(
                    timestamps=dataset["timestamp"].iloc[test_idx],
                    forward_returns=dataset["forward_return"].iloc[test_idx],
                    positions=pd.Series(positions),
                    fee_bps=settings.strategy_fee_bps,
                    slippage_bps=settings.strategy_slippage_bps,
                    bars_per_year=bars_per_year,
                )
                output["backtests"].append({"fold": fold, "strategy_name": "threshold", "result": result})
        output["metrics"].extend(fold_metrics)
        if model_name == "lightgbm":
            model.fit(X, y)
            model_path = predictor.save(model, asset_id, trained_at, feature_columns)
            output["model_path"] = model_path
            output["feature_columns"] = feature_columns
            output["lightgbm_params"] = lightgbm_params
            if tuning_result is not None:
                output["tuning"] = {
                    "default_log_loss": tuning_result.default_mean_log_loss,
                    "best_log_loss": tuning_result.best_mean_log_loss,
                    "candidates_evaluated": tuning_result.candidates_evaluated,
                    "improved": tuning_result.improved_over_default,
                }
    log.info("Trained asset %s with %d rows, %d features", asset_id, len(dataset), len(feature_columns))
    return output

def run(config_path: str = "config/modeling.yaml", tune_override: bool | None = None) -> dict:
    settings = load_config(config_path)
    if tune_override is not None:
        settings.tune_hyperparameters = tune_override
        
    conn = sqlite3.connect(settings.db_path)
    # FIX: Add WAL mode and busy timeout to prevent concurrent writer locks
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
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
            for entry in result.get("backtests", []):
                r = entry["result"]
                conn.execute(
                    "INSERT INTO strategy_backtests(model_run_id,fold,strategy_name,long_threshold,short_threshold,allow_short,fee_bps,slippage_bps,total_return,annualized_return,annualized_volatility,sharpe,max_drawdown,win_rate,trades,baseline_total_return,baseline_sharpe,n_bars) "
                    "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (run_id, entry["fold"], entry["strategy_name"], settings.strategy_long_threshold, settings.strategy_short_threshold, int(settings.strategy_allow_short),
                    r.metadata["fee_bps"], r.metadata["slippage_bps"], r.total_return, r.annualized_return, r.annualized_volatility, r.sharpe, r.max_drawdown, r.win_rate, r.trades,
                    r.baseline_total_return, r.baseline_sharpe, r.metadata["n_bars"]),
                )
            conn.commit()
        except Exception as exc:
            log.error("Modeling failed for asset %s: %s", asset["id"], exc)
            
    conn.close()
    return results

def main() -> None:
    parser = argparse.ArgumentParser(description="Train and walk-forward validate the Sentrune modeling layer")
    parser.add_argument("--config", default="config/modeling.yaml")
    parser.add_argument("--log-level", default="INFO")
    parser.add_argument("--tune", action="store_true", help="Run hyperparameter search (overrides tune_hyperparameters: false in config)")
    args = parser.parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level.upper(), logging.INFO), format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    run(args.config, tune_override=True if args.tune else None)

if __name__ == "__main__":
    main()