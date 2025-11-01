import { admin, db } from "../firebase/index.js"; // ✅ важно: .js в ESM
import { logger } from "../utils/logger.js";

export interface TelemetryData {
  deviceId: string;
  ts?: number;
  ph?: number | null;
  ec?: number | null;
  waterTempC?: number | null;
  airTempC?: number | null;
  humidity?: number | null;
  levelMin?: boolean;
  levelMax?: boolean;
  rssi?: number | null;
  fw?: string;
  receivedAt: Date;
}


/**
 * Сохраняет полную телеметрию:
 *  users/{uid}/devices/{deviceId}/telemetry/{autoId}
 *  + обновляет lastTelemetry в users/{uid}/devices/{deviceId}
 */
export async function saveTelemetry(
  uid: string,
  deviceId: string,
  data: TelemetryData
) {
  try {
    const deviceRef = db.collection("users").doc(uid).collection("devices").doc(deviceId);

    // ✅ 1. Сохраняем полный кадр телеметрии
    await deviceRef.collection("telemetry").add({
      ...data,
      receivedAt: admin.firestore.Timestamp.fromDate(data.receivedAt),
      serverTs: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ✅ 2. Обновление lastTelemetry в документе устройства
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
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
  } catch (err: any) {
    logger.error("[telemetryService] saveTelemetry error", {
      error: err?.message,
      deviceId,
      uid,
    });
  }
}
