import "server-only";
import type Stripe from "stripe";
import { getDb, withBusyRetry } from "../db/client";
import { sendOrderEmail } from "../email/notifications";
import { mapOrder } from "../orders/repository";
import type { Order, PaymentStatus } from "../orders/types";

export const HANDLED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
] as const;
type HandledEvent = (typeof HANDLED_EVENTS)[number];

export type WebhookOutcome =
  | { result: "ignored"; reason: string }
  | { result: "duplicate"; eventId: string }
  | { result: "orphan"; eventId: string }
  | { result: "processed"; eventId: string; orderId: string; from: PaymentStatus; to: PaymentStatus; becamePaid: boolean };

/**
 * Transitions autorisées. Une commande payée ne redevient jamais « en cours » ou
 * « échouée » (protection contre les événements reçus dans le désordre).
 */
const ALLOWED: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["processing", "paid", "failed", "expired"],
  processing: ["paid", "failed"],
  failed: [],
  expired: [],
  paid: [],
};

export function nextPaymentStatus(type: HandledEvent, session: Pick<Stripe.Checkout.Session, "payment_status">): PaymentStatus | null {
  switch (type) {
    case "checkout.session.completed":
      // « paid » = paiement confirmé ; « unpaid » = moyen de paiement différé en attente.
      if (session.payment_status === "paid") return "paid";
      if (session.payment_status === "unpaid") return "processing";
      return null; // no_payment_required : impossible pour une commande payante → à vérifier.
    case "checkout.session.async_payment_succeeded":
      return "paid";
    case "checkout.session.async_payment_failed":
      return "failed";
    case "checkout.session.expired":
      return "expired";
  }
}

function isHandled(type: string): type is HandledEvent {
  return (HANDLED_EVENTS as readonly string[]).includes(type);
}

/**
 * Traite un événement Stripe déjà VÉRIFIÉ (signature contrôlée par l'appelant).
 * Idempotent : l'identifiant de l'événement est enregistré dans la même transaction
 * que la mise à jour de la commande ; un événement répété est ignoré.
 */
export async function processStripeEvent(event: Stripe.Event): Promise<WebhookOutcome> {
  if (!isHandled(event.type)) return { result: "ignored", reason: `type ${event.type} non traité` };
  const type = event.type;
  const session = event.data.object as Stripe.Checkout.Session;
  const outcome = await withBusyRetry(() => applyEvent(event.id, type, session));

  // Après validation de la transaction : courriel de confirmation (au plus une fois).
  if (outcome.result === "processed" && outcome.becamePaid) {
    try {
      await sendOrderEmail(outcome.orderId, "confirmation");
    } catch (err) {
      console.error("[webhook] envoi du courriel de confirmation impossible", err);
    }
  }
  return outcome;
}

