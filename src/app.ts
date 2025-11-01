import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { httpLogger } from "./logger.js";
import { webhook } from "./routes/webhook.js";
import { telemetry } from "./routes/telemetry.js";

export function createApp() {
  const app = express();

  // ✅ 1. Сразу отвечаем Render на HEAD /
  app.head("/", (_req, res) => res.status(200).end());

  // ✅ 2. Простой ответ на /
  app.get("/", (_req, res) => {
    res.type("text").send("✅ HydroIoT server is running.");
  });

  // ✅ 3. Health-check
  app.get("/health", (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  // ✅ 4. Теперь middleware — после базовых ответов
  app.set("trust proxy", true);
  app.use(cors());
  app.use(
    helmet({
      contentSecurityPolicy: false, // иначе может блокировать inline-HTML
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));
  if (httpLogger) app.use(httpLogger);

  // ✅ 5. Тестовая страница
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

  // ✅ 6. Основные API
  app.use("/webhook", webhook);
  app.use("/api/telemetry", telemetry);

  return app;
}
