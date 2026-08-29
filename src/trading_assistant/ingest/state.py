from __future__ import annotations

import sqlite3

from .db.connection import utc_now


def get_last_success(conn: sqlite3.Connection, source: str, entity_key: str) -> str | None:
    row = conn.execute("SELECT last_success_at FROM ingestion_state WHERE source=? AND entity_key=?", (source, entity_key)).fetchone()
    return row[0] if row else None


def mark_success(conn: sqlite3.Connection, source: str, entity_key: str, cursor: str | None = None) -> None:
    conn.execute("INSERT INTO ingestion_state(source,entity_key,last_success_at,last_cursor) VALUES(?,?,?,?) ON CONFLICT(source,entity_key) DO UPDATE SET last_success_at=excluded.last_success_at,last_cursor=excluded.last_cursor", (source, entity_key, utc_now(), cursor))
    conn.commit()
