import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { ServerEmailService } from "./server/emailService";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API health route FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Sentrune Market Workstation" });
  });

  // Check email integration status (Resend, SMTP, or Simulation)
  app.get("/api/email/status", (req, res) => {
    const status = ServerEmailService.getProviderStatus();
    res.json(status);
  });

  // Dispatch real 6-digit confirmation email
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

  // Dispatch real price alert / newsletter email
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
        takeaway
      });
      res.json(result);
    } catch (err: any) {
      console.error("[Email Alert API Error]", err);
      res.status(500).json({ success: false, message: err.message || "Failed to dispatch alert email." });
    }
  });

  // Legacy fallback route for test dispatches
  app.post("/api/alerts/dispatch", (req, res) => {
    const { email, symbol, condition, threshold } = req.body || {};
    res.json({ 
      success: true, 
      dispatchedTo: email, 
      asset: symbol, 
      condition, 
      threshold, 
      timestamp: new Date().toISOString() 
    });
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
