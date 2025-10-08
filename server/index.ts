import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// ✅ Enable CORS
app.use(cors());

// ✅ Handle large JSON & file uploads
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// ✅ Health Check
app.get("/healthz", (_req, res) => res.status(200).send("OK"));

// 🔹 Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJson: Record<string, any> | undefined;

  const originalJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJson = bodyJson;
    return originalJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJson) logLine += ` :: ${JSON.stringify(capturedJson)}`;
      if (logLine.length > 200) logLine = logLine.slice(0, 199) + "…";
      log(logLine);
    }
  });

  next();
});

// ✅ Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  log(`❌ [${status}] ${message}`);
});

/**
 * 🔹 Initialize Server & Register Routes
 */
(async () => {
  try {
    // ✅ Register all main routes from routes.ts
    const server = await registerRoutes(app);

    // ✅ Setup Vite (dev) or serve static build (prod)
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ✅ Start the server
    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen(port, "0.0.0.0", () => {
      log(`🚀 Server running on port ${port} (${app.get("env")} mode)`);
    });

    // ✅ Log API key status
    if (!process.env.OPENROUTER_API_KEY && !process.env.HUGGINGFACE_API_KEY) {
      log("⚠️ No AI API key found. Set OPENROUTER_API_KEY or HUGGINGFACE_API_KEY in .env");
    } else {
      log("🔑 AI API keys loaded successfully");
    }
  } catch (err) {
    console.error("Fatal startup error:", err);
    process.exit(1);
  }
})();
