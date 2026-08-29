import sqlite3
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from trading_assistant.features.compute import compute_aggregates
from trading_assistant.features.db.connection import initialize


def _make_db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript("""
    CREATE TABLE assets (id INTEGER PRIMARY KEY, symbol TEXT, name TEXT, asset_type TEXT, exchange TEXT, pair TEXT, is_active INTEGER);
    CREATE TABLE news_items (id INTEGER PRIMARY KEY, source_type TEXT, source_name TEXT, external_id TEXT, headline TEXT, body TEXT, url TEXT, published_at TEXT, raw_sentiment REAL, raw_payload TEXT);
    CREATE TABLE news_item_assets (news_item_id INTEGER, asset_id INTEGER);
    CREATE TABLE social_items (id INTEGER PRIMARY KEY, platform TEXT, external_id TEXT, author_username TEXT, subreddit TEXT, is_followed_account INTEGER, title TEXT, body TEXT, url TEXT, created_at TEXT, score INTEGER, comment_count INTEGER, raw_payload TEXT);
    CREATE TABLE social_item_assets (social_item_id INTEGER, asset_id INTEGER);
    """)
    initialize(conn)
    return conn


def test_aggregates_cover_history_not_just_latest_window():
    # Regression: previously only the single latest window per asset was
    # stored, leaving the modeling layer with no sentiment time series.
    conn = _make_db()
    conn.execute("INSERT INTO assets(id,symbol,name,asset_type,is_active) VALUES(1,'TEST','Test','stock',1)")
    base = datetime(2024, 1, 1, tzinfo=timezone.utc)
    for day in range(10):
        published = (base + timedelta(days=day)).isoformat()
        cur = conn.execute("INSERT INTO news_items(source_type,headline,published_at) VALUES('fixture','h',?)", (published,))
        conn.execute("INSERT INTO news_item_assets(news_item_id,asset_id) VALUES(?,1)", (cur.lastrowid,))
        conn.execute("INSERT INTO text_sentiment(item_type,item_id,positive_prob,negative_prob,neutral_prob,label,computed_at) VALUES('news',?,0.7,0.1,0.2,'positive','2024-01-01T00:00:00+00:00')", (cur.lastrowid,))
    # One followed social mention so the followed split is exercised.
    cur = conn.execute("INSERT INTO social_items(platform,external_id,is_followed_account,created_at) VALUES('reddit','s1',1,?)", ((base + timedelta(days=5)).isoformat(),))
    conn.execute("INSERT INTO social_item_assets(social_item_id,asset_id) VALUES(?,1)", (cur.lastrowid,))
    conn.execute("INSERT INTO text_sentiment(item_type,item_id,positive_prob,negative_prob,neutral_prob,label,computed_at) VALUES('social',?,0.9,0.0,0.1,'positive','2024-01-01T00:00:00+00:00')", (cur.lastrowid,))
    conn.commit()

    settings = SimpleNamespace(sentiment_windows_hours=[24])
    total = compute_aggregates(conn, settings)
    assert total >= 10
    ends = conn.execute("SELECT COUNT(DISTINCT window_end) FROM sentiment_aggregates WHERE asset_id=1 AND window_hours=24").fetchone()[0]
    assert ends == total
    assert ends > 1, "aggregates must be a time series, not a single latest window"

    # The window containing both news (scalar 0.6) and the followed social item
    # (scalar 0.9) reports the followed split separately.
    window_rows = conn.execute("SELECT * FROM sentiment_aggregates WHERE asset_id=1 AND window_hours=24 AND window_end=? ORDER BY mention_volume DESC", ((base + timedelta(days=6)).isoformat(),)).fetchall()
    assert window_rows, "expected an aggregate row near the overlap window"
    conn.close()


def test_aggregates_are_idempotent_on_rerun():
    conn = _make_db()
    conn.execute("INSERT INTO assets(id,symbol,name,asset_type,is_active) VALUES(1,'TEST','Test','stock',1)")
    base = datetime(2024, 2, 1, tzinfo=timezone.utc)
    for day in range(4):
        cur = conn.execute("INSERT INTO news_items(source_type,headline,published_at) VALUES('fixture','h',?)", ((base + timedelta(days=day)).isoformat(),))
        conn.execute("INSERT INTO news_item_assets(news_item_id,asset_id) VALUES(?,1)", (cur.lastrowid,))
        conn.execute("INSERT INTO text_sentiment(item_type,item_id,positive_prob,negative_prob,neutral_prob,label,computed_at) VALUES('news',?,0.6,0.1,0.3,'positive','2024-01-01T00:00:00+00:00')", (cur.lastrowid,))
    conn.commit()
    settings = SimpleNamespace(sentiment_windows_hours=[24])
    first = compute_aggregates(conn, settings)
    second = compute_aggregates(conn, settings)
    assert first > 0 and second == first
    count = conn.execute("SELECT COUNT(*) FROM sentiment_aggregates").fetchone()[0]
    assert count == first, "re-running must upsert in place, never duplicate rows"
    conn.close()
