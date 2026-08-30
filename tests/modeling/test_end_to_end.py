import sqlite3
from pathlib import Path

import pandas as pd
import pytest
import yaml

from trading_assistant.modeling.compute import run


def _make_db(path: Path):
    conn = sqlite3.connect(path)
    conn.executescript("""
    CREATE TABLE assets (id INTEGER PRIMARY KEY, symbol TEXT, name TEXT, asset_type TEXT, exchange TEXT, pair TEXT, is_active INTEGER);
    CREATE TABLE price_bars (id INTEGER PRIMARY KEY, asset_id INTEGER, interval TEXT, timestamp TEXT, open REAL, high REAL, low REAL, close REAL, volume REAL, source TEXT);
    CREATE TABLE technical_features (id INTEGER PRIMARY KEY, asset_id INTEGER, interval TEXT, timestamp TEXT, sma_20 REAL, sma_50 REAL);
    CREATE TABLE sentiment_aggregates (id INTEGER PRIMARY KEY, asset_id INTEGER, window_end TEXT, window_hours INTEGER, avg_sentiment REAL, avg_sentiment_decayed REAL, mention_volume INTEGER, sentiment_volatility REAL, followed_avg_sentiment REAL, followed_mention_volume INTEGER, followed_sentiment_volatility REAL, unattributed_avg_sentiment REAL, unattributed_mention_volume INTEGER, unattributed_sentiment_volatility REAL);
    INSERT INTO assets VALUES (1, 'TEST', 'Test', 'stock', 'TEST', NULL, 1);
    """)
    dates = pd.date_range("2024-01-01", periods=12, freq="D", tz="UTC")
    for i, timestamp in enumerate(dates):
        close = 100 + (i % 3) * 2 + i * 0.1
        conn.execute("INSERT INTO price_bars(asset_id,interval,timestamp,open,high,low,close,volume,source) VALUES(?,?,?,?,?,?,?,?,?)", (1, "1d", timestamp.isoformat(), close, close + 1, close - 1, close, 1000, "fixture"))
        conn.execute("INSERT INTO technical_features(asset_id,interval,timestamp,sma_20,sma_50) VALUES(?,?,?,?,?)", (1, "1d", timestamp.isoformat(), 101 + i, 100 + i / 2))
        conn.execute("INSERT INTO sentiment_aggregates(asset_id,window_end,window_hours,avg_sentiment,avg_sentiment_decayed,mention_volume,sentiment_volatility,followed_avg_sentiment,followed_mention_volume,followed_sentiment_volatility,unattributed_avg_sentiment,unattributed_mention_volume,unattributed_sentiment_volatility) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", (1, timestamp.isoformat(), 24, 0.1, 0.1, 1, 0.0, 0.0, 0, 0.0, 0.1, 1, 0.0))
    conn.commit()
    conn.close()


def test_run_executes_with_assets_filter_and_fixture_db(tmp_path):
    db_path = tmp_path / "fixture.sqlite3"
    _make_db(db_path)
    config = tmp_path / "modeling.yaml"
    config.write_text(yaml.safe_dump({"db_path": str(db_path), "model_dir": str(tmp_path / "models"), "interval": "1d", "assets": ["TEST"], "horizon_bars": 1, "dead_zone": 0.001, "folds": 2, "min_train_size": 4, "test_size": 2, "feature_columns": ["sma_20", "sma_50", "avg_sentiment_24h"]}))
    result = run(str(config))
    assert "1" in result
    assert (tmp_path / "models").exists()
    conn = sqlite3.connect(db_path)
    assert conn.execute("SELECT COUNT(*) FROM model_runs").fetchone()[0] == 1
    assert conn.execute("SELECT COUNT(*) FROM validation_metrics").fetchone()[0] > 0
    conn.close()


def test_experimental_lstm_forward_pass():
    torch = pytest.importorskip("torch")
    from trading_assistant.modeling.models.experimental_torch import ExperimentalLSTM
    model = ExperimentalLSTM(input_size=3, hidden_size=4)
    output = model(torch.randn(2, 5, 3))
    assert tuple(output.shape) == (2, 3)
