import numpy as np
import pandas as pd
import pytest

from trading_assistant.features.technical.regime import compute_regime


def test_day_of_week_matches_datetime_index():
    idx = pd.date_range("2024-01-01", periods=5, freq="D")  # 2024-01-01 is a Monday
    frame = pd.DataFrame({"close": [100.0, 101.0, 102.0, 103.0, 104.0]}, index=idx)
    result = compute_regime(frame)
    assert result["day_of_week"].tolist() == [0, 1, 2, 3, 4]


def test_dist_from_high_and_low_are_zero_at_the_extremes():
    idx = pd.date_range("2024-01-01", periods=5, freq="D")
    close = pd.Series([100.0, 110.0, 90.0, 105.0, 95.0], index=idx)
    frame = pd.DataFrame({"close": close}, index=idx)
    result = compute_regime(frame, high_low_window=10)
    assert result.iloc[1]["dist_from_high"] == pytest.approx(0.0)  # 110 is the running high so far
    assert result.iloc[2]["dist_from_low"] == pytest.approx(0.0)  # 90 is the running low so far
    assert (result["dist_from_high"] <= 1e-9).all()
    assert (result["dist_from_low"] >= -1e-9).all()


def test_volatility_regime_is_bucketed_0_1_2():
    np.random.seed(0)
    idx = pd.date_range("2024-01-01", periods=300, freq="D")
    close = pd.Series(np.cumsum(np.random.randn(300)) + 100, index=idx)
    frame = pd.DataFrame({"close": close}, index=idx)
    result = compute_regime(frame, vol_window=10, vol_rank_window=50, high_low_window=50)
    observed = set(result["volatility_regime"].dropna().unique().tolist())
    assert observed <= {0, 1, 2}
