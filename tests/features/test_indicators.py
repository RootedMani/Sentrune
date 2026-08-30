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


def test_new_indicator_columns_are_populated_after_warmup():
    values = pd.Series(range(1, 301), dtype=float)
    frame = pd.DataFrame({"open": values, "high": values + 1, "low": values - 1, "close": values, "volume": 100.0})
    result = compute_indicators(
        frame, ["adx", "ichimoku", "volatility", "autocorr", "volume_price_divergence", "candlestick"]
    )
    for column in ("adx_14", "ichimoku_tenkan", "ichimoku_senkou_a", "volatility_20", "candle_body_ratio"):
        assert column in result
        assert not pd.isna(result.iloc[-1][column])


def test_ichimoku_chikou_depends_on_future_closes_and_is_nan_at_tail():
    # Regression: the chikou span at row t is close[t + displacement] in
    # pandas_ta's output, so it must never be used as a model feature for
    # row t (see modeling/compute.py DEFAULT_FEATURES, which excludes it).
    # Its NaN tail is the visible symptom of that future dependency.
    values = pd.Series(range(1, 121), dtype=float)
    frame = pd.DataFrame({"open": values, "high": values + 1, "low": values - 1, "close": values, "volume": 100.0})
    result = compute_indicators(frame, ["ichimoku"])
    assert pd.isna(result.iloc[-1]["ichimoku_chikou"])


def test_candlestick_flags_detect_bullish_engulfing():
    frame = pd.DataFrame({
        "open": [10.0, 9.0], "high": [10.5, 11.5], "low": [8.5, 8.8], "close": [9.0, 11.0], "volume": [100.0, 100.0],
    })
    result = compute_indicators(frame, ["candlestick"])
    assert result.iloc[1]["candle_bullish_engulfing"] == 1
    assert pd.isna(result.iloc[0]["candle_bullish_engulfing"])
