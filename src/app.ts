import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { httpLogger } from "./logger.js";
import { health } from "./routes/health.js";
import { webhook } from "./routes/webhook.js";
import { telemetry } from "./routes/telemetry.js";

export function createApp() {
  const app = express();

  // --- базовые middleware ---
  app.set("trust proxy", true);
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));       // лог HTTP-запросов
  if (httpLogger) app.use(httpLogger);

  // --- рабочий /health маршрут ---
  app.get("/health", (_req, res) => {
    res.json({ ok: true, status: "alive ✅", time: new Date().toISOString() });
  });

  // --- тестовая страница /test ---
  app.get("/test", (_req, res) => {
    res.type("html").send(`
      <html>
      <body style="font-family: system-ui; background:#111; color:#00ffaa; padding:20px;">
        <h2>✅ HydroIoT Server</h2>
        <p>REST: <code>/api/telemetry/latest?uid=demo&deviceId=test&limit=10</code></p>
        <p>SSE : <code>/api/telemetry/stream?uid=demo&deviceId=test&exp=123&sig=ABC</code></p>
        <p>Health check: <a href="/health" style="color:#00ffaa">/health</a></p>
      </body>
      </html>
    `);
  });

  // --- основные маршруты приложения ---
  app.use(health); // (если health реализован как Router — тоже подключается)
  app.use("/webhook", webhook);
  app.use("/api/telemetry", telemetry);

  return app;
}
