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

  // --- базовая защита и парсинг ---
  app.set("trust proxy", true);
  app.use(cors());
  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));
  if (httpLogger) app.use(httpLogger);

  // ✅ Render требует, чтобы HEAD / возвращал 200 OK
  app.head("/", (_req, res) => res.status(200).end());

  // ✅ Обычный GET / — чтобы браузер показывал страницу, а не зависал
  app.get("/", (_req, res) => {
    res.type("text").send("✅ HydroIoT server is running.");
  });

  // ✅ Health-check
  app.get("/health", (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  // ✅ Тестовая страница (можно позже подключить Firestore telemetry)
  app.get("/test", (_req, res) => {
    res.type("html").send(`
      <html>
        <body style="background:#111; color:#00ffaa; font-family:system-ui; padding:20px;">
          <h1>✅ HydroIoT Server</h1>
          <p>Health: <a href="/health" style="color:#00ffaa">/health</a></p>
          <p>Telemetry API: <code>/api/telemetry/latest?uid=demo&deviceId=test&limit=10</code></p>
        </body>
      </html>
    `);
  });

  // --- основные роуты API ---
  app.use("/webhook", webhook);          // Webhook от CloudAMQP → Firestore
  app.use("/api/telemetry", telemetry);  // Отдача данных телеметрии

  return app;
}
