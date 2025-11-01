import { z } from "zod";

/** Полезная нагрузка от устройства или MQTT  */
export const TelemetryPayload = z.object({
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

/** Вариант 1: Прямой POST от ESP32/MQTT-процессора */
export const WebhookBody = z.object({
  uid: z.string().min(1),
  deviceId: z.string().min(1),
  msgId: z.string().optional(),
  ts: z.number().int().optional(), // timestamp от устройства
  payload: TelemetryPayload
});

/** Вариант 2: CloudAMQP HTTP webhook (payload может быть строкой JSON или тип WebhookBody) */
export const RabbitWebhookBody = z.object({
  payload: z.string().or(z.any()),
  routing_key: z.string().optional(),
  exchange: z.string().optional(),
  properties: z.object({
    message_id: z.string().optional(),
    content_type: z.string().optional(),
  }).partial().optional()
});

/** Запрос для получения последних документов /api/telemetry/latest */
export const ListQuery = z.object({
  uid: z.string().min(1),
  deviceId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  cursor: z.string().optional()  // Для пагинации
});

/** Запрос для SSE-потока /api/telemetry/stream */
export const StreamQuery = z.object({
  uid: z.string().min(1),
  deviceId: z.string().min(1),
  exp: z.coerce.number(),  // Время истечения ссылки (UNIX seconds)
  sig: z.string().min(1),  // Подпись
});

/** Типы TypeScript для удобства */
export type TelemetryPayloadType = z.infer<typeof TelemetryPayload>;
export type WebhookBodyType = z.infer<typeof WebhookBody>;
export type RabbitWebhookBodyType = z.infer<typeof RabbitWebhookBody>;
export type ListQueryType = z.infer<typeof ListQuery>;
export type StreamQueryType = z.infer<typeof StreamQuery>;

/** Полезная структура — как данные будут храниться в Firestore */
export interface FirestoreTelemetryData extends TelemetryPayloadType {
  uid: string;
  deviceId: string;
  tsClient?: number;
  tsServer?: FirebaseFirestore.FieldValue;
  msgId?: string | null;
  routingKey?: string | null;
  exchange?: string | null;
}
