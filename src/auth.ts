import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { cfg } from "./config.js";

/** Проверка заголовка x-hydroiot-token */
export function requireToken(req: Request, res: Response, next: NextFunction) {
  const t = req.header("x-hydroiot-token");
  if (!t || t !== cfg.HYDROIOT_TOKEN) return res.status(401).json({ error: "Unauthorized" });
  next();
}

/** Подпись строки для SSE */
export function signSSEQuery(uid: string, deviceId: string, expiresAtSec: number) {
  const data = `${uid}:${deviceId}:${expiresAtSec}`;
  return crypto.createHmac("sha256", cfg.SSE_HMAC_SECRET).update(data).digest("hex");
}

export function verifySSEQuery(req: Request, res: Response, next: NextFunction) {
  const uid = String(req.query.uid || "");
  const deviceId = String(req.query.deviceId || "");
  const exp = Number(req.query.exp || 0);
  const sig = String(req.query.sig || "");

  if (!uid || !deviceId || !exp || !sig) return res.status(400).json({ error: "Bad query" });
  if (Date.now()/1000 > exp) return res.status(401).json({ error: "Expired" });

  const expected = signSSEQuery(uid, deviceId, exp);
  if (sig !== expected) return res.status(401).json({ error: "Invalid signature" });

  next();
}
