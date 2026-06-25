import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { createServer } from "http";
import cron from "node-cron";
import { syncCatalogAllOrgs } from "./services/catalogSync";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// The SPA is served separately (Amplify) in production, so allow that origin to
// call this API cross-origin. FRONTEND_ORIGIN is a comma-separated allowlist;
// when unset (local dev / same-origin), CORS is effectively a no-op.
const corsOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
if (corsOrigins.length > 0) {
  app.use(
    cors({
      origin: corsOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
}

// Unauthenticated liveness probe for the load balancer / orchestrator.
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // In production this process is API-only; the React SPA is built and served
  // separately (Amplify Hosting). In development we keep the monolith: Vite
  // middleware serves the client on the same origin for a one-command dev loop.
  // (setupVite is registered after all routes so its catch-all doesn't shadow them.)
  if (process.env.NODE_ENV !== "production") {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // Sync catalog nightly at 2am. Gated behind ENABLE_SCHEDULED_JOBS so that,
  // when running multiple instances, the job fires on exactly one of them.
  if (process.env.ENABLE_SCHEDULED_JOBS === "true") {
    log("Scheduled jobs enabled: nightly catalog sync registered", "cron");
    cron.schedule("0 2 * * *", () => {
      log("Running scheduled catalog sync", "cron");
      syncCatalogAllOrgs().catch((err) =>
        console.error("[CatalogSync] Scheduled sync failed:", err)
      );
    });
  } else {
    log("Scheduled jobs disabled (set ENABLE_SCHEDULED_JOBS=true to enable)", "cron");
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
