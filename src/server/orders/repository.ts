import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import type { Client, InStatement, Row, Transaction } from "@libsql/client";
import { store } from "@/config/store";
import { getDb, withBusyRetry } from "../db/client";
import type {
  EmailStatus,
  FulfillmentStatus,
  Order,
  OrderEvent,
  OrderItem,
  OrderWithItems,
  PaymentStatus,
} from "./types";

type Executor = Pick<Client, "execute"> | Pick<Transaction, "execute">;

/** Écriture atomique de plusieurs instructions, relancée si la base est momentanément verrouillée. */
const batchWrite = (db: Client, statements: InStatement[], mode: "write") => withBusyRetry(() => db.batch(statements, mode));

const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export function mapOrder(r: Row): Order {
  return {
    id: String(r.id),
    orderNumber: String(r.order_number),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    locale: r.locale === "en" ? "en" : "fr",
    checkoutAttemptKey: String(r.checkout_attempt_key),
    cartFingerprint: String(r.cart_fingerprint),
    stripeCheckoutSessionId: str(r.stripe_checkout_session_id),
    stripeCheckoutUrl: str(r.stripe_checkout_url),
    stripeSessionExpiresAt: str(r.stripe_session_expires_at),
    stripePaymentIntentId: str(r.stripe_payment_intent_id),
    stripeCustomerId: str(r.stripe_customer_id),
    stripeLivemode: r.stripe_livemode === null ? null : Number(r.stripe_livemode) === 1,
    paymentStatus: String(r.payment_status) as PaymentStatus,
    paidAt: str(r.paid_at),
    paymentFailedAt: str(r.payment_failed_at),
    needsReview: Number(r.needs_review) === 1,
    currency: String(r.currency),
    subtotalCents: Number(r.subtotal_cents),
    savingsCents: Number(r.savings_cents),
    shippingCents: Number(r.shipping_cents),
    taxCents: num(r.tax_cents),
    totalCents: Number(r.total_cents),
    amountPaidCents: num(r.amount_paid_cents),
    shippingOptionId: String(r.shipping_option_id),
    giftLabel: str(r.gift_label),
    promoCode: str(r.promo_code),
    promoDiscountCents: Number(r.promo_discount_cents ?? 0),
    stripeCouponId: str(r.stripe_coupon_id),
    customerEmail: str(r.customer_email),
    customerName: str(r.customer_name),
    customerPhone: str(r.customer_phone),
    shipName: str(r.ship_name),
    shipLine1: str(r.ship_line1),
    shipLine2: str(r.ship_line2),
    shipCity: str(r.ship_city),
    shipState: str(r.ship_state),
    shipPostalCode: str(r.ship_postal_code),
    shipCountry: str(r.ship_country),
    fulfillmentStatus: String(r.fulfillment_status) as FulfillmentStatus,
    fulfillmentProvider: String(r.fulfillment_provider),
    supplierOrderId: str(r.supplier_order_id),
    supplierOrderedAt: str(r.supplier_ordered_at),
    supplierCostCents: num(r.supplier_cost_cents),
    supplierNotes: str(r.supplier_notes),
    carrier: str(r.carrier),
    trackingNumber: str(r.tracking_number),
    trackingUrl: str(r.tracking_url),
    shippedAt: str(r.shipped_at),
    confirmationEmailStatus: str(r.confirmation_email_status) as EmailStatus,
    confirmationEmailAt: str(r.confirmation_email_at),
    shippingEmailStatus: str(r.shipping_email_status) as EmailStatus,
    shippingEmailAt: str(r.shipping_email_at),
  };
}

function mapItem(r: Row): OrderItem {
  return {
    id: Number(r.id),
    productId: String(r.product_id),
    variantId: String(r.variant_id),
    sku: String(r.sku),
    productName: String(r.product_name),
    variantLabel: String(r.variant_label),
    quantity: Number(r.quantity),
    unitPriceCents: Number(r.unit_price_cents),
    lineTotalCents: Number(r.line_total_cents),
  };
}

const ORDER_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function generateOrderNumber(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += ORDER_ALPHABET[randomInt(ORDER_ALPHABET.length)];
  return `${store.orderNumberPrefix}-${code}`;
}

