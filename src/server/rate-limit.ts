import "server-only";
import { createHash } from "node:crypto";
import { getDb } from "./db/client";
import { env } from "./env";

/**
 * Limiteur à fenêtre fixe stocké en base : fonctionne aussi avec plusieurs instances
 * serverless (contrairement à un compteur en mémoire).
 */
export async function rateLimit(bucket: string, identifier: string, limit: number, windowSeconds: number): Promise<{ ok: boolean; retryAfter: number }> {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSeconds);
  const key = `${bucket}:${createHash("sha256").update(identifier).digest("hex").slice(0, 32)}`;
  const res = await db.execute({
    sql: `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
          ON CONFLICT(key) DO UPDATE SET
            count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1 ELSE 1 END,
            window_start = excluded.window_start
          RETURNING count`,
    args: [key, windowStart],
  });
  const count = Number(res.rows[0]?.count ?? 1);
  // Nettoyage opportuniste des anciennes fenêtres.
  if (Math.random() < 0.02) {
    await db.execute({ sql: "DELETE FROM rate_limits WHERE window_start < ?", args: [now - 86_400] });
  }
  return { ok: count <= limit, retryAfter: windowStart + windowSeconds - now };
}

/** IP du client selon l'en-tête fiable de l'hébergeur (configurable via CLIENT_IP_HEADER). */
export function clientIp(headers: Headers): string {
  const raw = headers.get(env.clientIpHeader()) ?? headers.get("x-real-ip") ?? "";
  return raw.split(",")[0]?.trim() || "unknown";
}
