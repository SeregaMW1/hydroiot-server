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

    // =============================================================
    //   ROUND TIME TO 15-MINUTE PERIODS (00, 15, 30, 45 minutes)
    // =============================================================

    // Берём время, которое прислал ESP32
    const rawDate =
      data.receivedAt instanceof Date
        ? data.receivedAt
        : new Date(data.receivedAt);

    const minutes = rawDate.getMinutes();

    // Округляем вниз до квартала
    const roundedMinutes = Math.floor(minutes / 15) * 15;

    // Создаём "ровное" время
    const periodDate = new Date(rawDate);
    periodDate.setMinutes(roundedMinutes);
    periodDate.setSeconds(0);
    periodDate.setMilliseconds(0);

    // Конвертация в Firestore Timestamp
    const periodTimestamp = admin.firestore.Timestamp.fromDate(periodDate);

    // 🔥 (опционально) Можно добавить фактическое время прихода
    const rawServerTs = admin.firestore.Timestamp.now();

    // =============================================================
    // 1. Сохраняем полный кадр телеметрии в историю
    // =============================================================

    await deviceRef.collection("telemetry").add({
      ...data,
      receivedAt: periodTimestamp,     // ← ровное время периода
      serverTs: periodTimestamp,       // ← тоже ровное время
      rawServerTs,                     // ← фактическое время прихода
    });

    // =============================================================
    // 2. Обновление lastTelemetry в документе устройства
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
          receivedAt: periodTimestamp,           // ← совпадает с историей
          serverTs: periodTimestamp,             // ← совпадает с историей
          rawServerTs,                           // ← необязательно
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
