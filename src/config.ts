import "dotenv/config";
import { z } from "zod";

const Schema = z.object({
  PORT: z.coerce.number().default(3000),
  HYDROIOT_TOKEN: z.string().min(1),
  SSE_HMAC_SECRET: z.string().min(1),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  REDIS_URL: z.string().optional()
});

export const cfg = Schema.parse(process.env);
