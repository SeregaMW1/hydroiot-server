import { Router } from "express";
export const health = Router();

health.get("/health", (_req, res) => res.json({ ok: true }));
health.get("/ready", (_req, res) => res.json({ ready: true }));
