import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  // Убираем transport (pino-pretty), чтобы не ломалось
  transport: process.env.NODE_ENV === "production" ? undefined : undefined
});

export const httpLogger = () => (req: any, res: any, next: any) => {
  logger.info({ method: req.method, url: req.url });
  next();
};
