import { createApp } from "./app.js";
import { cfg } from "./config.js";
import { logger } from "./logger.js";

const app = createApp();

const PORT = process.env.PORT || cfg.PORT || 3000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  logger.info(`✅ Server listening on http://${HOST}:${PORT}`);
});
