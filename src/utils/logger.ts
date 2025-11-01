type Level = "debug" | "info" | "warn" | "error";
const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const current = process.env.LOG_LEVEL as Level || "info";

function log(level: Level, ...args: any[]) {
  if (LEVELS[level] >= LEVELS[current]) {
    // eslint-disable-next-line no-console
    console[level === "warn" ? "warn" : level](new Date().toISOString(), level.toUpperCase(), ...args);
  }
}

export const logger = {
  debug: (...a: any[]) => log("debug", ...a),
  info: (...a: any[]) => log("info", ...a),
  warn: (...a: any[]) => log("warn", ...a),
  error: (...a: any[]) => log("error", ...a),
};
