from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class StrategyConfig:
    """Configuration for turning model probabilities into a position.

    long_threshold / short_threshold: minimum probability required in the
    "up" / "down" class before the strategy will take a position at all.
    Kept deliberately separate from the model's own argmax so that "the
    model's most likely class happens to be up" and "the model is confident
    enough about up to risk capital on it" are not conflated - a 34% up /
    33% flat / 33% down row still argmaxes to "up" but is not a real signal.

    allow_short: if False, the strategy only ever goes long or flat - a
    reasonable default for retail-style testing where shorting has real
    borrow costs/risk this prototype doesn't model.

    max_position: position size as a fraction of capital (1.0 = fully
    invested when a signal fires, 0.0 = flat). A single scalar rather than
    a sizing curve, deliberately - probability-proportional sizing is a
    natural next step but adds a second untested assumption on top of the
    threshold itself; keep the first version simple enough to reason about.
    """
    long_threshold: float = 0.45
    short_threshold: float = 0.45
    allow_short: bool = False
    max_position: float = 1.0


class ThresholdStrategy:
    """Maps a (down, flat, up) probability row to a position in {-1, 0, +1} * max_position."""

    def __init__(self, config: StrategyConfig | None = None):
        self.config = config or StrategyConfig()

    def position_for(self, probabilities: dict[str, float]) -> float:
        up = probabilities.get("up", 0.0)
        down = probabilities.get("down", 0.0)
        cfg = self.config
        if up >= cfg.long_threshold and up > down:
            return cfg.max_position
        if cfg.allow_short and down >= cfg.short_threshold and down > up:
            return -cfg.max_position
        return 0.0

    def positions_for_batch(self, probability_matrix: np.ndarray) -> np.ndarray:
        """Vectorized version of position_for for an (n_rows, 3) array in
        [down, flat, up] column order - used by the backtester so an entire
        walk-forward fold can be scored without a Python loop per row."""
        down, up = probability_matrix[:, 0], probability_matrix[:, 2]
        cfg = self.config
        positions = np.zeros(len(probability_matrix))
        long_mask = (up >= cfg.long_threshold) & (up > down)
        positions[long_mask] = cfg.max_position
        if cfg.allow_short:
            short_mask = (down >= cfg.short_threshold) & (down > up) & ~long_mask
            positions[short_mask] = -cfg.max_position
        return positions
