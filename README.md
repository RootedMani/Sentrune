# Sentrune | Quantitative Market Intelligence & Strategy Workstation

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=flat-square&logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933.svg?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.1-38B2AC.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![LightGBM](https://img.shields.io/badge/ML-LightGBM-brightgreen.svg?style=flat-square)](https://lightgbm.readthedocs.io/)
[![Alpaca API](https://img.shields.io/badge/Trading-Alpaca_Markets-yellow.svg?style=flat-square)](https://alpaca.markets/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=flat-square)](LICENSE)

> **Institutional-grade quantitative intelligence, time-series machine learning, and algorithmic trading workstation.** Combines leak-free purged walk-forward model validation, source-attributed FinBERT rolling sentiment analysis, high-frequency technical indicators, real-time Alpaca broker execution, and multi-asset live telemetry.

---

## 📌 Executive Overview

**Sentrune** is an end-to-end quantitative financial terminal and strategy research workstation engineered to bridge the gap between academic algorithmic research and production-grade execution systems. Designed for quantitative researchers, portfolio managers, and systematic traders, the platform integrates:

1. **Rigorous ML Validation Pipeline**: Eliminates lookahead bias using purged expanding walk-forward splits with embargo gaps calibrated to forward return horizons.
2. **Multi-Factor Feature Engine**: 41 technical indicators, candlestick pattern classifiers, volatility regimes, and volume dynamics.
3. **Source-Attributed Financial NLP**: Local FinBERT item scoring with distinct tracking of curated/institutional versus ambient retail sentiment across rolling $24\text{h}$, $72\text{h}$, and $168\text{h}$ windows.
4. **Live Execution & Paper Trading**: Direct Alpaca Broker API integration for paper and live order routing, portfolio accounting, margin monitoring, and position liquidation.
5. **Institutional Terminal UX**: High-density workstation interface built with React 19, TradingView Lightweight Charts, Recharts, and dual-engine typography (JetBrains Mono for tabular numbers and zero-jitter telemetry; Plus Jakarta Sans / Inter for narrative intelligence).
6. **Bilingual Localization**: Comprehensive English and Persian (RTL) support with persistent user preferences.

---

## 🏗️ System Architecture

```text
                                  ┌────────────────────────────────────────────────────────┐
                                  │                EXTERNAL MARKET SOURCES                 │
                                  │   yfinance · Binance · Finnhub · CryptoPanic · Reddit  │
                                  └──────────────────────────┬─────────────────────────────┘
                                                             │
                                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             DATA INGESTION & STORAGE LAYER                               │
│  - Idempotent incremental state tracking (UTC-aligned timestamps)                        │
│  - Polymorphic relational entities: assets, price_bars, news_items, social_items         │
│  - Many-to-many junction attribution & curated account tagging                           │
└────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                             │
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               FEATURE ENGINEERING ENGINE                                 │
│  ┌─────────────────────────────────────────┐  ┌───────────────────────────────────────┐  │
│  │       41-Factor Technical Matrix        │  │     FinBERT Rolling Sentiment NLP     │  │
│  │  - Trend: SMA(20,50,200), EMA(12,26)    │  │  - Item-level [p_pos, p_neu, p_neg]   │  │
│  │  - Momentum: RSI(14), MACD, Stochastic  │  │  - Scalar: (p_pos - p_neg)           │  │
│  │  - Volatility: Bollinger, ATR(14), Reg. │  │  - Attributed: Curated vs Ambient     │  │
│  │  - Volume: OBV, Volume SMA(20)          │  │  - Windows: 24h, 72h, 168h rolling    │  │
│  └─────────────────────────────────────────┘  └───────────────────────────────────────┘  │
└────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                             │ Strict backward as-of join (window_end <= t)
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                         MODELING & WALK-FORWARD VALIDATION                               │
│  - 3-Class Horizon Return Labeling: {Down, Flat, Up} with symmetric 0.5% dead zone       │
│  - Purged Walk-Forward Splitting with H-bar Embargo Gap (Leak-Free Validation)           │
│  - Multi-Model Benchmarks: LightGBM, Random Forest, Logistic Regression, Baselines       │
│  - Artifact Versioning & Feature Importance Ranking                                      │
└────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                             │
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                              EXPRESS SERVER & API MIDDLEWARE                             │
│  - Server-Sent Events (SSE) Live Feed (`/api/live/stream`, `/api/live/prices`)           │
│  - Alpaca Trading Broker Gateway (Order placement, position control, sandbox reset)      │
│  - AI Tournament & Portfolio Backtest Engine (15 bps round-trip transaction costs)       │
│  - Resilient Gemini AI Pool with circuit breaker and multi-model failover                │
└────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                             │
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               SENTRUNE REACT 19 FRONTEND                                 │
│  ┌────────────────────┬────────────────────┬─────────────────────┬────────────────────┐  │
│  │  Interactive Price │ Technical Factor   │ Sentiment & Social  │ Live Trading Desk  │  │
│  │  Candlestick Chart │ Analysis Matrix    │ Community Pulse     │ & Alpaca Controls  │  │
│  └────────────────────┴────────────────────┴─────────────────────┴────────────────────┘  │
│  - Tabular zero-jitter font metrics (JetBrains Mono)                                     │
│  - Institutional obsidian/slate dark theme + full Persian (RTL) localization             │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Key Engineering & Quantitative Decisions

### 1. Leak-Free Walk-Forward Validation & Purged Embargo
In financial time series, conventional randomized K-fold cross-validation introduces catastrophic lookahead bias and serial correlation leakage. 
- **Purged Splitting**: Sentrune implements an expanding training window followed by strictly chronological out-of-sample test windows.
- **Embargo Gaps**: Because target labels represent forward returns over a horizon of $H = 5$ bars ($\frac{P_{t+H}}{P_t} - 1$), the final $H$ bars of each training fold are explicitly purged before the test boundary begins. This guarantees that training labels never ingest future price movements that bleed into the validation period.

### 2. Symmetric Dead-Zone Classification Target
Instead of binary up/down prediction (which encourages overtrading on statistical noise), Sentrune formulates a **3-class classification problem**:
$$\text{Label}(t) = \begin{cases} 
\text{Down (Class 0)} & \text{if } R_{t,t+H} < -\delta \\ 
\text{Flat (Class 1)} & \text{if } -\delta \le R_{t,t+H} \le \delta \\ 
\text{Up (Class 2)} & \text{if } R_{t,t+H} > \delta 
\end{cases}$$
where $\delta = 0.5\%$ is the neutral dead-zone threshold. This allows models to express conviction in directional expansion while filtering out consolidation regimes.

### 3. Source-Attributed FinBERT Sentiment Aggregation
Rather than treating all social and news volume as homogeneous noise:
- Every headline or post is passed through [`ProsusAI/finbert`](https://huggingface.co/ProsusAI/finbert) to extract probability distributions $[p_{\text{positive}}, p_{\text{neutral}}, p_{\text{negative}}]$.
- The normalized sentiment score is formulated as $S = p_{\text{positive}} - p_{\text{negative}} \in [-1, +1]$.
- Sentiment aggregates are segmented by **source authority**: verified/followed institutional accounts vs. retail discussion forums (e.g., Reddit r/wallstreetbets vs. curated macro desks).
- When joining sentiment to market bars, an **as-of timestamp join** is enforced: only aggregates where $\text{window\_end} \le t$ are visible at bar $t$.

### 4. Realistic Transaction Friction in Strategy Backtesting
Theoretical backtests frequently fail in live markets due to friction neglect. Sentrune models realistic microstructural drag on every position adjustment:
- **Exchange Fee**: $10\text{ bps}$ per executed trade.
- **Slippage & Spread**: $5\text{ bps}$ per transaction.
- **Round-Trip Friction**: $15\text{ bps}$ modeled cost deducted from gross returns before computing Sharpe Ratio, maximum drawdown, and win rates.

### 5. Resilient Multi-Tier AI Provider Pool
The AI engine implements a fault-tolerant multi-key rotating pool with automatic circuit breakers:
- Automatically cascades across production models (`gemini-2.5-flash`, `gemini-2.5-pro`).
- Monitors HTTP 429 (rate-limiting) and HTTP 503 (high upstream demand) errors.
- On upstream congestion, a 30-second circuit-breaker cooldown is triggered, immediately routing requests to secondary standby models or deterministic local quantitative fallbacks.

### 6. Tabular Figure Discipline & Real-Time UX
Financial trading terminals experience high-frequency DOM re-renders from streaming ticks. Sentrune enforces:
- `font-feature-settings: 'tnum' 1, 'zero' 1` via **JetBrains Mono** across all pricing, delta percentages, order book depths, and timestamps, preventing horizontal text jitter during live streaming.
- Sub-millisecond chart synchronization using TradingView Lightweight Charts canvas rendering.

---

## 📊 Walk-Forward Backtest Benchmarks

Results from out-of-sample walk-forward evaluation across multiple asset classes (net of modeled 15 bps round-trip transaction costs):

| Instrument | Asset Class | Walk-Forward Accuracy | Strategy Total Return | Strategy Sharpe | Max Drawdown | Benchmark B&H Return |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **AAPL** (Apple Inc.) | Equity | **58.3%** | **+95.8%** | **9.33** | **−6.3%** | +97.0% |
| **MSFT** (Microsoft) | Equity | **41.7%** | **−11.6%** | −0.20 | −26.8% | −15.8% |
| **BTC/USDT** (Bitcoin) | Crypto | **50.0%** | **+31.0%** | **2.87** | **−30.1%** | +16.3% |
| **ETH/USDT** (Ethereum) | Crypto | **40.0%** | **−28.8%** | −2.20 | −34.2% | −40.1% |

*Note: In extreme down-trending crypto and tech bear regimes, the model’s cash-preservation threshold rule substantially mitigated downside drawdowns compared to standard Buy-and-Hold.*

---

## 🛠️ Tech Stack & Ecosystem

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, TypeScript 5.8, Vite 6 |
| **Styling & Design System** | Tailwind CSS v4, Institutional Obsidian Theme, CSS Backdrop Glassmorphism |
| **Visualizations & Charting** | TradingView Lightweight Charts v5.2, Recharts v3.10, Lucide Icons |
| **Backend & Routing** | Express 4, Node.js 22 LTS, Server-Sent Events (SSE) |
| **Brokerage & Execution** | Alpaca Markets REST & WebSocket Trading API |
| **Machine Learning & NLP** | LightGBM, Hugging Face FinBERT, Scikit-Learn |
| **AI Inference** | Google GenAI SDK (`@google/genai`), Multi-Key Rotating Pool |
| **Communication & Alerts** | Nodemailer, Resend API |
| **Internationalization** | Full English & Persian (فارسی) LTR/RTL Layout Engine |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **npm**: `v10+`
- *(Optional)* Python 3.10+ for offline pipeline retraining

### 1. Clone the Repository
```bash
git clone https://github.com/RootedMani/Sentrune.git
cd Sentrune
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
```

Edit `.env` with your API keys (all keys are optional; offline simulation and synthetic data engines will operate automatically if keys are omitted):
```env
# AI Market Synthesis
GEMINI_API_KEY=your_gemini_api_key_here

# Broker Execution (Paper or Live)
ALPACA_API_KEY=your_alpaca_key_id
ALPACA_API_SECRET=your_alpaca_secret_key
ALPACA_PAPER=true

# Financial Data Providers (Optional)
FINNHUB_API_KEY=
ALPHA_VANTAGE_API_KEY=
CRYPTOPANIC_API_KEY=

# Reddit Scraper Credentials (Optional)
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
```

### 4. Launch Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to launch the Sentrune workstation.

---

## 💻 Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Boots Express backend with Vite HMR middleware on port 3000 |
| `npm run build` | Compiles client production bundle (`vite build`) and bundles server (`esbuild`) |
| `npm run start` | Runs production server from `/dist` |
| `npm run lint` | Runs TypeScript compilation check (`tsc --noEmit`) |
| `npm run clean` | Purges build artifacts |

---

## 📂 Project Structure

```text
Sentrune/
├── config/                     # Pipeline & factor configuration
│   ├── assets.yaml             # Tracked equity and crypto assets
│   ├── features.yaml           # Indicator parameters & sentiment windows
│   ├── modeling.yaml           # Model hyperparameters & validation folds
│   └── sources.yaml            # Subreddits, RSS feeds, and API sources
├── docs/                       # Technical whitepapers & design specifications
│   ├── features.md             # 41-factor technical indicator definitions
│   ├── ingest.md               # Rate-limiting & data ingestion contracts
│   ├── modeling.md             # Walk-forward cross validation formulas
│   └── deployment.md           # Production deployment topologies
├── models/                     # Versioned LightGBM serialized artifacts
├── reports/                    # Walk-forward backtest diagnostic reports
├── server/                     # Full-stack backend services
│   ├── ai_engine.ts            # AI tournament inference engine
│   ├── ai_summarizer.ts        # Automated financial news summarization
│   ├── alpaca.ts               # Alpaca Trading Broker execution gateway
│   ├── custom_models_engine.ts # In-browser model fine-tuning & autotuning
│   ├── db.ts                   # In-memory database & synthetic market feed
│   ├── emailService.ts         # Automated price/sentiment alerts dispatch
│   ├── gemini_pool.ts          # Resilient multi-key LLM failover pool
│   ├── indicators.ts           # Technical factor computation algorithms
│   ├── realtime.ts             # Server-Sent Events (SSE) telemetry hub
│   └── simulation_engine.ts    # Portfolio backtesting engine (Sharpe, DD)
├── src/                        # React 19 workstation client
│   ├── components/             # Institutional UI modules & analytical tabs
│   │   ├── PriceChart.tsx      # TradingView Lightweight Charts candlestick
│   │   ├── TechnicalAnalysis.ts# Factor matrices & pattern indicators
│   │   ├── AiTournament.tsx    # Strategy benchmark tournament
│   │   ├── SocialPulse.tsx     # Institutional social sentiment scanner
│   │   └── AlpacaModal.tsx     # Order ticket & live position manager
│   ├── context/                # Theme, Auth, Language, & Workstation state
│   ├── types.ts                # TypeScript strict schema contracts
│   ├── App.tsx                 # Workstation layout & tab router
│   └── main.tsx                # Client application root
├── DESIGN.md                   # Institutional terminal design constitution
├── server.ts                   # Express server bootstrap & Vite mounting
└── package.json                # Project manifest
```

---

## 🔒 Security & Data Integrity

- **Client-Side Key Protection**: No API secrets or private keys are exposed to the browser client. All external API routing (Alpaca, Gemini, Finnhub) executes server-side.
- **Fail-Safe Fallbacks**: In the absence of live external network access or during exchange outages, Sentrune gracefully falls back to deterministic local synthetic market dynamics, ensuring zero UI breakage.
- **Strict Typing**: Comprehensive TypeScript interfaces across the entire pipeline from database models to chart series payloads.

---

## 👨‍💻 Author & Contact

**Mani Jabari**  
- **GitHub**: [@RootedMani](https://github.com/RootedMani)  
- **Email**: [Mani.Jabari.Personal@gmail.com](mailto:Mani.Jabari.Personal@gmail.com)  

Developed as an advanced demonstration of **Quantitative Software Engineering**, **Time-Series Machine Learning**, and **High-Throughput Full-Stack Financial Systems**.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
