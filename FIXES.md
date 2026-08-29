# FIXES.md — What was fixed in this codebase

This is a working prototype. Everything below was found by real code review, fixed,
and covered by regression tests. All tests pass: **data-layer 16, feature-engineering 7,
model 10 (1 torch skip)** — plus a real end-to-end pipeline run (ingest → features → train)
and a dashboard state-matrix verification.

## Round 2 — runnability pass (pipeline runner + dashboard)

Found by actually running the pipeline on real network data, twice, and by opening the
dashboard against every partial-pipeline database state.

| # | File | What was broken | What it does now |
|---|------|-----------------|------------------|
| R1 | `data_layer/normalize/price_bars.py` | yfinance ≥0.2 returns MultiIndex columns and tz-naive dates; the flat-column assumption broke real ingestion. | MultiIndex flattened, rows with NaN OHLC dropped, naive stamps localized to UTC (matches Binance convention). |
| R2 | `data_layer/sources/stocks.py` | First run fetched ~1 month of bars (yfinance default) — starves `sma_200` warm-up and walk-forward splits. | No-start fetches default to 2 years of daily bars. |
| R3 | `data_layer/sources/stocks.py` | Incremental runs passed a full ISO string as `start`; yfinance's parser rejected it ("unconverted data remains") — **every run after the first failed**. | A UTC `datetime` object is passed instead. |
| R4 | FE/model `config.py` + `config/*.yaml` | feature-engineering resolved `../../data/` — one level above the shared DB — silently creating a stray empty database; model/FE ignored `DB_PATH`. | Correct relative defaults in all layers; `DB_PATH` env (set by `run_pipeline.py`) overrides YAML everywhere, so all three layers converge on one database from any CWD. |
| R5 | `modeling/features.py`, `modeling/compute.py` | Empty `sentiment_aggregates` (fresh install, no news keys) crashed `merge_asof` on an int64/object key mismatch, and dropna discarded every row — training impossible for all assets. | As-of join skipped when sentiment is empty; sentiment feature columns pruned with a logged warning; honest technical-only training. |
| R6 | `dashboard/app.py`, `run_pipeline.py` (new) | No way to see or test the system as a whole. | Single-file read-only dashboard (prices, technicals, sentiment, news/social, prediction + validation) and a one-command pipeline runner; verified against missing/empty/partial/full DB states. |

## Round 1 — code review fixes

## Data layer (data-layer/)

| # | File | What was broken | What it does now |
|---|------|-----------------|------------------|
| D1 | `data_layer/db/connection.py` | `insert_news`/`insert_social` used a stale `lastrowid` after `INSERT OR IGNORE`. A duplicate payload's asset tags got attached to the *original* item. | A fully-ignored duplicate is now a clean no-op. Re-running ingestion is harmless, as the README promises. |
| D2 | `data_layer/db/connection.py` | `_asset_ids` matched symbols by plain substring — the word "together" tagged ETH. | Word-boundary regex matching; explicit `related_symbols` still win. |
| D3 | `data_layer/normalize/price_bars.py` | Binance klines were normalized to server-local time, not UTC. | Klines normalized to UTC. |
| D4 | `data_layer/normalize/news_items.py` | Alpha Vantage `time_published` (YYYYMMDDTHHMMSS) was ignored; items stamped "now". | Parsed as UTC. |
| D5 | `data_layer/normalize/news_items.py` | `related_symbols` never extracted for Finnhub / CryptoPanic / Alpha Vantage. | Extracted from Finnhub `related`, CryptoPanic `currencies`, AV `ticker_sentiment`. |
| D6 | `sources/reddit.py`, `normalize/social_items.py` | `lstrip("u/")` mangled usernames (e.g. `u/uranus` → `ranus`). | `removeprefix("u/")`. |
| D7 | `data_layer/db/connection.py` | `insert_price_bars` counted fetched rows, not inserted rows — inflated stats. | Counts actually-inserted rows. |
| D8 | `data_layer/ingest.py` | Alpha Vantage was dead code; CryptoPanic had no incremental cursor. | AV wired as stock-news fallback when Finnhub key absent; CryptoPanic gets incremental `published_after`. |

## Feature engineering (feature-engineering/)

| # | File | What was broken | What it does now |
|---|------|-----------------|------------------|
| F1 | `feature_engineering/compute.py` | Aggregates only computed the *latest* window — the model layer starved of sentiment history. | Full-history aggregates on a UTC-aligned grid per `window_hours`; O(items) two-pointer; idempotent upserts. |
| F2 | `sentiment/aggregation.py` | Empty followed/unattributed subgroups produced missing rows. | Zero-count subgroups report neutral 0.0 (a fact, not missing data); fully-empty windows keep `NULL` honestly. This recovered 70 → 246 usable training rows in the smoke fixture. |
| F3 | `pyproject.toml` | `transformers`+`torch` were hard dependencies. | Moved to optional `[finbert]` extra; tests run heavy-free. |

