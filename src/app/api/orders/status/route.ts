import { NextResponse } from "next/server";
import { getOrderBySessionId } from "@/server/orders/repository";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Statut d'une commande pour la page de confirmation. Le statut provient UNIQUEMENT
 * de la base, mise à jour par le webhook Stripe — jamais de l'URL de retour.
 */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const limit = await rateLimit("order-status", clientIp(request.headers), 120, 600);
  if (!limit.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const order = await getOrderBySessionId(sessionId);
  if (!order) return NextResponse.json({ status: "unknown" }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(
    { status: order.paymentStatus, orderNumber: order.orderNumber },
    { headers: { "Cache-Control": "no-store" } },
  );
}
