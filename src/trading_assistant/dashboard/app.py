"""Read-only Streamlit dashboard over the prototype's shared SQLite database."""
from __future__ import annotations
import logging
import os
import shutil
import sqlite3
import time
from pathlib import Path
import joblib
import pandas as pd
import streamlit as st

log = logging.getLogger(__name__)
from trading_assistant.features.compute import run as run_features
from trading_assistant.ingest.pipeline import run as run_ingestion
from trading_assistant.modeling.explain import explain_prediction

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DB = Path(os.getenv("DB_PATH", str(ROOT / "data" / "trading_assistant.sqlite3"))).resolve()
MODEL_ROOT = Path(os.getenv("SENTRUNE_MODEL_DIR", str(ROOT / "models")))

# FIX: Shared state files for cross-session refresh coordination
LOCK_FILE = DEFAULT_DB.parent / ".refresh_lock"
LAST_REFRESH_FILE = DEFAULT_DB.parent / ".last_refresh"

def _get_last_refresh(db_path: str) -> float:
    p = Path(db_path).resolve()
    last_refresh_file = p.parent / ".last_refresh"
    if last_refresh_file.exists():
        try:
            return float(last_refresh_file.read_text().strip())
        except (ValueError, OSError):
            return 0.0
    return 0.0

def _set_last_refresh(db_path: str, timestamp: float) -> None:
    p = Path(db_path).resolve()
    last_refresh_file = p.parent / ".last_refresh"
    try:
        last_refresh_file.write_text(str(timestamp))
    except OSError:
        pass

def _acquire_refresh_lock(db_path: str, timeout_seconds: int = 300) -> bool:
    p = Path(db_path).resolve()
    lock_file = p.parent / ".refresh_lock"
    if lock_file.exists():
        try:
            mtime = lock_file.stat().st_mtime
            if time.time() - mtime < timeout_seconds:
                return False  # Lock is fresh, another process is running
        except OSError:
            pass
    try:
        lock_file.touch()
        return True
    except OSError:
        return False

def _release_refresh_lock(db_path: str) -> None:
    p = Path(db_path).resolve()
    lock_file = p.parent / ".refresh_lock"
    try:
        if lock_file.exists():
            lock_file.unlink()
    except OSError:
        pass

def _seed_persistent_storage() -> None:
    demo_db = ROOT / "data" / "trading_assistant.sqlite3"
    if not DEFAULT_DB.exists() and demo_db.exists() and DEFAULT_DB.resolve() != demo_db.resolve():
        DEFAULT_DB.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(demo_db, DEFAULT_DB)
    demo_models = ROOT / "models"
    if not MODEL_ROOT.exists() and demo_models.exists() and MODEL_ROOT.resolve() != demo_models.resolve():
        shutil.copytree(demo_models, MODEL_ROOT)

_seed_persistent_storage()

LABELS = {0: "down", 1: "flat", 2: "up"}
TECHNICAL_COLUMNS = [
    "sma_20", "sma_50", "sma_200", "ema_12", "ema_26", "macd", "macd_signal", "macd_histogram",
    "rsi_14", "stoch_k", "stoch_d", "bb_lower", "bb_middle", "bb_upper", "atr_14", "obv", "volume_sma_20",
    "adx_14", "plus_di_14", "minus_di_14",
    "ichimoku_tenkan", "ichimoku_kijun", "ichimoku_senkou_a", "ichimoku_senkou_b", "ichimoku_chikou",
    "volatility_20", "return_autocorr_20", "volume_price_divergence",
    "candle_body_ratio", "candle_doji", "candle_hammer", "candle_bullish_engulfing", "candle_bearish_engulfing",
    "return_1", "return_3", "return_5", "return_10", "zscore_20",
    "volatility_regime", "day_of_week", "dist_from_high", "dist_from_low",
]
SENTIMENT_BASE_COLUMNS = ["avg_sentiment", "avg_sentiment_decayed", "mention_volume", "sentiment_volatility", "followed_avg_sentiment", "followed_mention_volume", "followed_sentiment_volatility", "unattributed_avg_sentiment", "unattributed_mention_volume", "unattributed_sentiment_volatility"]

st.set_page_config(page_title="Sentrune", page_icon="📈", layout="wide")

