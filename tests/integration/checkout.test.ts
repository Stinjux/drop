import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setupTempDatabase } from "../helpers/env";
import { startMockStripe } from "../helpers/mock-stripe";

setupTempDatabase("checkout");
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
process.env.STRIPE_SECRET_KEY = "rk_test_mock";

const { POST } = await import("@/app/api/checkout/route");
const { getDb } = await import("@/server/db/client");
const { getOrderByAttemptKey } = await import("@/server/orders/repository");
const { buildCheckoutSessionParams } = await import("@/server/checkout/create-checkout");
const { product } = await import("@/config/product");

let mock: Awaited<ReturnType<typeof startMockStripe>>;
let ipCounter = 0;

function request(body: unknown, opts: { origin?: string; ip?: string; raw?: string; contentType?: string } = {}) {
  return new Request("http://localhost:3000/api/checkout", {
    method: "POST",
    headers: {
      "content-type": opts.contentType ?? "application/json",
      origin: opts.origin ?? "http://localhost:3000",
      "x-forwarded-for": opts.ip ?? `10.0.0.${++ipCounter}`,
    },
    body: opts.raw ?? JSON.stringify(body),
  });
}

const A = product.variants[0].id;
const B = product.variants[1].id;
const [, t2, t3] = product.pricing.tiers;

beforeAll(async () => {
  mock = await startMockStripe();
  process.env.STRIPE_API_BASE_FOR_TESTS = mock.url;
});
afterAll(async () => {
  await mock.close();
});
beforeEach(() => {
  mock.requests.length = 0;
  process.env.STRIPE_SECRET_KEY = "rk_test_mock";
  delete process.env.STORE_ALLOW_LIVE_PAYMENTS;
});

