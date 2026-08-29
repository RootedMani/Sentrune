# Sentrune

# Sentrune: The Trader's Assistant
### Sentrune: An Explainable, Multi-Source Market Intelligence & Alerting Platform

---

## 1. Executive Summary

Retail investors today face an uncomfortable asymmetry: they are asked to make decisions with the same market data institutions use, but without the institutional tooling that turns that data into structured, contextualized insight, and without the staff whose job is to watch every relevant source and flag what actually matters. Professional trading desks have analysts monitoring news wires, tracking specific influential voices, and pushing time-sensitive alerts to traders the moment something relevant happens. Retail investors, by contrast, are left checking a charting app, a news feed, and a handful of social accounts manually, hoping they don't miss the moment something important breaks.

This white paper describes Sentrune, a prototype platform built to close that gap directly. At its core, Sentrune is **a personal market assistant for traders**: it continuously monitors news, market data, and social sources, produces a running report of what happened and why it matters, and pushes real-time alerts when something the trader cares about occurs — a named source they follow posting, a sentiment or volume spike, or a technical signal crossing a threshold. Every trader configures Sentrune to their own interests: which sources and people to follow, which assets to track, and which categories of event should trigger a notification versus simply appear in their daily report.

Layered into this assistant, rather than sitting apart from it, is a machine learning prediction engine that produces probability distributions over near-term price outcomes (down, flat, or up beyond a defined threshold) for each tracked asset, along with a plain-English explanation of what is driving that estimate. The prediction layer is not a separate feature bolted onto a reporting tool — it actively shapes the reporting itself. A news event or sentiment spike is surfaced with more or less prominence depending on whether it aligns with, contradicts, or has already been anticipated by the model's current read of an asset's technical and sentiment state. The result is a report that doesn't just list what happened, but tells the trader *why it matters right now*, informed by the same model producing Sentrune's probability estimates.

Two design choices distinguish Sentrune from the broader field of "AI trading" tools. First, the platform makes no claim to forecast exact prices or guarantee returns; prediction outputs are explicitly probabilistic and are benchmarked against naive baselines (buy-and-hold, moving-average crossover) so that any genuine edge — or lack thereof — is visible rather than asserted. Second, explainability and personalization are treated as core product features: every report and every alert is traceable to a specific source or signal, and every trader's experience is shaped by sources and thresholds they themselves chose, not a one-size-fits-all feed.

The prototype is built entirely on free-tier data sources and open-source tooling, running end-to-end at zero infrastructure cost, with a live, shareable demo. This white paper documents Sentrune rationale, the technical architecture, the honest limitations of the approach, the competitive landscape, a realistic path to revenue, and what a funding round would specifically unlock.

---

## 2. Problem Statement

The common framing of this problem — "investing is hard for beginners" — is too generic to be useful, and it is not the gap Sentrune addresses. Charting tools, brokerage apps, and financial media have made basic market information more accessible than ever. The actual gap is more specific, and it sits at four levels.

**First, the attention gap.** Markets move on information that appears continuously and unpredictably throughout the day — a headline, an influential trader's post, a sudden volume spike. Institutional desks solve this with staff whose full-time job is to watch for it. Retail investors do not have this, and the result is not that they lack access to the information, but that they are structurally likely to see it late, if at all, unless they are watching constantly — which is not a reasonable expectation for someone with a full-time job outside of trading.

**Second, the synthesis gap.** A retail investor evaluating a stock or a cryptocurrency has to manually correlate technical indicators, sentiment, and news into a coherent picture. Institutional desks have quantitative teams whose entire job is this synthesis; retail investors have their own judgment and whatever time they have left after work.

**Third, the personalization gap.** Every trader cares about different sources, different assets, and different kinds of signal. A day trader watching a specific token cares about different accounts and different alert thresholds than a long-term equity holder. Existing retail tools are largely one-size-fits-all feeds; almost none let a trader configure *whose* voice and *what kind* of event should interrupt their day versus simply appear in a summary later.