## Model layer (model/)

| # | File | What was broken | What it does now |
|---|------|-----------------|------------------|
| M1 | `validation/walk_forward.py` | Splits leaked label information: the last `horizon_bars` training rows reached into the test window. | Purge/embargo parameter; caller passes `purge=horizon_bars`. |

## How to run it

```bash
# tests (no network, no API keys needed)
cd data-layer && pip install -e . && pip install -r requirements-dev.txt && pytest -q
cd ../feature-engineering && pip install -e . && pytest -q
cd ../model && pip install -e . && pip install -r requirements.txt && pytest -q
```

Real ingestion needs API keys in `data-layer/.env` (copy `.env.example`).

## Setup hardening (2026-08-29)

First real-world install on a user machine hit two failure modes: Python 3.14 has no
`numba` wheels (so `pandas-ta` forced a doomed source build), and a flaky local proxy
killed downloads mid-install, leaving a bare environment that then crashed with raw
`ModuleNotFoundError` tracebacks. The whole stack was re-verified end-to-end after
these changes (Python 3.12): 32 unit tests green, full zero-key pipeline against real
yfinance/Binance data, dashboard state matrix green.

| # | File | What was broken | What it does now |
|---|------|-----------------|------------------|
| S1 | all three `pyproject.toml` | `requires-python = ">=3.10"` let pip attempt Python 3.14, where `pandas-ta` → `numba` has no wheels and install dies on a source build. | Capped at `>=3.10,<3.14`; pip now fails fast with a clear "requires a different Python" error instead of a half-downloaded environment. |
| S2 | `run_pipeline.py` | With missing deps it crashed with a raw traceback (`No module named 'yaml'`); no guard against unsupported Python. | `preflight()` checks Python version and all required packages (and streamlit for `dashboard`), and prints exactly what is missing plus the one-line fix. |
| S3 | `constraints.txt` (new) | Fresh installs resolved whatever pip picked that day (e.g. pandas 3.x on some machines, untested combinations on others). | Pinfile of the exact verified stack (pandas 3.0.5, pandas-ta 0.4.71b0, numba 0.61.2, streamlit 1.62.0, yfinance 1.7.0, …); quickstart installs with `-c constraints.txt`. |

Verified stack (2026-08-28, Python 3.12, from `constraints.txt`): data-layer 16 / FE 7 /
model 9 (+1 torch skip) tests green; from-scratch `python run_pipeline.py all` with real
yfinance (AAPL/MSFT 2y daily) and Binance (BTC/ETH 1000 daily klines) green; dashboard
AppTest matrix green on streamlit 1.62 against demo, fresh, partial, and empty databases.

## Restructure (2026-08-29)

The three separately packaged layers were merged into ONE installable package so the
prototype is smaller to install, test, and show. No behavior changed: same schemas,
same fix history, same 4-command quickstart.

| Change | Before | After |
|---|---|---|
| Packages | three separate packages (three `pip install -e` runs) | one: `trading_assistant` (`pip install -e .`) |
| Code | `data-layer/data_layer/`, `feature-engineering/feature_engineering/`, `model/modeling/` | `src/trading_assistant/{ingest,features,modeling,dashboard}` |
| Configs | three per-layer `config/` dirs | one `config/` at the project root |
| Tests | one `tests/` dir per layer | `tests/{ingest,features,modeling}` at the root |
| Trained artifacts | `model/models/<asset>/` | `models/<asset>/` |
| API keys | `data-layer/.env` | `.env` at the project root |
| Layer docs | three READMEs | `docs/{ingest,features,modeling}.md` |
| Entry points | `python -m data_layer.ingest` etc. (per-layer CWDs) | `python -m trading_assistant.<layer>` (everything from the root) |

Sections D/F/M/R/S above reference file paths as they were at the time of each fix.
After the move, everything was re-verified: full pytest suite, from-scratch live
pipeline (real Yahoo + Binance data), idempotent re-run, and the dashboard state
matrix including the demo database with artifacts stored under the old layout.

Upgrade note: trained `.joblib` artifacts pickle the model class by module path, so
models trained BEFORE this restructure (`modeling.*`) cannot load under the new
package (`trading_assistant.modeling.*`). After upgrading, re-run
`python run_pipeline.py train` once - the shipped demo artifacts were already
retrained under the new layout.
