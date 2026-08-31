from __future__ import annotations

import logging
from typing import Iterable

import pandas as pd

log = logging.getLogger(__name__)


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
        ichimoku = ta.ichimoku(df["high"], df["low"], df["close"], tenkan=9, kijun=26, senkou=52)
        if ichimoku is not None:
            # ta.ichimoku returns (historical, forward-projected) - only the
            # first, index-aligned frame is usable as a per-bar feature; the
            # second frame projects the cloud into future dates that don't
            # exist yet in this index and would misalign on merge.
            historical = ichimoku[0]
            df["ichimoku_tenkan"] = historical["ITS_9"]
            df["ichimoku_kijun"] = historical["IKS_26"]
            df["ichimoku_senkou_a"] = historical["ISA_9"]
            df["ichimoku_senkou_b"] = historical["ISB_26"]
            df["ichimoku_chikou"] = historical["ICS_26"]
    if "candles" in wanted:
        df = _compute_candle_patterns(df)
    if "volatility_divergence" in wanted:
        returns = df["close"].pct_change()
        df["volatility_20"] = returns.rolling(20, min_periods=5).std()
        # Autocorrelation of daily returns at lag 1 over a trailing 20-bar
        # window: positive means recent moves tend to persist (momentum),
        # negative means they tend to reverse (mean reversion), computed
        # causally (rolling, backward-looking only).
        df["return_autocorr_20"] = returns.rolling(20, min_periods=10).apply(
            lambda window: window.autocorr(lag=1), raw=False
        )
        # Volume/price divergence: correlation between price direction and
        # volume over a trailing window. A strong uptrend on falling volume
        # (low/negative divergence) is a classic "weak hands" warning signal
        # technical analysts watch for; here it's a continuous feature
        # rather than a hand-tuned rule.
        volume_change = df["volume"].pct_change()
        df["volume_price_divergence"] = returns.rolling(20, min_periods=10).corr(volume_change)
    return df


def _compute_candle_patterns(df: pd.DataFrame) -> pd.DataFrame:
    """Hand-rolled single-bar candlestick patterns.

    pandas-ta's `cdl_pattern` delegates to the compiled TA-Lib C library for
    most named patterns, which is not part of this project's pure-Python
    dependency stack (see pyproject.toml) and is nontrivial to build in
    minimal/CI environments. These five are simple enough to define directly
    from OHLC ratios with no external dependency, and the definitions are
    standard textbook ones - not an attempt to reproduce TA-Lib exactly.
    """
    body = (df["close"] - df["open"]).abs()
    candle_range = (df["high"] - df["low"]).replace(0, pd.NA)
    upper_wick = df["high"] - df[["open", "close"]].max(axis=1)
    lower_wick = df[["open", "close"]].min(axis=1) - df["low"]

    # candle_body_ratio is meant to be a fraction of the bar's total range in
    # [0, 1]. Real OHLC feeds occasionally contain a bar where open or close
    # falls outside [low, high] (bad ticks, split/dividend adjustment
    # artifacts, etc.), which would otherwise let body > candle_range and
    # push the ratio above 1 - clip defensively rather than let a single bad
    # bar produce a nonsensical feature value silently.
    df["candle_body_ratio"] = (body / candle_range).clip(upper=1.0)
    # Doji: body is a small fraction of the bar's total range - open and
    # close are nearly equal, signaling indecision.
    df["candle_doji"] = (df["candle_body_ratio"] < 0.1).astype(int)
    # Hammer: small body near the top of the range with a long lower wick
    # (>= 2x the body) and a short upper wick - a classic potential-reversal
    # shape after a decline.
    df["candle_hammer"] = (
        (lower_wick >= 2 * body) & (upper_wick <= body) & (body > 0)
    ).astype(int)

    prev_open, prev_close = df["open"].shift(1), df["close"].shift(1)
    prev_body_low = pd.concat([prev_open, prev_close], axis=1).min(axis=1)
    prev_body_high = pd.concat([prev_open, prev_close], axis=1).max(axis=1)
    # Bullish engulfing: prior bar closed down, current bar closes up and its
    # body fully engulfs the prior bar's body.
    df["candle_bullish_engulfing"] = (
        (prev_close < prev_open) & (df["close"] > df["open"]) &
        (df["open"] <= prev_body_low) & (df["close"] >= prev_body_high)
    ).astype(int)
    # Bearish engulfing: the mirror image - prior bar closed up, current bar
    # closes down and fully engulfs the prior body.
    df["candle_bearish_engulfing"] = (
        (prev_close > prev_open) & (df["close"] < df["open"]) &
        (df["open"] >= prev_body_high) & (df["close"] <= prev_body_low)
    ).astype(int)
    return df
