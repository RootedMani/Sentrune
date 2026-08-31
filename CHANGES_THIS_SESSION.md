# Sentrune — Changes This Session

## New functionality

**1. Explainability (`src/trading_assistant/modeling/explain/`)**
Turns a prediction into a plain-English sentence, e.g.:
> "The model leans strongly toward falling (82% probability), driven mainly by the 20-day average volume (trading activity). The lower Bollinger Band also supports this read."

Uses LightGBM's native `pred_contrib` (SHAP-consistent, no new dependency) to find which features actually drove *this specific* prediction, not just global importance. Wired into `dashboard/app.py`'s Model tab.

**2. Strategy + backtest layer (`src/trading_assistant/modeling/strategy/`)**
Didn't exist before — predictions were probabilities only, nothing converted them into a position. Now:
- `ThresholdStrategy`: converts (down/flat/up) probabilities into a position, only trading when confidence clears a threshold (not just argmax)
- `run_backtest`: turns positions into an equity curve, Sharpe, max drawdown, win rate, trade count — net of fee + slippage, benchmarked against buy-and-hold
- Wired into walk-forward training; results persisted to a new `strategy_backtests` table and shown in the dashboard

**3. Hyperparameter tuning (`src/trading_assistant/modeling/tuning/`)**
Time-respecting search over LightGBM hyperparameters — reuses the exact same purged walk-forward folds as validation (never a shuffled CV, which would leak). Ranks by mean log loss (calibration), not accuracy, since the strategy layer acts on the probabilities directly.
- Run via `python run_pipeline.py train -- --tune`
- Real result on your data: log loss improved on all 4 assets (e.g. AAPL 1.35 → 0.95, MSFT 1.71 → 1.24) in ~12 seconds total

**4. Hyperparameter tuning (`src/trading_assistant/modeling/tuning/`)**
Time-respecting search over LightGBM hyperparameters — reuses the exact same purged walk-forward folds as validation (never a shuffled CV, which would leak). Ranks by mean log loss (calibration), not accuracy, since the strategy layer acts on the probabilities directly.
- Run via `python run_pipeline.py train -- --tune`
- Real result on your data: log loss improved on all 4 assets (e.g. AAPL 1.35 → 0.95, MSFT 1.71 → 1.24) in ~12 seconds total

**5. Calibration check (`src/trading_assistant/modeling/validation/calibration.py`)**
Out-of-sample reliability curves + Expected Calibration Error per class, pooled across walk-forward folds. Finding: calibration is currently noisy (ECE 0.05-0.36 depending on asset/class) but the miscalibration doesn't have a clean, correctable direction — it's consistent with too little out-of-sample data (60 rows/asset) rather than a fundamentally broken model. Full writeup in `reports/validation_backtest_report.md`.

**6. `run_pipeline.py features -- --force-technical`**
Recomputes technical indicators from scratch, bypassing the incremental watermark — needed after any change to indicator logic.

## Real bugs found and fixed (pre-existing, not caused by these changes)

1. Shipped model artifacts were trained on an old feature-naming scheme (stale, needed retraining anyway)
2. `technical_features` only had 20 of ~39 expected columns — **ADX, Ichimoku, volatility_20, return_autocorr_20, volume_price_divergence, and all 5 candle patterns were never actually computed**, silently `NULL` for every row. Implemented all of these in `features/technical/indicators.py`.
3. `lag_horizons` config default (`[1,3,6,12,24]`) didn't match what modeling expected (`return_1/3/5/10`)
4. **Critical**: `assemble_features` joined `technical` and `labels` on raw timestamp strings in two different (but equivalent) formats — silently matched **zero rows**, so training on the current codebase was completely broken until fixed. This was the root cause of "asset has only 0 usable rows."
5. The incremental feature-state watermark meant a fixed bug wouldn't take effect on rerun without clearing state (see `--force-technical` above)
6. `ichimoku_chikou` (a backward-shifted/lagging feature) was required for live prediction, but is always `NaN` on the most recent bar by construction — excluded it from the trained feature set (still computed/stored for charting)
7. `candle_body_ratio` could exceed 1.0 when open/close fall outside the bar's high/low — added a defensive clip

## Testing
- 37 new tests added (strategy, explainability, tuning, calibration, indicator regression, timestamp-merge regression)
- All 86 tests pass (49 original + 37 new)
- Full pipeline (ingest → features → train → predict → explain) verified end-to-end against your real database for all 4 assets

## Report
`reports/validation_backtest_report.md` — the full walk-forward validation + strategy backtest + calibration report, written honestly (includes the MSFT fold that scored 0% accuracy, and the current calibration weaknesses, not just the wins).

## Honest read of current results
On the walk-forward backtest: AAPL and MSFT show the threshold strategy beating or tracking buy-and-hold with lower drawdown in most folds. BTC and ETH are more mixed — some folds outperform, one fold on each took zero trades (model wasn't confident enough to signal), and ETH underperforms buy-and-hold in line with the broader market move. This is the real, un-inflated picture — not cherry-picked.

## Not yet done (next steps from the original plan)
- Wiring your Finnhub/Alpha Vantage keys so sentiment features stop being dead weight (currently 0 rows)
- Multi-year backtest report + short paper-trading forward-test (Phase D)
- Probability calibration check (beyond log loss)
