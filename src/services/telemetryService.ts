import { admin, db } from "../firebase/index.js";
import { logger } from "../utils/logger.js";

/**
 * Формат принимаемой телеметрии от ESP32
 */
export interface TelemetryData {
  deviceId: string;
  ts: number;                       // ровный слот от устройства в ms
  ph?: number | null;
  ec?: number | null;
  waterTempC?: number | null;
  rssi?: number | null;
  fw?: string;
  receivedAt: Date;                 // время получения устройством
}

/**
 * Округляет дату к слоту (00/15/30/45)
 */
function roundTo15minSlot(date: Date): admin.firestore.Timestamp {
  const d = new Date(date);
  const slot = Math.floor(d.getMinutes() / 15) * 15;

  d.setMinutes(slot);
  d.setSeconds(0);
  d.setMilliseconds(0);

  return admin.firestore.Timestamp.fromDate(d);
}

/**
 * Основная функция сохранения телеметрии
 */
export async function saveTelemetry(
  uid: string,
  deviceId: string,
  data: TelemetryData
) {
  try {
    // ---------------------------
    // 0) ВАЛИДАЦИЯ ВХОДНОЙ ТЕЛЕМЕТРИИ
    // ---------------------------

    if (!data.ts || typeof data.ts !== "number") {
      throw new Error("Invalid ts: must be number");
    }

    if (!data.deviceId) {
      throw new Error("Missing deviceId");
    }

    if (!(data.receivedAt instanceof Date)) {
      data.receivedAt = new Date(data.receivedAt);
    }

    // ---------------------------
    // 1) КОРРЕКТНОЕ ОКРУГЛЕНИЕ
    // ---------------------------

    const slotTimestamp = roundTo15minSlot(data.receivedAt);

    // Firestore docId = ts (НОРМАЛЬНОЕ ЧИСЛО)
    const tsStr = String(data.ts);

    const deviceRef = db
      .collection("users")
      .doc(uid)
      .collection("devices")
      .doc(deviceId);

    const telemetryRef = deviceRef.collection("telemetry").doc(tsStr);

    // ---------------------------
    // 2) ПОДГОТОВКА ОБЪЕКТА ДЛЯ ЗАПИСИ (ЧИСТАЯ ВЕРСИЯ)
    // ---------------------------

    const record = {
      deviceId: data.deviceId,
      ts: data.ts,
      ph: data.ph ?? null,
      ec: data.ec ?? null,
      waterTempC: data.waterTempC ?? null,
      rssi: data.rssi ?? null,
      fw: data.fw ?? null,

      // ⚠ единственная дата — ровно слот
      slotAt: slotTimestamp,
    };

    // ---------------------------
    // 3) ЗАПИСЬ В ИСТОРИЮ (ИДЕМПОТЕНТНО)
    // ---------------------------

    await telemetryRef.set(record, { merge: true });

    // ---------------------------
    // 4) АТОМАРНОЕ ОБНОВЛЕНИЕ lastTelemetry
    // ---------------------------

    await deviceRef.set(
      {
        lastTelemetry: {
          ...record,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

    logger.info(
      `[telemetryService] saved ts=${tsStr} uid=${uid} dev=${deviceId}`
    );
  } catch (err: any) {
    logger.error("[telemetryService] saveTelemetry error", {
      error: err?.message,
      deviceId,
      uid,
    });
  }
}
