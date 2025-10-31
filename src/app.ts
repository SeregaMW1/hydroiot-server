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
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("combined"));
  app.use(httpLogger);

  app.use(health);
  app.use("/webhook", webhook);
  app.use("/api/telemetry", telemetry);

  app.get("/test", (_req, res) => {
    res.type("html").send(`<html><body style="font-family:system-ui">
      <h2>HydroIoT Server</h2>
      <p>REST: <code>/api/telemetry/latest?uid=...&deviceId=...&limit=10</code></p>
      <p>SSE: <code>/api/telemetry/stream?uid=...&deviceId=...&exp=...&sig=...</code></p>
    </body></html>`);
  });

  return app;
}
