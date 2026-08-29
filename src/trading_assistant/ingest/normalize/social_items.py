from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def _value(item: Any, name: str, default: Any = None) -> Any:
    value = getattr(item, name, default)
    return value() if callable(value) else value


def normalize_reddit(item: Any, followed_usernames: set[str] | None = None) -> dict:
    # removeprefix, not lstrip: lstrip strips every leading character in the set
    # and would mangle names like "u/uranus" into "ranus".
    followed = {u.lower().removeprefix("u/").removeprefix("/") for u in (followed_usernames or set())}
    author = _value(item, "author")
    author_name = getattr(author, "name", None) if author else None
    created = _value(item, "created_utc")
    created_at = datetime.fromtimestamp(created, tz=timezone.utc).isoformat() if isinstance(created, (int, float)) else str(created or datetime.now(timezone.utc).isoformat())
    is_comment = hasattr(item, "body") and not hasattr(item, "selftext")
    return {
        "platform": "reddit",
        "external_id": str(_value(item, "id", "")),
        "author_username": author_name,
        "subreddit": getattr(_value(item, "subreddit"), "display_name", None) or str(_value(item, "subreddit", "")),
        "is_followed_account": int(bool(author_name and author_name.lower() in followed)),
        "title": None if is_comment else _value(item, "title"),
        "body": _value(item, "body") if is_comment else _value(item, "selftext", ""),
        "url": _value(item, "permalink"),
        "created_at": created_at,
        "score": _value(item, "score"),
        "comment_count": None if is_comment else _value(item, "num_comments"),
        "raw_payload": {"id": _value(item, "id"), "name": _value(item, "name")},
    }
