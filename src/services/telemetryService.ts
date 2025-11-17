// src/services/telemetryService.ts
import { db } from "../firebase.js";
import { logger } from "../utils/logger.js";
import type { TelemetryInput, TelemetryData } from "../types/TelemetryData.js";

/**
 * Нормализация входящей телеметрии:
 *  - гарантируем ts
 *  - приводим nullable поля к понятному виду
 */
function normalizeTelemetry(
  uid: string,
  deviceId: string,
  input: TelemetryInput
): TelemetryData {
  const {
    receivedAt,
    ts,
    ph,
    ec,
    waterTempC,
    airTempC,
    humidity,
    levelMin,
    levelMax,
    rssi,
    fw,
  } = input;

  const measurementTs = ts ?? receivedAt.getTime();

  return {
    uid,
    deviceId,
    receivedAt,
    ts: measurementTs,

    ph: ph ?? null,
    ec: ec ?? null,
    waterTempC: waterTempC ?? null,
    airTempC: airTempC ?? null,
    humidity: humidity ?? null,
    rssi: rssi ?? null,
    fw: fw ?? null,

    // bool’ы лучше хранить как boolean | null, чтобы не путать с “false = нет датчика”
    levelMin: typeof levelMin === "boolean" ? levelMin : null,
    levelMax: typeof levelMax === "boolean" ? levelMax : null,
  };
}

/**
 * Центральная точка записи телеметрии в Firestore.
 */
export async function saveTelemetry(
  uid: string,
  deviceId: string,
  input: TelemetryInput
): Promise<void> {
  try {
    const data = normalizeTelemetry(uid, deviceId, input);

    const colRef = db
      .collection("users")
      .doc(uid)
      .collection("devices")
      .doc(deviceId)
      .collection("telemetry");

    await colRef.add(data);

    logger.debug("[TelemetryService] ✅ saved", {
      uid,
      deviceId,
      ts: data.ts,
    });
  } catch (err: any) {
    logger.error("[TelemetryService] ❌ saveTelemetry error", {
      uid,
      deviceId,
      error: err?.message ?? String(err),
    });
    throw err;
  }
}