def connect(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn

def table_exists(db_path: str, table: str) -> bool:
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
        frame = pd.read_sql_query("SELECT timestamp, open, high, low, close, volume FROM price_bars WHERE asset_id=? AND interval=? ORDER BY timestamp", conn, params=(asset_id, interval))
        return frame.drop_duplicates(subset=["timestamp"], keep="last")

@st.cache_data(ttl=30)
def load_technical(db_path: str, asset_id: int, interval: str) -> pd.DataFrame:
    with connect(db_path) as conn:
        columns = ", ".join(["timestamp"] + TECHNICAL_COLUMNS)
        frame = pd.read_sql_query(f"SELECT {columns} FROM technical_features WHERE asset_id=? AND interval=? ORDER BY timestamp", conn, params=(asset_id, interval))
        return frame.drop_duplicates(subset=["timestamp"], keep="last")

@st.cache_data(ttl=30)
def load_aggregates(db_path: str, asset_id: int) -> pd.DataFrame:
    with connect(db_path) as conn:
        columns = ", ".join(["window_end", "window_hours"] + SENTIMENT_BASE_COLUMNS)
        frame = pd.read_sql_query(f"SELECT {columns} FROM sentiment_aggregates WHERE asset_id=? ORDER BY window_end", conn, params=(asset_id,))
        return frame.drop_duplicates(subset=["window_end", "window_hours"], keep="last")

@st.cache_data(ttl=30)
def load_news(db_path: str, asset_id: int, limit: int = 25) -> pd.DataFrame:
    with connect(db_path) as conn:
        if table_exists(db_path, "text_sentiment"):
            query = """SELECT n.published_at, n.source_type, n.source_name, n.headline, n.body, n.url, COALESCE(s.label, 'not scored') sentiment FROM news_items n JOIN news_item_assets a ON a.news_item_id = n.id LEFT JOIN text_sentiment s ON s.item_type='news' AND s.item_id = n.id WHERE a.asset_id=? ORDER BY n.published_at DESC LIMIT ?"""
        else:
            query = """SELECT n.published_at, n.source_type, n.source_name, n.headline, n.body, n.url, 'not scored' sentiment FROM news_items n JOIN news_item_assets a ON a.news_item_id = n.id WHERE a.asset_id=? ORDER BY n.published_at DESC LIMIT ?"""
        return pd.read_sql_query(query, conn, params=(asset_id, limit))

@st.cache_data(ttl=30)
def load_social(db_path: str, asset_id: int, limit: int = 25) -> pd.DataFrame:
    with connect(db_path) as conn:
        if table_exists(db_path, "text_sentiment"):
            query = """SELECT x.created_at, x.platform, x.author_username, x.subreddit, x.is_followed_account, x.score, x.title, COALESCE(s.label, 'not scored') sentiment FROM social_items x JOIN social_item_assets a ON a.social_item_id = x.id LEFT JOIN text_sentiment s ON s.item_type='social' AND s.item_id = x.id WHERE a.asset_id=? ORDER BY x.created_at DESC LIMIT ?"""
        else:
            query = """SELECT x.created_at, x.platform, x.author_username, x.subreddit, x.is_followed_account, x.score, x.title, 'not scored' sentiment FROM social_items x JOIN social_item_assets a ON a.social_item_id = x.id WHERE a.asset_id=? ORDER BY x.created_at DESC LIMIT ?"""
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
            """SELECT r.id, r.interval, r.trained_at, r.model_path, AVG(m.accuracy) avg_accuracy, AVG(m.log_loss) avg_log_loss, COUNT(DISTINCT m.model_name) models_compared FROM model_runs r LEFT JOIN validation_metrics m ON m.model_run_id = r.id WHERE r.asset_id=? GROUP BY r.id ORDER BY r.id DESC LIMIT 5""",
            conn, params=(asset_id,))

@st.cache_data(ttl=30)
def load_validation_summary(db_path: str, run_id: int) -> pd.DataFrame:
    if not table_exists(db_path, "validation_metrics"):
        return pd.DataFrame()
    with connect(db_path) as conn:
        return pd.read_sql_query(
            """SELECT model_name, COUNT(*) folds, AVG(accuracy) accuracy, AVG(log_loss) log_loss FROM validation_metrics WHERE model_run_id=? GROUP BY model_name""",
            conn, params=(run_id,))

