# Sentrune Feature Engineering

> Restructured 2026-08-29: this layer now lives at `src/trading_assistant/features`,
> its config at `config/features.yaml`, and every command runs from the project root
> (`python -m trading_assistant.features` or `python run_pipeline.py features`). The
> setup snippets below predate the restructure; the root README quickstart is authoritative.

This additive package reads the existing data-layer SQLite tables and writes technical indicators, local FinBERT item-level scores, and source-attributed rolling sentiment features. It does not modify the data layer or its tables.

## Setup and execution

The package expects the data layer to have run first and populated `assets`, `price_bars`, `news_items`, `news_item_assets`, `social_items`, and `social_item_assets`. From this directory:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .            # technical + aggregation features and tests
pip install -e ".[finbert]" # additionally installs Transformers + PyTorch for real FinBERT scoring
cp config/features.example.yaml config/features.yaml
feature-compute --config config/features.yaml
```

The default database path is `../data/trading_assistant.sqlite3`, relative to this package directory, matching the data layer's repository-level shared database convention; the `DB_PATH` environment variable (set by `run_pipeline.py`) overrides the YAML so all three layers converge on one database. Change `db_path` if the data layer database is elsewhere. The operation is repeatable: technical rows are upserted by asset, interval, and timestamp and tracked in `feature_state`; sentiment rows are unique by item type and item ID and only missing items are sent to FinBERT; aggregate rows are upserted by asset, window end, and window length and cover the **full covered history** on a regular UTC-aligned grid per window length, so the modeling layer trains on a sentiment time series rather than a single latest window.

## FinBERT

The default model is [`ProsusAI/finbert`](https://huggingface.co/ProsusAI/finbert), loaded locally through Hugging Face Transformers. The first run downloads the model and tokenizer, which together require a few hundred megabytes of disk and several gigabytes of practical memory depending on runtime and cache configuration. CPU inference is free and suitable for prototype volumes but can be slow; a GPU such as a free-tier Colab runtime is substantially faster for historical backfills. The scorer processes texts in configurable batches and stores positive, negative, and neutral probabilities plus the top label.

## Configuration

`config/features.yaml` controls intervals, optional asset symbol filtering, indicator families, aggregation windows in hours, model name, and inference batch size. An empty `assets` list means all active assets already present in the data-layer database.

| Setting | Meaning |
|---|---|
| `intervals` | Price-bar intervals to process, such as `1d` or `1h`. |
| `assets` | Optional list of symbols; empty means every active asset. |
| `indicators` | Indicator families computed with pandas-ta. |
| `sentiment_windows_hours` | Trailing aggregation windows, such as 24 and 168 hours. |
| `sentiment_batch_size` | Number of texts passed to FinBERT per inference batch. |

## Technical features

Technical features use a **wide** table because downstream model training commonly selects a timestamp row as a feature vector. The additive `technical_features` table contains SMA(20/50/200), EMA(12/26), MACD, MACD signal and histogram, RSI(14), stochastic K/D, Bollinger lower/middle/upper bands, ATR(14), OBV, and volume SMA(20). Warm-up rows remain null and are not treated as errors; a row is stored when at least one configured indicator has a value.

## Sentiment features

`text_sentiment` stores three FinBERT probabilities for every news or social item, with a polymorphic `(item_type, item_id)` relationship. SQL cannot use one foreign key to two parent tables, so the application validates the item type and ID before writing. The original data-layer `news_items.raw_sentiment` is never used as a replacement for FinBERT and remains available as a separate source-provided signal.

The scalar used by `sentiment_aggregates` is **positive probability minus negative probability**. For each asset and trailing window, the package stores mean scalar sentiment, item count, and sample standard deviation. It also computes those three values separately for followed Reddit accounts and for unattributed/general items. A subgroup with zero mentions reports a neutral scalar of 0.0 with zero volatility — "no followed source posted" is a zero-count fact, not missing data — while a fully empty window keeps `avg_sentiment` null and `mention_volume` 0 to honestly mark no coverage. Publisher curation can be incorporated by assigning the appropriate source relationship in the data layer; this package does not invent attribution when junction rows are absent.

## Additive schema

Only `schema_additions.sql` is executed. It creates `technical_features`, `text_sentiment`, `sentiment_aggregates`, and `feature_state`, with foreign keys to the existing `assets` table and indexes on the primary modeling query dimensions.

## Tests and non-goals

The tests use synthetic OHLCV and sentiment data, plus a stubbed classifier, so they do not download FinBERT or call external services. A live model test is intentionally not included in the default suite. This layer does not build a prediction model, backtester, alerting rules, notification system, dashboard, user accounts, or API service.
