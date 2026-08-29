# Sentrune (prototype)

Free-tier market intelligence + explainable prediction prototype for retail traders.
One installable package (`trading_assistant`) with three pipeline layers and a
read-only dashboard, all writing into one SQLite database. Probability, not
certainty - the model outputs down/flat/up probabilities and is always compared
against naive baselines.

## Quickstart (4 commands)

```bash
# Needs Python 3.10-3.13 (3.12 recommended - 3.14 has no numba wheels yet)
python -m venv .venv && source .venv/bin/activate
pip install -c constraints.txt -e .
python run_pipeline.py all        # ingest -> features -> train (works with ZERO api keys)
python run_pipeline.py dashboard  # open http://localhost:8501
```

`constraints.txt` pins the exact dependency stack the prototype was last verified
on (see `FIXES.md`), so a fresh install reproduces a known-good setup instead of
gambling on whatever pip resolves that day. One `pip install -e .` now covers the
pipeline, the dashboard, and the test dependencies.

`all` runs the three steps in order and stops at the first failure. Steps are also
runnable one at a time (`ingest`, `features`, `train`) and are idempotent - re-running
never duplicates rows. `status` prints table counts and the last ingestion runs.

With no API keys you still get real prices (yfinance + Binance public API), technical
indicators, and trained models. To light up news (Finnhub or Alpha Vantage,
CryptoPanic) and Reddit social data, copy `.env.example` to `.env` at the project
root and fill in free keys; re-run `python run_pipeline.py all` and the sentiment
panels fill in.

## Layout

```
run_pipeline.py            one entry point: status / ingest / features / train / all / dashboard
pyproject.toml             single package definition (one `pip install -e .`)
constraints.txt            exact verified dependency stack
.env.example               template for optional API keys (copy to .env)
config/                    all yaml configs: assets, sources, features, modeling
src/trading_assistant/
  ingest/                  prices (yfinance, Binance), news (Finnhub/AV, CryptoPanic), Reddit -> SQLite
  features/                pandas-ta indicators + FinBERT sentiment + rolling aggregates
  modeling/                LightGBM walk-forward validation vs naive baselines, saved artifacts
  dashboard/app.py         read-only Streamlit UI: prices, technicals, sentiment, predictions
tests/                     pytest suites per layer (run `pytest -q` at the root)
docs/                      per-layer deep dives: data model, FinBERT, label formula
data/                      shared SQLite database (created on first run)
models/                    trained LightGBM artifacts (created by `train`)
white_paper/               investor-facing white paper
FIXES.md                   changelog of every reviewed bug, fix, and restructure
```

Note: `data/` ships with a demo database built from real market data on 2026-08-28
(AAPL/MSFT ~2y daily bars, BTC/ETH ~1000 daily klines, trained models) so the dashboard
works before your first ingest. Delete the `data/` and `models/` directories to
start from scratch - `python run_pipeline.py all` rebuilds everything.

## What the dashboard shows

- **Overview** - row counts per table, ingestion log with per-source status, next-step hints
- **Prices** - close and volume from real ingested bars
- **Technicals** - moving averages, RSI(14), MACD computed by the feature layer
- **Sentiment** - rolling aggregates split into followed vs unattributed accounts
- **News / Social** - latest linked items with FinBERT labels
- **Model** - latest down/flat/up prediction with the exact as-of timestamp, plus
  walk-forward accuracy and log loss against buy-and-hold and MA-crossover baselines

## Configuration

- Assets: `config/assets.yaml` (default: AAPL, MSFT, BTC, ETH)
- Sources and Reddit pacing caps: `config/sources.yaml`
- Features and sentiment windows: `config/features.yaml`
- Labels, folds, horizon: `config/modeling.yaml`
- All layers converge on one database; `DB_PATH` (set by `run_pipeline.py`) overrides it.
- API keys go in `.env` at the project root (copy `.env.example`); no credentials are committed.

Reddit needs one free manual step: create a "script" app at
[reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) and put the client ID and
secret into `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`. Deeper per-layer
documentation - the data model, free-tier limit handling, FinBERT details, and the
label/walk-forward formulas - lives in `docs/`.

## Setup notes (when install or first run goes wrong)

- **Python version**: 3.10–3.13 only (3.12 recommended). On 3.14 the install fails
  because `pandas-ta` → `numba` has no wheels for it yet; the `pyproject.toml`
  refuses anything above 3.13 with a clear error. With conda:
  `conda create -n sentrune python=3.12 && conda activate sentrune` - then run the
  quickstart commands without the `venv` line.
- **Install keeps failing mid-download**: pip needs a stable connection for the whole
  install. If you are behind a local proxy/VPN, start it first and keep it running;
  if a download breaks, just re-run the same `pip install` command - pip caches what
  already downloaded, so a retry is cheap. `pip install --retries 10 --timeout 120 ...`
  tolerates flaky networks.
- **`ModuleNotFoundError` (or similar)**: the environment you are running from is not
  the one you installed into - re-activate it, or just run `python run_pipeline.py all`
  and it will tell you exactly what is missing and the command to fix it.
