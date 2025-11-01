import { createApp } from "./app.js";
import { cfg } from "./config.js";
import { logger } from "./logger.js";

const app = createApp();

// Render требует host = 0.0.0.0, иначе он не видит сервис
const PORT = cfg.PORT || 3000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  logger.info(`✅ Server listening on http://${HOST}:${PORT}`);
});
