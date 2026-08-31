from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd


@dataclass
class BacktestResult:
    equity_curve: pd.Series          # cumulative equity, starting at 1.0
    bar_returns: pd.Series           # net-of-cost strategy return per bar
    positions: pd.Series             # position held into each bar (-1..1)
    trades: int                      # number of position changes (a rough turnover proxy)
    total_return: float
    annualized_return: float
    annualized_volatility: float
    sharpe: float
    max_drawdown: float
    win_rate: float                  # fraction of active (nonzero-position) bars with positive net return
    baseline_total_return: float     # buy-and-hold over the same window, for comparison
    baseline_sharpe: float
    bars_per_year: float
    metadata: dict = field(default_factory=dict)


def _annualization_factor(bars_per_year: float) -> float:
    return bars_per_year


def _sharpe(bar_returns: np.ndarray, bars_per_year: float) -> float:
    if len(bar_returns) < 2 or np.std(bar_returns) == 0:
        return 0.0
    return float(np.mean(bar_returns) / np.std(bar_returns) * np.sqrt(bars_per_year))


def _max_drawdown(equity_curve: np.ndarray) -> float:
    running_max = np.maximum.accumulate(equity_curve)
    drawdown = equity_curve / running_max - 1.0
    return float(drawdown.min())


def run_backtest(
    timestamps: pd.Series,
    forward_returns: pd.Series,
    positions: pd.Series,
    fee_bps: float = 10.0,
    slippage_bps: float = 5.0,
    bars_per_year: float = 252.0,
) -> BacktestResult:
    """Simulate holding `positions[i]` (in {-1, 0, +1} x size) over the
    single-bar forward return `forward_returns[i]`, deducting a fee +
    slippage cost in basis points whenever the position changes from the
    prior bar (entering, exiting, or flipping all incur cost once; holding
    an unchanged position does not).

    This intentionally simulates one bar of holding per row rather than
    holding for the model's full `horizon_bars` - it composes directly with
    walk-forward folds (one row = one already-purged, already-labeled bar)
    without re-deriving custom overlapping-holding-period accounting. It is
    a conservative choice: overlapping multi-bar holds are not modeled, so
    this could understate returns if the true horizon is longer, but never
    manufactures returns that were not actually realizable bar-to-bar.

    Costs are charged on the *size of the position change*, not a flat
    per-trade fee, so a flip from +1 to -1 costs twice as much as +1 to 0.
    """
    positions = positions.reset_index(drop=True)
    forward_returns = forward_returns.reset_index(drop=True)
    timestamps = pd.to_datetime(pd.Series(timestamps).reset_index(drop=True), utc=True)

    prior_positions = positions.shift(1).fillna(0.0)
    position_change = (positions - prior_positions).abs()
    cost_rate = (fee_bps + slippage_bps) / 10_000.0
    costs = position_change * cost_rate

    gross_bar_return = positions * forward_returns
    net_bar_return = gross_bar_return - costs

    equity_curve = (1.0 + net_bar_return).cumprod()
    equity_curve.index = timestamps
    net_bar_return.index = timestamps
    positions.index = timestamps

    active = positions != 0
    win_rate = float((net_bar_return[active] > 0).mean()) if active.any() else 0.0
    trades = int((position_change > 0).sum())

    total_return = float(equity_curve.iloc[-1] - 1.0) if len(equity_curve) else 0.0
    n_bars = len(net_bar_return)
    years = n_bars / bars_per_year if bars_per_year else 0.0
    annualized_return = float((1.0 + total_return) ** (1.0 / years) - 1.0) if years > 0 and (1.0 + total_return) > 0 else float("nan")
    annualized_vol = float(net_bar_return.std() * np.sqrt(bars_per_year)) if n_bars > 1 else 0.0
    sharpe = _sharpe(net_bar_return.to_numpy(), bars_per_year)
    max_dd = _max_drawdown(equity_curve.to_numpy()) if len(equity_curve) else 0.0

    baseline_equity = (1.0 + forward_returns.reset_index(drop=True)).cumprod()
    baseline_total_return = float(baseline_equity.iloc[-1] - 1.0) if len(baseline_equity) else 0.0
    baseline_sharpe = _sharpe(forward_returns.to_numpy(), bars_per_year)

    return BacktestResult(
        equity_curve=equity_curve,
        bar_returns=net_bar_return,
        positions=positions,
        trades=trades,
        total_return=total_return,
        annualized_return=annualized_return,
        annualized_volatility=annualized_vol,
        sharpe=sharpe,
        max_drawdown=max_dd,
        win_rate=win_rate,
        baseline_total_return=baseline_total_return,
        baseline_sharpe=baseline_sharpe,
        bars_per_year=bars_per_year,
        metadata={"fee_bps": fee_bps, "slippage_bps": slippage_bps, "n_bars": n_bars},
    )