def load_backtest_summary(db_path: str, run_id: int) -> pd.DataFrame:
    if not table_exists(db_path, "strategy_backtests"):
        return pd.DataFrame()
    with connect(db_path) as conn:
        return pd.read_sql_query(
            """SELECT fold, total_return, sharpe, max_drawdown, win_rate, trades, baseline_total_return, baseline_sharpe FROM strategy_backtests WHERE model_run_id=? ORDER BY fold""",
            conn, params=(run_id,))

def render_news_cards(news: pd.DataFrame) -> None:
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
    with connect(db_path) as conn:
        run = conn.execute("SELECT id, model_path FROM model_runs WHERE asset_id=? AND interval=? ORDER BY id DESC LIMIT 1", (asset_id, interval)).fetchone()
        if run is None:
            return {"error": "no trained model yet - run: python run_pipeline.py train"}
        technical = conn.execute("SELECT * FROM technical_features WHERE asset_id=? AND interval=? ORDER BY timestamp DESC LIMIT 1", (asset_id, interval)).fetchone()
        if technical is None:
            return {"error": "no technical features yet - automatic computation will run after the next data refresh"}
        path = Path(run["model_path"])
        if not path.is_absolute():
            candidates = [MODEL_ROOT / path, ROOT / path]
            path = next((c for c in candidates if c.exists()), MODEL_ROOT / path)
        if not path.exists():
            return {"error": f"model artifact missing: {path}"}
        artifact = joblib.load(path)
        feature_columns = artifact["feature_columns"]
        values: dict[str, float | None] = {}
        sentiment_columns: list[tuple[str, str, int]] = []
        for column in feature_columns:
            if column in TECHNICAL_COLUMNS:
                value = technical[column]
                values[column] = None if value is None else float(value)
                continue
            base, _, suffix = column.rpartition("_")
            if base in SENTIMENT_BASE_COLUMNS and suffix.endswith("h") and suffix[:-1].isdigit():
                sentiment_columns.append((column, base, int(suffix[:-1])))
            else:
                return {"error": f"unknown feature column in artifact: {column}"}
        if sentiment_columns:
            with connect(db_path) as conn:
                for window_hours in {hours for _, _, hours in sentiment_columns}:
                    agg = conn.execute(
                        "SELECT * FROM sentiment_aggregates WHERE asset_id=? AND window_hours=? AND window_end<=? ORDER BY window_end DESC, id DESC LIMIT 1",
                        (asset_id, window_hours, technical["timestamp"])).fetchone()
                    for feature_column, base_column, hours in sentiment_columns:
                        if hours != window_hours:
                            continue
                        values[feature_column] = float(agg[base_column]) if agg is not None and agg[base_column] is not None else None
        missing = sorted(c for c, v in values.items() if v is None)
        if missing:
            return {"error": f"cannot predict yet, missing features: {', '.join(missing)}"}
        X = pd.DataFrame([[values[c] for c in feature_columns]], columns=feature_columns)
        probabilities = artifact["model"].predict_proba(X)[0]
        classes = getattr(getattr(artifact["model"], "model", None), "classes_", [0, 1, 2])
        probability_dict = {LABELS.get(int(c), str(c)): float(p) for c, p in zip(classes, probabilities)}
        result = {"probabilities": probability_dict, "as_of": technical["timestamp"], "model_run": run["id"], "features_used": feature_columns}
        try:
            result["explanation"] = explain_prediction(artifact["model"], X, probability_dict)
        except Exception as exc:
            log.warning("Could not build explanation for asset %s: %s", asset_id, exc)
        return result

def hint_for(counts: dict[str, int], has_ingest_log: bool) -> list[str]:
    hints = []
    if not has_ingest_log:
        hints.append("Nothing ingested yet - run: python run_pipeline.py ingest")
    if counts.get("price_bars", 0) == 0:
        hints.append("No price bars - check connectivity (yfinance / Binance) and config/assets.yaml")
    if counts.get("news_items", 0) == 0:
        hints.append("No news items - add FINNHUB_API_KEY or ALPHA_VANTAGE_API_KEY in Render, then click Fetch latest news.")
    if counts.get("social_items", 0) == 0:
        hints.append("No market discussion yet - use Refresh news and prices now; Google News RSS needs no key. Reddit requires approved API access.")
    if counts.get("price_bars", 0) > 0 and counts.get("technical_features", 0) == 0:
        hints.append("Prices exist but no technical features - automatic computation will run after the next data refresh")
    if counts.get("model_runs", 0) == 0:
        hints.append("No trained models yet - run: python run_pipeline.py train")
    return hints

