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

  app.set("trust proxy", true);
  app.use(cors());
  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));
  if (httpLogger) app.use(httpLogger);

  // ✅ Render требует ответ на HEAD /
  app.head("/", (_req, res) => res.status(200).end());

  app.get("/", (_req, res) => {
    res.type("text").send("✅ HydroIoT server running.");
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.get("/test", (_req, res) => {
    res.type("html").send(`
      <html>
        <body style="background:#111; color:#00ffaa; font-family:system-ui;">
          <h1>✅ HydroIoT Server</h1>
          <p>/health – check health</p>
        </body>
      </html>
    `);
  });

  app.use("/webhook", webhook);
  app.use("/api/telemetry", telemetry);

  return app;
}