async function applyEvent(eventId: string, type: HandledEvent, session: Stripe.Checkout.Session): Promise<WebhookOutcome> {
  const db = await getDb();
  const now = new Date().toISOString();
  const event = { id: eventId, type };

  const tx = await db.transaction("write");
  let outcome: WebhookOutcome;
  try {
    const inserted = await tx.execute({
      sql: "INSERT INTO stripe_events (id, type, checkout_session_id, received_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
      args: [event.id, event.type, session.id, now],
    });
    if (inserted.rowsAffected === 0) {
      await tx.rollback();
      return { result: "duplicate", eventId: event.id };
    }

    const orderId = session.metadata?.order_id;
    const found = await tx.execute({
      sql: "SELECT * FROM orders WHERE stripe_checkout_session_id = ? OR (? IS NOT NULL AND id = ?) LIMIT 1",
      args: [session.id, orderId ?? null, orderId ?? null],
    });
    if (!found.rows[0]) {
      await tx.commit();
      return { result: "orphan", eventId: event.id };
    }
    const order: Order = mapOrder(found.rows[0]);
    await tx.execute({ sql: "UPDATE stripe_events SET order_id = ? WHERE id = ?", args: [order.id, event.id] });

    const target = nextPaymentStatus(event.type, session);
    const from = order.paymentStatus;
    const canMove = target !== null && ALLOWED[from].includes(target);
    const to: PaymentStatus = canMove ? target : from;
    const becamePaid = to === "paid" && from !== "paid";
    const notes: string[] = [];

    // Contrôle de cohérence : le sous-total Stripe doit correspondre au calcul serveur.
    let needsReview = order.needsReview;
    if (session.amount_subtotal !== null && session.amount_subtotal !== order.subtotalCents) {
      needsReview = true;
      notes.push(`ANOMALIE : sous-total Stripe ${session.amount_subtotal} ≠ sous-total attendu ${order.subtotalCents}.`);
    }
    if (session.currency && session.currency.toUpperCase() !== order.currency.toUpperCase()) {
      needsReview = true;
      notes.push(`ANOMALIE : devise ${session.currency} ≠ ${order.currency}.`);
    }
    if (target === null) {
      needsReview = true;
      notes.push(`Statut de paiement inattendu : ${session.payment_status}.`);
    } else if (!canMove && target !== from) {
      notes.push(`Transition ignorée ${from} → ${target} (événement tardif ou dans le désordre).`);
    }

    const details = session.customer_details;
    // Les versions d'API antérieures exposaient `shipping_details` à la racine de la session.
    const legacy = session as unknown as { shipping_details?: Stripe.Checkout.Session.CollectedInformation.ShippingDetails | null };
    const shipping = session.collected_information?.shipping_details ?? legacy.shipping_details ?? null;
    const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
    const customer = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

    await tx.execute({
      sql: `UPDATE orders SET
              payment_status = ?,
              paid_at = CASE WHEN ? = 1 THEN ? ELSE paid_at END,
              payment_failed_at = CASE WHEN ? = 'failed' AND payment_failed_at IS NULL THEN ? ELSE payment_failed_at END,
              needs_review = ?,
              stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id),
              stripe_customer_id = COALESCE(?, stripe_customer_id),
              stripe_livemode = ?,
              customer_email = COALESCE(?, customer_email),
              customer_name = COALESCE(?, customer_name),
              customer_phone = COALESCE(?, customer_phone),
              ship_name = COALESCE(?, ship_name),
              ship_line1 = COALESCE(?, ship_line1),
              ship_line2 = COALESCE(?, ship_line2),
              ship_city = COALESCE(?, ship_city),
              ship_state = COALESCE(?, ship_state),
              ship_postal_code = COALESCE(?, ship_postal_code),
              ship_country = COALESCE(?, ship_country),
              shipping_cents = COALESCE(?, shipping_cents),
              tax_cents = COALESCE(?, tax_cents),
              amount_paid_cents = CASE WHEN ? = 'paid' THEN COALESCE(?, amount_paid_cents) ELSE amount_paid_cents END,
              confirmation_email_status = CASE WHEN ? = 1 AND confirmation_email_status IS NULL THEN 'pending' ELSE confirmation_email_status END,
              updated_at = ?
            WHERE id = ?`,
      args: [
        to,
        becamePaid ? 1 : 0,
        now,
        to,
        now,
        needsReview ? 1 : 0,
        paymentIntent,
        customer,
        session.livemode ? 1 : 0,
        details?.email ?? null,
        details?.name ?? null,
        details?.phone ?? null,
        shipping?.name ?? null,
        shipping?.address?.line1 ?? null,
        shipping?.address?.line2 ?? null,
        shipping?.address?.city ?? null,
        shipping?.address?.state ?? null,
        shipping?.address?.postal_code ?? null,
        shipping?.address?.country ?? null,
        session.total_details?.amount_shipping ?? null,
        session.total_details?.amount_tax ?? null,
        to,
        session.amount_total ?? null,
        becamePaid ? 1 : 0,
        now,
        order.id,
      ],
    });

    const label: Record<HandledEvent, string> = {
      "checkout.session.completed": "Checkout terminé",
      "checkout.session.async_payment_succeeded": "Paiement différé réussi",
      "checkout.session.async_payment_failed": "Paiement différé échoué",
      "checkout.session.expired": "Session expirée",
    };
    const message = [`${label[event.type]} (${event.id}) — paiement : ${from} → ${to}.`, ...notes].join(" ");
    await tx.execute({
      sql: "INSERT INTO order_events (order_id, at, kind, message) VALUES (?, ?, 'stripe', ?)",
      args: [order.id, now, message],
    });
    await tx.commit();
    outcome = { result: "processed", eventId: event.id, orderId: order.id, from, to, becamePaid };
  } catch (err) {
    if (!tx.closed) await tx.rollback().catch(() => {});
    throw err;
  } finally {
    tx.close();
  }
  return outcome;
}
