import { admin, db } from "../firebase";
import { logger } from "../utils/logger";

export interface TelemetryData {
  deviceId: string;
  ts?: number;
  ph?: number;
  ec?: number;
  waterTempC?: number;
  airTempC?: number;
  humidity?: number;
  levelMin?: boolean;
  levelMax?: boolean;
  rssi?: number;
  fw?: string;
  receivedAt: Date;
}

/**
 * Сохраняет телеметрию:
 * users/{uid}/devices/{deviceId}/telemetry/{autoId}
 * + обновляет lastTelemetry в документе устройства
 */
export async function saveTelemetry(uid: string, deviceId: string, data: TelemetryData) {
  try {
    const deviceRef = db.collection("users").doc(uid).collection("devices").doc(deviceId);

    await deviceRef.collection("telemetry").add({
      ...data,
      receivedAt: admin.firestore.Timestamp.fromDate(data.receivedAt),
      serverTs: admin.firestore.FieldValue.serverTimestamp(),
    });

    await deviceRef.set(
      {
        lastTelemetry: {
          ts: data.ts ?? null,
          ph: data.ph ?? null,
          ec: data.ec ?? null,
          waterTempC: data.waterTempC ?? null,
          airTempC: data.airTempC ?? null,
          humidity: data.humidity ?? null,
          levelMin: data.levelMin ?? null,
          levelMax: data.levelMax ?? null,
          rssi: data.rssi ?? null,
          fw: data.fw ?? null,
          serverTs: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
  } catch (err: any) {
    logger.error("[telemetryService] saveTelemetry error", { error: err?.message, deviceId, uid });
  }
}
