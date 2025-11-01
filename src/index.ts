import { createApp } from "./app.js";
import { cfg } from "./config.js";
import { logger } from "./logger.js";
import "./mqtt/mqttClient.js";
import { admin, db } from "./firebase/index.js"; 

const app = createApp();

// ✅ PORT без TS-ошибок (универсальный)
const PORT = Number(process.env.PORT || cfg.PORT || 3000);

// ✅ Render / Docker требуют 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`✅ Server listening on http://0.0.0.0:${PORT}`);
});
