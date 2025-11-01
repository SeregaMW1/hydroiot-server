import { createApp } from "./app.js";
import { cfg } from "./config.js";
import { logger } from "./logger.js";
import "./mqtt/mqttClient";               // ← MQTT запускается сразу при импорте
import { admin, db } from "./firebase/index.js"; 

const app = createApp();

// ✅ Приводим порт к числу
const PORT: number = parseInt(process.env.PORT || cfg.PORT?.toString() || "3000", 10);

// ✅ Важно: слушаем 0.0.0.0 — иначе Render / Docker не увидят сервер
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`✅ Server listening on http://0.0.0.0:${PORT}`);
});
