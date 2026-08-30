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
    return df
