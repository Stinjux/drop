import { NextResponse, type NextRequest } from "next/server";
import { scratchGame } from "@/config/promo";
import { env } from "@/server/env";
import { getTicket, issueTicket } from "@/server/promo/tickets";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "scratch_ticket";

function payload(t: { code: string; prize: unknown; expiresAt: string; redeemedOrderId: string | null }) {
  return { code: t.code, prize: t.prize, expiresAt: t.expiresAt, redeemed: !!t.redeemedOrderId };
}

/**
 * Délivre UN ticket par navigateur (cookie) : un même visiteur retrouve toujours le même
 * résultat, sans possibilité de retirer. Le lot est tiré ici, côté serveur.
 */
export async function POST(request: NextRequest) {
  if (!scratchGame.enabled) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const origin = request.headers.get("origin");
  if (origin) {
    const o = new URL(origin).host;
    if (o !== new URL(request.url).host && o !== new URL(env.siteUrl()).host) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }
  const ip = clientIp(request.headers);
  const limit = await rateLimit("scratch", ip, 20, 3600);
  if (!limit.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const existing = request.cookies.get(COOKIE)?.value;
  if (existing) {
    const t = await getTicket(existing);
    if (t) return NextResponse.json(payload(t), { headers: { "Cache-Control": "no-store" } });
  }

  const ticket = await issueTicket(ip);
  if (!ticket) return NextResponse.json({ error: "limit_reached" }, { status: 429 });
  const res = NextResponse.json(payload(ticket), { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(COOKIE, ticket.code, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction(),
    path: "/",
    maxAge: scratchGame.validityDays * 24 * 3600,
  });
  return res;
}
