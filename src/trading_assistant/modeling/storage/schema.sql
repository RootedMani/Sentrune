CREATE TABLE IF NOT EXISTS model_runs (
    id INTEGER PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    interval TEXT NOT NULL,
    model_name TEXT NOT NULL,
    trained_at TEXT NOT NULL,
    model_path TEXT NOT NULL,
    feature_columns TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS validation_metrics (
    id INTEGER PRIMARY KEY,
    model_run_id INTEGER NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
    fold INTEGER NOT NULL,
    model_name TEXT NOT NULL,
    accuracy REAL,
    log_loss REAL,
    precision_down REAL,
    recall_down REAL,
    precision_flat REAL,
    recall_flat REAL,
    precision_up REAL,
    recall_up REAL
);
CREATE INDEX IF NOT EXISTS idx_validation_model_run ON validation_metrics(model_run_id);
CREATE TABLE IF NOT EXISTS strategy_backtests (
    id INTEGER PRIMARY KEY,
    model_run_id INTEGER NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
    fold INTEGER NOT NULL,
    strategy_name TEXT NOT NULL,
    long_threshold REAL,
    short_threshold REAL,
    allow_short INTEGER,
    fee_bps REAL,
    slippage_bps REAL,
    total_return REAL,
    annualized_return REAL,
    annualized_volatility REAL,
    sharpe REAL,
    max_drawdown REAL,
    win_rate REAL,
    trades INTEGER,
    baseline_total_return REAL,
    baseline_sharpe REAL,
    n_bars INTEGER
);
CREATE INDEX IF NOT EXISTS idx_strategy_backtest_model_run ON strategy_backtests(model_run_id);
