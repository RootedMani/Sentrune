from __future__ import annotations

from typing import Iterable

import pandas as pd

DEFAULT_HORIZONS: tuple[int, ...] = (1, 3, 5, 10)


def compute_lag_momentum(
    frame: pd.DataFrame,
    horizons: Iterable[int] = DEFAULT_HORIZONS,
    zscore_window: int = 20,
) -> pd.DataFrame:
    """Add past multi-horizon returns and a rolling z-score of price.

    These are backward-looking only (no future data): `return_{h}` is the
    return over the trailing `h` bars ending at the current row, and
    `zscore_{window}` is how many rolling standard deviations the current
    close sits from its own trailing mean. Together they give the model
    trend shape (was it rising over 1, 3, 5, 10 bars) rather than just the
    current indicator level.
    """
    df = frame.copy()
    df.columns = [str(c).lower() for c in df.columns]
    if "close" not in df.columns:
        raise ValueError("frame is missing a 'close' column")

    close = df["close"]
    for horizon in horizons:
        df[f"return_{horizon}"] = close.pct_change(periods=horizon)

    min_periods = min(5, zscore_window)
    rolling_mean = close.rolling(zscore_window, min_periods=min_periods).mean()
    rolling_std = close.rolling(zscore_window, min_periods=min_periods).std()
    df[f"zscore_{zscore_window}"] = (close - rolling_mean) / rolling_std.replace(0, pd.NA)
    return df
