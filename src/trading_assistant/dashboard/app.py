"""Read-only Streamlit dashboard over the prototype's shared SQLite database.

Launch from the project root (or just `python run_pipeline.py dashboard`):

    streamlit run src/trading_assistant/dashboard/app.py

The dashboard never writes: every panel is a SELECT against
data/trading_assistant.sqlite3, plus a read of the latest LightGBM artifact
for the current prediction. Empty tables render an honest hint instead of
pretending data exists.
"""
from __future__ import annotations

import os
import sqlite3
import time
from pathlib import Path

import joblib
import pandas as pd
import streamlit as st
from streamlit_autorefresh import st_autorefresh

from trading_assistant.ingest.pipeline import run as run_ingestion

# app.py sits at src/trading_assistant/dashboard/ -> project root is 3 levels up.
ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DB = Path(os.getenv("DB_PATH", str(ROOT / "data" / "trading_assistant.sqlite3")))
MODEL_ROOT = Path(os.getenv("SENTRUNE_MODEL_DIR", str(ROOT / "models")))

LABELS = {0: "down", 1: "flat", 2: "up"}
TECHNICAL_COLUMNS = ["sma_20", "sma_50", "sma_200", "ema_12", "ema_26", "macd", "macd_signal", "macd_histogram", "rsi_14", "stoch_k", "stoch_d", "bb_lower", "bb_middle", "bb_upper", "atr_14", "obv", "volume_sma_20"]
SENTIMENT_COLUMNS = ["avg_sentiment", "mention_volume", "sentiment_volatility", "followed_avg_sentiment", "followed_mention_volume", "followed_sentiment_volatility", "unattributed_avg_sentiment", "unattributed_mention_volume", "unattributed_sentiment_volatility"]

st.set_page_config(page_title="Sentrune", page_icon=None, layout="wide")


