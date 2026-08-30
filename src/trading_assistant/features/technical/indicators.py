from __future__ import annotations

import logging
from typing import Iterable

import numpy as np
import pandas as pd

log = logging.getLogger(__name__)


def _rolling_autocorr(returns: pd.Series, window: int, lag: int = 1) -> pd.Series:
    """Rolling lag-`lag` autocorrelation of a return series.

    pandas has no vectorized rolling-autocorrelation primitive, so this uses
    a manual rolling window. Window sizes here are small (20-ish bars) and
    this runs once per asset/interval during feature computation, so the
    O(n * window) cost is not a bottleneck in practice.
    """
    def _autocorr(x: np.ndarray) -> float:
        if len(x) <= lag or np.all(x == x[0]):
            return np.nan
        a, b = x[:-lag], x[lag:]
        if np.std(a) == 0 or np.std(b) == 0:
            return np.nan
        return float(np.corrcoef(a, b)[0, 1])

    return returns.rolling(window, min_periods=max(5, lag + 2)).apply(_autocorr, raw=True)


def _candlestick_flags(df: pd.DataFrame) -> pd.DataFrame:
    """Simple, dependency-free candlestick pattern flags (0/1 columns).

    These use body/range ratios rather than TA-Lib's C bindings (not
    installed here), so they're intentionally conservative approximations
    of doji / engulfing / hammer rather than TA-Lib-exact definitions.
    """
    body = (df["close"] - df["open"]).abs()
    candle_range = (df["high"] - df["low"]).replace(0, np.nan)
    upper_wick = df["high"] - df[["open", "close"]].max(axis=1)
    lower_wick = df[["open", "close"]].min(axis=1) - df["low"]

    out = pd.DataFrame(index=df.index)
    out["candle_body_ratio"] = body / candle_range
    out["candle_doji"] = (out["candle_body_ratio"] < 0.1).astype("Int64")
    out["candle_hammer"] = (
        (lower_wick > 2 * body) & (upper_wick < body) & (out["candle_body_ratio"] < 0.4)
    ).astype("Int64")

    prev_open, prev_close = df["open"].shift(1), df["close"].shift(1)
    bullish_engulf = (prev_close < prev_open) & (df["close"] > df["open"]) & \
        (df["close"] >= prev_open) & (df["open"] <= prev_close)
    bearish_engulf = (prev_close > prev_open) & (df["close"] < df["open"]) & \
        (df["open"] >= prev_close) & (df["close"] <= prev_open)
    out["candle_bullish_engulfing"] = bullish_engulf.astype("Int64")
    out["candle_bearish_engulfing"] = bearish_engulf.astype("Int64")
    # First row has no previous bar; warm-up NaN rather than a false flag.
    out.loc[df.index[:1], ["candle_bullish_engulfing", "candle_bearish_engulfing"]] = pd.NA
    return out


def compute_indicators(frame: pd.DataFrame, indicators: Iterable[str]) -> pd.DataFrame:
    """Compute configured indicators using pandas-ta; NaNs remain for warm-up rows."""
    try:
        import pandas_ta as ta
    except ImportError as exc:
        raise RuntimeError("pandas-ta is required for technical feature computation") from exc

    df = frame.copy()
    df.columns = [str(c).lower() for c in df.columns]
    required = {"open", "high", "low", "close", "volume"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"OHLCV frame missing columns: {sorted(missing)}")
    wanted = set(indicators)
    if "sma" in wanted:
        df["sma_20"] = ta.sma(df["close"], length=20)
        df["sma_50"] = ta.sma(df["close"], length=50)
        df["sma_200"] = ta.sma(df["close"], length=200)
    if "ema" in wanted:
        df["ema_12"] = ta.ema(df["close"], length=12)
        df["ema_26"] = ta.ema(df["close"], length=26)
    if "macd" in wanted:
        macd = ta.macd(df["close"], fast=12, slow=26, signal=9)
        if macd is not None:
            df["macd"] = macd.iloc[:, 0]
            df["macd_histogram"] = macd.iloc[:, 1]
            df["macd_signal"] = macd.iloc[:, 2]
    if "rsi" in wanted:
        df["rsi_14"] = ta.rsi(df["close"], length=14)
    if "stoch" in wanted:
        stoch = ta.stoch(df["high"], df["low"], df["close"], k=14, d=3, smooth_k=3)
        if stoch is not None:
            df["stoch_k"] = stoch.iloc[:, 0]
            df["stoch_d"] = stoch.iloc[:, 1]
    if "bollinger" in wanted:
        bands = ta.bbands(df["close"], length=20, std=2)
        if bands is not None:
            df["bb_lower"] = bands.iloc[:, 0]
            df["bb_middle"] = bands.iloc[:, 1]
            df["bb_upper"] = bands.iloc[:, 2]
    if "atr" in wanted:
        df["atr_14"] = ta.atr(df["high"], df["low"], df["close"], length=14)
    if "obv" in wanted:
        df["obv"] = ta.obv(df["close"], df["volume"])
    if "volume_sma" in wanted:
        df["volume_sma_20"] = ta.sma(df["volume"], length=20)
    if "adx" in wanted:
        adx = ta.adx(df["high"], df["low"], df["close"], length=14)
        if adx is not None:
            df["adx_14"] = adx["ADX_14"]
            df["plus_di_14"] = adx["DMP_14"]
            df["minus_di_14"] = adx["DMN_14"]
    if "ichimoku" in wanted:
        # pandas_ta returns (visible_df, forward_projection_df); we only
        # want the aligned-to-history half, reindexed defensively in case a
        # future pandas_ta version drops warm-up rows instead of NaN-padding.
        ichimoku = ta.ichimoku(df["high"], df["low"], df["close"])
        if ichimoku is not None and ichimoku[0] is not None:
            visible = ichimoku[0].reindex(df.index)
            df["ichimoku_tenkan"] = visible.get("ITS_9")
            df["ichimoku_kijun"] = visible.get("IKS_26")
            df["ichimoku_senkou_a"] = visible.get("ISA_9")
            df["ichimoku_senkou_b"] = visible.get("ISB_26")
            # pandas_ta's chikou span at row t is close[t+displacement] (the
            # standard "plot current close 26 periods back" convention) —
            # i.e. it depends on future closes. Fine for charting, but it
            # must never be fed to the model as a feature for row t, or the
            # model would be trained on leaked future data.
            df["ichimoku_chikou"] = visible.get("ICS_26")
    returns = df["close"].pct_change()
    if "volatility" in wanted:
        df["volatility_20"] = returns.rolling(20, min_periods=min(5, 20)).std()
    if "autocorr" in wanted:
        df["return_autocorr_20"] = _rolling_autocorr(returns, window=20, lag=1)
    if "volume_price_divergence" in wanted:
        volume_change = df["volume"].pct_change()
        df["volume_price_divergence"] = returns.rolling(20, min_periods=min(5, 20)).corr(volume_change)
    if "candlestick" in wanted:
        df = df.join(_candlestick_flags(df))
    return df
