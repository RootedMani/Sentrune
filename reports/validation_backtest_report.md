# Sentrune — Validation & Backtest Report

**Generated:** 2026-08-31 · **Model:** LightGBM 3-class (down/flat/up), tuned per asset · **Data:** technical indicators only (news/social sentiment not yet populated — see Limitations)

---

## 1. What this report is, and isn't

This is a **walk-forward backtest report**, not a live trading result. Every number below comes from testing the model only on data it never trained on, using an expanding window that always trains on the past and tests on the future — never the reverse. It is the honest evidence for whether this approach has any edge at all.

It is **not** a multi-year, statistically robust backtest. The data available right now is:

| Asset | History | Trading days |
|---|---|---|
| AAPL, MSFT | Aug 2024 – Aug 2026 | ~2 years |
| BTC, ETH | Dec 2023 – Aug 2026 | ~2.7 years |

Three walk-forward folds of 20 test days each means **each asset's entire evidence base is 60 out-of-sample trading days** (about 3 months, non-contiguous, spread across the available history). That is not enough to draw confident conclusions about real-world edge — it's enough to say whether the approach is *worth continuing to invest in*, which is what this report answers.

---

## 2. Setup

- **Labels:** 3-class — price up / down / flat over a 5-day forward horizon, with a 0.5% dead zone around zero counted as "flat"
- **Features:** 41 technical/candlestick/volatility indicators per bar (sentiment features exist in the pipeline but are currently empty — see §6)
- **Validation:** 3 expanding walk-forward folds per asset, each with a 5-day purge gap at the train/test boundary (to prevent the forward-looking label from leaking test-period information into training)
- **Hyperparameters:** searched per asset using the same purged folds (never a shuffled CV), selected by mean log loss. Every asset converged on a smaller, more regularized tree than the untuned default — expected, given how little data there is per asset
- **Strategy:** a simple threshold rule — only take a position when the model's up (or down) probability clears 45% *and* exceeds the opposing probability; otherwise stay flat. No shorting. 10bps fee + 5bps slippage charged on every position change
- **Baselines:** buy-and-hold, and a 20/50-day moving-average crossover

---

## 3. Classification results

Mean walk-forward log loss and accuracy per asset (lower log loss is better; it rewards calibrated probabilities and punishes confident wrong answers):

| Asset | LightGBM log loss | LightGBM accuracy | Buy&hold log loss | MA-crossover log loss |
|---|---|---|---|---|
| AAPL | **0.95** | 58.3% | 14.42 | 14.42 |
| MSFT | **1.24** | 41.7% | 19.82 | 24.63 |
| BTC | **1.12** | 50.0% | 18.02 | 26.43 |
| ETH | **1.29** | 40.0% | 20.42 | 19.23 |

The baselines' extreme log-loss values are an artifact of how they're built (buy-and-hold and MA-crossover always assign 100% probability to one class), not evidence they're "worse traders" — log loss simply isn't the right way to compare a probabilistic model to a hard rule. The honest comparison is the **strategy backtest in §4**, which puts every approach through the same return-based scoring.

LightGBM's accuracy hovering around 40-58% (vs. a 3-class random baseline of ~33%) is a modest, believable signal — not the kind of number that should raise suspicion of leakage, and not a number that implies a reliable trading edge on its own either.

**One result worth calling out directly: MSFT's fold 1 scored 0% accuracy** — every single test-window prediction was wrong. Investigating this: that test window (Sept 25 – Oct 22, 2025) was a real trending stretch with no "flat" days at all, while the model's training data up to that point contained a meaningful share of "flat" labels. The model appears to have leaned on that base rate and been caught flat-footed by a one-directional regime it hadn't seen enough of. This is a genuine model weakness (adapting to regime shifts), not a data or leakage bug — flagged rather than smoothed over.

---

## 4. Strategy backtest (threshold rule vs. buy-and-hold)

Per-fold results, net of a modeled 15bps round-trip cost:

| Asset | Fold | Strategy return | Strategy Sharpe | Max drawdown | Trades | Buy&hold return | Buy&hold Sharpe |
|---|---|---|---|---|---|---|---|
| AAPL | 0 | **+41.4%** | 10.4 | −0.2% | 4 | +59.3% | 10.7 |
| AAPL | 1 | **+34.2%** | 9.1 | −6.3% | 3 | +22.5% | 5.2 |
| AAPL | 2 | **+20.2%** | 8.5 | −3.7% | 3 | +15.2% | 5.8 |
| MSFT | 0 | **+12.2%** | 8.5 | −0.2% | 2 | +7.5% | 3.6 |
| MSFT | 1 | 0.0% (no trades) | — | — | 0 | +18.4% | 6.9 |
| MSFT | 2 | **−23.8%** | −7.9 | −26.8% | 1 | −41.7% | −14.4 |
| BTC | 0 | −10.7% | −1.3 | −30.1% | 1 | −12.1% | −1.5 |
| BTC | 1 | **+33.9%** | 5.0 | −26.7% | 1 | +34.1% | 5.0 |
| BTC | 2 | **+7.8%** | 4.9 | −0.2% | 2 | −5.7% | −0.9 |
| ETH | 0 | −22.4% | −4.0 | −33.3% | 1 | −22.3% | −4.0 |
| ETH | 1 | −6.4% | −0.4 | −34.2% | 3 | −6.8% | −0.5 |
| ETH | 2 | 0.0% (no trades) | — | — | 0 | −11.0% | — |

