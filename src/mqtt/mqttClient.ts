import mqtt from "mqtt";
import { z } from "zod";
import { upsertDeviceForUid, resolveUidByDeviceId } from "../services/deviceService";
import { saveTelemetry } from "../services/telemetryService";
import { logger } from "../utils/logger";

// -------- ENV --------
const MQTT_URL = process.env.MQTT_URL!;
const MQTT_USERNAME = process.env.MQTT_USERNAME!;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD!;
const MQTT_TELEMETRY_TOPIC = process.env.MQTT_TELEMETRY_TOPIC || "devices/+/telemetry";

if (!MQTT_URL || !MQTT_USERNAME || !MQTT_PASSWORD) {
  logger.error("[MQTT] Missing env MQTT_URL / MQTT_USERNAME / MQTT_PASSWORD");
  // не падаем в проде — но шансов подключиться нет
}

// -------- Валидация полезной нагрузки --------
export const TelemetrySchema = z.object({
  uid: z.string().min(1).optional(),      // желательно, но не всегда будет
  deviceId: z.string().min(1).optional(), // если нет в topic — можно брать из payload
  ts: z.number().int().optional(),

  // сенсоры
  ph: z.number().optional(),
  ec: z.number().optional(),
  waterTempC: z.number().optional(),
  airTempC: z.number().optional(),
  humidity: z.number().optional(),
  levelMin: z.boolean().optional(),
  levelMax: z.boolean().optional(),
  rssi: z.number().optional(),
  fw: z.string().optional(),
}).passthrough();

function parseDeviceIdFromTopic(topic: string): string | null {
  // ожидаем devices/{deviceId}/telemetry
  const parts = topic.split("/");
  if (parts.length >= 3 && parts[0] === "devices" && parts[2] === "telemetry") {
    return parts[1];
  }
  return null;
}

// -------- MQTT connect --------
const client = mqtt.connect(MQTT_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  reconnectPeriod: 5000,     // 5s backoff (mqtt.js сам увеличивает паузу)
  connectTimeout: 15000,     // 15s
  keepalive: 30,             // сек
  protocolVersion: 4,        // MQTT v3.1.1 для совместимости
});

client.on("connect", () => {
  logger.info("[MQTT] ✅ Connected");
  client.subscribe(MQTT_TELEMETRY_TOPIC, (err) => {
    if (err) logger.error("[MQTT] subscribe error", err);
    else logger.info(`[MQTT] 📡 Subscribed: ${MQTT_TELEMETRY_TOPIC}`);
  });
});

client.on("reconnect", () => logger.warn("[MQTT] reconnecting..."));
client.on("close", () => logger.warn("[MQTT] connection closed"));
client.on("error", (err) => logger.error("[MQTT] error", err));

client.on("message", async (topic, payloadBuf) => {
  const receivedAt = new Date();
  let deviceIdFromTopic = parseDeviceIdFromTopic(topic);

  try {
    const payloadText = payloadBuf.toString("utf8");
    const parsed = TelemetrySchema.safeParse(JSON.parse(payloadText));
    if (!parsed.success) {
      logger.warn("[MQTT] telemetry validation failed", parsed.error.flatten());
      return;
    }
    const data = parsed.data;

    // deviceId: приоритет topic > payload
    const deviceId = deviceIdFromTopic || data.deviceId;
    if (!deviceId) {
      logger.warn("[MQTT] no deviceId (topic/payload)");
      return;
    }

    // uid: приоритет payload.uid; иначе resolve из Firestore индекса
    let uid = data.uid;
    if (!uid) {
      uid = await resolveUidByDeviceId(deviceId);
      if (!uid) {
        logger.warn(`[MQTT] uid not found for deviceId=${deviceId}. Telemetry skipped until device is claimed.`);
        return; // нет владельца — пока игнорируем или можно накапливать во временную коллекцию
      }
    }

    // Обновим (или создадим) устройство и статус
    await upsertDeviceForUid(uid, deviceId, {
      fw: data.fw,
      lastSeen: receivedAt,
      lastRssi: data.rssi ?? null,
    });

    // Сохраним телеметрию
    await saveTelemetry(uid, deviceId, {
      ...data,
      deviceId,
      receivedAt: receivedAt,
    });

    logger.info(`[MQTT] ✅ stored telemetry uid=${uid} device=${deviceId}`);
  } catch (err: any) {
    logger.error("[MQTT] handler error", { err: err?.message, topic });
  }
});
