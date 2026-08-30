CREATE TABLE IF NOT EXISTS model_runs (
    id INTEGER PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    interval TEXT NOT NULL,
    model_name TEXT NOT NULL,
    trained_at TEXT NOT NULL,
    model_path TEXT NOT NULL,
    feature_columns TEXT NOT NULL,
    feature_importance_rank_correlation REAL
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

CREATE TABLE IF NOT EXISTS feature_importance (
    id INTEGER PRIMARY KEY,
    model_run_id INTEGER NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
    fold INTEGER NOT NULL,
    feature TEXT NOT NULL,
    permutation_importance REAL NOT NULL,
    gain_importance REAL
);
CREATE INDEX IF NOT EXISTS idx_feature_importance_model_run ON feature_importance(model_run_id);

CREATE TABLE IF NOT EXISTS feature_importance_stability (
    id INTEGER PRIMARY KEY,
    model_run_id INTEGER NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    mean_importance REAL,
    std_importance REAL,
    coefficient_of_variation REAL,
    mean_rank REAL,
    UNIQUE(model_run_id, feature)
);
CREATE INDEX IF NOT EXISTS idx_feature_importance_stability_model_run ON feature_importance_stability(model_run_id);
