import "server-only";
import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { z } from "zod";
import { getMedia, getVariant, product } from "@/config/product";
import { store } from "@/config/store";
import type { Locale } from "@/config/types";
import { catalog, defaultShipping, deliveryEstimate } from "@/lib/catalog";
import { normalizeCartLines, priceCart, type CartError } from "@/lib/pricing";
import { env } from "../env";
import { attachCheckoutSession, createPendingOrder, getOrderByAttemptKey, addOrderEvent } from "../orders/repository";
import type { OrderWithItems } from "../orders/types";
import { getStripe } from "../stripe/client";

/**
 * Le navigateur n'envoie QUE : variantes, quantités, langue et une clé de tentative.
 * Tout champ supplémentaire (prix, montant, remise…) est rejeté.
 */
export const checkoutRequestSchema = z.strictObject({
  items: z
    .array(z.strictObject({ variantId: z.string().min(1).max(64), quantity: z.number() }))
    .min(1)
    .max(20),
  locale: z.enum(["fr", "en"]),
  attemptKey: z.uuid(),
});
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export class CheckoutError extends Error {
  constructor(
    public code: CartError["code"] | "attempt_mismatch" | "already_completed" | "stripe_error",
    public status: number,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "CheckoutError";
  }
}

export function cartFingerprint(lines: Array<{ variantId: string; quantity: number }>, locale: Locale, totalCents: number): string {
  const canonical = [...lines].sort((a, b) => a.variantId.localeCompare(b.variantId));
  return createHash("sha256").update(JSON.stringify({ canonical, locale, totalCents })).digest("hex");
}

/** Paramètres de la session Stripe — fonction pure, testée unitairement. */
export function buildCheckoutSessionParams(order: OrderWithItems, opts: { siteUrl: string; taxEnabled: boolean }): Stripe.Checkout.SessionCreateParams {
  const locale = order.locale;
  const estimate = deliveryEstimate(defaultShipping);
  const taxBehavior = opts.taxEnabled ? ("exclusive" as const) : undefined;
  const canShowImages = opts.siteUrl.startsWith("https://");
  // Expiration stable (dérivée de la création de la commande) pour que la clé d'idempotence reste valide.
  const createdAt = Math.floor(new Date(order.createdAt).getTime() / 1000);
  const lifetime = Math.min(Math.max(store.checkout.sessionLifetimeMinutes, 30), 24 * 60) * 60;

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    // Pas de payment_method_types : Stripe affiche les moyens de paiement admissibles
    // activés dans le Dashboard.
    line_items: order.items.map((item) => {
      const variant = getVariant(item.variantId);
      const image = getMedia(variant?.mediaId);
      return {
        quantity: item.quantity,
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: item.unitPriceCents,
          ...(taxBehavior ? { tax_behavior: taxBehavior } : {}),
          product_data: {
            name: `${item.productName} — ${item.variantLabel}`,
            metadata: { product_id: item.productId, variant_id: item.variantId, sku: item.sku },
            ...(canShowImages && !image.provisional ? { images: [`${opts.siteUrl}${image.src}`] } : {}),
          },
        },
      };
    }),
    shipping_address_collection: { allowed_countries: [...store.shippingCountries] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: defaultShipping.label[locale],
          fixed_amount: { amount: order.shippingCents, currency: order.currency.toLowerCase() },
          delivery_estimate: {
            minimum: { unit: "business_day", value: estimate.min },
            maximum: { unit: "business_day", value: estimate.max },
          },
          ...(taxBehavior ? { tax_behavior: taxBehavior } : {}),
        },
      },
    ],
    phone_number_collection: { enabled: store.checkout.collectPhone },
    billing_address_collection: "auto",
    client_reference_id: order.orderNumber,
    metadata: { order_id: order.id, order_number: order.orderNumber },
    payment_intent_data: {
      metadata: { order_id: order.id, order_number: order.orderNumber },
      description: `${store.brand.name} ${order.orderNumber}`,
    },
    locale: locale === "fr" ? "fr-CA" : "en",
    success_url: `${opts.siteUrl}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.siteUrl}/${locale}/checkout/cancel`,
    expires_at: createdAt + lifetime,
    custom_text: {
      submit: {
        message:
          locale === "fr"
            ? `En payant, vous acceptez nos conditions de vente : ${opts.siteUrl}/fr/conditions-de-vente`
            : `By paying, you agree to our terms of sale: ${opts.siteUrl}/en/terms`,
      },
    },
  };
  if (opts.taxEnabled) params.automatic_tax = { enabled: true };
  return params;
}

export async function createCheckout(req: CheckoutRequest): Promise<{ url: string; orderNumber: string }> {
  const normalized = normalizeCartLines(req.items, catalog);
  if (!normalized.ok) throw new CheckoutError(normalized.error.code, 400);

  const pricing = priceCart(normalized.lines, catalog);
  const fingerprint = cartFingerprint(normalized.lines, req.locale, pricing.totalBeforeTaxCents);

  let order = await getOrderByAttemptKey(req.attemptKey);
  if (order) {
    if (order.cartFingerprint !== fingerprint) throw new CheckoutError("attempt_mismatch", 409);
    if (order.paymentStatus !== "pending") throw new CheckoutError("already_completed", 409);
    const notExpired = order.stripeSessionExpiresAt && new Date(order.stripeSessionExpiresAt).getTime() > Date.now() + 60_000;
    if (order.stripeCheckoutUrl && notExpired) return { url: order.stripeCheckoutUrl, orderNumber: order.orderNumber };
  } else {
    try {
      order = await createPendingOrder({
        locale: req.locale,
        checkoutAttemptKey: req.attemptKey,
        cartFingerprint: fingerprint,
        currency: store.currency,
        subtotalCents: pricing.subtotalCents,
        savingsCents: pricing.savingsCents,
        shippingCents: pricing.shippingCents,
        totalCents: pricing.totalBeforeTaxCents,
        shippingOptionId: defaultShipping.id,
        items: pricing.lines.map((l) => ({
          productId: product.id,
          variantId: l.variantId,
          sku: l.sku,
          productName: product.name[req.locale],
          variantLabel: getVariant(l.variantId)?.label[req.locale] ?? l.variantId,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
          lineTotalCents: l.lineTotalCents,
        })),
      });
    } catch (err) {
      // Double clic simultané : l'autre requête a créé la commande avec la même clé.
      if (String((err as Error)?.message).includes("checkout_attempt_key")) {
        order = await getOrderByAttemptKey(req.attemptKey);
        if (!order) throw err;
      } else {
        throw err;
      }
    }
  }

  const params = buildCheckoutSessionParams(order, { siteUrl: env.siteUrl(), taxEnabled: env.stripeTaxEnabled() });
  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.create(params, { idempotencyKey: `checkout-${order.id}` });
  } catch (err) {
    await addOrderEvent(order.id, "stripe_error", `Création de session refusée par Stripe : ${(err as Error).message}`).catch(() => {});
    throw err;
  }
  if (!session.url) throw new CheckoutError("stripe_error", 502, "Stripe n'a pas renvoyé d'URL de paiement.");
  await attachCheckoutSession(order.id, { id: session.id, url: session.url, expiresAt: session.expires_at, livemode: session.livemode });
  return { url: session.url, orderNumber: order.orderNumber };
}
