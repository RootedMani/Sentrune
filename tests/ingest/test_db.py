from trading_assistant.ingest.db.connection import connect, initialize, insert_news, insert_price_bars, insert_social, seed_assets, seed_followed_sources


def test_schema_and_price_upsert_are_idempotent():
    conn = connect(":memory:")
    initialize(conn)
    seed_assets(conn, [{"symbol": "BTC", "name": "Bitcoin", "asset_type": "crypto", "pair": "BTCUSDT"}])
    asset_id = conn.execute("SELECT id FROM assets WHERE symbol='BTC'").fetchone()[0]
    row = {"asset_id": asset_id, "interval": "1d", "timestamp": "2024-01-01T00:00:00+00:00", "open": 1, "high": 2, "low": 0.5, "close": 1.5, "volume": 10, "source": "binance"}
    assert insert_price_bars(conn, [row]) == 1
    assert insert_price_bars(conn, [row]) == 0
    assert conn.execute("SELECT COUNT(*) FROM price_bars").fetchone()[0] == 1


def test_news_and_social_items_are_linked_to_asset_mentions():
    conn = connect(":memory:")
    initialize(conn)
    seed_assets(conn, [{"symbol": "AAPL", "name": "Apple", "asset_type": "stock"}])
    insert_news(conn, [{"source_type": "fixture", "source_name": "Test", "external_id": "n1", "headline": "AAPL earnings", "body": "", "url": "https://example.test/n1", "published_at": "2024-01-01T00:00:00+00:00", "raw_sentiment": None, "raw_payload": {}}])
    insert_social(conn, [{"platform": "reddit", "external_id": "s1", "author_username": "trader", "subreddit": "stocks", "is_followed_account": 0, "title": "AAPL discussion", "body": "", "url": "/s1", "created_at": "2024-01-01T00:00:00+00:00", "score": 1, "comment_count": 0, "raw_payload": {}}])
    assert conn.execute("SELECT COUNT(*) FROM news_item_assets").fetchone()[0] == 1
    assert conn.execute("SELECT COUNT(*) FROM social_item_assets").fetchone()[0] == 1


def test_followed_sources_seed_named_users_and_subreddits():
    conn = connect(":memory:")
    initialize(conn)
    seed_followed_sources(conn, ["r/stocks"], ["u/example"])
    records = conn.execute("SELECT source_type,source_identifier FROM followed_sources ORDER BY source_type").fetchall()
    assert [(r[0], r[1]) for r in records] == [("reddit_subreddit", "stocks"), ("reddit_user", "example")]


def test_duplicate_news_insert_does_not_corrupt_junction_rows():
    # Regression: a re-fetched item whose payload mentions a different asset
    # must not attach its tags to the previously stored item.
    conn = connect(":memory:")
    initialize(conn)
    seed_assets(conn, [
        {"symbol": "AAPL", "name": "Apple", "asset_type": "stock"},
        {"symbol": "MSFT", "name": "Microsoft", "asset_type": "stock"},
    ])
    first = {"source_type": "fixture", "source_name": "Test", "external_id": "n1", "headline": "AAPL hits record high", "body": "", "url": "https://example.test/n1", "published_at": "2024-01-01T00:00:00+00:00", "raw_sentiment": None, "raw_payload": {}}
    duplicate = {"source_type": "fixture", "source_name": "Test", "external_id": "n1", "headline": "MSFT special dividend", "body": "", "url": "https://example.test/n1", "published_at": "2024-01-01T00:00:00+00:00", "raw_sentiment": None, "raw_payload": {}}
    assert insert_news(conn, [first]) == 1
    assert insert_news(conn, [duplicate]) == 0
    symbols = [r[0] for r in conn.execute("SELECT a.symbol FROM news_item_assets nia JOIN assets a ON a.id=nia.asset_id").fetchall()]
    assert symbols == ["AAPL"]
    assert conn.execute("SELECT COUNT(*) FROM news_items").fetchone()[0] == 1


def test_explicit_related_symbols_survive_without_text_mention():
    conn = connect(":memory:")
    initialize(conn)
    seed_assets(conn, [{"symbol": "MSFT", "name": "Microsoft", "asset_type": "stock"}])
    insert_news(conn, [{"source_type": "fixture", "source_name": "Test", "external_id": "n2", "headline": "Cloud spending rises", "body": "", "url": "https://example.test/n2", "published_at": "2024-01-01T00:00:00+00:00", "raw_sentiment": None, "raw_payload": {}, "related_symbols": ("MSFT",)}])
    symbols = [r[0] for r in conn.execute("SELECT a.symbol FROM news_item_assets nia JOIN assets a ON a.id=nia.asset_id").fetchall()]
    assert symbols == ["MSFT"]


def test_word_boundary_matching_ignores_substring_coincidences():
    # Regression: "together" contains "ether"; only whole-word ETH counts.
    conn = connect(":memory:")
    initialize(conn)
    seed_assets(conn, [{"symbol": "ETH", "name": "Ethereum", "asset_type": "crypto", "pair": "ETHUSDT"}])
    insert_news(conn, [{"source_type": "fixture", "source_name": "Test", "external_id": "w1", "headline": "Investors rally together ahead of Fed decision", "body": "", "url": "https://example.test/w1", "published_at": "2024-01-01T00:00:00+00:00", "raw_sentiment": None, "raw_payload": {}}])
    assert conn.execute("SELECT COUNT(*) FROM news_item_assets").fetchone()[0] == 0
    insert_news(conn, [{"source_type": "fixture", "source_name": "Test", "external_id": "w2", "headline": "ETH rallies as staking inflows accelerate", "body": "Upgrades lift $ETH sentiment", "url": "https://example.test/w2", "published_at": "2024-01-02T00:00:00+00:00", "raw_sentiment": None, "raw_payload": {}}])
    assert conn.execute("SELECT COUNT(*) FROM news_item_assets").fetchone()[0] == 1


def test_duplicate_social_insert_does_not_corrupt_junction_rows():
    conn = connect(":memory:")
    initialize(conn)
    seed_assets(conn, [{"symbol": "BTC", "name": "Bitcoin", "asset_type": "crypto", "pair": "BTCUSDT"}, {"symbol": "ETH", "name": "Ethereum", "asset_type": "crypto", "pair": "ETHUSDT"}])
    first = {"platform": "reddit", "external_id": "s1", "author_username": "trader", "subreddit": "Bitcoin", "is_followed_account": 0, "title": "BTC breakout", "body": "", "url": "/r/Bitcoin/s1", "created_at": "2024-01-01T00:00:00+00:00", "score": 5, "comment_count": 1, "raw_payload": {}}
    duplicate = {"platform": "reddit", "external_id": "s1", "author_username": "trader", "subreddit": "Ethereum", "is_followed_account": 0, "title": "ETH gas fees drop", "body": "", "url": "/r/Ethereum/s1", "created_at": "2024-01-01T00:00:00+00:00", "score": 9, "comment_count": 4, "raw_payload": {}}
    assert insert_social(conn, [first]) == 1
    assert insert_social(conn, [duplicate]) == 0
    symbols = [r[0] for r in conn.execute("SELECT a.symbol FROM social_item_assets sia JOIN assets a ON a.id=sia.asset_id").fetchall()]
    assert symbols == ["BTC"]
