import numpy as np
import pandas as pd
import pytest

from trading_assistant.modeling.strategy import StrategyConfig, ThresholdStrategy, run_backtest


class TestThresholdStrategy:
    def test_takes_long_position_above_threshold(self):
        strategy = ThresholdStrategy(StrategyConfig(long_threshold=0.5))
        assert strategy.position_for({"down": 0.1, "flat": 0.2, "up": 0.7}) == 1.0

    def test_stays_flat_below_threshold_even_if_up_is_argmax(self):
        # up is the most likely single class (0.34 > 0.33) but far below the
        # confidence threshold - this is the scenario the module's docstring
        # calls out explicitly: argmax alone is not a real trading signal.
        strategy = ThresholdStrategy(StrategyConfig(long_threshold=0.45))
        assert strategy.position_for({"down": 0.33, "flat": 0.33, "up": 0.34}) == 0.0

    def test_no_short_by_default_even_with_strong_down_signal(self):
        strategy = ThresholdStrategy(StrategyConfig(short_threshold=0.5, allow_short=False))
        assert strategy.position_for({"down": 0.8, "flat": 0.1, "up": 0.1}) == 0.0

    def test_shorts_when_enabled_and_confident(self):
        strategy = ThresholdStrategy(StrategyConfig(short_threshold=0.5, allow_short=True))
        assert strategy.position_for({"down": 0.8, "flat": 0.1, "up": 0.1}) == -1.0

    def test_max_position_scales_output(self):
        strategy = ThresholdStrategy(StrategyConfig(long_threshold=0.5, max_position=0.25))
        assert strategy.position_for({"down": 0.1, "flat": 0.1, "up": 0.8}) == 0.25

    def test_batch_matches_row_by_row(self):
        config = StrategyConfig(long_threshold=0.5, short_threshold=0.5, allow_short=True)
        strategy = ThresholdStrategy(config)
        rows = [
            {"down": 0.1, "flat": 0.1, "up": 0.8},
            {"down": 0.7, "flat": 0.2, "up": 0.1},
            {"down": 0.34, "flat": 0.33, "up": 0.33},
        ]
        matrix = np.array([[r["down"], r["flat"], r["up"]] for r in rows])
        batch_result = strategy.positions_for_batch(matrix)
        row_result = [strategy.position_for(r) for r in rows]
        assert list(batch_result) == row_result


class TestRunBacktest:
    def _frame(self, n=6):
        timestamps = pd.date_range("2024-01-01", periods=n, freq="D", tz="UTC")
        return timestamps

    def test_flat_position_produces_zero_return_and_zero_cost(self):
        timestamps = self._frame()
        forward_returns = pd.Series([0.01, -0.02, 0.03, -0.01, 0.02, 0.0])
        positions = pd.Series([0.0] * 6)
        result = run_backtest(timestamps, forward_returns, positions, fee_bps=10, slippage_bps=5)
        assert result.total_return == pytest.approx(0.0)
        assert result.trades == 0

    def test_always_long_matches_buy_and_hold_before_costs(self):
        timestamps = self._frame()
        forward_returns = pd.Series([0.01, 0.02, -0.01, 0.03, 0.0, 0.01])
        positions = pd.Series([1.0] * 6)
        # Zero cost isolates the "does holding long every bar reduce to
        # buy-and-hold" check from the separate cost-accounting behavior.
        result = run_backtest(timestamps, forward_returns, positions, fee_bps=0, slippage_bps=0)
        assert result.total_return == pytest.approx(result.baseline_total_return, abs=1e-9)
        # One cost is still charged: entering the position on bar 0 (from a
        # flat implicit starting position) is itself a position change.
        assert result.trades == 1

    def test_costs_reduce_return_when_flipping_every_bar(self):
        timestamps = self._frame()
        forward_returns = pd.Series([0.0] * 6)
        positions = pd.Series([1.0, -1.0, 1.0, -1.0, 1.0, -1.0])
        result = run_backtest(timestamps, forward_returns, positions, fee_bps=10, slippage_bps=5)
        # Zero underlying return but constant flipping should show up as a
        # pure cost drag - equity should end below 1.0 (a real loss), and
        # every bar changes position by 2 (a full flip) except the first.
        assert result.total_return < 0
        assert result.trades == 6  # flat->1 counts, plus 5 flips

    def test_max_drawdown_is_never_positive(self):
        timestamps = self._frame()
        forward_returns = pd.Series([0.05, -0.10, 0.02, -0.05, 0.01, 0.03])
        positions = pd.Series([1.0] * 6)
        result = run_backtest(timestamps, forward_returns, positions)
        assert result.max_drawdown <= 0

    def test_win_rate_only_counts_active_bars(self):
        timestamps = self._frame()
        # Bars 0,1 are flat (should not count toward win rate); bars 2-5 are
        # active with 3 winners, 1 loser among them.
        forward_returns = pd.Series([0.05, -0.05, 0.02, 0.02, 0.02, -0.01])
        positions = pd.Series([0.0, 0.0, 1.0, 1.0, 1.0, 1.0])
        result = run_backtest(timestamps, forward_returns, positions, fee_bps=0, slippage_bps=0)
        assert result.win_rate == pytest.approx(0.75)
