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
        adx = ta.adx(df["high"], df["low"], df["close"], length= a14)
        if adx is not None:
            df["adx_14"] = adx["ADX_14"]
            df["plus_di_14"] = adx["DMP_14"]
            df["minus_di_14"] = adx["DMN_14"]
    if "ichimoku" in wanted:
        ichimoku = ta.ichimoku(df["high"], df["low"], df["close"], tenkan=9, kijun=26, senkou=52)
        # FIX: Check that the historical frame (index 0) is also not None
        if ichimoku is not None and ichimoku[0] is not None:
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
        df["return_autocorr_20"] = returns.rolling(20, min_periods=10).apply(
            lambda window: window.autocorr(lag=1), raw=False
        )
        volume_change = df["volume"].pct_change()
        df["volume_price_divergence"] = returns.rolling(20, min_periods=10).corr(volume_change)

    return df

def _compute_candle_patterns(df: pd.DataFrame) -> pd.DataFrame:
    """Hand-rolled single-bar candlestick patterns."""
    body = (df["close"] - df["open"]).abs()
    candle_range = (df["high"] - df["low"]).replace(0, pd.NA)
    upper_wick = df["high"] - df[["open", "close"]].max(axis=1)
    lower_wick = df[["open", "close"]].min(axis=1) - df["low"]

    df["candle_body_ratio"] = (body / candle_range).clip(upper=1.0)
    df["candle_doji"] = (df["candle_body_ratio"] < 0.1).astype(int)
    df["candle_hammer"] = (
        (lower_wick >= 2 * body) & (upper_wick <= body) & (body > 0)
    ).astype(int)
    
    prev_open, prev_close = df["open"].shift(1), df["close"].shift(1)
    prev_body_low = pd.concat([prev_open, prev_close], axis=1).min(axis=1)
    prev_body_high = pd.concat([prev_open, prev_close], axis=1).max(axis=1)
    
    df["candle_bullish_engulfing"] = (
        (prev_close < prev_open) & (df["close"] > df["open"]) &
        (df["open"] <= prev_body_low) & (df["close"] >= prev_body_high)
    ).astype(int)
    df["candle_bearish_engulfing"] = (
        (prev_close > prev_open) & (df["close"] < df["open"]) &
        (df["open"] >= prev_body_high) & (df["close"] <= prev_body_low)
    ).astype(int)
    
    return df
