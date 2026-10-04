import { NextResponse } from "next/server";
import { CheckoutError, checkoutRequestSchema, createCheckout } from "@/server/checkout/create-checkout";
import { env } from "@/server/env";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { LivePaymentsBlockedError, StripeNotConfiguredError } from "@/server/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_096;

function json(status: number, body: Record<string, unknown>, headers?: Record<string, string>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // clients non navigateurs : couverts par la limite de débit
  try {
    const o = new URL(origin);
    const self = new URL(request.url);
    const site = new URL(env.siteUrl());
    return o.host === self.host || o.host === site.host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json(403, { error: "forbidden_origin" });
  if (!request.headers.get("content-type")?.includes("application/json")) return json(415, { error: "unsupported_media_type" });

  const ip = clientIp(request.headers);
  const limit = await rateLimit("checkout", ip, 12, 600);
  if (!limit.ok) return json(429, { error: "rate_limited" }, { "Retry-After": String(limit.retryAfter) });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: "payload_too_large" });
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const parsed = checkoutRequestSchema.safeParse(data);
  if (!parsed.success) return json(400, { error: "invalid_request" });

  try {
    const { url, orderNumber } = await createCheckout(parsed.data);
    return json(200, { url, orderNumber });
  } catch (err) {
    if (err instanceof CheckoutError) return json(err.status, { error: err.code });
    if (err instanceof StripeNotConfiguredError || err instanceof LivePaymentsBlockedError) {
      console.error("[checkout]", err.message);
      return json(503, { error: "payments_unavailable" });
    }
    console.error("[checkout] erreur inattendue", err);
    return json(502, { error: "checkout_failed" });
  }
}
