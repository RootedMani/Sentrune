from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Callable, Iterable

from ..normalize.social_items import normalize_reddit

log = logging.getLogger(__name__)


def _collect(items: Iterable, followed: set[str], start: datetime | None, output: list[dict], label: str) -> None:
    try:
        for item in items:
            row = normalize_reddit(item, followed)
            if not start or row["created_at"] > start.isoformat():
                output.append(row)
    except Exception as exc:
        # PRAW can raise on a malformed item or a stream/API error. Preserve
        # records already collected and continue with the next endpoint.
        log.warning("Reddit collection failed for %s: %s", label, exc)


def _pace(delay_seconds: float) -> None:
    if delay_seconds > 0:
        time.sleep(delay_seconds)


def _report_limits(reddit) -> None:
    try:
        limits = reddit.auth.limits
        remaining = limits.get("remaining") if isinstance(limits, dict) else None
        used = limits.get("used") if isinstance(limits, dict) else None
        if remaining is not None or used is not None:
            log.info("Reddit API limits: used=%s remaining=%s", used, remaining)
    except Exception as exc:
        log.debug("Reddit API limits unavailable: %s", exc)


def fetch(
    client_id: str | None,
    client_secret: str | None,
    user_agent: str,
    subreddits: list[str],
    usernames: list[str],
    start: datetime | None = None,
    limit: int = 100,
    delay_seconds: float = 1.0,
    max_subreddits: int = 10,
    max_usernames: int = 20,
) -> list[dict]:
    """Fetch Reddit data without exceeding a conservative request cadence.

    Each subreddit or named account can issue up to four listing requests.
    The one-second delay between requests keeps the process at or below about
    60 requests/minute, while caps prevent an accidentally large config from
    creating an unbounded run. Every endpoint is isolated so one bad subreddit
    or username does not discard records collected earlier.
    """
    if not client_id or not client_secret:
        log.info("Reddit skipped: REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET are not configured")
        return []
    try:
        import praw
        reddit = praw.Reddit(client_id=client_id, client_secret=client_secret, user_agent=user_agent, check_for_async=False)
    except Exception as exc:
        log.error("Reddit client initialization failed: %s", exc)
        return []

    selected_subreddits = subreddits[:max(0, max_subreddits)]
    selected_usernames = usernames[:max(0, max_usernames)]
    if len(selected_subreddits) < len(subreddits):
        log.warning("Reddit subreddit list capped at %d; %d configured entries skipped", max_subreddits, len(subreddits) - len(selected_subreddits))
    if len(selected_usernames) < len(usernames):
        log.warning("Reddit username list capped at %d; %d configured entries skipped", max_usernames, len(usernames) - len(selected_usernames))

    followed = {u.lower().removeprefix("u/").removeprefix("/") for u in selected_usernames}
    output: list[dict] = []
    requests_made = 0

    def call(items: Iterable, label: str) -> None:
        nonlocal requests_made
        if requests_made:
            _pace(delay_seconds)
        requests_made += 1
        _collect(items, followed, start, output, label)
        if requests_made % 10 == 0:
            _report_limits(reddit)

    for name in selected_subreddits:
        normalized = name.removeprefix("r/")
        try:
            subreddit = reddit.subreddit(normalized)
            call(subreddit.new(limit=limit), f"r/{normalized} submissions")
            call(subreddit.comments(limit=limit), f"r/{normalized} comments")
        except Exception as exc:
            log.warning("Reddit subreddit failed for r/%s; continuing: %s", normalized, exc)

    for username in selected_usernames:
        normalized = username.removeprefix("u/").removeprefix("/")
        try:
            redditor = reddit.redditor(normalized)
            call(redditor.submissions.new(limit=limit), f"u/{normalized} submissions")
            call(redditor.comments.new(limit=limit), f"u/{normalized} comments")
        except Exception as exc:
            log.warning("Reddit username failed for u/%s; continuing: %s", normalized, exc)

    _report_limits(reddit)
    return output
