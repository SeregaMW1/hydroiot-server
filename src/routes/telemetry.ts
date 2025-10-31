import { Router } from "express";
import { db } from "../firebase.js";
import { requireToken, verifySSEQuery } from "../auth.js";
import { ListQuery } from "../utils/validation.js";

export const telemetry = Router();

telemetry.get("/latest", requireToken, async (req, res) => {
  const q = ListQuery.parse(req.query);
  const snap = await db.collection("users").doc(q.uid)
    .collection("devices").doc(q.deviceId)
    .collection("telemetry")
    .orderBy("ts", "desc").limit(q.limit).get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json({ items });
});

telemetry.get("/list", requireToken, async (req, res) => {
  const q = ListQuery.parse(req.query);
  let query = db.collection("users").doc(q.uid)
    .collection("devices").doc(q.deviceId)
    .collection("telemetry")
    .orderBy("ts", "desc").limit(q.limit);

  if (q.cursor) {
    const cur = await db.doc(q.cursor).get();
    if (cur.exists) query = query.startAfter(cur);
  }

  const snap = await query.get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const nextCursor = snap.size ? snap.docs[snap.size - 1].ref.path : null;
  res.json({ items, nextCursor });
});

telemetry.get("/stream", verifySSEQuery, async (req, res) => {
  const uid = String(req.query.uid);
  const deviceId = String(req.query.deviceId);
  const limit = Math.min(Number(req.query.limit || 50), 200);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const q = db.collection("users").doc(uid)
    .collection("devices").doc(deviceId)
    .collection("telemetry")
    .orderBy("ts", "desc").limit(limit);

  const unsub = q.onSnapshot(
    (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.write(`event: data\n`);
      res.write(`data: ${JSON.stringify(items)}\n\n`);
    },
    (err) => {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: err.message })}\n\n`);
    }
  );

  const hb = setInterval(() => res.write(`event: ping\ndata: {}\n\n`), 25000);
  req.on("close", () => { clearInterval(hb); unsub(); });
});
