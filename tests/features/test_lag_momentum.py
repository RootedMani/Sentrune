import pandas as pd
import pytest

from trading_assistant.features.technical.lag_momentum import compute_lag_momentum


def test_multi_horizon_returns_are_backward_looking_only():
    close = pd.Series([100.0, 101.0, 102.0, 99.0, 105.0, 110.0])
    frame = pd.DataFrame({"close": close})
    result = compute_lag_momentum(frame, horizons=[1, 3], zscore_window=3)
    # return_1 at row i is close[i]/close[i-1]-1; row 0 has no prior bar.
    assert pd.isna(result.iloc[0]["return_1"])
    assert result.iloc[1]["return_1"] == pytest.approx(101.0 / 100.0 - 1.0)
    assert result.iloc[3]["return_3"] == pytest.approx(99.0 / 100.0 - 1.0)


def test_zscore_reflects_deviation_from_rolling_mean():
    close = pd.Series([100.0] * 10 + [200.0])
    frame = pd.DataFrame({"close": close})
    result = compute_lag_momentum(frame, horizons=[1], zscore_window=5)
    # A big jump after a flat run should register as a strongly positive z-score.
    assert result.iloc[-1]["zscore_5"] > 1.5


def test_missing_close_column_raises():
    with pytest.raises(ValueError):
        compute_lag_momentum(pd.DataFrame({"open": [1.0, 2.0]}))
