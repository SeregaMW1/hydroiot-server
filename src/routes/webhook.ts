import { Router } from "express";
import { db, FieldValue } from "../firebase.js";
import { requireToken } from "../auth.js";
import { WebhookBody } from "../utils/validation.js";
import { shaId } from "../utils/idempotency.js";
import { logger } from "../logger.js";

export const webhook = Router();

webhook.post("/telemetry", requireToken, async (req, res) => {
  try {
    const parsed = WebhookBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { uid, deviceId, payload, ts, msgId } = parsed.data;
    const docId = shaId({ uid, deviceId, ts: ts ?? Date.now(), msgId, payload });

    const ref = db.collection("users").doc(uid)
      .collection("devices").doc(deviceId)
      .collection("telemetry").doc(docId);

    // 📌 1. Сохраняем телеметрию
    await ref.set({
      ...payload,
      ts: ts ? new Date(ts) : FieldValue.serverTimestamp(),
      serverTs: FieldValue.serverTimestamp(),
      msgId: msgId ?? null
    }, { merge: true });

    // ✅ 2. Обновляем статус устройства
    await db.collection("users").doc(uid)
      .collection("devices").doc(deviceId)
      .set(
        {
          isOnline: true,
          lastSeen: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    logger.info({ uid, deviceId, docId }, "telemetry stored + status updated");
    res.status(201).json({ ok: true, id: docId });
  } catch (e: any) {
    logger.error(e, "webhook error");
    res.status(500).json({ error: e.message });
  }
});
