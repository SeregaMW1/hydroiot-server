import { createApp } from "./app.js";
import { cfg } from "./config.js";
import { logger } from "./logger.js";
import "./mqtt/mqttClient"; 
import admin from "firebase-admin";
const app = createApp();

// ✅ Приводим порт к чистому числу (важно)
const PORT: number = parseInt(process.env.PORT || cfg.PORT?.toString() || "3000", 10);

// ✅ Всегда слушаем 0.0.0.0 — нужно для Render, Docker, Railway и др.
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`✅ Server listening on http://0.0.0.0:${PORT}`);
});


if (!admin.apps.length) {
  admin.initializeApp({
    // Render обычно использует GOOGLE_APPLICATION_CREDENTIALS или переменные окружения
    // credential: admin.credential.applicationDefault(),
    // либо:
    // credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!)),
  });
}

export { admin };
export const db = admin.firestore();