**Fourth, the honesty gap.** A significant share of retail-facing "AI trading" products imply or directly claim predictive accuracy that is not achievable given the efficiency of liquid public markets, and do not benchmark their outputs against trivial baselines. A tool that is honest about what probabilistic modeling can and cannot do — and proves it against naive baselines rather than asserting it — is solving a real, underserved problem: making institutional-style monitoring and rigor legible and personal to a non-expert audience, without pretending markets are more predictable than they are.

This is the specific gap Sentrune targets: not access to data, but continuous attention, synthesis, personalization, and honesty about uncertainty, delivered in a form usable by someone without a data science or finance background.

---

## 3. Product Overview

Sentrune is a personal market assistant for retail investors and active traders. It has two tightly integrated components.

**The intelligence and alerting layer** continuously monitors news, technical market data, and social sources for each asset a trader follows, and produces two things: a running report — a digestible summary of what happened and why it matters, refreshed throughout the day — and real-time notifications when something the trader has configured as important occurs. Traders customize both the sources they follow (a curated default list of well-known analysts, exchange accounts, and project founders, plus any individual sources they add themselves) and what should trigger an interruption versus a mention in the next report: a followed source posting, a sentiment or mention-volume spike even from unattributed crowd activity, or a technical indicator crossing a threshold they define.

**The prediction layer** produces, for each tracked asset, a probability distribution over near-term price outcomes over a defined forward horizon, along with a plain-English explanation of the technical and sentiment factors behind it. This is displayed alongside the report, and — critically — it also informs the report itself: the same signals used to generate a probability estimate are used to decide how prominently a given news event or sentiment shift should be surfaced. A headline that confirms a setup the model already flagged is presented differently than one that contradicts it or that arrives with no prior signal at all. This is what makes the assistant more than a news aggregator with a model attached: the model's read of the market shapes what the trader is told matters.

The platform is explicitly **not** a price-prediction engine and does not claim to guarantee returns; its outputs are probabilistic, explainable, and intended as decision support and situational awareness, used alongside the trader's own judgment and risk management.

The prototype covers a deliberately narrow universe: three to five large-cap US equities, chosen because they have long, clean historical data that supports credible backtesting, and two major cryptocurrencies (BTC and ETH), chosen because their retail-driven sentiment volatility showcases the sentiment-analysis and alerting components in a way that steadier large-cap equities do not.

The target user is a self-directed retail investor or active trader who is not a financial professional, wants to stay informed without watching markets continuously, and wants more structured, evidence-based input into their decisions than an intuition formed from scrolling headlines and chart patterns on their own.

---

## 4. Technical Architecture

The system is organized into six layers: data ingestion, feature engineering, modeling, backtesting and evaluation, the intelligence & alerting layer, and a user/personalization layer underlying the presentation. Each is described below, followed by a full technology stack table.

### 4.1 Data Layer

- **Stock price data (OHLCV):** sourced via `yfinance`, a free wrapper around publicly available market data, requiring no API key.
- **Crypto price data (OHLCV):** sourced via the Binance public API, which provides free, keyless access to market data for major trading pairs.
- **Stock news and fundamentals:** sourced via the free tiers of Finnhub and/or Alpha Vantage, both of which support filtering by named source/publisher, making them usable for the "important people/sources" feature within the prototype's free-tier constraints.
- **Crypto news and community sentiment:** sourced via the CryptoPanic free tier, which provides both headlines and community sentiment votes, and identifies publishing source.
- **Social sentiment and named-source tracking:** sourced via the Reddit API through the PRAW library, which supports tracking specific subreddits and specific user accounts. **The prototype explicitly does not scrape or poll X/Twitter directly for individual accounts.** This is a deliberate and important scoping decision: real-time tracking of specific named individuals on X is precisely the use case X's official API is built to charge for, and unofficial scraping at that granularity risks both Terms of Service violations and unreliable, rate-limited data. The platform's source-tracking architecture is designed to be source-agnostic — a "followed source" is an abstraction that currently resolves to Reddit accounts, news publishers, and CryptoPanic-tracked outlets, and is designed to resolve to X accounts as well once official API access is funded. This is documented as a funded-roadmap item (Section 8), not a current blocker, and the prototype demonstrates the full personalized-alerting feature end-to-end on sources that are free and ToS-compliant today.
- **Storage:** all ingested data, including per-user followed-source lists and alert preferences, is stored in SQLite for the prototype, which carries zero hosting cost and is sufficient at prototype data volumes. A migration path to a hosted Postgres/Supabase instance is planned for scale, particularly once real-time alerting to multiple concurrent users requires more robust concurrent read/write handling than SQLite comfortably supports.

