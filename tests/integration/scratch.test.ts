import { randomInt, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupTempDatabase } from "../helpers/env";
import { startMockStripe } from "../helpers/mock-stripe";

setupTempDatabase("scratch");
const WEBHOOK_SECRET = "whsec_test_scratch";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
process.env.STRIPE_SECRET_KEY = "rk_test_mock";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
delete process.env.RESEND_API_KEY;

const scratch = await import("@/app/api/scratch/route");
const checkout = await import("@/app/api/checkout/route");
const webhook = await import("@/app/api/stripe/webhook/route");
const { getDb } = await import("@/server/db/client");
const { getTicket, MAX_TICKETS_PER_IP_PER_DAY } = await import("@/server/promo/tickets");
const { getOrderByAttemptKey, getOrderById: getOrder } = await import("@/server/orders/repository");
const { product } = await import("@/config/product");

let mock: Awaited<ReturnType<typeof startMockStripe>>;
let ip = 0;
const A = product.variants[0].id;
const B = product.variants[13].id;

beforeAll(async () => {
  mock = await startMockStripe();
  process.env.STRIPE_API_BASE_FOR_TESTS = mock.url;
});
afterAll(async () => {
  await mock.close();
});

function scratchRequest(opts: { ip: string; cookie?: string; origin?: string }) {
  return new NextRequest("http://localhost:3000/api/scratch", {
    method: "POST",
    headers: { origin: opts.origin ?? "http://localhost:3000", "x-forwarded-for": opts.ip, ...(opts.cookie ? { cookie: `scratch_ticket=${opts.cookie}` } : {}) },
    body: "{}",
  });
}

function checkoutRequest(body: unknown) {
  return new Request("http://localhost:3000/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000", "x-forwarded-for": `10.9.0.${++ip}` },
    body: JSON.stringify(body),
  });
}

/** Ticket au lot choisi (le tirage réel est aléatoire). */
async function seedTicket(prizeId: string, opts: { expired?: boolean } = {}) {
  const code = `WOOF-${Array.from({ length: 8 }, () => "23456789ABCDEFGHJKMNPQRSTUVWXYZ"[randomInt(31)]).join("")}`;
  const db = await getDb();
  const now = new Date();
  const exp = new Date(now.getTime() + (opts.expired ? -1 : 1) * 86400_000);
  await db.execute({ sql: "INSERT INTO scratch_tickets (code, prize_id, created_at, expires_at, ip_hash) VALUES (?, ?, ?, ?, 'seed')", args: [code, prizeId, now.toISOString(), exp.toISOString()] });
  return code;
}

