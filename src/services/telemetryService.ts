import { admin, db } from "../firebase/index.js"; // ESM важен .js
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
  receivedAt: Date;   // ← единственная дата
}

/**
 * Сохраняет телеметрию:
 *  users/{uid}/devices/{deviceId}/telemetry/{autoId}
 * + обновляет lastTelemetry
 */
export async function saveTelemetry(
  uid: string,
  deviceId: string,
  data: TelemetryData
) {
  try {
    const deviceRef = db
      .collection("users")
      .doc(uid)
      .collection("devices")
      .doc(deviceId);

    // =============================================================
    //   ROUND TIME TO 15-MINUTE PERIOD (00, 15, 30, 45 minutes)
    // =============================================================

    const rawDate =
      data.receivedAt instanceof Date
        ? data.receivedAt
        : new Date(data.receivedAt);

    const minutes = rawDate.getMinutes();
    const roundedMinutes = Math.floor(minutes / 15) * 15;

    const periodDate = new Date(rawDate);
    periodDate.setMinutes(roundedMinutes);
    periodDate.setSeconds(0);
    periodDate.setMilliseconds(0);

    const periodTimestamp = admin.firestore.Timestamp.fromDate(periodDate);

    // =============================================================
    // 1. Сохранение полной телеметрии (ИСТОРИЯ)
    // =============================================================

  const tsStr = String(data.ts); // tsMilliseconds → string

await deviceRef
  .collection("telemetry")
  .doc(tsStr) // уникальный ID документа
  .set(
    {
      ...data,
      receivedAt: admin.firestore.Timestamp.fromDate(data.receivedAt),
      serverTs: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

    // =============================================================
    // 2. Обновление lastTelemetry
    // =============================================================

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

          receivedAt: periodTimestamp, // ← только одна дата
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
