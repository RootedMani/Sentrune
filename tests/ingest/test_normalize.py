import json
from pathlib import Path
from types import SimpleNamespace

import pandas as pd

FIXTURES = Path(__file__).parent / "fixtures"

from trading_assistant.ingest.normalize.news_items import normalize_news
from trading_assistant.ingest.normalize.price_bars import normalize_binance_klines, normalize_bar, normalize_yfinance_frame
from trading_assistant.ingest.normalize.social_items import normalize_reddit


def test_yfinance_multiindex_and_naive_dates_are_normalized():
    # Regression: yfinance >= 0.2.x returns MultiIndex columns (Price, Ticker)
    # and a tz-naive Date index even for a single ticker; the flat-column
    # assumption broke real ingestion, and naive dates broke UTC consistency
    # with Binance bars.
    frame = pd.DataFrame(
        {"Open": [1.0], "High": [2.0], "Low": [0.5], "Close": [1.5], "Volume": [1000.0]},
        index=pd.DatetimeIndex(["2024-01-02"], name="Date"),
    )
    frame.columns = pd.MultiIndex.from_tuples([(c, "AAPL") for c in frame.columns])
    rows = normalize_yfinance_frame(3, "1d", frame)
    assert len(rows) == 1
    assert rows[0]["close"] == 1.5
    assert rows[0]["timestamp"] == "2024-01-02T00:00:00+00:00"
    assert rows[0]["source"] == "yfinance"


def test_yfinance_nan_rows_are_dropped():
    frame = pd.DataFrame(
        {"Open": [1.0, None], "High": [2.0, None], "Low": [0.5, None], "Close": [1.5, None], "Volume": [1000.0, 0.0]},
        index=pd.DatetimeIndex(["2024-01-02", "2024-01-03"]),
    )
    rows = normalize_yfinance_frame(3, "1d", frame)
    assert [r["timestamp"] for r in rows] == ["2024-01-02T00:00:00+00:00"]


def test_binance_kline_normalization():
    rows = normalize_binance_klines(7, "1d", json.loads((FIXTURES / "binance_klines.json").read_text())[0:1])
    assert rows[0]["asset_id"] == 7
    assert rows[0]["close"] == 1.5
    assert rows[0]["source"] == "binance"


def test_news_normalization_preserves_sentiment():
    raw = json.loads((FIXTURES / "cryptopanic_posts.json").read_text())["results"][0]
    raw["sentiment"] = 0.8
    item = normalize_news(raw, "cryptopanic", "Example")
    assert item["external_id"] == "202"
    assert item["raw_sentiment"] == 0.8
    assert item["source_name"] == "Example"


def test_reddit_named_account_is_marked():
    author = SimpleNamespace(name="TrackedTrader")
    subreddit = SimpleNamespace(display_name="stocks")
    post = SimpleNamespace(id="abc", author=author, subreddit=subreddit, created_utc=1700000000, title="A post", selftext="body", permalink="/r/stocks/abc", score=10, num_comments=2)
    row = normalize_reddit(post, {"TrackedTrader"})
    assert row["is_followed_account"] == 1
    assert row["subreddit"] == "stocks"
    assert row["comment_count"] == 2


def test_binance_klines_are_normalized_to_utc():
    # Regression: open times must be stored as UTC, not server-local wall time.
    # Fixture open time 1700000000000 ms == 2023-11-14T22:13:20Z.
    rows = normalize_binance_klines(7, "1d", json.loads((FIXTURES / "binance_klines.json").read_text())[0:1])
    assert rows[0]["timestamp"] == "2023-11-14T22:13:20+00:00"


def test_alpha_vantage_time_published_is_parsed():
    # Regression: Alpha Vantage stamps are compact UTC (YYYYMMDDTHHMMSS);
    # previously they fell through to "now", destroying the item timeline.
    raw = {"title": "Markets close higher", "summary": "Indices rallied.", "source": "AV", "url": "https://example.test/av", "time_published": "20240103T153000", "sentiment_score": 0.25, "ticker_sentiment": [{"ticker": "AAPL", "relevance_score": "0.9"}]}
    item = normalize_news(raw, "alpha_vantage")
    assert item["published_at"] == "2024-01-03T15:30:00+00:00"
    assert item["headline"] == "Markets close higher"
    assert item["raw_sentiment"] == 0.25
    assert item["related_symbols"] == ["AAPL"]


def test_finnhub_and_cryptopanic_related_symbols_are_extracted():
    finnhub = normalize_news({"headline": "h", "datetime": 1700000000, "related": "AAPL,MSFT", "url": "u"}, "finnhub")
    assert finnhub["related_symbols"] == ["AAPL", "MSFT"]
    cryptopanic = normalize_news({"title": "t", "published_at": "2024-01-01T00:00:00Z", "url": "u", "currencies": [{"code": "BTC"}, {"code": "ETH"}]}, "cryptopanic")
    assert cryptopanic["related_symbols"] == ["BTC", "ETH"]


def test_followed_username_prefix_is_not_stripped_character_wise():
    # Regression: lstrip("u/") stripped every leading 'u' and '/', mangling
    # "u/uranus" into "ranus" so followed-account attribution silently failed.
    post = SimpleNamespace(id="abc", author=SimpleNamespace(name="uranus"), subreddit=SimpleNamespace(display_name="ethfinance"), created_utc=1700000000, title="A post", selftext="body", permalink="/r/ethfinance/abc", score=1, num_comments=0)
    row = normalize_reddit(post, {"u/uranus"})
    assert row["is_followed_account"] == 1
    post_other = SimpleNamespace(id="def", author=SimpleNamespace(name="someoneelse"), subreddit=SimpleNamespace(display_name="ethfinance"), created_utc=1700000000, title="B post", selftext="body", permalink="/r/ethfinance/def", score=1, num_comments=0)
    assert normalize_reddit(post_other, {"u/uranus"})["is_followed_account"] == 0
