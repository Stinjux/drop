import "server-only";
import { createHash, randomInt } from "node:crypto";
import { scratchGame, type Prize } from "@/config/promo";
import { findPrize, prizeFromRoll, TOTAL_PRIZE_WEIGHT } from "@/lib/promo";
import { getDb, withBusyRetry } from "../db/client";

export type Ticket = { code: string; prize: Prize; createdAt: string; expiresAt: string; redeemedOrderId: string | null };

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_RE = /^WOOF-[2-9A-HJKMNP-Z]{8}$/;

export function isTicketCode(code: unknown): code is string {
  return typeof code === "string" && CODE_RE.test(code);
}

function newCode(): string {
  let c = "";
  for (let i = 0; i < 8; i++) c += ALPHABET[randomInt(ALPHABET.length)];
  return `WOOF-${c}`;
}

const hashIp = (ip: string) => createHash("sha256").update(`scratch:${ip}`).digest("hex").slice(0, 32);

function mapTicket(r: Record<string, unknown>): Ticket | null {
  const prize = findPrize(String(r.prize_id));
  if (!prize) return null;
  return {
    code: String(r.code),
    prize,
    createdAt: String(r.created_at),
    expiresAt: String(r.expires_at),
    redeemedOrderId: r.redeemed_order_id ? String(r.redeemed_order_id) : null,
  };
}

export async function getTicket(code: string): Promise<Ticket | null> {
  if (!isTicketCode(code)) return null;
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT * FROM scratch_tickets WHERE code = ?", args: [code] });
  return res.rows[0] ? mapTicket(res.rows[0] as Record<string, unknown>) : null;
}

/** Ticket utilisable : existe, non expiré, pas déjà utilisé par une commande payée. */
export async function getUsableTicket(code: string): Promise<Ticket | null> {
  const t = await getTicket(code);
  if (!t || t.redeemedOrderId || new Date(t.expiresAt).getTime() <= Date.now()) return null;
  return t;
}

/** Nombre de tickets créés depuis cette IP sur 24 h (limite anti-abus). */
async function ticketsFromIpToday(ipHash: string): Promise<number> {
  const db = await getDb();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const res = await db.execute({ sql: "SELECT COUNT(*) AS n FROM scratch_tickets WHERE ip_hash = ? AND created_at >= ?", args: [ipHash, since] });
  return Number(res.rows[0]?.n ?? 0);
}

/** Assez large pour les IP partagées (réseaux mobiles, bureaux), assez bas pour freiner le « farming ». */
export const MAX_TICKETS_PER_IP_PER_DAY = 10;

/**
 * Tire un lot (aléatoire cryptographique) et enregistre le ticket.
 * Renvoie `null` si la limite par IP est atteinte.
 */
export async function issueTicket(ip: string): Promise<Ticket | null> {
  const ipHash = hashIp(ip);
  if ((await ticketsFromIpToday(ipHash)) >= MAX_TICKETS_PER_IP_PER_DAY) return null;
  const prize = prizeFromRoll(randomInt(TOTAL_PRIZE_WEIGHT));
  const now = new Date();
  const expires = new Date(now.getTime() + scratchGame.validityDays * 24 * 3600 * 1000);
  const db = await getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      await withBusyRetry(() =>
        db.execute({
          sql: "INSERT INTO scratch_tickets (code, prize_id, created_at, expires_at, ip_hash) VALUES (?, ?, ?, ?, ?)",
          args: [code, prize.id, now.toISOString(), expires.toISOString(), ipHash],
        }),
      );
      return { code, prize, createdAt: now.toISOString(), expiresAt: expires.toISOString(), redeemedOrderId: null };
    } catch (err) {
      if (!String((err as Error).message).includes("UNIQUE")) throw err;
    }
  }
  throw new Error("Impossible de générer un code unique.");
}
