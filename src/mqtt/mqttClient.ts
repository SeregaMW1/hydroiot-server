import mqtt from "mqtt";
import { z } from "zod";
import { upsertDeviceForUid, resolveUidByDeviceId } from "../services/deviceService.js";
import { saveTelemetry } from "../services/telemetryService.js";
import { logger } from "../utils/logger.js";

// ----------- ENV -----------
const {
  MQTT_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_TELEMETRY_TOPIC = "devices/+/telemetry",
  MQTT_CLAIM_TOPIC = "devices/+/claim",
} = process.env;

if (!MQTT_URL || !MQTT_USERNAME || !MQTT_PASSWORD) {
  logger.error("[MQTT] ❌ Missing MQTT credentials in .env");
}

// ----------- SCHEMAS -----------
const TelemetrySchema = z.object({
  uid: z.string().optional(),
  deviceId: z.string().optional(),
  ts: z.number().optional(),
  ph: z.number().nullable().optional(),
  ec: z.number().nullable().optional(),
  waterTempC: z.number().nullable().optional(),
  airTempC: z.number().nullable().optional(),
  humidity: z.number().nullable().optional(),
  levelMin: z.boolean().optional(),
  levelMax: z.boolean().optional(),
  rssi: z.number().nullable().optional(),
  fw: z.string().optional(),
}).passthrough();

const ClaimSchema = z.object({
  uid: z.string().min(1),
  deviceId: z.string().min(1),
  ts: z.number().optional(),
  fw: z.string().optional(),
}).passthrough();

// ----------- HELPERS -----------
function extractDeviceId(topic: string): string | undefined {
  const parts = topic.split("/");
  return parts.length >= 2 && parts[0] === "devices" ? parts[1] : undefined;
}

function isClaimTopic(topic: string): boolean {
  return /^devices\/[^/]+\/claim$/.test(topic);
}

function isTelemetryTopic(topic: string): boolean {
  return /^devices\/[^/]+\/telemetry$/.test(topic);
}

// ----------- MQTT CONNECT -----------
const client = mqtt.connect(MQTT_URL!, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  reconnectPeriod: 5000, // Auto reconnect
  connectTimeout: 15000,
  protocolVersion: 4,
});

client.on("connect", () => {
  logger.info("[MQTT] ✅ Connected");
  client.subscribe([MQTT_CLAIM_TOPIC, MQTT_TELEMETRY_TOPIC], (err) => {
    if (err) logger.error("[MQTT] ❌ Subscribe Error", err);
    else logger.info(`[MQTT] 📡 Subscribed to: ${MQTT_CLAIM_TOPIC}, ${MQTT_TELEMETRY_TOPIC}`);
  });
});

client.on("error", (err) => logger.error("[MQTT] ❌ Error", err));
client.on("reconnect", () => logger.warn("[MQTT] 🔄 Reconnecting..."));
client.on("close", () => logger.warn("[MQTT] 🔌 Connection closed"));

// ----------- MESSAGE HANDLER -----------
client.on("message", async (topic, payloadBuf) => {
  const deviceId = extractDeviceId(topic);
  if (!deviceId) return;

  const receivedAt = new Date();
  let payload: any;

  try {
    payload = JSON.parse(payloadBuf.toString("utf8"));
  } catch {
    logger.warn(`[MQTT] ❌ Invalid JSON from device ${deviceId}`);
    return;
  }

  try {
    // ✅ 1. Claim (привязка устройства к UID)
    if (isClaimTopic(topic)) {
      const parsed = ClaimSchema.safeParse(payload);
      if (!parsed.success) {
        logger.warn("[MQTT] ❌ Invalid claim payload", parsed.error.format());
        return;
      }

      const { uid, fw } = parsed.data;

      await upsertDeviceForUid(uid, deviceId, {
        fw,
        lastSeen: receivedAt,
        lastRssi: null,
      });

      logger.info(`[MQTT] ✅ Device claimed → uid=${uid}, device=${deviceId}`);
      return;
    }

    // ✅ 2. Telemetry
    if (isTelemetryTopic(topic)) {
      const parsed = TelemetrySchema.safeParse(payload);
      if (!parsed.success) {
        logger.warn("[MQTT] ❌ Invalid telemetry", parsed.error.format());
        return;
      }

      const data = parsed.data;
      let uid = data.uid ?? await resolveUidByDeviceId(deviceId);

      if (!uid) {
        logger.warn(`[MQTT] ⚠ Device ${deviceId} has no owner. Telemetry skipped.`);
        return;
      }

      await upsertDeviceForUid(uid, deviceId, {
        fw: data.fw,
        lastSeen: receivedAt,
        lastRssi: data.rssi ?? null,
      });

      await saveTelemetry(uid, deviceId, {
        ...data,
        deviceId,
        receivedAt,
      });

      logger.info(`[MQTT] ✅ Telemetry saved → uid=${uid}, device=${deviceId}`);
    }
  } catch (err: any) {
    logger.error("[MQTT] ❌ Handler error", { topic, error: err?.message });
  }
});