def connect(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def table_exists(db_path: str, table: str) -> bool:
    # Layers create their tables lazily: after `ingest` only data-layer tables
    # exist, after `train` the model tables appear. The dashboard must render
    # every partial-pipeline state without crashing.
    with connect(db_path) as conn:
        row = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone()
    return row is not None


@st.cache_data(ttl=30)
def load_assets(db_path: str) -> pd.DataFrame:
    with connect(db_path) as conn:
        return pd.read_sql_query("SELECT id, symbol, name, asset_type, exchange FROM assets WHERE is_active=1 ORDER BY symbol", conn)


@st.cache_data(ttl=30)
def load_prices(db_path: str, asset_id: int, interval: str) -> pd.DataFrame:
    with connect(db_path) as conn:
        return pd.read_sql_query("SELECT timestamp, open, high, low, close, volume FROM price_bars WHERE asset_id=? AND interval=? ORDER BY timestamp", conn, params=(asset_id, interval))


@st.cache_data(ttl=30)
def load_technical(db_path: str, asset_id: int, interval: str) -> pd.DataFrame:
    with connect(db_path) as conn:
        columns = ", ".join(["timestamp"] + TECHNICAL_COLUMNS)
        return pd.read_sql_query(f"SELECT {columns} FROM technical_features WHERE asset_id=? AND interval=? ORDER BY timestamp", conn, params=(asset_id, interval))


@st.cache_data(ttl=30)
def load_aggregates(db_path: str, asset_id: int) -> pd.DataFrame:
    with connect(db_path) as conn:
        columns = ", ".join(["window_end", "window_hours"] + SENTIMENT_COLUMNS)
        return pd.read_sql_query(f"SELECT {columns} FROM sentiment_aggregates WHERE asset_id=? ORDER BY window_end", conn, params=(asset_id,))


@st.cache_data(ttl=30)
def load_news(db_path: str, asset_id: int, limit: int = 25) -> pd.DataFrame:
    with connect(db_path) as conn:
        # text_sentiment only exists after the feature-engineering layer ran;
        # until then show the news honestly as 'not scored' instead of crashing.
        if table_exists(db_path, "text_sentiment"):
            query = """SELECT n.published_at, n.source_type, n.source_name, n.headline,
                              n.body, n.url, COALESCE(s.label, 'not scored') sentiment
                       FROM news_items n
                       JOIN news_item_assets a ON a.news_item_id = n.id
                       LEFT JOIN text_sentiment s ON s.item_type='news' AND s.item_id = n.id
                       WHERE a.asset_id=? ORDER BY n.published_at DESC LIMIT ?"""
        else:
            query = """SELECT n.published_at, n.source_type, n.source_name, n.headline,
                              n.body, n.url, 'not scored' sentiment
                       FROM news_items n
                       JOIN news_item_assets a ON a.news_item_id = n.id
                       WHERE a.asset_id=? ORDER BY n.published_at DESC LIMIT ?"""
        return pd.read_sql_query(query, conn, params=(asset_id, limit))


@st.cache_data(ttl=30)
def load_social(db_path: str, asset_id: int, limit: int = 25) -> pd.DataFrame:
    with connect(db_path) as conn:
        if table_exists(db_path, "text_sentiment"):
            query = """SELECT x.created_at, x.platform, x.author_username, x.subreddit,
                              x.is_followed_account, x.score, x.title,
                              COALESCE(s.label, 'not scored') sentiment
                       FROM social_items x
                       JOIN social_item_assets a ON a.social_item_id = x.id
                       LEFT JOIN text_sentiment s ON s.item_type='social' AND s.item_id = x.id
                       WHERE a.asset_id=? ORDER BY x.created_at DESC LIMIT ?"""
        else:
            query = """SELECT x.created_at, x.platform, x.author_username, x.subreddit,
                              x.is_followed_account, x.score, x.title,
                              'not scored' sentiment
                       FROM social_items x
                       JOIN social_item_assets a ON a.social_item_id = x.id
                       WHERE a.asset_id=? ORDER BY x.created_at DESC LIMIT ?"""
        return pd.read_sql_query(query, conn, params=(asset_id, limit))


@st.cache_data(ttl=30)
def load_ingestion_log(db_path: str, limit: int = 12) -> pd.DataFrame:
    with connect(db_path) as conn:
        return pd.read_sql_query("SELECT started_at, source, status, records_fetched, error_message FROM ingestion_log ORDER BY id DESC LIMIT ?", conn, params=(limit,))


@st.cache_data(ttl=30)
def load_model_runs(db_path: str, asset_id: int) -> pd.DataFrame:
    if not table_exists(db_path, "model_runs"):
        return pd.DataFrame()
    with connect(db_path) as conn:
        return pd.read_sql_query(
            """SELECT r.id, r.interval, r.trained_at, r.model_path,
                      AVG(m.accuracy) avg_accuracy, AVG(m.log_loss) avg_log_loss,
                      COUNT(DISTINCT m.model_name) models_compared
               FROM model_runs r LEFT JOIN validation_metrics m ON m.model_run_id = r.id
               WHERE r.asset_id=? GROUP BY r.id ORDER BY r.id DESC LIMIT 5""",
            conn, params=(asset_id,))


@st.cache_data(ttl=30)
def load_validation_summary(db_path: str, run_id: int) -> pd.DataFrame:
    if not table_exists(db_path, "validation_metrics"):
        return pd.DataFrame()
    with connect(db_path) as conn:
        return pd.read_sql_query(
            """SELECT model_name, COUNT(*) folds, AVG(accuracy) accuracy, AVG(log_loss) log_loss
               FROM validation_metrics WHERE model_run_id=? GROUP BY model_name""",
            conn, params=(run_id,))


def render_news_cards(news: pd.DataFrame) -> None:
    """Render linked, human-readable article cards instead of a raw SQL table."""
    for _, article in news.iterrows():
        headline = str(article.get("headline") or "Untitled article").strip()
        source = str(article.get("source_name") or article.get("source_type") or "Unknown source").strip()
        published = str(article.get("published_at") or "")
        body = str(article.get("body") or "").strip()
        url = str(article.get("url") or "").strip()
        sentiment = str(article.get("sentiment") or "not scored").strip()
        try:
            stamp = pd.to_datetime(published, utc=True).strftime("%b %d, %Y · %H:%M UTC")
        except (TypeError, ValueError):
            stamp = published
        st.markdown(f"### {headline}")
        st.caption(f"{source} · {stamp} · Sentiment: {sentiment}")
        if body and body.lower() != "none":
            summary = body if len(body) <= 420 else body[:417].rsplit(" ", 1)[0] + "…"
            st.write(summary)
        if url and url.lower() != "none":
            st.link_button("Read full article", url, use_container_width=False)
        else:
            st.caption("Source link unavailable")
        st.divider()


def latest_prediction(db_path: str, asset_id: int, interval: str) -> dict:
    """Build the newest feature row from the database and score it with the
    newest artifact. Returns {probabilities, ...} or {error} honestly."""
    with connect(db_path) as conn:
        run = conn.execute("SELECT id, model_path FROM model_runs WHERE asset_id=? AND interval=? ORDER BY id DESC LIMIT 1", (asset_id, interval)).fetchone()
        if run is None:
            return {"error": "no trained model yet - run: python run_pipeline.py train"}
        technical = conn.execute("SELECT * FROM technical_features WHERE asset_id=? AND interval=? ORDER BY timestamp DESC LIMIT 1", (asset_id, interval)).fetchone()
    if technical is None:
        return {"error": "no technical features yet - run: python run_pipeline.py features"}

    path = Path(run["model_path"])
    if not path.is_absolute():
        # Paths are recorded relative to the project root ("models/<id>/x.joblib").
        # The MODEL_ROOT fallback covers artifacts saved under older layouts.
        candidates = [MODEL_ROOT / path, ROOT / path]
        path = next((c for c in candidates if c.exists()), MODEL_ROOT / path)
    if not path.exists():
        return {"error": f"model artifact missing: {path}"}
    artifact = joblib.load(path)
    feature_columns = artifact["feature_columns"]

    values: dict[str, float | None] = {}
    for column in feature_columns:
        if column in TECHNICAL_COLUMNS:
            value = technical[column]
            values[column] = None if value is None else float(value)
        elif column not in SENTIMENT_COLUMNS:
            return {"error": f"unknown feature column in artifact: {column}"}
    sentiment_columns = [c for c in feature_columns if c in SENTIMENT_COLUMNS]
    if sentiment_columns:
        with connect(db_path) as conn:
            agg = conn.execute(
                "SELECT * FROM sentiment_aggregates WHERE asset_id=? AND window_end<=? ORDER BY window_end DESC, id DESC LIMIT 1",
                (asset_id, technical["timestamp"])).fetchone()
        for column in sentiment_columns:
            values[column] = float(agg[column]) if agg is not None and agg[column] is not None else None
    missing = sorted(c for c, v in values.items() if v is None)
    if missing:
        return {"error": f"cannot predict yet, missing features: {', '.join(missing)}"}

    X = pd.DataFrame([[values[c] for c in feature_columns]], columns=feature_columns)
    probabilities = artifact["model"].predict_proba(X)[0]
    classes = getattr(getattr(artifact["model"], "model", None), "classes_", [0, 1, 2])
    return {"probabilities": {LABELS.get(int(c), str(c)): float(p) for c, p in zip(classes, probabilities)},
            "as_of": technical["timestamp"], "model_run": run["id"], "features_used": feature_columns}


def hint_for(counts: dict[str, int], has_ingest_log: bool) -> list[str]:
    hints = []
    if not has_ingest_log:
        hints.append("Nothing ingested yet - run: python run_pipeline.py ingest")
    if counts.get("price_bars", 0) == 0:
        hints.append("No price bars - check connectivity (yfinance / Binance) and config/assets.yaml")
    if counts.get("news_items", 0) == 0:
        hints.append("No news items - add FINNHUB_API_KEY or ALPHA_VANTAGE_API_KEY in Render, then click Fetch latest news.")
    if counts.get("social_items", 0) == 0:
        hints.append("No social items - Reddit script keys go in .env at the project root (REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET)")
    if counts.get("price_bars", 0) > 0 and counts.get("technical_features", 0) == 0:
        hints.append("Prices exist but no technical features - run: python run_pipeline.py features")
    if counts.get("model_runs", 0) == 0:
        hints.append("No trained models yet - run: python run_pipeline.py train")
    return hints


def main() -> None:
    st.title("Sentrune")
    st.caption("Sentrune prototype - probabilistic, explainable market intelligence. Read-only view over the pipeline database.")

    db_path = st.sidebar.text_input("Database", str(DEFAULT_DB))
    refresh_minutes = max(1, int(os.getenv("AUTO_REFRESH_MINUTES", "15")))
    st_autorefresh(interval=refresh_minutes * 60 * 1000, key="sentrune_auto_refresh")
    st.sidebar.caption(f"Auto-refreshing every {refresh_minutes} minutes")
    st.sidebar.divider()
    st.sidebar.subheader("News ingestion")
    configured_providers = [
        name for name, env_name in (
            ("Finnhub", "FINNHUB_API_KEY"),
            ("Alpha Vantage", "ALPHA_VANTAGE_API_KEY"),
        ) if os.getenv(env_name)
    ]
    if configured_providers:
        st.sidebar.caption("Configured: " + ", ".join(configured_providers))
    else:
        st.sidebar.caption("Add FINNHUB_API_KEY or ALPHA_VANTAGE_API_KEY in Render.")
    if st.sidebar.button("Refresh news and prices now", type="primary", use_container_width=True):
        try:
            # The dashboard normally opens SQLite read-only, while ingestion
            # needs a write connection. Point the existing pipeline at the
            # same database selected in the sidebar, then refresh cached views.
            os.environ["DB_PATH"] = db_path
            with st.spinner("Fetching news and updating the database..."):
                totals = run_ingestion()
            st.session_state["last_auto_ingest"] = time.time()
            for cached_loader in (load_assets, load_prices, load_technical, load_aggregates, load_news, load_social, load_ingestion_log, load_model_runs, load_validation_summary):
                cached_loader.clear()
            st.sidebar.success("Ingestion complete: " + (", ".join(f"{k}={v}" for k, v in totals.items()) or "no records fetched"))
            st.rerun()
        except Exception as exc:
            st.sidebar.error(f"Data refresh failed: {exc}")
    if not Path(db_path).exists():
        st.warning(f"No database at {db_path}. Run: python run_pipeline.py all")
        st.stop()

    # Streamlit reruns the script when the auto-refresh timer fires. Keep the
    # last ingestion time in session state so a selector change does not call
    # external APIs repeatedly, while the open dashboard stays current.
    last_auto_ingest = float(st.session_state.get("last_auto_ingest", 0.0))
    if time.time() - last_auto_ingest >= refresh_minutes * 60:
        try:
            os.environ["DB_PATH"] = db_path
            with st.spinner("Updating prices and news..."):
                run_ingestion()
            st.session_state["last_auto_ingest"] = time.time()
            for cached_loader in (load_assets, load_prices, load_technical, load_aggregates, load_news, load_social, load_ingestion_log, load_model_runs, load_validation_summary):
                cached_loader.clear()
        except Exception as exc:
            st.warning(f"Automatic data refresh failed: {exc}")

    try:
        assets = load_assets(db_path)
    except (sqlite3.OperationalError, pd.errors.DatabaseError):
        st.warning("Database has no tables yet - run: python run_pipeline.py ingest")
        st.stop()
    if assets.empty:
        st.warning("Assets table is empty - run: python run_pipeline.py ingest")
        st.stop()

    symbols = assets["symbol"].tolist()
    symbol = st.sidebar.selectbox("Asset", symbols, index=0, key="selected_asset")
    asset = assets[assets.symbol == symbol].iloc[0]
    asset_id = int(asset["id"])

    with connect(db_path) as conn:
        stored_intervals = [r[0] for r in conn.execute("SELECT DISTINCT interval FROM price_bars WHERE asset_id=? ORDER BY interval", (asset_id,))]
    configured_intervals = [value.strip() for value in os.getenv("PRICE_INTERVALS", "1d").split(",") if value.strip()]
    intervals = list(dict.fromkeys(configured_intervals + stored_intervals)) or ["1d"]
    interval = st.sidebar.selectbox("Interval", intervals, index=0, key="selected_interval")

    overview_tab, prices_tab, technical_tab, sentiment_tab, news_tab, social_tab, model_tab = st.tabs(
        ["Overview", "Prices", "Technicals", "Sentiment", "News", "Social", "Model"])

    counts = {}
    with connect(db_path) as conn:
        for table in ("price_bars", "news_items", "social_items", "technical_features", "text_sentiment", "sentiment_aggregates", "model_runs"):
            try:
                counts[table] = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            except sqlite3.OperationalError:
                counts[table] = None  # table not created yet by a later layer
    log_rows = load_ingestion_log(db_path)

    with overview_tab:
        cols = st.columns(4)
        cols[0].metric("Price bars", counts["price_bars"] if counts["price_bars"] is not None else "n/a")
        cols[1].metric("News items", counts["news_items"] if counts["news_items"] is not None else "n/a")
        cols[2].metric("Social items", counts["social_items"] if counts["social_items"] is not None else "n/a")
        cols[3].metric("Trained models", counts["model_runs"] if counts["model_runs"] is not None else "n/a")
        st.dataframe(assets[assets.symbol == symbol], width="stretch", hide_index=True)
        with st.expander("Diagnostics", expanded=False):
            st.caption("Operational details are kept here so the dashboard remains focused on market data.")
            st.dataframe(log_rows, width="stretch", hide_index=True)
            for message in hint_for(counts, has_ingest_log=not log_rows.empty):
                st.info(message)

    prices = load_prices(db_path, asset_id, interval)
    with prices_tab:
        if prices.empty:
            st.info(f"No price bars for {symbol} {interval} yet.")
        else:
            frame = prices.copy()
            frame["timestamp"] = pd.to_datetime(frame["timestamp"], utc=True)
            frame = frame.set_index("timestamp")
            last, change = frame["close"].iloc[-1], frame["close"].iloc[-1] - frame["close"].iloc[-2] if len(frame) > 1 else 0.0
            left, right = st.columns([3, 1])
            right.metric("Last close", f"{last:,.2f}", f"{change:+,.2f}")
            st.line_chart(frame[["close"]], height=280)
            st.caption("Close price (UTC)")
            st.bar_chart(frame[["volume"]], height=140)
            st.caption("Volume")
            with st.expander("Raw bars (latest 50)"):
                st.dataframe(prices.tail(50), width="stretch", hide_index=True)

    technical = load_technical(db_path, asset_id, interval) if table_exists(db_path, "technical_features") else pd.DataFrame()
    with technical_tab:
        if technical.empty:
            st.info("No technical features yet - run: python run_pipeline.py features")
        else:
            frame = technical.copy()
            frame["timestamp"] = pd.to_datetime(frame["timestamp"], utc=True)
            frame = frame.set_index("timestamp")
            trend = frame[["sma_20", "sma_50", "sma_200"]].copy()
            if not prices.empty:
                price_frame = prices.copy()
                price_frame["timestamp"] = pd.to_datetime(price_frame["timestamp"], utc=True)
                trend = trend.join(price_frame.set_index("timestamp")["close"], how="outer").sort_index()
            st.subheader("Trend")
            st.line_chart(trend[["close", "sma_20", "sma_50", "sma_200"]].dropna(how="all"), height=280)
            st.caption("Close vs moving averages")
            st.subheader("Momentum")
            st.line_chart(frame[["rsi_14"]], height=160)
            st.caption("RSI(14)")
            st.line_chart(frame[["macd", "macd_signal", "macd_histogram"]], height=160)
            st.caption("MACD(12,26,9)")
            with st.expander("All technical columns (latest 50 rows)"):
                st.dataframe(technical.tail(50), width="stretch", hide_index=True)

    aggregates = load_aggregates(db_path, asset_id) if table_exists(db_path, "sentiment_aggregates") else pd.DataFrame()
    with sentiment_tab:
        if aggregates.empty:
            st.info("No sentiment aggregates yet - they appear once news/social items are ingested and scored.")
        else:
            windows = sorted(aggregates["window_hours"].unique().tolist())
            window_hours = st.selectbox("Window (hours)", windows, index=len(windows) - 1)
            frame = aggregates[aggregates.window_hours == window_hours].copy()
            frame["window_end"] = pd.to_datetime(frame["window_end"], utc=True)
            frame = frame.set_index("window_end")
            st.subheader("Sentiment score (positive minus negative probability)")
            st.line_chart(frame[["avg_sentiment", "followed_avg_sentiment", "unattributed_avg_sentiment"]], height=240)
            st.caption("Followed = accounts you track; unattributed = the rest of the feed")
            st.subheader("Mention volume")
            st.bar_chart(frame[["mention_volume"]], height=160)
            with st.expander("Aggregate rows (latest 50)"):
                st.dataframe(aggregates.tail(50), width="stretch", hide_index=True)

    with news_tab:
        news = load_news(db_path, asset_id)
        st.subheader(f"Latest news for {symbol}")
        st.caption("Headlines are fetched from the configured provider and linked to this asset by the provider’s symbols or article text.")
        if news.empty:
            st.info("No news linked to this asset yet. Use Refresh news and prices now in the sidebar.")
        else:
            render_news_cards(news)

    with social_tab:
        social = load_social(db_path, asset_id)
        if social.empty:
            st.info("No social posts linked to this asset yet.")
        else:
            st.dataframe(social, width="stretch", hide_index=True)

    with model_tab:
        runs = load_model_runs(db_path, asset_id)
        if counts["model_runs"] is None:
            st.info("Model tables not created yet - run: python run_pipeline.py train")
        elif runs.empty:
            st.info("No trained models yet - run: python run_pipeline.py train")
        else:
            latest_run = runs.iloc[0]
            st.subheader(f"Latest prediction - {symbol}, {latest_run['interval']} bars ahead")
            prediction = latest_prediction(db_path, asset_id, str(latest_run["interval"]))
            if "error" in prediction:
                st.warning(prediction["error"])
            else:
                probabilities = prediction["probabilities"]
                cols = st.columns(3)
                for col, name in zip(cols, ("down", "flat", "up")):
                    col.metric(name.upper(), f"{probabilities[name] * 100:.1f}%")
                st.caption(f"As of {prediction['as_of']} | model run {prediction['model_run']} | {len(prediction['features_used'])} features")
                st.bar_chart(pd.DataFrame({"probability": probabilities}, index=list(probabilities)), height=180)
            st.subheader("Walk-forward validation (latest run)")
            summary = load_validation_summary(db_path, int(latest_run["id"]))
            if summary.empty:
                st.info("No validation metrics recorded.")
            else:
                st.dataframe(summary, width="stretch", hide_index=True)
                st.caption("LightGBM compared against the naive baselines; log loss closer to 0 is better.")
            with st.expander("Recent training runs"):
                st.dataframe(runs, width="stretch", hide_index=True)


main()