describe("POST /api/checkout", () => {
  it("crée une commande en attente et une session Stripe avec les prix du SERVEUR", async () => {
    const attemptKey = randomUUID();
    const res = await POST(request({ items: [{ variantId: A, quantity: 2 }], locale: "fr", attemptKey }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);

    const order = await getOrderByAttemptKey(attemptKey);
    expect(order?.paymentStatus).toBe("pending");
    expect(order?.subtotalCents).toBe(t2.unitPriceCents * 2);
    expect(order?.items[0]).toMatchObject({ variantId: A, quantity: 2, unitPriceCents: t2.unitPriceCents });
    // Cadeau calculé côté serveur à partir du seuil configuré.
    expect(order?.giftLabel).toBe(t2.unitPriceCents * 2 >= product.gift.thresholdCents ? product.gift.label.fr : null);
    // Livraison gratuite.
    expect(order?.shippingCents).toBe(0);

    const sent = mock.requests.find((r) => r.path === "/v1/checkout/sessions")!;
    expect(sent.body.get("mode")).toBe("payment");
    expect(sent.body.get("line_items[0][price_data][unit_amount]")).toBe(String(t2.unitPriceCents));
    expect(sent.body.get("line_items[0][price_data][currency]")).toBe("cad");
    expect(sent.body.get("line_items[0][quantity]")).toBe("2");
    expect([...sent.body.keys()].some((k) => k.startsWith("payment_method_types"))).toBe(false);
    expect(sent.body.get("shipping_address_collection[allowed_countries][0]")).toBe("CA");
    expect(sent.body.get("metadata[order_id]")).toBe(order?.id);
    expect(sent.body.get("locale")).toBe("fr-CA");
    expect(sent.body.get("success_url")).toBe("http://localhost:3000/fr/checkout/success?session_id={CHECKOUT_SESSION_ID}");
    expect(sent.body.get("automatic_tax[enabled]")).toBeNull();
    expect(sent.idempotencyKey).toBe(`checkout-${order?.id}`);
  });

  it("applique le palier sur un panier mixte (2 variantes, 3 unités)", async () => {
    const attemptKey = randomUUID();
    const res = await POST(request({ items: [{ variantId: A, quantity: 1 }, { variantId: B, quantity: 2 }], locale: "en", attemptKey }));
    expect(res.status).toBe(200);
    const order = await getOrderByAttemptKey(attemptKey);
    expect(order?.subtotalCents).toBe(t3.unitPriceCents * 3);
    expect(order?.items.map((i) => i.unitPriceCents)).toEqual([t3.unitPriceCents, t3.unitPriceCents]);
    const sent = mock.requests.find((r) => r.path === "/v1/checkout/sessions")!;
    expect(sent.body.get("locale")).toBe("en");
  });

  it.each([
    ["prix injecté dans une ligne", { items: [{ variantId: A, quantity: 1, unitPriceCents: 1 }], locale: "fr", attemptKey: randomUUID() }],
    ["montant total injecté", { items: [{ variantId: A, quantity: 1 }], locale: "fr", attemptKey: randomUUID(), amount: 100 }],
    ["quantité nulle", { items: [{ variantId: A, quantity: 0 }], locale: "fr", attemptKey: randomUUID() }],
    ["quantité négative", { items: [{ variantId: A, quantity: -3 }], locale: "fr", attemptKey: randomUUID() }],
    ["quantité décimale", { items: [{ variantId: A, quantity: 1.5 }], locale: "fr", attemptKey: randomUUID() }],
    ["quantité en texte", { items: [{ variantId: A, quantity: "2" }], locale: "fr", attemptKey: randomUUID() }],
    ["quantité excessive", { items: [{ variantId: A, quantity: 999 }], locale: "fr", attemptKey: randomUUID() }],
    ["total > maximum", { items: [{ variantId: A, quantity: 6 }, { variantId: B, quantity: 6 }], locale: "fr", attemptKey: randomUUID() }],
    ["variante inconnue", { items: [{ variantId: "hack", quantity: 1 }], locale: "fr", attemptKey: randomUUID() }],
    ["langue invalide", { items: [{ variantId: A, quantity: 1 }], locale: "de", attemptKey: randomUUID() }],
    ["clé de tentative invalide", { items: [{ variantId: A, quantity: 1 }], locale: "fr", attemptKey: "1" }],
  ])("refuse : %s (400, aucun appel Stripe)", async (_label, body) => {
    const res = await POST(request(body));
    expect(res.status).toBe(400);
    expect(mock.requests).toHaveLength(0);
  });

  it("refuse le JSON invalide, les corps trop gros et le mauvais type de contenu", async () => {
    expect((await POST(request(null, { raw: "{oops" }))).status).toBe(400);
    expect((await POST(request(null, { raw: JSON.stringify({ x: "y".repeat(5000) }) }))).status).toBe(413);
    expect((await POST(request({}, { contentType: "text/plain" }))).status).toBe(415);
  });

  it("refuse une origine tierce (CSRF)", async () => {
    const res = await POST(request({ items: [{ variantId: A, quantity: 1 }], locale: "fr", attemptKey: randomUUID() }, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });

  it("double clic : même clé de tentative → une seule commande, même URL, un seul appel Stripe", async () => {
    const attemptKey = randomUUID();
    const body = { items: [{ variantId: A, quantity: 1 }], locale: "fr", attemptKey };
    const [r1, r2] = await Promise.all([POST(request(body)), POST(request(body))]);
    const [d1, d2] = [await r1.json(), await r2.json()];
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(d1.url).toBe(d2.url);
    const db = await getDb();
    const n = await db.execute({ sql: "SELECT COUNT(*) AS n FROM orders WHERE checkout_attempt_key = ?", args: [attemptKey] });
    expect(Number(n.rows[0].n)).toBe(1);
    const r3 = await POST(request(body));
    expect((await r3.json()).url).toBe(d1.url);
    // Les éventuels appels concurrents partagent la même clé d'idempotence Stripe.
    expect(new Set(mock.requests.map((r) => r.idempotencyKey)).size).toBe(1);
  });

  it("même clé de tentative avec un panier différent → 409", async () => {
    const attemptKey = randomUUID();
    expect((await POST(request({ items: [{ variantId: A, quantity: 1 }], locale: "fr", attemptKey }))).status).toBe(200);
    expect((await POST(request({ items: [{ variantId: A, quantity: 3 }], locale: "fr", attemptKey }))).status).toBe(409);
  });

  it("limite de débit par IP → 429", async () => {
    const ip = "203.0.113.9";
    const statuses: number[] = [];
    for (let i = 0; i < 14; i++) {
      const res = await POST(request({ items: [{ variantId: A, quantity: 1 }], locale: "fr", attemptKey: randomUUID() }, { ip }));
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 12).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(12)).toEqual([429, 429]);
  });

  it("bloque une clé live tant que STORE_ALLOW_LIVE_PAYMENTS n'est pas activé", async () => {
    process.env.STRIPE_SECRET_KEY = "rk_live_should_not_be_used";
    const res = await POST(request({ items: [{ variantId: A, quantity: 1 }], locale: "fr", attemptKey: randomUUID() }));
    expect(res.status).toBe(503);
    expect(mock.requests).toHaveLength(0);
  });

  it("Stripe non configuré → 503 sans fuite d'information", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await POST(request({ items: [{ variantId: A, quantity: 1 }], locale: "fr", attemptKey: randomUUID() }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "payments_unavailable" });
  });
});

describe("paramètres Stripe", () => {
  it("active Stripe Tax et tax_behavior uniquement si demandé", async () => {
    const attemptKey = randomUUID();
    await POST(request({ items: [{ variantId: A, quantity: 1 }], locale: "fr", attemptKey }));
    const order = (await getOrderByAttemptKey(attemptKey))!;
    const off = buildCheckoutSessionParams(order, { siteUrl: "https://shop.example", taxEnabled: false });
    expect(off.automatic_tax).toBeUndefined();
    const on = buildCheckoutSessionParams(order, { siteUrl: "https://shop.example", taxEnabled: true });
    expect(on.automatic_tax).toEqual({ enabled: true });
    expect(on.line_items?.[0].price_data?.tax_behavior).toBe("exclusive");
    // Visuels provisoires jamais envoyés à Stripe.
    expect(on.line_items?.[0].price_data?.product_data?.images).toBeUndefined();
    expect(order.shippingCents).toBe(on.shipping_options?.[0].shipping_rate_data?.fixed_amount?.amount);
  });
});
