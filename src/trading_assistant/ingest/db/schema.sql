PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'crypto')),
    exchange TEXT,
    pair TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    UNIQUE(symbol, asset_type)
);

CREATE TABLE IF NOT EXISTS price_bars (
    id INTEGER PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    interval TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume REAL,
    source TEXT NOT NULL,
    UNIQUE(asset_id, interval, timestamp, source)
);
CREATE INDEX IF NOT EXISTS idx_price_bars_asset_time ON price_bars(asset_id, interval, timestamp);

CREATE TABLE IF NOT EXISTS news_items (
    id INTEGER PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_name TEXT,
    external_id TEXT,
    headline TEXT NOT NULL,
    body TEXT,
    url TEXT,
    published_at TEXT NOT NULL,
    raw_sentiment REAL,
    raw_payload TEXT,
    UNIQUE(source_type, external_id, url, published_at)
);
CREATE INDEX IF NOT EXISTS idx_news_published ON news_items(published_at);

CREATE TABLE IF NOT EXISTS news_item_assets (
    news_item_id INTEGER NOT NULL REFERENCES news_items(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    PRIMARY KEY(news_item_id, asset_id)
);

CREATE TABLE IF NOT EXISTS social_items (
    id INTEGER PRIMARY KEY,
    platform TEXT NOT NULL,
    external_id TEXT,
    author_username TEXT,
    subreddit TEXT,
    is_followed_account INTEGER NOT NULL DEFAULT 0,
    title TEXT,
    body TEXT,
    url TEXT,
    created_at TEXT NOT NULL,
    score INTEGER,
    comment_count INTEGER,
    raw_payload TEXT,
    UNIQUE(platform, external_id)
);
CREATE INDEX IF NOT EXISTS idx_social_created ON social_items(created_at);

CREATE TABLE IF NOT EXISTS social_item_assets (
    social_item_id INTEGER NOT NULL REFERENCES social_items(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    PRIMARY KEY(social_item_id, asset_id)
);

CREATE TABLE IF NOT EXISTS followed_sources (
    id INTEGER PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_identifier TEXT NOT NULL,
    is_curated_default INTEGER NOT NULL DEFAULT 0,
    UNIQUE(source_type, source_identifier)
);

CREATE TABLE IF NOT EXISTS ingestion_log (
    id INTEGER PRIMARY KEY,
    source TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    status TEXT NOT NULL CHECK(status IN ('running', 'success', 'failure')),
    records_fetched INTEGER NOT NULL DEFAULT 0,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS ingestion_state (
    source TEXT NOT NULL,
    entity_key TEXT NOT NULL,
    last_success_at TEXT,
    last_cursor TEXT,
    PRIMARY KEY(source, entity_key)
);