export type NewOrderInput = {
  locale: "fr" | "en";
  checkoutAttemptKey: string;
  cartFingerprint: string;
  currency: string;
  subtotalCents: number;
  savingsCents: number;
  shippingCents: number;
  totalCents: number;
  shippingOptionId: string;
  giftLabel?: string | null;
  promoCode?: string | null;
  promoDiscountCents?: number;
  items: Array<Omit<OrderItem, "id">>;
};

export async function createPendingOrder(input: NewOrderInput): Promise<OrderWithItems> {
  const db = await getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randomUUID();
    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();
    const statements: InStatement[] = [
      {
        sql: `INSERT INTO orders (id, order_number, created_at, updated_at, locale, checkout_attempt_key, cart_fingerprint,
                payment_status, currency, subtotal_cents, savings_cents, shipping_cents, total_cents, shipping_option_id, gift_label, promo_code, promo_discount_cents)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          orderNumber,
          now,
          now,
          input.locale,
          input.checkoutAttemptKey,
          input.cartFingerprint,
          input.currency,
          input.subtotalCents,
          input.savingsCents,
          input.shippingCents,
          input.totalCents,
          input.shippingOptionId,
          input.giftLabel ?? null,
          input.promoCode ?? null,
          input.promoDiscountCents ?? 0,
        ],
      },
      ...input.items.map((it) => ({
        sql: `INSERT INTO order_items (order_id, product_id, variant_id, sku, product_name, variant_label, quantity, unit_price_cents, line_total_cents)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, it.productId, it.variantId, it.sku, it.productName, it.variantLabel, it.quantity, it.unitPriceCents, it.lineTotalCents],
      })),
      {
        sql: "INSERT INTO order_events (order_id, at, kind, message) VALUES (?, ?, 'created', ?)",
        args: [id, now, "Session de paiement demandée par le client."],
      },
    ];
    try {
      await batchWrite(db, statements, "write");
      const order = await getOrderById(id);
      if (!order) throw new Error("Commande introuvable après création.");
      return order;
    } catch (err) {
      const message = String((err as Error)?.message ?? err);
      // Collision (très improbable) sur le numéro de commande : on réessaie.
      if (message.includes("UNIQUE") && message.includes("order_number")) continue;
      throw err;
    }
  }
  throw new Error("Impossible de générer un numéro de commande unique.");
}

async function withItems(db: Executor, order: Order | null): Promise<OrderWithItems | null> {
  if (!order) return null;
  const items = await db.execute({ sql: "SELECT * FROM order_items WHERE order_id = ? ORDER BY id", args: [order.id] });
  return { ...order, items: items.rows.map(mapItem) };
}

async function getOne(sql: string, args: Array<string | number>, db?: Executor): Promise<OrderWithItems | null> {
  const ex = db ?? (await getDb());
  const res = await ex.execute({ sql, args });
  return withItems(ex, res.rows[0] ? mapOrder(res.rows[0]) : null);
}

export const getOrderById = (id: string, db?: Executor) => getOne("SELECT * FROM orders WHERE id = ?", [id], db);
export const getOrderBySessionId = (sessionId: string, db?: Executor) =>
  getOne("SELECT * FROM orders WHERE stripe_checkout_session_id = ?", [sessionId], db);
export const getOrderByAttemptKey = (key: string, db?: Executor) =>
  getOne("SELECT * FROM orders WHERE checkout_attempt_key = ?", [key], db);

export async function attachCheckoutSession(
  orderId: string,
  session: { id: string; url: string | null; expiresAt: number; livemode: boolean },
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `UPDATE orders SET stripe_checkout_session_id = ?, stripe_checkout_url = ?, stripe_session_expires_at = ?,
            stripe_livemode = ?, updated_at = ? WHERE id = ?`,
    args: [
      session.id,
      session.url,
      new Date(session.expiresAt * 1000).toISOString(),
      session.livemode ? 1 : 0,
      new Date().toISOString(),
      orderId,
    ],
  });
}

export async function addOrderEvent(orderId: string, kind: string, message: string, db?: Executor): Promise<void> {
  const ex = db ?? (await getDb());
  await ex.execute({
    sql: "INSERT INTO order_events (order_id, at, kind, message) VALUES (?, ?, ?, ?)",
    args: [orderId, new Date().toISOString(), kind, message],
  });
}

export async function listOrderEvents(orderId: string): Promise<OrderEvent[]> {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT * FROM order_events WHERE order_id = ? ORDER BY id DESC", args: [orderId] });
  return res.rows.map((r) => ({ id: Number(r.id), at: String(r.at), kind: String(r.kind), message: String(r.message) }));
}

