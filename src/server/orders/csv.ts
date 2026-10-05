import type { OrderWithItems } from "./types";

/** Neutralise l'injection de formules (=, +, -, @) et échappe les guillemets. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const cents = (v: number | null) => (v === null ? "" : (v / 100).toFixed(2));

export function toCsv(orders: OrderWithItems[]): string {
  const header = [
    "numero_commande", "date", "statut_paiement", "statut_traitement", "langue",
    "client_nom", "client_courriel", "client_telephone",
    "livraison_nom", "adresse_1", "adresse_2", "ville", "province", "code_postal", "pays",
    "articles", "cadeau", "quantite_totale", "sous_total", "code_grattage", "rabais_grattage", "livraison", "taxes", "total_paye", "devise",
    "stripe_session", "stripe_payment_intent", "mode_stripe",
    "commande_fournisseur", "cout_fournisseur", "transporteur", "numero_suivi", "lien_suivi", "expediee_le",
  ];
  const rows = orders.map((o) => [
    o.orderNumber, o.createdAt, o.paymentStatus, o.fulfillmentStatus, o.locale,
    o.customerName, o.customerEmail, o.customerPhone,
    o.shipName, o.shipLine1, o.shipLine2, o.shipCity, o.shipState, o.shipPostalCode, o.shipCountry,
    o.items.map((i) => `${i.quantity}x ${i.sku} (${i.variantLabel})`).join(" | "),
    o.giftLabel,
    o.items.reduce((s, i) => s + i.quantity, 0),
    cents(o.subtotalCents), o.promoCode, cents(o.promoDiscountCents), cents(o.shippingCents), cents(o.taxCents), cents(o.amountPaidCents), o.currency,
    o.stripeCheckoutSessionId, o.stripePaymentIntentId, o.stripeLivemode === null ? "" : o.stripeLivemode ? "live" : "test",
    o.supplierOrderId, cents(o.supplierCostCents), o.carrier, o.trackingNumber, o.trackingUrl, o.shippedAt,
  ]);
  // BOM pour une ouverture correcte des accents dans Excel.
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
