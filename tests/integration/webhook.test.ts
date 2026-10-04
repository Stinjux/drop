import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupTempDatabase } from "../helpers/env";

setupTempDatabase("webhook");
const WEBHOOK_SECRET = "whsec_test_secret_for_unit_tests";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.STRIPE_SECRET_KEY = "rk_test_mock";
delete process.env.RESEND_API_KEY;

const { POST } = await import("@/app/api/stripe/webhook/route");
const repo = await import("@/server/orders/repository");
const { getDb } = await import("@/server/db/client");
const { product } = await import("@/config/product");

const stripe = new Stripe("sk_test_dummy");
let seq = 0;

async function makeOrder(sessionId = `cs_test_${randomUUID().replace(/-/g, "")}`) {
  const unit = product.pricing.tiers[0].unitPriceCents;
  const order = await repo.createPendingOrder({
    locale: "fr",
    checkoutAttemptKey: randomUUID(),
    cartFingerprint: "fp",
    currency: "CAD",
    subtotalCents: unit,
    savingsCents: 0,
    shippingCents: 799,
    totalCents: unit + 799,
    shippingOptionId: "standard",
    items: [{ productId: "main", variantId: "option-1", sku: "BR-OPT1", productName: "P", variantLabel: "Option 1", quantity: 1, unitPriceCents: unit, lineTotalCents: unit }],
  });
  await repo.attachCheckoutSession(order.id, { id: sessionId, url: "https://checkout.stripe.com/x", expiresAt: Math.floor(Date.now() / 1000) + 3600, livemode: false });
  return { order, sessionId, unit };
}

function sessionObject(o: { id: string; orderId: string; paymentStatus: "paid" | "unpaid"; subtotal: number }) {
  return {
    id: o.id,
    object: "checkout.session",
    livemode: false,
    payment_status: o.paymentStatus,
    status: "complete",
    currency: "cad",
    amount_subtotal: o.subtotal,
    amount_total: o.subtotal + 799,
    total_details: { amount_discount: 0, amount_shipping: 799, amount_tax: 0 },
    metadata: { order_id: o.orderId },
    payment_intent: "pi_test_123",
    customer: null,
    customer_details: { email: "client@example.com", name: "Marie Tremblay", phone: "+15145550123", address: null },
    collected_information: {
      shipping_details: { name: "Marie Tremblay", address: { line1: "123 rue Principale", line2: null, city: "Montréal", state: "QC", postal_code: "H2X 1Y4", country: "CA" } },
    },
  };
}

function event(type: string, object: unknown, id = `evt_test_${++seq}_${randomUUID().slice(0, 8)}`) {
  return { id, object: "event", type, api_version: "2026-09-30.endive", created: Math.floor(Date.now() / 1000), data: { object }, livemode: false, pending_webhooks: 1, request: null };
}

function signed(payload: string, secret = WEBHOOK_SECRET) {
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost:3000/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": header, "content-type": "application/json" }, body: payload });
}

async function deliver(evt: unknown) {
  const res = await POST(signed(JSON.stringify(evt)));
  return { status: res.status, body: res.status === 200 ? await res.json() : await res.text() };
}

async function emailEvents(orderId: string) {
  return (await repo.listOrderEvents(orderId)).filter((e) => e.kind === "email");
}

beforeAll(async () => {
  await getDb();
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
});

describe("vérification de signature", () => {
  it("rejette une requête sans signature", async () => {
    const res = await POST(new Request("http://x/api/stripe/webhook", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
  });
  it("rejette une signature faite avec un autre secret", async () => {
    const payload = JSON.stringify(event("checkout.session.completed", {}));
    expect((await POST(signed(payload, "whsec_wrong"))).status).toBe(400);
  });
  it("rejette un corps modifié après signature (vérification sur le corps brut)", async () => {
    const { order, sessionId, unit } = await makeOrder();
    const payload = JSON.stringify(event("checkout.session.completed", sessionObject({ id: sessionId, orderId: order.id, paymentStatus: "paid", subtotal: unit })));
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    const tampered = payload.replace('"paid"', '"paid" ');
    const res = await POST(new Request("http://x/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": header }, body: tampered }));
    expect(res.status).toBe(400);
    expect((await repo.getOrderById(order.id))?.paymentStatus).toBe("pending");
  });
});

