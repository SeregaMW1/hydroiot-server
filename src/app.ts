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

  // 🔹 Базовые middleware
  app.set("trust proxy", true);
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));
  if (httpLogger) app.use(httpLogger);

  // ✅ Главная страница (иначе Render делает HEAD / и думает, что сервис мертв)
  app.get("/", (_req, res) => {
    res.type("text/plain").send("✅ HydroIoT Server is running");
  });

  // ✅ /health — для Render / UptimeRobot
  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      status: "alive ✅",
      time: new Date().toISOString(),
    });
  });

  // ✅ /test — визуальная страница
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

  // ✅ Основные API-маршруты
  app.use(health);
  app.use("/webhook", webhook);
  app.use("/api/telemetry", telemetry);

  return app;
}