### 4.2 Feature Engineering Layer

- **Technical indicators:** roughly 15–20 indicators computed via the `pandas-ta` library, spanning trend (SMA, EMA, MACD), momentum (RSI, Stochastic Oscillator), volatility (Bollinger Bands, ATR), and volume (On-Balance Volume).
- **Sentiment features:** news and social text is passed through FinBERT, a free, open-source, finance-domain-pretrained sentiment model run locally via Hugging Face Transformers, at no per-call API cost.
- **Aggregated sentiment features:** rolling sentiment averages, mention volume, and sentiment volatility (sudden swings independent of average level, treated as a distinct and informative signal).
- **Source-attributed features:** in addition to aggregate sentiment, the system tags sentiment and event data by source — distinguishing, for example, a sentiment shift driven by a single followed high-influence account from the same shift driven by broad, unattributed crowd activity. This attribution is what allows both the alerting layer (Section 4.5) and the prediction layer to treat "who said it" as a feature, not just "what was said."
- **Cross-asset / market-context features:** broad market trend indicators, so the model has a basis for distinguishing an asset-specific signal from a move that is simply the whole market moving together.

### 4.3 Modeling Layer

- **Primary model:** gradient boosting (LightGBM or scikit-learn's implementation), trained to output a three-class probability distribution (down / flat / up) over a fixed forward horizon, rather than a point price prediction. Chosen for efficient training on limited prototype data, robustness to noisy tabular features, and explainability via feature importance — which now serves double duty: it drives both the trader-facing "why" explanation for a prediction and the logic that decides how prominently a news event should surface in the report (Section 4.5).
- **Secondary / experimental model:** an LSTM or small Transformer trained on raw price sequences, framed explicitly as an open research comparison against the interpretable primary model, not a superior replacement.
- **Baselines:** all models are benchmarked against a persistence/trend-following baseline and against random guessing, so that any claimed predictive edge is demonstrable rather than asserted.
- **Training compute:** free-tier GPU access via Google Colab or Kaggle.

### 4.4 Backtesting & Evaluation Layer

- **Validation methodology:** walk-forward validation exclusively, never random train/test splits.
- **Metrics:** Sharpe ratio, maximum drawdown, and win rate, reported net of realistic trading fees and slippage.
- **Baseline comparison:** performance reported explicitly against buy-and-hold and moving-average-crossover strategies, including underperforming periods.

### 4.5 Intelligence & Alerting Layer

This layer is new relative to a pure prediction system and is the direct technical expression of the "assistant" product framing.

- **Event detection:** the system continuously watches incoming news, social posts, sentiment shifts, and technical signal crossings for each tracked asset, and classifies each incoming item against a trader's configured interests.
- **Report generation:** on a running basis (and summarized at defined intervals, e.g. a daily digest), the system compiles a plain-English report of what happened for each tracked asset — news, notable posts from followed sources, sentiment shifts, and technical developments — ordered and weighted using the prediction layer's current read of the asset, so that events aligned with or contradicting the model's existing signal are flagged as such rather than presented as an undifferentiated list.
- **Alert triggering:** each trader configures which categories of event trigger an immediate notification versus appearing only in the periodic report: a followed source posting, a sentiment/volume spike above a chosen threshold (including from unattributed crowd activity, not just followed sources), or a technical indicator crossing a trader-defined level. This is implemented as a rules engine sitting on top of the event detection stream, evaluated per-user against that user's saved configuration.
- **Delivery:** for the prototype, notifications are delivered via the Streamlit dashboard (near-real-time in-app) and optionally email (via a free-tier transactional email service); push/SMS delivery is noted as a funded-stage addition (Section 8), since reliable push infrastructure at scale typically involves paid services.

### 4.6 User / Personalization Layer

- **Accounts and preferences:** each trader has a saved profile specifying tracked assets, followed sources (from the curated default list and/or self-added), and per-category alert thresholds.
- **Curated defaults:** the platform ships a maintained default list of well-known analysts, exchange accounts, and project founders per covered asset class, so a new user has a useful experience before configuring anything.
- **Custom sources:** traders can add their own sources on top of the curated list, within the bounds of what the underlying data layer supports (Reddit accounts and subreddits, specific news publishers, and — once funded — specific X accounts).

### 4.7 Presentation Layer

- **Framework:** Streamlit, for the fastest path to a working, demoable, personalized prototype, with free hosting via Streamlit Community Cloud or Hugging Face Spaces.
- **Per-asset view:** current technical state, sentiment snapshot, the model's probability distribution over outcomes with plain-English explanation, and the live report feed for that asset.
- **Report/digest view:** the running and periodic-summary report described in Section 4.5, personalized per trader.
- **Backtest view:** transparent historical prediction performance, including drawdown periods.
- **Disclaimers:** prominent, permanent disclaimers stating that the platform is a decision-support and situational-awareness tool, not financial advice, and not a guarantee of future performance.

### 4.8 Technology Stack

| Layer | Component | Tool / Service | Cost (prototype) |
|---|---|---|---|
| Data | Stock price data | yfinance | Free |
| Data | Crypto price data | Binance public API | Free |
| Data | Stock news/fundamentals (source-attributed) | Finnhub / Alpha Vantage (free tier) | Free |
| Data | Crypto news/sentiment (source-attributed) | CryptoPanic (free tier) | Free |
| Data | Social sentiment & named-source tracking | Reddit API via PRAW | Free |
| Data | Storage (incl. user profiles, alert rules) | SQLite (prototype) → Postgres/Supabase (scale) | Free (prototype) |
| Features | Technical indicators | pandas-ta | Free |
| Features | Text sentiment | Hugging Face Transformers + FinBERT (local inference) | Free |
| Modeling | Primary model | LightGBM / scikit-learn | Free |
| Modeling | Secondary/research model | PyTorch (LSTM / small Transformer) | Free |
| Modeling | Training compute | Google Colab / Kaggle (free GPU tier) | Free |
| Alerting | Rules engine / event classification | Custom Python service (in-repo, no external cost) | Free |
| Alerting | Notification delivery (prototype) | In-app (Streamlit) + free-tier transactional email | Free |
| Backend | API layer | FastAPI | Free |
| Presentation | Dashboard | Streamlit | Free |
| Hosting | Demo deployment | Streamlit Community Cloud / Hugging Face Spaces | Free |
| Infra | Version control | GitHub | Free |

The entire prototype — including personalized alerting and a live, shareable demo — runs end-to-end on a $0 infrastructure budget. A clearly separated future/funded roadmap covers paid upgrades: official X/Twitter API access for named-account tracking, push/SMS notification infrastructure, higher-tier market data feeds, and hosted infrastructure at scale (Section 8).

---

## 5. Methodology & Honesty About Limitations

### 5.1 Why probabilistic, explainable outputs instead of point predictions

The platform deliberately avoids outputting a single predicted future price. Point predictions imply a false precision that financial markets do not support, and are less actionable in practice than a probability distribution paired with a plain-English explanation of drivers — which now also does double duty as the logic behind what the report layer chooses to surface and how prominently.

### 5.2 Why baselines and walk-forward validation matter

This platform's architecture is built specifically to avoid the two most common ways financial ML products mislead: random train/test splits that leak future information into the past, and reporting raw returns without comparison to a naive baseline. Walk-forward validation is the only validation method used, and every result is reported alongside buy-and-hold and moving-average-crossover baselines, net of realistic fees and slippage.

### 5.3 What this system cannot do

Stated plainly, without hedging:

- It cannot predict black-swan events, unprecedented news, or discontinuous market shocks.
- It cannot guarantee returns. All outputs are probability estimates, not certainties.
- Market efficiency places a hard ceiling on any edge a model like this can find, particularly in the liquid, well-covered large-cap equities included in the prototype.
- Backtested performance does not guarantee future performance; market regimes shift.
- **The alerting layer cannot catch everything.** It is bounded by the sources it can legally and technically monitor — most importantly, it cannot yet monitor specific X/Twitter accounts in real time, which is a real gap for traders whose most important sources are on that platform specifically. This is stated openly rather than glossed over, and is the single most consequential item on the funded roadmap (Section 8).
- Sentiment and news data quality is dependent on free-tier sources for the prototype, which have coverage and rate-limit constraints a funded, paid-data version would not have.

Where a specific claim about model performance would require actual backtest results, this document does not invent numbers — those results are noted as **to be validated during prototype testing**, and will be reported in Sentrune's own backtest view, including any periods of underperformance.

---

## 6. Competitive Landscape

Existing retail-facing tools generally fall into three categories relevant here: charting platforms, generic "AI stock picker" apps, and generic news/alert aggregators.

**Charting platforms** (e.g., TradingView) give users powerful technical analysis tools but leave synthesis, sentiment, and alerting on named sources entirely to the user, and generally do not offer per-trader-configurable event alerting tied to specific people.

**Generic "AI stock picker" apps** produce a single opaque output — a buy/sell/hold call, a star rating — without transparent methodology or baseline benchmarking. Sentrune is deliberately not built to resemble this category.

**Generic news/alert aggregators** (e.g., broad financial news apps with push notifications) provide breaking-news alerts but are not asset-model-aware: a headline is pushed with the same generic urgency regardless of whether it actually aligns with anything happening technically or in sentiment for that specific asset, and they do not typically support following specific individual social accounts as first-class, per-user configurable alert sources alongside a market model.

The differentiation here is not a claim of superior predictive accuracy. It is:

- **Model-aware reporting:** events are surfaced and weighted using the same signal that drives Sentrune's probability estimates, not as an undifferentiated news firehose.
- **Personalization:** each trader configures their own followed sources and alert thresholds, rather than receiving a one-size-fits-all feed.
- **Explainability:** every probability estimate and every alert is traceable to specific technical and sentiment factors, not a black box.
- **Transparent backtesting:** performance shown against naive baselines, including underperforming periods.
- **Multi-source, source-attributed sentiment:** combining news, community sentiment, and social sentiment with visibility into *who* is driving a given signal, not just an aggregate score.

The competitive bet is that a segment of retail traders — likely a more engaged, higher-frequency segment than the audience for a passive stock-picker app — values a genuinely personal, model-aware assistant enough to prefer it over either a generic alert firehose or an opaque prediction tool.

---

## 7. Business Model & Path to Revenue

- **Freemium SaaS subscription:** a free tier offering the curated default source list, the core dashboard, and in-app/email alerts for the prototype's asset universe; a paid tier unlocking custom source tracking beyond the curated list, faster refresh rates, push/SMS delivery, more assets, and deeper historical backtests. Per-trader personalization is a natural and intuitive premium hook: the free tier demonstrates the assistant, the paid tier makes it truly *yours*.
- **API access:** exposing the underlying signal engine (technical + sentiment + probability + event-report outputs) via API for developers and other fintech products to integrate directly, priced on usage.
- **B2B licensing:** licensing the intelligence/alerting engine itself — including the personalized source-tracking and event-classification logic — to other trading or investing platforms that want to add this kind of assistant layer without building it in-house.
- **Premium data partnerships:** partnering with data providers, and eventually with X/Twitter's official API, for higher-quality, lower-latency, and broader-coverage feeds, potentially with revenue-sharing or co-marketing arrangements.

**Regulatory considerations remain a first-class constraint.** Sentrune is explicitly not investment advice. Personalization and alerting introduce an additional nuance worth naming directly: as the system becomes more tailored to an individual trader's followed sources, thresholds, and configured interests, Sentrune moves closer — in user experience, if not in substance — to something that feels individualized. Sentrune's design intentionally keeps the underlying output general and non-personalized (the *model's* estimate is the same for every user watching a given asset; only *which* information reaches a given trader, and how urgently, is personalized). This distinction should be maintained deliberately as Sentrune evolves and should be reviewed with legal counsel before any feature blurs it further.

---

## 8. Roadmap

**Prototype stage (current — $0 budget):** the six-layer system described above, covering 3–5 large-cap US equities and BTC/ETH, with personalized source-following, in-app/email alerting, model-aware reporting, and prediction outputs, running entirely on free-tier data and open-source tooling, with a live public demo.

**Funded seed stage:** official X/Twitter API access to extend named-source tracking and alerting to X specifically (the single most requested and most consequential upgrade given Sentrune's positioning); push/SMS notification infrastructure; expansion to a larger and more diverse asset universe; migration from SQLite to hosted Postgres/Supabase to support concurrent users and real-time alerting at scale; continued development of the experimental deep-learning model track.

**Growth stage:** premium data partnerships, B2B licensing of the intelligence/alerting engine, a formal API product for developers, and — contingent on legal review — further personalization features evaluated against the advisory-line distinction in Section 7.

---

## 9. Risks

**Technical risks:**
- **Overfitting**, mitigated structurally by walk-forward validation and baseline comparison.
- **Data quality dependency on free tiers**, a real limitation until paid data partnerships are in place.
- **Alert fatigue:** a personalization feature that is too aggressive by default, or poorly tuned, risks becoming noise rather than signal — the same failure mode Sentrune is explicitly trying to avoid relative to competitors. Default alert thresholds and onboarding need deliberate design attention, not just technical capability.

**Market risks:**
- **Regulatory scrutiny of AI-driven financial tools**, requiring continued legal review, especially as personalization increases.
- **Competition**, from well-funded charting/analytics incumbents, generic AI stock-picker entrants, and generic news-alert apps that could add similar features.

**A note on end-user market risk, stated without qualification:** no system of this kind — nor any decision-support or alerting tool — can eliminate market risk for its end users. Markets carry inherent risk regardless of the quality or timeliness of information applied to them, and no aspect of Sentrune's design or messaging should be read as suggesting otherwise.

---

## 10. Ask

This white paper supports a fundraising conversation for a company at the prototype stage: a working, zero-cost, live-demoable Sentrune trading assistant — combining model-aware reporting, configurable real-time alerting, and explainable probabilistic prediction — not yet backed by paid data infrastructure or a team beyond the founder.

Funding would specifically unlock:
- **Paid data access**, most importantly an official X/Twitter API integration to extend the platform's named-source alerting to X specifically, plus push/SMS delivery infrastructure and higher-tier market data feeds.
- **Compute**, moving beyond free-tier Colab/Kaggle GPU access for more extensive model training and the secondary deep-learning research track.
- **A small initial team**, to move from a solo prototype build to a properly resourced product and engineering effort, and to bring in the legal/compliance review the regulatory considerations in Section 7 require as personalization and user base scale.

The founder's position is straightforward: the prototype demonstrates that Sentrune, a transparent, explainable, personalized trading assistant — combining real-time event awareness with honestly-benchmarked prediction — is technically achievable at zero budget, on sources that are free and fully compliant today. What it has not yet demonstrated — because it cannot, without funding — is the same assistant with full named-source coverage on X/Twitter, push-scale alert delivery, and paid-tier data depth. That is what this round is for.