describe("checkout.session.completed", () => {
  it("paiement confirmé → payée, coordonnées enregistrées, courriel non envoyé si service absent", async () => {
    const { order, sessionId, unit } = await makeOrder();
    const r = await deliver(event("checkout.session.completed", sessionObject({ id: sessionId, orderId: order.id, paymentStatus: "paid", subtotal: unit })));
    expect(r).toMatchObject({ status: 200, body: { outcome: "processed" } });
    const o = (await repo.getOrderById(order.id))!;
    expect(o.paymentStatus).toBe("paid");
    expect(o.paidAt).not.toBeNull();
    expect(o.customerEmail).toBe("client@example.com");
    expect(o.shipCity).toBe("Montréal");
    expect(o.shipPostalCode).toBe("H2X 1Y4");
    expect(o.amountPaidCents).toBe(unit + 799);
    expect(o.stripePaymentIntentId).toBe("pi_test_123");
    expect(o.confirmationEmailStatus).toBe("not_configured");
    expect((await emailEvents(order.id))[0].message).toMatch(/NON envoyé/);
  });

  it("événement répété (même id) → aucun doublon de commande, de statut ni de courriel", async () => {
    const { order, sessionId, unit } = await makeOrder();
    const evt = event("checkout.session.completed", sessionObject({ id: sessionId, orderId: order.id, paymentStatus: "paid", subtotal: unit }));
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "email_1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Boutique <commandes@example.com>";

    const results = await Promise.all([deliver(evt), deliver(evt), deliver(evt)]);
    const outcomes = results.map((r) => (r.body as { outcome: string }).outcome).sort();
    expect(outcomes).toEqual(["duplicate", "duplicate", "processed"]);
    expect((await deliver(evt)).body).toMatchObject({ outcome: "duplicate" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const o = (await repo.getOrderById(order.id))!;
    expect(o.confirmationEmailStatus).toBe("sent");
    const db = await getDb();
    const orders = await db.execute({ sql: "SELECT COUNT(*) AS n FROM orders WHERE stripe_checkout_session_id = ?", args: [sessionId] });
    expect(Number(orders.rows[0].n)).toBe(1);
    const stripeEvents = (await repo.listOrderEvents(order.id)).filter((e) => e.kind === "stripe");
    expect(stripeEvents).toHaveLength(1);
  });

  it("deux événements différents pour la même session → un seul courriel", async () => {
    const { order, sessionId, unit } = await makeOrder();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "email_2" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Boutique <commandes@example.com>";
    const obj = sessionObject({ id: sessionId, orderId: order.id, paymentStatus: "paid", subtotal: unit });
    await deliver(event("checkout.session.completed", obj));
    await deliver(event("checkout.session.async_payment_succeeded", obj));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sous-total différent du calcul serveur → commande marquée à vérifier", async () => {
    const { order, sessionId, unit } = await makeOrder();
    await deliver(event("checkout.session.completed", sessionObject({ id: sessionId, orderId: order.id, paymentStatus: "paid", subtotal: unit - 1000 })));
    const o = (await repo.getOrderById(order.id))!;
    expect(o.needsReview).toBe(true);
  });

  it("session inconnue → 200 « orphan » sans erreur", async () => {
    const r = await deliver(event("checkout.session.completed", sessionObject({ id: "cs_test_unknown_session", orderId: randomUUID(), paymentStatus: "paid", subtotal: 1 })));
    expect(r.body).toMatchObject({ outcome: "orphan" });
  });

  it("type d'événement non traité → ignoré", async () => {
    const r = await deliver(event("customer.created", { id: "cus_1" }));
    expect(r.body).toMatchObject({ outcome: "ignored" });
  });
});

describe("paiements différés", () => {
  it("completed (unpaid) → en cours, puis async_payment_succeeded → payée", async () => {
    const { order, sessionId, unit } = await makeOrder();
    await deliver(event("checkout.session.completed", sessionObject({ id: sessionId, orderId: order.id, paymentStatus: "unpaid", subtotal: unit })));
    let o = (await repo.getOrderById(order.id))!;
    expect(o.paymentStatus).toBe("processing");
    expect(o.paidAt).toBeNull();
    expect(o.confirmationEmailStatus).toBeNull(); // pas de courriel tant que non payé

    await deliver(event("checkout.session.async_payment_succeeded", sessionObject({ id: sessionId, orderId: order.id, paymentStatus: "paid", subtotal: unit })));
    o = (await repo.getOrderById(order.id))!;
    expect(o.paymentStatus).toBe("paid");
    expect(o.confirmationEmailStatus).toBe("not_configured");
  });

  it("completed (unpaid) puis async_payment_failed → échouée, jamais payée", async () => {
    const { order, sessionId, unit } = await makeOrder();
    await deliver(event("checkout.session.completed", sessionObject({ id: sessionId, orderId: order.id, paymentStatus: "unpaid", subtotal: unit })));
    await deliver(event("checkout.session.async_payment_failed", sessionObject({ id: sessionId, orderId: order.id, paymentStatus: "unpaid", subtotal: unit })));
    const o = (await repo.getOrderById(order.id))!;
    expect(o.paymentStatus).toBe("failed");
    expect(o.paymentFailedAt).not.toBeNull();
    expect(o.paidAt).toBeNull();
  });

  it("événements dans le désordre : une commande payée ne régresse jamais", async () => {
    const { order, sessionId, unit } = await makeOrder();
    await deliver(event("checkout.session.async_payment_succeeded", sessionObject({ id: sessionId, orderId: order.id, paymentStatus: "paid", subtotal: unit })));
    await deliver(event("checkout.session.completed", sessionObject({ id: sessionId, orderId: order.id, paymentStatus: "unpaid", subtotal: unit })));
    await deliver(event("checkout.session.async_payment_failed", sessionObject({ id: sessionId, orderId: order.id, paymentStatus: "unpaid", subtotal: unit })));
    expect((await repo.getOrderById(order.id))?.paymentStatus).toBe("paid");
  });

  it("session expirée (panier abandonné) → expirée", async () => {
    const { order, sessionId, unit } = await makeOrder();
    await deliver(event("checkout.session.expired", { ...sessionObject({ id: sessionId, orderId: order.id, paymentStatus: "unpaid", subtotal: unit }), status: "expired" }));
    expect((await repo.getOrderById(order.id))?.paymentStatus).toBe("expired");
  });
});

describe("courriel d'expédition", () => {
  it("n'est envoyé qu'une fois, puis relançable explicitement", async () => {
    const { order, sessionId, unit } = await makeOrder();
    await deliver(event("checkout.session.completed", sessionObject({ id: sessionId, orderId: order.id, paymentStatus: "paid", subtotal: unit })));
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "email_3" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Boutique <commandes@example.com>";
    const { sendOrderEmail } = await import("@/server/email/notifications");
    await repo.updateTracking(order.id, { carrier: "Postes Canada", trackingNumber: "LX123456789CA", trackingUrl: null });
    expect(await sendOrderEmail(order.id, "shipping")).toBe("sent");
    expect(await sendOrderEmail(order.id, "shipping")).toBe("skipped");
    expect(await sendOrderEmail(order.id, "shipping", { retry: true })).toBe("skipped"); // déjà « sent »
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const o = (await repo.getOrderById(order.id))!;
    expect(o.fulfillmentStatus).toBe("shipped");
    expect(o.shippingEmailStatus).toBe("sent");
  });
});