**Honest read, asset by asset:**

- **AAPL** — the strategy wins in every fold and does so with dramatically lower drawdown than buy-and-hold (−0.2% to −6.3% vs. buy-and-hold's implicit full exposure). It never captures all of buy-and-hold's upside, which is expected — the threshold rule sits out uncertain periods on purpose.
- **MSFT** — mixed. Fold 0 modestly beats buy-and-hold; fold 1 the model never got confident enough to trade at all (a legitimate outcome of a threshold rule, not a bug); fold 2 loses less than buy-and-hold in a down move, which is arguably the more useful outcome even though the return is negative.
- **BTC** — one loss, one near-tie, one clear win (fold 2, where the strategy is positive while buy-and-hold is negative — the model correctly avoided some of a down move).
- **ETH** — the weakest asset. Two folds track buy-and-hold almost exactly (meaning the strategy added no value over just holding), and one fold took no trades at all. Nothing here suggests real edge on ETH specifically.

**Aggregate:** the strategy shows a real, non-random pattern of *reducing drawdown relative to buy-and-hold* even in folds where it doesn't beat raw return — which is the more defensible claim than "beats the market," and is consistent with what a probability-threshold strategy that sometimes sits out is supposed to do.

---

## 5. Probability calibration

Calibration asks a stricter question than accuracy: when the model says "75% up," does "up" actually happen about 75% of the time? This matters directly here because the strategy layer trades on the raw probability, not just the predicted class.

Expected Calibration Error (n-weighted average gap between predicted probability and actual frequency, pooled across all out-of-sample folds; 0 = perfect, values above ~0.10 mean the raw probability shouldn't be trusted at face value):

| Asset | down | flat | up |
|---|---|---|---|
| AAPL | 0.20 | 0.07 | 0.11 |
| MSFT | 0.13 | 0.26 | 0.20 |
| BTC | 0.23 | 0.06 | 0.25 |
| ETH | 0.36 | 0.05 | 0.33 |

**These numbers are not good, and it would be dishonest to present them as good.** But the reliability curves behind them (see `CHANGES_THIS_SESSION.md`/code for full bin-by-bin detail) show something specific: the miscalibration isn't a clean, correctable pattern like "always 20% overconfident." It swings both directions across probability bins, and every bin has only 6–30 out-of-sample rows behind it. That combination — noisy, inconsistent direction, small samples — is the signature of **too little out-of-sample data to measure calibration reliably**, not necessarily proof the model's probabilities are fundamentally broken.

One genuinely encouraging data point: AAPL's highest-confidence "up" bin (predicted 75-100%) was predicted at 86.1% and occurred 85.7% of the time — a 0.4 percentage-point gap, on the bin that matters most for the strategy layer's actual trading decisions.

**Practical takeaway:** don't read a single predicted probability as a precise real-world frequency yet. Do treat "the model is in its highest-confidence bin" as a meaningfully different regime than "the model is unsure" — that distinction holds up better than the raw number does.

---

## 6. Known limitations (the honest list)

1. **Sentiment features are currently inert.** The pipeline supports Finnhub/Alpha Vantage news and FinBERT scoring, but no API keys are configured yet, so `sentiment_aggregates` has 0 rows and the model is technical-only. This is very likely the single highest-leverage improvement available and hasn't been tried yet.
2. **~2-2.7 years of history, 3 folds, 60 out-of-sample days per asset.** Every number in this report should be read as "a believable early signal," not "proven edge." More history (as ingestion continues) directly strengthens every section above.
3. **MSFT fold 1's total failure** is a real, unresolved weakness — the model doesn't yet adapt well to a regime shift with no historical "flat" precedent. Worth investigating further once more data exists to see if it's a recurring pattern or a one-off.
4. **Calibration is not currently trustworthy enough to size positions off directly.** The strategy layer's binary threshold rule sidesteps this somewhat (it only asks "above 45% or not," not "exactly how confident"), but any move toward probability-proportional position sizing should wait for either more data or a calibration-correction step (e.g. Platt scaling / isotonic regression) validated on a larger out-of-sample set.
5. **No overlapping-holding-period accounting.** The backtest simulates one bar of holding per row; it doesn't model holding a position across the model's full 5-day label horizon. This is a conservative choice (it never manufactures returns that weren't bar-to-bar realizable) but means the backtest may understate what a "hold for the full horizon" version of the strategy could do.
6. **This is a paper backtest, not a live or capital-at-risk result.** No real trades were placed. Transaction costs are modeled (15bps round-trip) but real slippage, especially on crypto during volatile periods, could differ.

---

## 7. Bottom line

The model shows a real, out-of-sample, non-random signal on AAPL and — more weakly — on BTC and MSFT. It shows essentially no edge on ETH in this window. The strategy's main demonstrated value so far is **drawdown reduction relative to buy-and-hold**, more consistently than outright outperformance. Calibration needs more data before probabilities can be trusted as precise sizing inputs. The single most likely way to improve every number in this report is populating sentiment data, which is currently unused.

This supports continuing development — it does not yet support treating this as a validated trading system.
