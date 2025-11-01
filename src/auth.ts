import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { cfg } from "./config.js";
import { logger } from "./logger.js";

/**
 * Проверка заголовка x-hydroiot-token (для /webhook и защищённых API)
 */
export function requireToken(req: Request, res: Response, next: NextFunction) {
  const t = req.header("x-hydroiot-token");
  if (!t || t !== cfg.HYDROIOT_TOKEN) {
    logger.warn("Unauthorized request (missing or wrong x-hydroiot-token)");
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

/**
 * Подпись для SSE:
 * data = uid:deviceId:expiresAt
 */
export function signSSEQuery(uid: string, deviceId: string, expiresAtSec: number) {
  const data = `${uid}:${deviceId}:${expiresAtSec}`;
  return crypto.createHmac("sha256", cfg.SSE_HMAC_SECRET)
    .update(data)
    .digest("hex");
}

/**
 * Проверка подписи SSE-запроса.
 * Используется перед выдачей реального SSE-потока.
 */
export function verifySSEQuery(req: Request, res: Response, next: NextFunction) {
  const uid = String(req.query.uid || "");
  const deviceId = String(req.query.deviceId || "");
  const exp = Number(req.query.exp || 0);
  const sig = String(req.query.sig || "");

  if (!uid || !deviceId || !exp || !sig) {
    return res.status(400).json({ ok: false, error: "Missing uid/deviceId/exp/sig" });
  }
  if (Date.now() / 1000 > exp) {
    return res.status(401).json({ ok: false, error: "Link expired" });
  }

  const expected = signSSEQuery(uid, deviceId, exp);
  if (sig !== expected) {
    logger.warn(`Invalid SSE signature: got=${sig}, need=${expected}`);
    return res.status(401).json({ ok: false, error: "Invalid signature" });
  }
  next();
}

/**
 * Хелпер — генерация готовой SSE-ссылки для фронтенда:
 * /api/telemetry/stream?uid=...&deviceId=...&exp=...&sig=...
 */
export function buildSSEUrl(baseUrl: string, uid: string, deviceId: string, ttlSeconds = 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = signSSEQuery(uid, deviceId, exp);
  return `${baseUrl}/api/telemetry/stream?uid=${uid}&deviceId=${deviceId}&exp=${exp}&sig=${sig}`;
}
