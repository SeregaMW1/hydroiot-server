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
}

// -------- Валидация полезной нагрузки --------
export const TelemetrySchema = z.object({
  uid: z.string().min(1).optional(),
  deviceId: z.string().min(1).optional(),
  ts: z.number().int().optional(),
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

// ✅ Вытаскиваем deviceId из топика devices/{deviceId}/telemetry
function parseDeviceIdFromTopic(topic: string): string | undefined {
  const parts = topic.split("/");
  return parts.length >= 3 && parts[0] === "devices" && parts[2] === "telemetry"
    ? parts[1]
    : undefined;
}

// -------- MQTT connect --------
const client = mqtt.connect(MQTT_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  reconnectPeriod: 5000,
  connectTimeout: 15000,
  keepalive: 30,
  protocolVersion: 4,
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
  const deviceIdInTopic = parseDeviceIdFromTopic(topic);

  try {
    const raw = payloadBuf.toString("utf8");
    const parsed = TelemetrySchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      logger.warn("[MQTT] ❌ Invalid telemetry JSON", parsed.error.format());
      return;
    }

    const data = parsed.data;
    const deviceId = deviceIdInTopic ?? data.deviceId;

    if (!deviceId) {
      logger.warn("[MQTT] ❌ No deviceId in topic or payload");
      return;
    }

    // ✅ UID: сначала берем из payload, если нет — ищем в Firestore
    let uid: string | undefined = data.uid;
    if (!uid) {
      const resolved = await resolveUidByDeviceId(deviceId);
      if (!resolved) {
        logger.warn(`[MQTT] ⚠ Device ${deviceId} has no owner (uid). Skipping.`);
        return;
      }
      uid = resolved;
    }

    // ✅ Сохраняем устройство (гарантируем его существование в Firestore)
    await upsertDeviceForUid(uid, deviceId, {
      fw: data.fw,
      lastRssi: data.rssi ?? null,
      lastSeen: receivedAt,
    });

    // ✅ Сохраняем телеметрию
    await saveTelemetry(uid, deviceId, {
      ...data,
      deviceId,
      receivedAt,
    });

    logger.info(`[MQTT] ✅ Saved telemetry: uid=${uid} device=${deviceId}`);

  } catch (err: any) {
    logger.error("[MQTT] handler exception", {
      error: err?.message,
      topic,
    });
  }
});
