import { createApp } from "./app.js";
import { cfg } from "./config.js";
import { logger } from "./logger.js";

const app = createApp();

// Render всегда передаёт порт через process.env.PORT
const PORT = process.env.PORT || cfg.PORT || 3000;

// ❗ Обязательно 0.0.0.0 — иначе Render не увидит порт
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  logger.info(`✅ Server listening on http://${HOST}:${PORT}`);
});
