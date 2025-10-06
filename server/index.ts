import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// ✅ Allow all origins (Render compatible CORS)
app.use(cors());

// ✅ Fix: allow large JSON + file uploads (prevents 413 errors)
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// ✅ Add simple health check route for Render
app.get("/healthz", (_req, res) => res.status(200).send("OK"));

/**
 * 🔹 Custom API logging middleware
 */
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "…";
      }

      log(logLine);
    }
  });

  next();
});

/**
 * 🔹 Async initialization with error handling
 */
(async () => {
  try {
    const server = await registerRoutes(app);

    // ✅ Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      log(`❌ [${status}] ${message}`);
    });

    // ✅ Setup Vite in dev / serve static in prod
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ✅ Port setup for Render
    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen(port, "0.0.0.0", () => {
      log(`🚀 Server running on port ${port} in ${app.get("env")} mode`);
    });

    // ✅ Log key setup
    if (!process.env.OPENROUTER_API_KEY && !process.env.HUGGINGFACE_API_KEY) {
      log("⚠️ No API key found. Please set OPENROUTER_API_KEY or HUGGINGFACE_API_KEY in .env");
    } else {
      log("🔑 API keys loaded successfully");
    }
  } catch (err) {
    console.error("Fatal startup error:", err);
    process.exit(1);
  }
})();
