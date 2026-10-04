/**
 * Valide les paramètres de session contre `stripe-mock` (serveur officiel de Stripe
 * qui contrôle les requêtes selon la spécification OpenAPI de l'API).
 * Lancer : stripe-mock -http-port 12111  (test ignoré si indisponible).
 */
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { setupTempDatabase } from "../helpers/env";

setupTempDatabase("stripe-mock");
const MOCK = process.env.STRIPE_MOCK_URL ?? "http://localhost:12111";
const available = await fetch(MOCK, { signal: AbortSignal.timeout(1000) }).then(() => true, () => false);

const { createPendingOrder } = await import("@/server/orders/repository");
const { buildCheckoutSessionParams } = await import("@/server/checkout/create-checkout");

describe.skipIf(!available)("stripe-mock : paramètres acceptés par l'API Stripe", () => {
  const url = new URL(MOCK);
  const stripe = new Stripe("sk_test_123", { host: url.hostname, port: Number(url.port), protocol: "http" });

  it.each([false, true])("session Checkout (Stripe Tax : %s)", async (taxEnabled) => {
    const order = await createPendingOrder({
      locale: "fr", checkoutAttemptKey: randomUUID(), cartFingerprint: "fp", currency: "CAD",
      subtotalCents: 7198, savingsCents: 800, shippingCents: 0, totalCents: 7198, shippingOptionId: "standard",
      items: [{ productId: "main", variantId: "option-1", sku: "BR-OPT1", productName: "Produit", variantLabel: "Option 1", quantity: 2, unitPriceCents: 3599, lineTotalCents: 7198 }],
    });
    const params = buildCheckoutSessionParams(order, { siteUrl: "https://boutique.example", taxEnabled });
    const session = await stripe.checkout.sessions.create(params, { idempotencyKey: randomUUID() });
    expect(session.object).toBe("checkout.session");
  });
});
