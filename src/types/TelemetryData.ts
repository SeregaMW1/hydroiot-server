// src/types/TelemetryData.ts

export interface TelemetryBase {
  ph?: number | null;
  ec?: number | null;
  waterTempC?: number | null;
  airTempC?: number | null;
  humidity?: number | null;
  levelMin?: boolean;
  levelMax?: boolean;
  rssi?: number | null;
  fw?: string | null;
  ts?: number; // на входе может быть undefined
}

/**
 * То, что приходит в saveTelemetry из mqttClient:
 *  - uid и deviceId передаются отдельно
 *  - receivedAt = время приёма на сервере
 */
export interface TelemetryInput extends TelemetryBase {
  deviceId: string;
  receivedAt: Date;
  uid?: string;
}

/**
 * Нормализованные данные, которые кладём в Firestore.
 * Здесь ts уже ГАРАНТИРОВАННО есть.
 */
export interface TelemetryData extends TelemetryBase {
  deviceId: string;
  uid: string;
  receivedAt: Date;
  ts: number; // строго number
}
