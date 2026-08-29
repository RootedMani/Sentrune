from __future__ import annotations

import logging
from datetime import datetime, timezone

from ..normalize.price_bars import normalize_yfinance_frame

log = logging.getLogger(__name__)


def fetch(asset: dict, asset_id: int, interval: str = "1d", start: datetime | None = None) -> list[dict]:
    try:
        import yfinance as yf
        kwargs = {"interval": interval, "progress": False, "auto_adjust": False}
        if start:
            # Pass a datetime object: yfinance's string parser rejects full
            # ISO timestamps ("unconverted data remains"), which broke every
            # incremental run after the first one.
            kwargs["start"] = start.astimezone(timezone.utc)
        else:
            # First run: yfinance's default window is ~1 month, which starves
            # the sma_200 warm-up and the walk-forward splits. Two years of
            # daily bars keep the modeling layer usable on a fresh install.
            kwargs["period"] = "2y" if interval == "1d" else "1mo"
        frame = yf.download(asset["symbol"], **kwargs)
        return normalize_yfinance_frame(asset_id, interval, frame)
    except Exception as exc:
        log.warning("yfinance fetch failed for %s: %s", asset.get("symbol"), exc)
        return []
