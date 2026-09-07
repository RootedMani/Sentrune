import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { ServerEmailService } from "./server/emailService.js";
import { startRealtimeEngine } from "./server/realtime.js";
import { generateAiSummaryAndHook } from "./server/ai_summarizer.js";
import { runAiTournament } from "./server/ai_engine.js";
import { runPortfolioSimulation } from "./server/simulation_engine.js";
import {
  getCustomModels,
  autoTuneModel,
  trainCustomModel,
  deleteCustomModel,
} from "./server/custom_models_engine.js";
import {
  getAlpacaConfig,
  getAlpacaAccount,
  getAlpacaPositions,
  getAlpacaOrders,
  checkAlpacaDataCoverage,
  getAlpacaStockBars,
  getAlpacaLatestQuote,
  placeAlpacaOrder,
  closeAlpacaPosition,
  cancelAlpacaOrder,
  resetSimulatedAccount,
  testAlpacaConnection,
  setRuntimeCredentials,
  clearRuntimeCredentials,
} from "./server/alpaca.js";
import { runIngestionAndFeatures } from "./server/refresh.js";
import { getDatabase } from "./server/db.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API health route FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Sentrune Market Workstation" });
  });

  // Start real-time engine & SSE routes (/api/live/stream, /api/live/prices, /api/live/status)
  startRealtimeEngine(app);

  // Email routes
  app.get("/api/email/status", (req, res) => {
    const status = ServerEmailService.getProviderStatus();
    res.json(status);
  });

  app.post("/api/email/send-verification", async (req, res) => {
    try {
      const { email, code, assetSymbol } = req.body || {};
      if (!email || !code) {
        return res.status(400).json({ success: false, message: "Email and code are required." });
      }

      const result = await ServerEmailService.sendVerificationCode({ email, code, assetSymbol });
      res.json(result);
    } catch (err: any) {
      console.error("[Email Verification API Error]", err);
      res.status(500).json({ success: false, message: err.message || "Failed to dispatch verification email." });
    }
  });

  app.post("/api/email/send-alert", async (req, res) => {
    try {
      const { email, symbol, assetName, price, changePercent, condition, threshold, takeaway } = req.body || {};
      if (!email || !symbol) {
        return res.status(400).json({ success: false, message: "Email and symbol are required." });
      }

      const result = await ServerEmailService.sendMarketAlert({
        email,
        symbol,
        assetName,
        price,
        changePercent,
        condition,
        threshold,
        takeaway,
      });
      res.json(result);
    } catch (err: any) {
      console.error("[Email Alert API Error]", err);
      res.status(500).json({ success: false, message: err.message || "Failed to dispatch alert email." });
    }
  });

  app.post("/api/alerts/dispatch", (req, res) => {
    const { email, symbol, condition, threshold } = req.body || {};
    res.json({
      success: true,
      dispatchedTo: email,
      asset: symbol,
      condition,
      threshold,
      timestamp: new Date().toISOString(),
    });
  });

  // News AI summarize route
  app.post("/api/news/ai-summarize", async (req, res) => {
    try {
      const { id, headline, body, source_name, url } = req.body || {};
      const result = await generateAiSummaryAndHook({
        id: id ?? Date.now(),
        headline: headline || "Market Update",
        body,
        source_name,
        url,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("[News AI Summarize Error]", err);
      res.status(500).json({ success: false, error: err.message || "Failed to generate summary" });
    }
  });

  // Helper for running algorithmic simulation
  function getSimulationForAssetAndModel(
    assetId: number,
    interval: string,
    modelId: string,
    budget: number
  ) {
    const db = getDatabase();
    const asset = db.assets.find((a) => a.id === assetId) || db.assets[0];
    const bars = db.price_bars
      .filter((b) => b.asset_id === asset.id && b.interval === (interval || "1d"))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const technicals = db.technical_features.filter(
      (t) => t.asset_id === asset.id && t.interval === (interval || "1d")
    );
    const techMap = new Map<string, Record<string, any>>();
    technicals.forEach((t) => techMap.set(t.timestamp, t));
    const sentimentAgg = db.sentiment_aggregates.filter((s) => s.asset_id === asset.id).pop();
    const sentimentScore = sentimentAgg?.avg_sentiment ?? 0.2;
    const modelName = modelId.split("/").pop()?.replace(/-/g, " ").toUpperCase() || modelId;

    return runPortfolioSimulation(
      modelId,
      modelName,
      bars,
      techMap,
      sentimentScore,
      budget
    );
  }

  // AI inference tournament route
  app.post("/api/ai/tournament", async (req, res) => {
    try {
      const { asset_id, interval } = req.body || {};
      const db = getDatabase();
      const asset = db.assets.find((a) => a.id === Number(asset_id)) || db.assets[0];
      const bars = db.price_bars
        .filter((b) => b.asset_id === asset.id && b.interval === (interval || "1d"))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const latestBar = bars[bars.length - 1];
      const latestPrice = latestBar?.close ?? 100;
      const technical =
        db.technical_features
          .filter((t) => t.asset_id === asset.id && t.interval === (interval || "1d"))
          .pop() || {};
      const sentimentAgg = db.sentiment_aggregates.filter((s) => s.asset_id === asset.id).pop();
      const recentPriceHistory = bars
        .slice(-10)
        .map((b) => ({ timestamp: b.timestamp, close: b.close, volume: b.volume }));

      const data = await runAiTournament(
        asset,
        latestPrice,
        technical,
        sentimentAgg,
        recentPriceHistory
      );
      res.json(data);
    } catch (err: any) {
      console.error("[AI Tournament Error]", err);
      res.status(500).json({ success: false, error: err.message || "Tournament inference failed" });
    }
  });

  // AI simulation routes
  app.post("/api/ai/simulation", async (req, res) => {
    try {
      const { asset_id, interval, model_id, budget } = req.body || {};
      const results = getSimulationForAssetAndModel(
        Number(asset_id) || 1,
        interval || "1d",
        model_id || "openai/gpt-oss-120b",
        Number(budget) || 10000
      );
      res.json(results);
    } catch (err: any) {
      console.error("[AI Simulation Error]", err);
      res.status(500).json({ success: false, error: err.message || "Simulation failed" });
    }
  });

  app.post("/api/ai/simulation-compare", async (req, res) => {
    try {
      const { asset_id, interval, budget } = req.body || {};
      const assetId = Number(asset_id) || 1;
      const iv = interval || "1d";
      const b = Number(budget) || 10000;
      const candidateModels = [
        "openai/gpt-oss-120b",
        "qwen/qwen-2.5-32b",
        "openai/gpt-oss-20b",
        "gemini-3.8-flash",
        "quant/lightgbm-ensemble",
      ];
      const comparisons = candidateModels.map((mId) =>
        getSimulationForAssetAndModel(assetId, iv, mId, b)
      );
      // Best model by Sharpe ratio, then total return
      const sorted = [...comparisons].sort(
        (a, b) => b.sharpeRatio - a.sharpeRatio || b.totalReturnPct - a.totalReturnPct
      );
      res.json({
        comparisons,
        best_model: sorted[0] || comparisons[0],
      });
    } catch (err: any) {
      console.error("[AI Simulation Compare Error]", err);
      res.status(500).json({ success: false, error: err.message || "Comparison failed" });
    }
  });

  // Custom models routes
  app.get("/api/custom-models", (req, res) => {
    res.json({ success: true, models: getCustomModels() });
  });

  app.post("/api/custom-models/autotune", (req, res) => {
    try {
      const { model_id, asset_id } = req.body || {};
      const tuned = autoTuneModel(model_id, Number(asset_id) || 1);
      res.json({ success: true, model: tuned });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Auto-tune failed" });
    }
  });

  app.post("/api/custom-models/train", (req, res) => {
    try {
      const { config, asset_id } = req.body || {};
      const trained = trainCustomModel(config, Number(asset_id) || 1);
      res.json({ success: true, model: trained });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Training failed" });
    }
  });

  app.delete("/api/custom-models/:id", (req, res) => {
    const success = deleteCustomModel(req.params.id);
    res.json({ success });
  });

  // Alpaca Trading & Paper Account routes
  app.get("/api/alpaca/status", async (req, res) => {
    try {
      const config = getAlpacaConfig();
      const account = await getAlpacaAccount();
      res.json({ ...config, account });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/alpaca/positions", async (req, res) => {
    try {
      const positions = await getAlpacaPositions();
      res.json({ success: true, positions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/alpaca/orders", async (req, res) => {
    try {
      const status = req.query.status as any;
      const limit = req.query.limit ? Number(req.query.limit) : 15;
      const orders = await getAlpacaOrders(status, limit);
      res.json({ success: true, orders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/alpaca/coverage", async (req, res) => {
    try {
      const symbols = ["AAPL", "MSFT", "BTC/USD", "ETH/USD"];
      const coverage = await checkAlpacaDataCoverage(symbols);
      res.json({ success: true, coverage });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/alpaca/bars", async (req, res) => {
    try {
      const symbol = (req.query.symbol as string) || "AAPL";
      const timeframe = (req.query.timeframe as any) || "1Day";
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const bars = await getAlpacaStockBars(symbol, timeframe, limit);
      res.json({ success: true, bars });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/alpaca/quote", async (req, res) => {
    try {
      const symbol = (req.query.symbol as string) || "AAPL";
      const quote = await getAlpacaLatestQuote(symbol);
      res.json({ success: true, quote });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/alpaca/order", async (req, res) => {
    try {
      const result = await placeAlpacaOrder(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/alpaca/positions/:symbol", async (req, res) => {
    try {
      const result = await closeAlpacaPosition(req.params.symbol);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.delete("/api/alpaca/orders/:orderId", async (req, res) => {
    try {
      const result = await cancelAlpacaOrder(req.params.orderId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/alpaca/reset", (req, res) => {
    resetSimulatedAccount();
    res.json({ success: true, message: "Sandbox reset to $100,000" });
  });

  app.post("/api/alpaca/test-connection", async (req, res) => {
    try {
      const { apiKey, apiSecret, isPaper } = req.body || {};
      const result = await testAlpacaConnection(apiKey, apiSecret, isPaper !== false);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ connected: false, error: err.message });
    }
  });

  app.post("/api/alpaca/credentials", (req, res) => {
    const { apiKey, apiSecret, isPaper } = req.body || {};
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ success: false, error: "Missing apiKey or apiSecret" });
    }
    setRuntimeCredentials(apiKey, apiSecret, isPaper !== false);
    res.json({ success: true, message: "Credentials applied" });
  });

  app.delete("/api/alpaca/credentials", (req, res) => {
    clearRuntimeCredentials();
    res.json({ success: true, message: "Credentials cleared, reverted to paper sandbox" });
  });

  // Pipeline refresh
  app.post("/api/pipeline/refresh", async (req, res) => {
    try {
      const stats = await runIngestionAndFeatures();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development vs static dist for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
