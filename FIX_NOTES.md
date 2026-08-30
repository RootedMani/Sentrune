# Sentrune refresh/feature-crash fix

## What was broken
`compute_technical()` in `features/compute.py` set the OHLCV frame's index to
the raw SQLite `timestamp` column, which is a plain string, not a datetime.
Every existing indicator tolerated that, but the newly added
`ta.ichimoku(...)` call internally does `last_index_value + Timedelta(...)`
to build its forward-projection dates, and `str + Timedelta` raises
`TypeError: can only concatenate str (not "Timedelta") to str`.

That exception aborted the whole `features` step (technical indicators AND
sentiment aggregation run in the same call, so sentiment never even started).
The dashboard's refresh button and auto-refresh-on-load both wrapped this in
a bare `except Exception:` that showed a generic "market data source may be
temporarily unavailable" message, so the real cause never surfaced.

## Files changed
- `src/trading_assistant/features/compute.py` — parse `timestamp` to a real
  datetime (`pd.to_datetime(..., utc=True)`) before setting it as the index.
- `src/trading_assistant/dashboard/app.py` — both refresh call sites now log
  the full traceback (`log.exception`) and show the actual exception type/
  message in the UI instead of a canned string.
- `src/trading_assistant/ingest/sources/market_rss.py` — the Google News RSS
  fetcher (needs no API key) now logs a response snippet when it gets zero
  `<item>` elements, since a 200 with an empty feed usually means Google
  served a block/consent page rather than genuinely having no news.

## Separately (not a bug, just config)
`news_items`/`social_items` have been 0 since your very first ingestion run,
independent of the crash above:
- CryptoPanic and Reddit require API credentials (`CRYPTOPANIC_API_KEY`,
  Reddit client id/secret) that aren't in your current env, so those sources
  intentionally return 0 by design.
- Google News RSS needs no key and *should* return items — if it's still 0
  after this fix, check the new warning log lines added above; they'll show
  you the actual HTTP status/body Google is sending back.
