import { admin, db } from "../firebase";

type Telemetry = {
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
  receivedAt: Date; // серверное время получения
};

export async function saveTelemetry(uid: string, deviceId: string, t: Telemetry) {
  const base = db.collection("users").doc(uid).collection("devices").doc(deviceId);

  // Добавляем документ в подколлекцию telemetry
  await base.collection("telemetry").add({
    ...t,
    receivedAt: admin.firestore.Timestamp.fromDate(t.receivedAt),
    serverTs: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Поддерживаем быстрые поля сводки на устройстве (lastTelemetry)
  await base.set({
    lastTelemetry: {
      ts: t.ts ?? null,
      ph: t.ph ?? null,
      ec: t.ec ?? null,
      waterTempC: t.waterTempC ?? null,
      airTempC: t.airTempC ?? null,
      humidity: t.humidity ?? null,
      levelMin: t.levelMin ?? null,
      levelMax: t.levelMax ?? null,
      rssi: t.rssi ?? null,
      fw: t.fw ?? null,
      serverTs: admin.firestore.FieldValue.serverTimestamp(),
    }
  }, { merge: true });
}
