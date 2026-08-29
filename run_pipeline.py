#!/usr/bin/env python3
"""Single entry point for the whole prototype.

One package, one database, four commands - everything runs from the project
root:

    python run_pipeline.py status     # what is in the database right now
    python run_pipeline.py ingest     # data layer (prices, news, social)
    python run_pipeline.py features   # technical indicators + sentiment
    python run_pipeline.py train      # walk-forward validation + model fit
    python run_pipeline.py all        # the three steps above, in order
    python run_pipeline.py dashboard  # launch the Streamlit dashboard

Steps are independently re-runnable and idempotent: ingest is incremental,
features upsert on a UTC grid, training refits and appends a new model run.
"""
from __future__ import annotations

import argparse
import importlib.util
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("DB_PATH", str(ROOT / "data" / "trading_assistant.sqlite3")))

STEPS: dict[str, str] = {
    "ingest": "trading_assistant.ingest",
    "features": "trading_assistant.features",
    "train": "trading_assistant.modeling",
}


def preflight(need_streamlit: bool = False) -> None:
    """Fail with a clear setup message instead of a ModuleNotFoundError traceback."""
    if sys.version_info >= (3, 14):
        print("Warning: Python 3.14+ is experimental for this Sentrune dependency set.")
        print("If installation or tests fail, use Python 3.13 or 3.12.")
    required = ["trading_assistant"] + (["streamlit"] if need_streamlit else [])
    missing = [name for name in required if importlib.util.find_spec(name) is None]
    if missing:
        print("Missing packages: " + ", ".join(missing))
        print("The Python environment you are running from does not have the project installed.")
        print("Activate the right environment, then run from the project root:")
        print("  pip install -c constraints.txt -e .")
        raise SystemExit(1)


def _env() -> dict[str, str]:
    # Preserve an externally configured DB_PATH (for example /var/data on Render).
    # Fall back to the repository-local demo database for local development.
    return dict(os.environ, DB_PATH=str(DB_PATH))


def run_step(name: str) -> int:
    module = STEPS[name]
    print(f"\n=== {name} ({module}) ===")
    return subprocess.call([sys.executable, "-m", module], cwd=str(ROOT), env=_env())


def status() -> None:
    if not DB_PATH.exists():
        print(f"No database yet at {DB_PATH}. Run: python run_pipeline.py all")
        return
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    print(f"Database: {DB_PATH}")
    for table in ("assets", "price_bars", "news_items", "social_items", "technical_features", "text_sentiment", "sentiment_aggregates", "model_runs", "validation_metrics"):
        try:
            count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        except sqlite3.OperationalError:
            count = "table missing"
        print(f"  {table:24} {count}")
    print("\nLast ingestion runs:")
    for row in conn.execute("SELECT source, status, records_fetched, ended_at, error_message FROM ingestion_log ORDER BY id DESC LIMIT 10"):
        line = f"  {row['source']:28} {row['status']:8} {row['records_fetched']:6} rows  {row['ended_at'] or ''}"
        if row["error_message"]:
            line += f"  | {row['error_message'][:80]}"
        print(line)
    conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=["status", "ingest", "features", "train", "all", "dashboard"], help="pipeline step to run")
    args = parser.parse_args()

    if args.command == "status":
        status()
        return
    if args.command == "dashboard":
        preflight(need_streamlit=True)
        app = ROOT / "src" / "trading_assistant" / "dashboard" / "app.py"
        if not app.exists():
            print(f"Dashboard not found at {app}")
            raise SystemExit(1)
        raise SystemExit(subprocess.call([sys.executable, "-m", "streamlit", "run", str(app)], cwd=str(ROOT), env=_env()))

    preflight()
    order = ["ingest", "features", "train"] if args.command == "all" else [args.command]
    for name in order:
        code = run_step(name)
        if code != 0:
            print(f"\nStep '{name}' failed (exit {code}). Fix it before continuing - later steps depend on it.")
            raise SystemExit(code)
    print("\nDone. Inspect the results:  python run_pipeline.py status")
    print("Launch the dashboard:       python run_pipeline.py dashboard")


if __name__ == "__main__":
    main()