describe("POST /api/scratch", () => {
  it("délivre un ticket tiré côté serveur et le pose en cookie httpOnly", async () => {
    const res = await scratch.POST(scratchRequest({ ip: "10.8.0.1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.code).toMatch(/^WOOF-[2-9A-HJKMNP-Z]{8}$/);
    expect(data.prize.id).toBeTruthy();
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`scratch_ticket=${data.code}`);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(await getTicket(data.code)).toMatchObject({ code: data.code, prize: { id: data.prize.id } });

    // Même navigateur → même ticket (impossible de « regratter » pour changer de lot).
    const again = await scratch.POST(scratchRequest({ ip: "10.8.0.1", cookie: data.code }));
    expect((await again.json()).code).toBe(data.code);
  });

  it("limite le nombre de tickets par IP et par jour", async () => {
    const codes = [];
    for (let i = 0; i < MAX_TICKETS_PER_IP_PER_DAY; i++) {
      const res = await scratch.POST(scratchRequest({ ip: "10.8.0.2" }));
      expect(res.status).toBe(200);
      codes.push((await res.json()).code);
    }
    expect(new Set(codes).size).toBe(MAX_TICKETS_PER_IP_PER_DAY);
    const blocked = await scratch.POST(scratchRequest({ ip: "10.8.0.2" }));
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error).toBe("limit_reached");
  });

  it("refuse une origine étrangère", async () => {
    const res = await scratch.POST(scratchRequest({ ip: "10.8.0.3", origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });
});

describe("checkout avec code de grattage", () => {
  it("pourcentage : coupon Stripe à montant fixe, usage unique, calculé par le serveur", async () => {
    const code = await seedTicket("p10");
    const attemptKey = randomUUID();
    mock.requests.length = 0;
    const res = await checkout.POST(checkoutRequest({ items: [{ variantId: A, quantity: 2 }], locale: "fr", attemptKey, promoCode: code }));
    expect(res.status).toBe(200);
    const order = await getOrderByAttemptKey(attemptKey);
    expect(order?.promoCode).toBe(code);
    expect(order?.promoDiscountCents).toBe(Math.round(9348 * 0.1));
    expect(order?.totalCents).toBe(9348 - order!.promoDiscountCents);

    const coupon = mock.requests.find((r) => r.path === "/v1/coupons")!;
    expect(coupon.body.get("amount_off")).toBe(String(order?.promoDiscountCents));
    expect(coupon.body.get("currency")).toBe("cad");
    expect(coupon.body.get("duration")).toBe("once");
    expect(coupon.body.get("max_redemptions")).toBe("1");
    expect(coupon.idempotencyKey).toBe(`coupon-${order?.id}`);
    const session = mock.requests.find((r) => r.path === "/v1/checkout/sessions")!;
    expect(session.body.get("discounts[0][coupon]")).toMatch(/^coupon_/);
    expect(session.body.get("discounts[0][coupon]")).toBe((await getOrder(order!.id))?.stripeCouponId);
    // Les prix unitaires envoyés restent ceux du palier : le rabais passe uniquement par le coupon.
    expect(session.body.get("line_items[0][price_data][unit_amount]")).toBe("4674");
  });

  it("1 acheté = 1 offert : refusé avec 1 unité, une unité offerte avec 2", async () => {
    const code = await seedTicket("bogo");
    const one = await checkout.POST(checkoutRequest({ items: [{ variantId: A, quantity: 1 }], locale: "fr", attemptKey: randomUUID(), promoCode: code }));
    expect(one.status).toBe(400);
    expect((await one.json()).error).toBe("promo_needs_second_item");

    const attemptKey = randomUUID();
    const two = await checkout.POST(checkoutRequest({ items: [{ variantId: A, quantity: 1 }, { variantId: B, quantity: 1 }], locale: "fr", attemptKey, promoCode: code }));
    expect(two.status).toBe(200);
    expect((await getOrderByAttemptKey(attemptKey))?.promoDiscountCents).toBe(4674);
  });

  it.each([["WOOF-ZZZZZZZZ"], ["n'importe quoi"]])("code inconnu %s → promo_invalid", async (promoCode) => {
    const res = await checkout.POST(checkoutRequest({ items: [{ variantId: A, quantity: 1 }], locale: "fr", attemptKey: randomUUID(), promoCode }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("promo_invalid");
  });

  it("code expiré → promo_invalid", async () => {
    const code = await seedTicket("p5", { expired: true });
    const res = await checkout.POST(checkoutRequest({ items: [{ variantId: A, quantity: 1 }], locale: "fr", attemptKey: randomUUID(), promoCode: code }));
    expect((await res.json()).error).toBe("promo_invalid");
  });
});

describe("webhook : le code n'est consommé qu'au paiement confirmé", () => {
  const stripe = new Stripe("sk_test_dummy");
  async function pay(orderId: string, discount: number) {
    const order = (await getOrder(orderId))!;
    const evt = {
      id: `evt_${randomUUID().slice(0, 12)}`,
      object: "event",
      type: "checkout.session.completed",
      api_version: "2026-09-30.endive",
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 1,
      request: null,
      data: {
        object: {
          id: order.stripeCheckoutSessionId,
          object: "checkout.session",
          livemode: false,
          payment_status: "paid",
          status: "complete",
          currency: "cad",
          amount_subtotal: order.subtotalCents,
          amount_total: order.subtotalCents - discount,
          total_details: { amount_discount: discount, amount_shipping: 0, amount_tax: 0 },
          metadata: { order_id: order.id },
          customer_details: { email: "client@example.com", name: "Test", phone: null, address: null },
        },
      },
    };
    const payload = JSON.stringify(evt);
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    const res = await webhook.POST(new Request("http://localhost:3000/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": header }, body: payload }));
    expect(res.status).toBe(200);
    return getOrder(orderId);
  }

  it("marque le ticket utilisé, puis refuse sa réutilisation", async () => {
    const code = await seedTicket("p15");
    const k1 = randomUUID();
    const k2 = randomUUID();
    // Deux paniers ouverts avec le même code : autorisé tant qu'aucun n'est payé.
    expect((await checkout.POST(checkoutRequest({ items: [{ variantId: A, quantity: 1 }], locale: "fr", attemptKey: k1, promoCode: code }))).status).toBe(200);
    expect((await checkout.POST(checkoutRequest({ items: [{ variantId: B, quantity: 1 }], locale: "fr", attemptKey: k2, promoCode: code }))).status).toBe(200);
    const o1 = (await getOrderByAttemptKey(k1))!;
    const o2 = (await getOrderByAttemptKey(k2))!;

    const paid = await pay(o1.id, o1.promoDiscountCents);
    expect(paid?.paymentStatus).toBe("paid");
    expect(paid?.needsReview).toBe(false);
    expect((await getTicket(code))?.redeemedOrderId).toBe(o1.id);

    // Nouveau checkout avec le code consommé → refusé.
    const reuse = await checkout.POST(checkoutRequest({ items: [{ variantId: A, quantity: 1 }], locale: "fr", attemptKey: randomUUID(), promoCode: code }));
    expect((await reuse.json()).error).toBe("promo_invalid");

    // Le second panier, payé malgré tout (coupon déjà créé), est signalé pour vérification.
    const second = await pay(o2.id, o2.promoDiscountCents);
    expect(second?.paymentStatus).toBe("paid");
    expect(second?.needsReview).toBe(true);
    expect((await getTicket(code))?.redeemedOrderId).toBe(o1.id);
  });

  it("signale un rabais Stripe différent de celui calculé par le serveur", async () => {
    const code = await seedTicket("p5");
    const k = randomUUID();
    await checkout.POST(checkoutRequest({ items: [{ variantId: A, quantity: 1 }], locale: "fr", attemptKey: k, promoCode: code }));
    const o = (await getOrderByAttemptKey(k))!;
    const paid = await pay(o.id, o.promoDiscountCents + 500);
    expect(paid?.needsReview).toBe(true);
  });
});