ALL_CACHED_LOADERS = (
    load_assets, load_prices, load_technical, load_aggregates, load_news,
    load_social, load_ingestion_log, load_model_runs, load_validation_summary,
)

def _do_refresh(db_path: str) -> dict[str, int]:
    os.environ["DB_PATH"] = db_path
    with st.spinner("Fetching prices, news, and market discussion..."):
        totals = run_ingestion()
    with st.spinner("Computing technical indicators and sentiment..."):
        feature_totals = run_features()
    totals.update({f"features_{key}": value for key, value in feature_totals.items()})
    for cached_loader in ALL_CACHED_LOADERS:
        cached_loader.clear()
    return totals

def _relative_time(epoch_seconds: float) -> str:
    if not epoch_seconds:
        return "never"
    elapsed = max(0, int(time.time() - epoch_seconds))
    if elapsed < 60:
        return "just now"
    if elapsed < 3600:
        return f"{elapsed // 60} min ago"
    if elapsed < 86400:
        return f"{elapsed // 3600} hr ago"
    return f"{elapsed // 86400} days ago"

def main() -> None:
    st.title("Sentrune")
    st.caption("Sentrune prototype - probabilistic, explainable market intelligence.")
    with st.sidebar.expander("Database location", expanded=False):
        st.caption("Only change this if you're pointing the dashboard at a different file.")
        db_path = st.text_input("Database path", str(DEFAULT_DB), label_visibility="collapsed")
    st.sidebar.subheader("Data")
    configured_providers = [
        name for name, env_name in (
            ("Finnhub", "FINNHUB_API_KEY"),
            ("Alpha Vantage", "ALPHA_VANTAGE_API_KEY"),
        ) if os.getenv(env_name)
    ]
    if configured_providers:
        st.sidebar.caption("News source: " + ", ".join(configured_providers))
    else:
        st.sidebar.caption("Prices only - add a FINNHUB_API_KEY or ALPHA_VANTAGE_API_KEY to also pull news.")
        
    # FIX: Use shared file state instead of st.session_state, and respect AUTO_REFRESH_MINUTES
    auto_refresh_minutes = int(os.getenv("AUTO_REFRESH_MINUTES", "5"))
    STALE_AFTER_SECONDS = auto_refresh_minutes * 60
    last_refresh_at = _get_last_refresh(db_path)
    
    st.sidebar.caption(f"Last updated: {_relative_time(last_refresh_at)}")
    
    if st.sidebar.button("🔄 Refresh prices & news", type="primary", use_container_width=True):
        if _acquire_refresh_lock(db_path, timeout_seconds=300):
            try:
                totals = _do_refresh(db_path)
                _set_last_refresh(db_path, time.time())
                st.sidebar.success("Refreshed: " + (", ".join(f"{k}={v}" for k, v in totals.items()) or "no new records"))
                st.rerun()
            except Exception as exc:
                log.exception("Manual refresh failed")
                st.sidebar.error(f"Refresh failed: {type(exc).__name__}: {exc}")
            finally:
                _release_refresh_lock(db_path)
        else:
            st.sidebar.warning("A refresh is already in progress. Please wait.")

    if not Path(db_path).exists():
        st.warning(f"No database at {db_path}. Run: python run_pipeline.py all")
        st.stop()
        
    # FIX: Auto-refresh logic now uses shared lock
    if time.time() - last_refresh_at >= STALE_AFTER_SECONDS:
        if _acquire_refresh_lock(db_path, timeout_seconds=300):
            try:
                _do_refresh(db_path)
                _set_last_refresh(db_path, time.time())
            except Exception as exc:
                log.exception("Auto-refresh on load failed")
                st.warning(
                    "Auto-refresh failed and the last saved data is shown instead "
                    f"({type(exc).__name__}: {exc}). Use Refresh in the sidebar to try again."
                )
            finally:
                _release_refresh_lock(db_path)
        else:
            st.info("Another refresh is currently in progress. Data will update shortly.")

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
        ["Overview", "Prices", "Technicals", "Sentiment", "News", "Market Discussion", "Model"])
        
    counts = {}
    with connect(db_path) as conn:
        for table in ("price_bars", "news_items", "social_items", "technical_features", "text_sentiment", "sentiment_aggregates", "model_runs"):
            try:
                counts[table] = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            except sqlite3.OperationalError:
                counts[table] = None
                
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
            frame["timestamp"] = pd.to_datetime(frame["timestamp"], format="mixed", utc=True)
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
            st.info("No technical features yet - automatic computation will run after the next data refresh")
        else:
            frame = technical.copy()
            frame["timestamp"] = pd.to_datetime(frame["timestamp"], format="mixed", utc=True)
            frame = frame.set_index("timestamp")
            trend = frame[["sma_20", "sma_50", "sma_200"]].copy()
            if not prices.empty:
                price_frame = prices.copy()
                price_frame["timestamp"] = pd.to_datetime(price_frame["timestamp"], format="mixed", utc=True)
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
        st.caption("Headlines are fetched from the configured provider and linked to this asset by the provider's symbols or article text.")
        if news.empty:
            st.info("No news linked to this asset yet. Use Refresh news and prices now in the sidebar.")
        else:
            render_news_cards(news)
            
    with social_tab:
        discussion = load_social(db_path, asset_id)
        st.subheader(f"Market discussion for {symbol}")
        st.caption("Google News RSS is the no-key discussion feed. Reddit remains optional and requires approved API access.")
        if discussion.empty:
            st.info("No market discussion linked to this asset yet. Use Refresh news and prices now in the sidebar.")
        else:
            for _, item in discussion.iterrows():
                title = str(item.get("title") or "Untitled discussion").strip()
                source = str(item.get("author_username") or item.get("platform") or "Unknown source").strip()
                created = str(item.get("created_at") or "")
                url = str(item.get("url") or "").strip()
                st.markdown(f"### {title}")
                st.caption(f"{source} · {created}")
                if url and url.lower() != "none":
                    st.link_button("Open discussion", url, use_container_width=False)
                st.divider()
                
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
                explanation = prediction.get("explanation")
                if explanation:
                    st.markdown(f"**Why:** {explanation['sentence']}")
                    if explanation["top_factors"]:
                        factor_rows = pd.DataFrame([
                            {"Factor": f["label"], "Reads as": f["meaning"], "Effect": f["direction"], "Current value": round(f["value"], 4)}
                            for f in explanation["top_factors"]
                        ])
                        st.dataframe(factor_rows, width="stretch", hide_index=True)
                    st.caption("Explanation shows what pushed this specific prediction, not a general ranking of feature importance.")
            st.subheader("Walk-forward validation (latest run)")
            summary = load_validation_summary(db_path, int(latest_run["id"]))
            if summary.empty:
                st.info("No validation metrics recorded.")
            else:
                st.dataframe(summary, width="stretch", hide_index=True)
                st.caption("LightGBM compared against the naive baselines; log loss closer to 0 is better.")
            st.subheader("Simple threshold strategy backtest (latest run)")
            backtest_summary = load_backtest_summary(db_path, int(latest_run["id"]))
            if backtest_summary.empty:
                st.info("No strategy backtest recorded.")
            else:
                display = backtest_summary.copy()
                for col in ("total_return", "max_drawdown", "win_rate", "baseline_total_return"):
                    display[col] = (display[col] * 100).round(1)
                display = display.rename(columns={
                    "total_return": "Return %", "sharpe": "Sharpe", "max_drawdown": "Max drawdown %",
                    "win_rate": "Win rate %", "trades": "Trades", "baseline_total_return": "Buy&hold return %",
                    "baseline_sharpe": "Buy&hold Sharpe",
                })
                st.dataframe(display, width="stretch", hide_index=True)
                st.caption("Per-fold result of only taking a position when the model's up/down probability clears a confidence threshold, net of a modeled fee+slippage cost.")
            with st.expander("Recent training runs"):
                st.dataframe(runs, width="stretch", hide_index=True)

if __name__ == "__main__":
    main()