export type OrderListFilter = {
  payment?: PaymentStatus | "all";
  fulfillment?: FulfillmentStatus | "all";
  q?: string;
  limit?: number;
  offset?: number;
};

export async function listOrders(filter: OrderListFilter = {}): Promise<{ orders: OrderWithItems[]; total: number }> {
  const db = await getDb();
  const where: string[] = [];
  const args: Array<string | number> = [];
  if (filter.payment && filter.payment !== "all") {
    where.push("payment_status = ?");
    args.push(filter.payment);
  }
  if (filter.fulfillment && filter.fulfillment !== "all") {
    where.push("fulfillment_status = ?");
    args.push(filter.fulfillment);
  }
  if (filter.q && filter.q.trim()) {
    const like = `%${filter.q.trim().replace(/[%_]/g, "")}%`;
    where.push("(order_number LIKE ? OR customer_email LIKE ? OR customer_name LIKE ? OR tracking_number LIKE ? OR supplier_order_id LIKE ?)");
    args.push(like, like, like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 5000);
  const offset = Math.max(filter.offset ?? 0, 0);
  const [rows, count] = await Promise.all([
    db.execute({ sql: `SELECT * FROM orders ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`, args: [...args, limit, offset] }),
    db.execute({ sql: `SELECT COUNT(*) AS n FROM orders ${whereSql}`, args }),
  ]);
  const orders = rows.rows.map(mapOrder);
  if (orders.length === 0) return { orders: [], total: Number(count.rows[0]?.n ?? 0) };
  const placeholders = orders.map(() => "?").join(",");
  const items = await db.execute({
    sql: `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id`,
    args: orders.map((o) => o.id),
  });
  const byOrder = new Map<string, OrderItem[]>();
  for (const r of items.rows) {
    const list = byOrder.get(String(r.order_id)) ?? [];
    list.push(mapItem(r));
    byOrder.set(String(r.order_id), list);
  }
  return { orders: orders.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] })), total: Number(count.rows[0]?.n ?? 0) };
}

export async function countOrdersByStatus(): Promise<{ paidToFulfill: number; processing: number; paidTotal: number; needsReview: number; emailIssues: number }> {
  const db = await getDb();
  const res = await db.execute(`SELECT
      SUM(CASE WHEN payment_status = 'paid' AND fulfillment_status = 'not_started' THEN 1 ELSE 0 END) AS to_fulfill,
      SUM(CASE WHEN payment_status = 'processing' THEN 1 ELSE 0 END) AS processing,
      SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_total,
      SUM(CASE WHEN needs_review = 1 THEN 1 ELSE 0 END) AS needs_review,
      SUM(CASE WHEN payment_status = 'paid' AND (confirmation_email_status IN ('pending','sending','failed','not_configured')
               OR shipping_email_status IN ('pending','sending','failed','not_configured')) THEN 1 ELSE 0 END) AS email_issues
    FROM orders`);
  const r = res.rows[0];
  return {
    paidToFulfill: Number(r?.to_fulfill ?? 0),
    processing: Number(r?.processing ?? 0),
    paidTotal: Number(r?.paid_total ?? 0),
    needsReview: Number(r?.needs_review ?? 0),
    emailIssues: Number(r?.email_issues ?? 0),
  };
}

/**
 * Réserve l'envoi d'un courriel : ne réussit que pour UN appelant (évite les doublons
 * si deux traitements se chevauchent). Renvoie true si l'appelant doit envoyer.
 */
export async function claimEmail(orderId: string, kind: "confirmation" | "shipping", allowRetry = false): Promise<boolean> {
  const db = await getDb();
  const col = kind === "confirmation" ? "confirmation_email_status" : "shipping_email_status";
  const allowed = allowRetry ? "('pending','failed','not_configured','sending')" : "('pending')";
  const res = await db.execute({
    sql: `UPDATE orders SET ${col} = 'sending', updated_at = ? WHERE id = ? AND ${col} IN ${allowed}`,
    args: [new Date().toISOString(), orderId],
  });
  return res.rowsAffected === 1;
}

export async function setEmailStatus(orderId: string, kind: "confirmation" | "shipping", status: Exclude<EmailStatus, null>): Promise<void> {
  const db = await getDb();
  const col = kind === "confirmation" ? "confirmation_email" : "shipping_email";
  await db.execute({
    sql: `UPDATE orders SET ${col}_status = ?, ${col}_at = ?, updated_at = ? WHERE id = ?`,
    args: [status, new Date().toISOString(), new Date().toISOString(), orderId],
  });
}

