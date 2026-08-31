import numpy as np
import pandas as pd
import pytest

pdta = pytest.importorskip("pandas_ta")
from trading_assistant.features.technical.indicators import compute_indicators


def test_indicator_columns_and_warmup_values():
    values = pd.Series(range(1, 221), dtype=float)
    frame = pd.DataFrame({"open": values, "high": values + 1, "low": values - 1, "close": values, "volume": 100.0})
    result = compute_indicators(frame, ["sma", "ema", "macd", "rsi", "stoch", "bollinger", "atr", "obv", "volume_sma"])
    assert "sma_20" in result and "macd" in result and "rsi_14" in result
    assert pd.isna(result.iloc[0]["sma_20"])
    assert result.iloc[199]["sma_200"] == pytest.approx(100.5)
    assert result.iloc[-1]["ema_12"] > result.iloc[-2]["ema_12"]


def _realistic_ohlcv_frame(n=250, seed=0):
    """A wiggly (not monotonic) synthetic series - ADX/ichimoku/candle
    patterns need actual up/down movement to produce non-degenerate values,
    unlike the strictly increasing fixture above. high/low are built to
    always bracket both open and close, as any real OHLC bar must."""
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2023-01-01", periods=n, freq="D", tz="UTC")
    close = pd.Series(100 + np.cumsum(rng.normal(0, 1, n)), index=dates)
    open_ = close.shift(1).fillna(close.iloc[0])
    body_high = pd.concat([open_, close], axis=1).max(axis=1)
    body_low = pd.concat([open_, close], axis=1).min(axis=1)
    high = body_high + rng.uniform(0.1, 2.0, n)
    low = body_low - rng.uniform(0.1, 2.0, n)
    volume = pd.Series(rng.uniform(1000, 5000, n), index=dates)
    return pd.DataFrame({"open": open_, "high": high, "low": low, "close": close, "volume": volume})


class TestNewlyAddedIndicators:
    """Regression coverage for the indicators that were listed in
    modeling/compute.py's TECHNICAL_FEATURES and features/db's
    ensure_columns but were never actually computed - every row silently
    stayed NULL until these branches were added. These pin down that each
    configured indicator name produces real (non-entirely-NaN) values."""

    def test_adx_produces_real_post_warmup_values(self):
        frame = _realistic_ohlcv_frame()
        result = compute_indicators(frame, ["adx"])
        for col in ("adx_14", "plus_di_14", "minus_di_14"):
            assert col in result.columns
            assert result[col].notna().sum() > 0, f"{col} was never computed (all-NaN)"

    def test_ichimoku_produces_real_values_and_chikou_is_lagging(self):
        frame = _realistic_ohlcv_frame()
        result = compute_indicators(frame, ["ichimoku"])
        for col in ("ichimoku_tenkan", "ichimoku_kijun", "ichimoku_senkou_a", "ichimoku_senkou_b", "ichimoku_chikou"):
            assert col in result.columns
            assert result[col].notna().sum() > 0, f"{col} was never computed (all-NaN)"
        # Chikou is a lagging span (close shifted backward): by construction
        # the most recent rows must be NaN. This is the exact property that
        # makes it unusable as a live-prediction feature (see
        # modeling/compute.py's TECHNICAL_FEATURES comment) - pinned here so
        # a future change doesn't accidentally "fix" it into a leaking
        # forward-looking feature instead.
        assert result["ichimoku_chikou"].iloc[-5:].isna().all()

    def test_candle_patterns_are_binary_and_not_all_zero(self):
        frame = _realistic_ohlcv_frame()
        result = compute_indicators(frame, ["candles"])
        for col in ("candle_doji", "candle_hammer", "candle_bullish_engulfing", "candle_bearish_engulfing"):
            assert col in result.columns
            assert set(result[col].dropna().unique()) <= {0, 1}
        assert "candle_body_ratio" in result.columns
        assert result["candle_body_ratio"].dropna().between(0, 1).all()

    def test_volatility_and_divergence_features_compute(self):
        frame = _realistic_ohlcv_frame()
        result = compute_indicators(frame, ["volatility_divergence"])
        for col in ("volatility_20", "return_autocorr_20", "volume_price_divergence"):
            assert col in result.columns
            assert result[col].notna().sum() > 0, f"{col} was never computed (all-NaN)"
        # Correlation/autocorrelation-based features must stay in [-1, 1].
        assert result["return_autocorr_20"].dropna().between(-1.0001, 1.0001).all()
        assert result["volume_price_divergence"].dropna().between(-1.0001, 1.0001).all()

