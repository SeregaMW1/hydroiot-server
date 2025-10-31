import { createApp } from "./app.js";
import { cfg } from "./config.js";
import { logger } from "./logger.js";

const app = createApp();
app.listen(cfg.PORT, () => {
  logger.info(`Server listening on :${cfg.PORT}`);
});
