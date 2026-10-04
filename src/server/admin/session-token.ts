/**
 * Jeton de session administrateur signé HMAC-SHA256 (sans état). Utilisable dans
 * proxy.ts et dans les composants serveur. Ne dépend que de node:crypto.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

function secret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET?.trim();
  return s && s.length >= 32 ? s : null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function isAdminConfigured(): boolean {
  const pw = process.env.ADMIN_PASSWORD?.trim();
  return !!pw && pw.length >= 12 && !!secret();
}

/** Compare deux chaînes en temps constant (via leurs empreintes, de longueur fixe). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function createAdminToken(now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("ADMIN_SESSION_SECRET manquant ou trop court (32 caractères minimum).");
  const payload = Buffer.from(JSON.stringify({ sub: "admin", exp: Math.floor(now / 1000) + ADMIN_SESSION_TTL_SECONDS })).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function verifyAdminToken(token: string | undefined | null, now = Date.now()): boolean {
  const key = secret();
  if (!key || !token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload, key))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number };
    return data.sub === "admin" && typeof data.exp === "number" && data.exp * 1000 > now;
  } catch {
    return false;
  }
}
