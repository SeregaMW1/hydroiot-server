import { createApp } from "./app.js";
import { cfg } from "./config.js";
import { logger } from "./logger.js";
import "./mqtt/mqttClient.js"; // запускаем MQTT подписку сразу
import { admin, db } from "./firebase/index.js"; // инициализация Firebase (гарантированно 1 раз)

// Создаем Express-приложение
const app = createApp();

// ✅ Приводим PORT к числу (универсально для TS/Node/Render)
const PORT = Number(process.env.PORT || cfg.PORT || 3000);

// ✅ Render / Docker требуют прослушивания на 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`✅ Server listening on http://0.0.0.0:${PORT}`);
});
