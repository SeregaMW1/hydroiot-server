import { z } from "zod";

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

export const WebhookBody = z.object({
  uid: z.string().min(1),
  deviceId: z.string().min(1),
  msgId: z.string().optional(),
  ts: z.number().int().optional(),
  payload: TelemetryPayload
});

export const ListQuery = z.object({
  uid: z.string().min(1),
  deviceId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  cursor: z.string().optional()
});
