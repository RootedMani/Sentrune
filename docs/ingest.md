# Sentrune Data Layer

> Restructured 2026-08-29: this layer now lives at `src/trading_assistant/ingest`,
> configs at `config/`, keys in `.env` at the project root, and every command runs
> from the project root (`python -m trading_assistant.ingest` or
> `python run_pipeline.py ingest`). The setup snippets below predate the restructure;
> the root README quickstart is authoritative.

This repository contains the **data layer only** for the Trader's Assistant prototype. It ingests price bars, market news, CryptoPanic headlines, and Reddit posts/comments into a local SQLite database. The package is deliberately source-agnostic at its normalized boundary so later feature-engineering, modeling, alerting, and dashboard work can query consistent records.

## Setup

Use Python 3.10 or newer. From the repository root, create a virtual environment and install the package:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
pip install -r requirements-dev.txt
cp .env.example .env
```

The default `config/assets.yaml` and `config/sources.yaml` files are runnable examples. Edit them to change tracked assets, subreddits, and named Reddit accounts. API credentials are loaded only from environment variables or `.env`; no credentials are committed.

Reddit requires one free manual setup step. Visit [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps), choose **create another app**, select the **script** application type, and place the resulting client ID and secret in `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`. This is a free API app registration, not a paid service. Named-account tracking is configured in `config/sources.yaml` under `usernames`, while subreddit tracking is configured under `subreddits`.

## Running one ingestion cycle

Run the complete pipeline with:

```bash
trading-ingest
```

The equivalent module invocation is:

```bash
python -m data_layer.ingest --assets config/assets.yaml --sources config/sources.yaml
```

The SQLite database is created at `data/trading_assistant.sqlite3` by default. A cron job can invoke the command periodically; this package intentionally does not implement a scheduler.

## Data model

The schema uses ordinary relational tables and explicit join tables for asset relationships. Price queries are indexed by asset, interval, and timestamp. News and social records retain source payloads and source-provided sentiment values without calculating a new score.

| Table | Purpose |
|---|---|
| `assets` | Canonical tracked stock and crypto instruments. |
| `price_bars` | Normalized OHLCV bars from yfinance or Binance. |
| `news_items` | Normalized headlines, publisher, URL, time, body, and raw sentiment. |
| `news_item_assets` | Many-to-many relationship between headlines and assets. |
| `social_items` | Reddit posts/comments with author, subreddit, attribution, and engagement. |
| `social_item_assets` | Many-to-many relationship between social items and assets. |
| `followed_sources` | First-class curated/custom subreddit and named-account sources. |
| `ingestion_log` | Per-source run audit records and recoverable error messages. |
| `ingestion_state` | Last-success state used for incremental fetching. |

## Incremental and idempotent behavior

Each source/entity combination has a row in `ingestion_state`. When a prior successful timestamp exists, price fetchers pass it as the next start boundary, Reddit filters returned items against it, and CryptoPanic receives the boundary as `published_after`. SQLite uniqueness constraints make repeated records harmless even if a provider overlaps the boundary or returns the same item again: a fully ignored duplicate is a pure no-op and never writes new asset junction rows, so re-runs cannot corrupt attribution. Providers that ship explicit related symbols (Finnhub `related`, CryptoPanic `currencies`, Alpha Vantage `ticker_sentiment`) are matched exactly; otherwise asset mentions are matched as whole words in the headline/body so words like "together" do not falsely tag ETH. Binance kline open times are normalized to UTC regardless of server timezone. A source failure is logged and does not prevent other sources from running. Missing optional credentials cause that source to be skipped with an informational log rather than crashing the cycle.

## Free-tier limits and failure behavior

| Source | Credential requirement | Limit handling |
|---|---|---|
| yfinance | None | Provider errors are caught and logged per asset. |
| Binance public REST | None for market data | Requests use timeouts and a small inter-request delay; HTTP and malformed-response errors are isolated. |
| Finnhub | Free API key | The client spaces calls at roughly one second and logs HTTP 429 responses. |
| Alpha Vantage | Free API key | The client spaces calls at roughly four seconds and recognizes `Note`/`Information` throttling responses. It runs as the stock-news source only when no Finnhub key is configured, so the two free providers never double-fetch the same headlines. |
| CryptoPanic | Free API token | HTTP 429 and malformed responses are logged and skipped. |
| Reddit/PRAW | Free script app credentials | The fetcher waits one second between listing requests by default, logs available PRAW limit information, and isolates failures per subreddit/account and endpoint. |

For Reddit specifically, one subreddit can issue up to two listing requests and one named account can issue up to two listing requests. The default one-second delay between requests keeps the cadence at approximately 60 requests per minute or lower. Each run is capped at 10 subreddits and 20 usernames by default; override `REDDIT_DELAY_SECONDS`, `REDDIT_MAX_SUBREDDITS`, and `REDDIT_MAX_USERNAMES` in `.env` only when the deployment's request budget supports it. A bad subreddit, deleted account, malformed item, or endpoint failure is logged and skipped without discarding records already collected from earlier entities.

Provider policies and limits can change. The implementation treats rate-limit responses as recoverable, records the run in `ingestion_log`, and continues rather than retrying aggressively or risking a key ban.

## Tests

The test suite uses local sample-shaped objects and an in-memory SQLite database, so it does not call live APIs or consume rate-limit budget:

```bash
pytest -q
```

## Explicit non-goals

This package does **not** compute sentiment scores, technical indicators, ML predictions, backtests, alerts, user accounts, dashboards, or an API server. It does not integrate with X/Twitter and does not use paid services. The downstream feature-engineering layer should consume `news_items.raw_sentiment` as an optional provider field and perform any FinBERT scoring separately. The downstream alerting layer can use `followed_sources` and `is_followed_account` to attribute events to named sources.

## References

[1]: https://developer.yahoo.com/finance/ Yahoo Finance developer resources.
[2]: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/general-endpoints Binance Spot REST API documentation.
[3]: https://finnhub.io/docs/api Finnhub API documentation.
[4]: https://www.alphavantage.co/documentation/ Alpha Vantage documentation.
[5]: https://cryptopanic.com/developers/api/ CryptoPanic API documentation.
[6]: https://praw.readthedocs.io/ PRAW documentation.
