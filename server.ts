import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDatabase, TechnicalFeature, ensureBarsAndTechnicals } from './server/db.js';
import { generatePredictionAndExplanation } from './server/narrative.js';
import { runIngestionAndFeatures } from './server/refresh.js';
import { translateNewsItems, translateSocialItems } from './server/translator.js';
import { runAiTournament } from './server/ai_engine.js';
import { runPortfolioSimulation } from './server/simulation_engine.js';
import { getGeminiKeyPool } from './server/gemini_pool.js';
import {
  getCustomModels,
  getCustomModelById,
  saveCustomModel,
  deleteCustomModel,
  trainCustomModel,
  autoTuneModel,
} from './server/custom_models_engine.js';
import {
  startRealtimeEngine,
  triggerInitialSync,
  fetchFastLiveQuotes,
} from './server/realtime.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize DB instance
  const db = getDatabase();

  // API 1: Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API 2: App and data feed status
  app.get('/api/status', (req: Request, res: Response) => {
    res.json({
      last_refresh_at: db.last_refresh_at,
      status: 'operational',
      total_assets: db.assets.length,
      total_bars: db.price_bars.length,
      is_realtime_active: true,
      streaming_endpoint: '/api/live/stream',
    });
  });

  // API 3: Assets list
  app.get('/api/assets', (req: Request, res: Response) => {
    const assets = db.assets.filter((a) => a.is_active === 1);
    res.json(assets);
  });

  // API 4: Overview metrics & diagnostics
  app.get('/api/overview', (req: Request, res: Response) => {
    const assetId = req.query.asset_id ? parseInt(req.query.asset_id as string, 10) : 1;
    const asset = db.assets.find((a) => a.id === assetId) || db.assets[0];

    const counts = {
      price_bars: db.price_bars.length,
      news_items: db.news_items.length,
      social_items: db.social_items.length,
      technical_features: db.technical_features.length,
      model_runs: db.model_runs.length,
      sentiment_aggregates: db.sentiment_aggregates.length,
    };

    const hints: string[] = [];
    if (counts.price_bars === 0) {
      hints.push('No price bars - check connectivity (yfinance / Binance) and config/assets.yaml');
    }
    if (counts.news_items === 0) {
      hints.push('No news items - add FINNHUB_API_KEY or ALPHA_VANTAGE_API_KEY, then click Refresh prices & news.');
    }
    if (counts.social_items === 0) {
      hints.push('No market discussion yet - use Refresh news and prices now; Google News RSS needs no key.');
    }
    if (counts.price_bars > 0 && counts.technical_features === 0) {
      hints.push('Prices exist but no technical features - automatic computation will run after the next data refresh');
    }
    if (counts.model_runs === 0) {
      hints.push('No trained models yet - run: python run_pipeline.py train');
    }

    res.json({
      counts,
      selected_asset: asset,
      ingestion_log: db.ingestion_log.slice(0, 15),
      hints,
    });
  });

  // API 5: Prices
  app.get('/api/prices', (req: Request, res: Response) => {
    const assetId = req.query.asset_id ? parseInt(req.query.asset_id as string, 10) : 1;
    const interval = (req.query.interval as string) || '1d';

    let bars = db.price_bars.filter((b) => b.asset_id === assetId && b.interval === interval);
    if (bars.length === 0) {
      bars = ensureBarsAndTechnicals(db, assetId, interval);
    }
    bars.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let lastClose = 0;
    let change = 0;
    let changePct = 0;

    if (bars.length > 0) {
      lastClose = bars[bars.length - 1].close;
      if (bars.length > 1) {
        const prevClose = bars[bars.length - 2].close;
        change = lastClose - prevClose;
        changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
      }
    } else {
      // Fallback: lookup asset's latest price across any interval so price is NEVER 0
      const anyBars = db.price_bars
        .filter((b) => b.asset_id === assetId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      if (anyBars.length > 0) {
        lastClose = anyBars[anyBars.length - 1].close;
      }
    }

    res.json({
      bars,
      last_close: lastClose,
      change,
      change_pct: changePct,
    });
  });

  // API 6: Technicals
  app.get('/api/technicals', (req: Request, res: Response) => {
    const assetId = req.query.asset_id ? parseInt(req.query.asset_id as string, 10) : 1;
    const interval = (req.query.interval as string) || '1d';

    let technical = db.technical_features.filter((tf) => tf.asset_id === assetId && tf.interval === interval);
    if (technical.length === 0) {
      ensureBarsAndTechnicals(db, assetId, interval);
      technical = db.technical_features.filter((tf) => tf.asset_id === assetId && tf.interval === interval);
    }
    technical.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json(technical);
  });

  // API 7: Sentiment aggregates
  app.get('/api/sentiment', (req: Request, res: Response) => {
    const assetId = req.query.asset_id ? parseInt(req.query.asset_id as string, 10) : 1;
    const windowHours = req.query.window_hours ? parseInt(req.query.window_hours as string, 10) : null;

    let aggs = db.sentiment_aggregates.filter((sa) => sa.asset_id === assetId);
    const windows = Array.from(new Set(aggs.map((a) => a.window_hours))).sort((a, b) => a - b);

    if (windowHours) {
      aggs = aggs.filter((a) => a.window_hours === windowHours);
    }
    aggs.sort((a, b) => new Date(a.window_end).getTime() - new Date(b.window_end).getTime());

    res.json({
      aggregates: aggs,
      available_windows: windows.length > 0 ? windows : [24, 72, 168],
    });
  });

  // API 8: News
  app.get('/api/news', async (req: Request, res: Response) => {
    const assetId = req.query.asset_id ? parseInt(req.query.asset_id as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;

    const linkedNewsIds = new Set(
      db.news_item_assets.filter((na) => na.asset_id === assetId).map((na) => na.news_item_id)
    );

    let news = db.news_items.filter((n) => linkedNewsIds.has(n.id) || linkedNewsIds.size === 0);
    news.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

    const sliced = news.slice(0, limit);

    try {
      const translations = await translateNewsItems(sliced);
      translations.forEach((tr) => {
        const item = db.news_items.find((n) => n.id === tr.id);
        if (item) {
          if (!item.headline_fa && tr.headline_fa) item.headline_fa = tr.headline_fa;
          if (!item.body_fa && tr.body_fa) item.body_fa = tr.body_fa;
        }
      });
    } catch (err) {
      console.warn('Error applying translations to news items:', err);
    }

    res.json(sliced);
  });

  // API 9: Market Discussion / Social
  app.get('/api/social', async (req: Request, res: Response) => {
    const assetId = req.query.asset_id ? parseInt(req.query.asset_id as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;

    const linkedSocialIds = new Set(
      db.social_item_assets.filter((sa) => sa.asset_id === assetId).map((sa) => sa.social_item_id)
    );

    let social = db.social_items.filter((s) => linkedSocialIds.has(s.id) || linkedSocialIds.size === 0);
    social.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const sliced = social.slice(0, limit);

    try {
      const translations = await translateSocialItems(sliced);
      translations.forEach((tr) => {
        const item = db.social_items.find((s) => s.id === tr.id);
        if (item) {
          if (!item.title_fa && tr.title_fa) item.title_fa = tr.title_fa;
          if (!item.body_fa && tr.body_fa) item.body_fa = tr.body_fa;
        }
      });
    } catch (err) {
      console.warn('Error applying translations to social items:', err);
    }

    res.json(sliced);
  });

  // API 10: Model prediction, explainability, validation & backtest
  app.get('/api/model', (req: Request, res: Response) => {
    const assetId = req.query.asset_id ? parseInt(req.query.asset_id as string, 10) : 1;
    const interval = (req.query.interval as string) || '1d';

    const asset = db.assets.find((a) => a.id === assetId) || db.assets[0];
    const runs = db.model_runs.filter((r) => r.asset_id === assetId && r.interval === interval);
    runs.sort((a, b) => b.id - a.id);

    if (runs.length === 0 && db.model_runs.length === 0) {
      return res.json({
        has_models: false,
        message: 'No trained models yet - run model training.',
      });
    }

    const latestRun = runs[0] || db.model_runs[0];
    const runId = latestRun.id;

    // Get latest technical bar
    const assetTechnicals = db.technical_features.filter(
      (tf) => tf.asset_id === assetId && tf.interval === interval
    );
    assetTechnicals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const latestTech = assetTechnicals[0] as TechnicalFeature | undefined;

    // Get latest sentiment agg
    const assetSentiment = db.sentiment_aggregates.filter((sa) => sa.asset_id === assetId);
    assetSentiment.sort((a, b) => new Date(b.window_end).getTime() - new Date(a.window_end).getTime());
    const latestSent = assetSentiment[0];

    const explanation = generatePredictionAndExplanation(assetId, asset.symbol, latestTech || {}, latestSent);

    // Validation metrics summary grouped by model_name
    const validationMetrics = db.validation_metrics.filter((vm) => vm.model_run_id === runId);
    const modelNames = Array.from(new Set(validationMetrics.map((vm) => vm.model_name)));

    const validationSummary = modelNames.map((model_name) => {
      const items = validationMetrics.filter((vm) => vm.model_name === model_name);
      const folds = items.length;
      const avgAccuracy = items.reduce((sum, v) => sum + (v.accuracy || 0), 0) / folds;
      const avgLogLoss = items.reduce((sum, v) => sum + (v.log_loss || 0), 0) / folds;
      return {
        model_name,
        folds,
        accuracy: parseFloat(avgAccuracy.toFixed(4)),
        log_loss: parseFloat(avgLogLoss.toFixed(4)),
      };
    });

    // Strategy backtests for this run
    const backtests = db.strategy_backtests.filter((sb) => sb.model_run_id === runId);
    backtests.sort((a, b) => a.fold - b.fold);

    res.json({
      has_models: true,
      asset,
      model_run: latestRun,
      as_of: latestTech?.timestamp || new Date().toISOString(),
      prediction: explanation,
      validation_summary: validationSummary,
      strategy_backtests: backtests,
      recent_runs: runs.slice(0, 5),
    });
  });

  // API 11: AI Multi-Model Tournament & Benchmark (Groq LPU + Gemini + Quant)
  app.post('/api/ai/tournament', async (req: Request, res: Response) => {
    try {
      const assetId = req.body.asset_id ? parseInt(req.body.asset_id as string, 10) : 1;
      const interval = (req.body.interval as string) || '1d';

      const asset = db.assets.find((a) => a.id === assetId) || db.assets[0];
      const assetBars = db.price_bars.filter((b) => b.asset_id === assetId && b.interval === interval);
      assetBars.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const latestPrice = assetBars.length > 0 ? assetBars[assetBars.length - 1].close : 100;

      const assetTechnicals = db.technical_features.filter(
        (tf) => tf.asset_id === assetId && tf.interval === interval
      );
      assetTechnicals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const latestTech = assetTechnicals[0] || {};

      const assetSentiment = db.sentiment_aggregates.filter((sa) => sa.asset_id === assetId);
      assetSentiment.sort((a, b) => new Date(b.window_end).getTime() - new Date(a.window_end).getTime());
      const latestSent = assetSentiment[0];

      const priceHistory = assetBars.slice(-10).map((b) => ({
        timestamp: b.timestamp,
        close: b.close,
        volume: b.volume,
      }));

      const tournamentResults = await runAiTournament(
        {
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          asset_type: asset.asset_type,
        },
        latestPrice,
        latestTech,
        latestSent,
        priceHistory
      );

      res.json({
        success: true,
        asset,
        latest_price: latestPrice,
        timestamp: new Date().toISOString(),
        tournament: tournamentResults,
      });
    } catch (err: any) {
      console.error('AI Tournament error:', err);
      res.status(500).json({ error: err.message || 'Tournament execution failed' });
    }
  });

  // API 12: $10,000 Portfolio Algorithmic Simulation Engine
  app.post('/api/ai/simulation', (req: Request, res: Response) => {
    try {
      const assetId = req.body.asset_id ? parseInt(req.body.asset_id as string, 10) : 1;
      const interval = (req.body.interval as string) || '1d';
      const modelId = (req.body.model_id as string) || 'openai/gpt-oss-120b';
      const modelName = (req.body.model_name as string) || 'OpenAI GPT OSS 120B Quant Strategist';
      const budget = req.body.budget ? parseFloat(req.body.budget) : 10000.0;
      const feeRate = req.body.fee_rate !== undefined ? parseFloat(req.body.fee_rate) : 0.001; // 0.10%
      const slippageRate = req.body.slippage_rate !== undefined ? parseFloat(req.body.slippage_rate) : 0.0005; // 0.05%

      const asset = db.assets.find((a) => a.id === assetId) || db.assets[0];
      const bars = db.price_bars.filter((b) => b.asset_id === assetId && b.interval === interval);
      bars.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const technicals = db.technical_features.filter((tf) => tf.asset_id === assetId && tf.interval === interval);
      const techMap = new Map<string, Record<string, any>>();
      technicals.forEach((t) => techMap.set(t.timestamp, t));

      const sentiment = db.sentiment_aggregates.find((sa) => sa.asset_id === assetId);
      const avgSent = sentiment ? sentiment.avg_sentiment : 0.2;

      const simulationResults = runPortfolioSimulation(
        modelId,
        modelName,
        bars,
        techMap,
        avgSent,
        budget,
        feeRate,
        slippageRate
      );

      res.json({
        success: true,
        asset,
        simulation: simulationResults,
      });
    } catch (err: any) {
      console.error('Simulation error:', err);
      res.status(500).json({ error: err.message || 'Simulation execution failed' });
    }
  });

  // API 13: Multi-Model $10,000 Portfolio Comparative Benchmark
  app.post('/api/ai/simulation-compare', (req: Request, res: Response) => {
    try {
      const assetId = req.body.asset_id ? parseInt(req.body.asset_id as string, 10) : 1;
      const interval = (req.body.interval as string) || '1d';
      const budget = req.body.budget ? parseFloat(req.body.budget) : 10000.0;

      const asset = db.assets.find((a) => a.id === assetId) || db.assets[0];
      const bars = db.price_bars.filter((b) => b.asset_id === assetId && b.interval === interval);
      bars.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const technicals = db.technical_features.filter((tf) => tf.asset_id === assetId && tf.interval === interval);
      const techMap = new Map<string, Record<string, any>>();
      technicals.forEach((t) => techMap.set(t.timestamp, t));

      const sentiment = db.sentiment_aggregates.find((sa) => sa.asset_id === assetId);
      const avgSent = sentiment ? sentiment.avg_sentiment : 0.2;

      // Include user's custom models alongside frontier LLMs for comprehensive benchmarking
      const customModels = getCustomModels();
      const modelsToCompare = [
        ...customModels.map((cm) => ({
          id: cm.id,
          name: `${cm.name} (${cm.metrics?.status === 'profitable' ? '🟢 Profit' : '🔴 In Loss'})`,
        })),
        { id: 'openai/gpt-oss-120b', name: 'OpenAI GPT OSS 120B (Groq LPU)' },
        { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B Reasoning (Groq LPU)' },
        { id: 'openai/gpt-oss-20b', name: 'OpenAI GPT OSS 20B Instant (Groq LPU)' },
        { id: 'gemini-3.8-flash', name: 'Google Gemini 3.8 Flash' },
        { id: 'lightgbm-quant', name: 'LightGBM Multi-Factor Quant Ensemble' },
      ];

      const comparisons = modelsToCompare.map((m) =>
        runPortfolioSimulation(m.id, m.name, bars, techMap, avgSent, budget)
      );

      // Rank by final return descending
      comparisons.sort((a, b) => b.totalReturnPct - a.totalReturnPct);

      res.json({
        success: true,
        asset,
        best_model: comparisons[0],
        comparisons,
      });
    } catch (err: any) {
      console.error('Simulation compare error:', err);
      res.status(500).json({ error: err.message || 'Simulation comparison failed' });
    }
  });

  // API 14: Custom Models Architecture Studio & Registry
  app.get('/api/custom-models', (req: Request, res: Response) => {
    try {
      const models = getCustomModels();
      res.json({ success: true, models });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch custom models' });
    }
  });

  app.get('/api/custom-models/:id', (req: Request, res: Response) => {
    try {
      const model = getCustomModelById(req.params.id);
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }
      res.json({ success: true, model });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch model' });
    }
  });

  // Train a custom architecture
  app.post('/api/custom-models/train', (req: Request, res: Response) => {
    try {
      const config = req.body.config;
      const assetId = req.body.asset_id ? parseInt(req.body.asset_id as string, 10) : 1;
      if (!config) {
        return res.status(400).json({ error: 'Model architecture configuration is required' });
      }
      const trainedModel = trainCustomModel(config, assetId);
      res.json({ success: true, model: trainedModel });
    } catch (err: any) {
      console.error('Training error:', err);
      res.status(500).json({ error: err.message || 'Training failed' });
    }
  });

  // Auto-tune an architecture to fix loss and turn it into profit
  app.post('/api/custom-models/autotune', (req: Request, res: Response) => {
    try {
      const modelId = req.body.model_id as string;
      const assetId = req.body.asset_id ? parseInt(req.body.asset_id as string, 10) : 1;
      if (!modelId) {
        return res.status(400).json({ error: 'model_id is required' });
      }
      const tunedModel = autoTuneModel(modelId, assetId);
      res.json({ success: true, model: tunedModel });
    } catch (err: any) {
      console.error('Auto-tuning error:', err);
      res.status(500).json({ error: err.message || 'Auto-tuning failed' });
    }
  });

  // Delete a custom model
  app.delete('/api/custom-models/:id', (req: Request, res: Response) => {
    try {
      const deleted = deleteCustomModel(req.params.id);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete model' });
    }
  });

  // API 15: Refresh pipeline with real-time broadcast
  app.post('/api/refresh', async (req: Request, res: Response) => {
    try {
      await triggerInitialSync();
      res.json({ success: true, message: 'Pipeline refreshed and broadcasted to live clients' });
    } catch (err: any) {
      console.error('Refresh error:', err);
      res.status(500).json({ error: err.message || 'Refresh failed' });
    }
  });

  // Attach Real-Time Streaming and Auto-Refresh Engine
  startRealtimeEngine(app);

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sentrune Trading Assistant server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
