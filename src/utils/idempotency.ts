import crypto from "crypto";

export function shaId(value: unknown) {
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 40);
}
