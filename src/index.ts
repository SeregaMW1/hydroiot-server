import { createApp } from "./app.js";
import { cfg } from "./config.js";
import { logger } from "./logger.js";

const app = createApp();

// Приводим PORT к number, потому что process.env.PORT — string
const PORT = Number(process.env.PORT || cfg.PORT || 3000);

// Запускаем сервер на 0.0.0.0 (обязательно для Render, Railway, Replit, VPS и т.д.)
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`✅ Server listening on http://0.0.0.0:${PORT}`);
});
