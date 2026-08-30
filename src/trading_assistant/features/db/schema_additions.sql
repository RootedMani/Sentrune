CREATE TABLE IF NOT EXISTS technical_features (
    id INTEGER PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    interval TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    sma_20 REAL,
    sma_50 REAL,
    sma_200 REAL,
    ema_12 REAL,
    ema_26 REAL,
    macd REAL,
    macd_signal REAL,
    macd_histogram REAL,
    rsi_14 REAL,
    stoch_k REAL,
    stoch_d REAL,
    bb_lower REAL,
    bb_middle REAL,
    bb_upper REAL,
    atr_14 REAL,
    obv REAL,
    volume_sma_20 REAL,
    adx_14 REAL,
    plus_di_14 REAL,
    minus_di_14 REAL,
    ichimoku_tenkan REAL,
    ichimoku_kijun REAL,
    ichimoku_senkou_a REAL,
    ichimoku_senkou_b REAL,
    ichimoku_chikou REAL,
    volatility_20 REAL,
    return_autocorr_20 REAL,
    volume_price_divergence REAL,
    candle_body_ratio REAL,
    candle_doji INTEGER,
    candle_hammer INTEGER,
    candle_bullish_engulfing INTEGER,
    candle_bearish_engulfing INTEGER,
    return_1 REAL,
    return_3 REAL,
    return_5 REAL,
    return_10 REAL,
    zscore_20 REAL,
    volatility_regime INTEGER,
    day_of_week INTEGER,
    dist_from_high REAL,
    dist_from_low REAL,
    UNIQUE(asset_id, interval, timestamp)
);
CREATE INDEX IF NOT EXISTS idx_technical_features_asset_time ON technical_features(asset_id, interval, timestamp);

CREATE TABLE IF NOT EXISTS text_sentiment (
    id INTEGER PRIMARY KEY,
    item_type TEXT NOT NULL CHECK(item_type IN ('news','social')),
    item_id INTEGER NOT NULL,
    positive_prob REAL NOT NULL,
    negative_prob REAL NOT NULL,
    neutral_prob REAL NOT NULL,
    label TEXT NOT NULL,
    computed_at TEXT NOT NULL,
    UNIQUE(item_type, item_id)
);
CREATE INDEX IF NOT EXISTS idx_text_sentiment_item ON text_sentiment(item_type, item_id);

CREATE TABLE IF NOT EXISTS sentiment_aggregates (
    id INTEGER PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    window_end TEXT NOT NULL,
    window_hours INTEGER NOT NULL,
    avg_sentiment REAL,
    mention_volume INTEGER NOT NULL,
    sentiment_volatility REAL,
    followed_avg_sentiment REAL,
    followed_mention_volume INTEGER NOT NULL,
    followed_sentiment_volatility REAL,
    unattributed_avg_sentiment REAL,
    unattributed_mention_volume INTEGER NOT NULL,
    unattributed_sentiment_volatility REAL,
    UNIQUE(asset_id, window_end, window_hours)
);
CREATE INDEX IF NOT EXISTS idx_sentiment_aggregates_asset_time ON sentiment_aggregates(asset_id, window_end);

CREATE TABLE IF NOT EXISTS feature_state (
    feature_name TEXT NOT NULL,
    entity_key TEXT NOT NULL,
    last_processed_at TEXT,
    PRIMARY KEY(feature_name, entity_key)
);
