import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API health route FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Sentrune Market Workstation" });
  });

  // Zero-cost simulated alert email dispatch API endpoint
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
