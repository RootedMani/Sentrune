from __future__ import annotations

import numpy as np
import pandas as pd


def _rolling_percentile_rank(series: pd.Series, window: int) -> pd.Series:
    """Causal rolling percentile rank: where the latest value sits (0-1)
    among the trailing `window` values, using only past and current data."""
    def _rank_last(values: np.ndarray) -> float:
        if len(values) <= 1:
            return np.nan
        return float((values < values[-1]).sum()) / (len(values) - 1)

    return series.rolling(window, min_periods=min(5, window)).apply(_rank_last, raw=True)


def compute_regime(
    frame: pd.DataFrame,
    vol_window: int = 20,
    vol_rank_window: int = 252,
    high_low_window: int = 252,
) -> pd.DataFrame:
    """Add regime-context features: volatility bucket, calendar effects,
    and distance from the trailing high/low.

    `high_low_window` should reflect the asset's trading calendar (e.g. 252
    trading days for stocks vs ~365 for crypto, which trades every day);
    callers pass the appropriate window per asset type.

    The frame's index must be a DatetimeIndex (as produced by the ingest
    layer's price_bars timestamp column) so day-of-week can be derived.
    """
    df = frame.copy()
    df.columns = [str(c).lower() for c in df.columns]
    if "close" not in df.columns:
        raise ValueError("frame is missing a 'close' column")

    close = df["close"]
    realized_vol = close.pct_change().rolling(vol_window, min_periods=min(5, vol_window)).std()
    vol_rank = _rolling_percentile_rank(realized_vol, vol_rank_window)
    # 0 = low-vol regime, 1 = mid, 2 = high-vol regime, based on where today's
    # volatility ranks against its own trailing history (causal, no lookahead).
    df["volatility_regime"] = pd.cut(
        vol_rank, bins=[-0.01, 0.33, 0.67, 1.01], labels=[0, 1, 2]
    ).astype("Int64")

    index_as_datetime = pd.to_datetime(df.index, errors="coerce")
    df["day_of_week"] = index_as_datetime.dayofweek

    rolling_high = close.rolling(high_low_window, min_periods=1).max()
    rolling_low = close.rolling(high_low_window, min_periods=1).min()
    df["dist_from_high"] = close / rolling_high - 1.0  # <= 0, 0 means at the high
    df["dist_from_low"] = close / rolling_low - 1.0  # >= 0, 0 means at the low
    return df