export async function markEmailPending(orderId: string, kind: "confirmation" | "shipping"): Promise<void> {
  const db = await getDb();
  const col = kind === "confirmation" ? "confirmation_email_status" : "shipping_email_status";
  await db.execute({
    sql: `UPDATE orders SET ${col} = 'pending', updated_at = ? WHERE id = ? AND ${col} IS NULL`,
    args: [new Date().toISOString(), orderId],
  });
}

export type SupplierUpdate = {
  supplierOrderId: string | null;
  supplierCostCents: number | null;
  supplierNotes: string | null;
  supplierOrderedAt: string | null;
};

export async function updateSupplierInfo(orderId: string, u: SupplierUpdate): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await batchWrite(db, 
    [
      {
        sql: `UPDATE orders SET supplier_order_id = ?, supplier_cost_cents = ?, supplier_notes = ?,
                supplier_ordered_at = COALESCE(?, supplier_ordered_at),
                fulfillment_status = CASE WHEN ? IS NOT NULL AND fulfillment_status = 'not_started' THEN 'supplier_ordered' ELSE fulfillment_status END,
                updated_at = ? WHERE id = ?`,
        args: [u.supplierOrderId, u.supplierCostCents, u.supplierNotes, u.supplierOrderedAt, u.supplierOrderId, now, orderId],
      },
      {
        sql: "INSERT INTO order_events (order_id, at, kind, message) VALUES (?, ?, 'supplier', ?)",
        args: [orderId, now, u.supplierOrderId ? `Commande fournisseur enregistrée : ${u.supplierOrderId}` : "Informations fournisseur mises à jour."],
      },
    ],
    "write",
  );
}

export type TrackingUpdate = { carrier: string; trackingNumber: string; trackingUrl: string | null };

/** Enregistre le suivi, passe la commande à « Expédiée » et prépare le courriel d'expédition. */
export async function updateTracking(orderId: string, t: TrackingUpdate): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await batchWrite(db, 
    [
      {
        sql: `UPDATE orders SET carrier = ?, tracking_number = ?, tracking_url = ?,
                shipped_at = COALESCE(shipped_at, ?),
                fulfillment_status = CASE WHEN fulfillment_status IN ('not_started','supplier_ordered','issue') THEN 'shipped' ELSE fulfillment_status END,
                shipping_email_status = COALESCE(shipping_email_status, 'pending'),
                updated_at = ? WHERE id = ?`,
        args: [t.carrier, t.trackingNumber, t.trackingUrl, now, now, orderId],
      },
      {
        sql: "INSERT INTO order_events (order_id, at, kind, message) VALUES (?, ?, 'tracking', ?)",
        args: [orderId, now, `Suivi ajouté : ${t.carrier} ${t.trackingNumber}`],
      },
    ],
    "write",
  );
}

export async function setFulfillmentStatus(orderId: string, status: FulfillmentStatus, note?: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await batchWrite(db, 
    [
      { sql: "UPDATE orders SET fulfillment_status = ?, updated_at = ? WHERE id = ?", args: [status, now, orderId] },
      {
        sql: "INSERT INTO order_events (order_id, at, kind, message) VALUES (?, ?, 'fulfillment', ?)",
        args: [orderId, now, `Statut de traitement : ${status}${note ? ` — ${note}` : ""}`],
      },
    ],
    "write",
  );
}

export async function clearNeedsReview(orderId: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE orders SET needs_review = 0, updated_at = ? WHERE id = ?", args: [new Date().toISOString(), orderId] });
  await addOrderEvent(orderId, "review", "Anomalie marquée comme vérifiée par l'administrateur.");
}

/** Recherche pour le suivi client : numéro ET courriel doivent correspondre. */
export async function findOrderForTracking(orderNumber: string, email: string): Promise<Order | null> {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT * FROM orders WHERE order_number = ? AND lower(customer_email) = lower(?) LIMIT 1",
    args: [orderNumber.trim().toUpperCase(), email.trim()],
  });
  return res.rows[0] ? mapOrder(res.rows[0]) : null;
}

export async function setOrderCoupon(orderId: string, couponId: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE orders SET stripe_coupon_id = ?, updated_at = ? WHERE id = ?", args: [couponId, new Date().toISOString(), orderId] });
}
