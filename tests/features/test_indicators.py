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
