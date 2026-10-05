export const PAYMENT_STATUSES = ["pending", "processing", "paid", "failed", "expired"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILLMENT_STATUSES = [
  "not_started",
  "supplier_ordered",
  "shipped",
  "delivered",
  "cancelled",
  "issue",
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export type EmailStatus = "pending" | "sending" | "sent" | "failed" | "not_configured" | null;

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "En attente de paiement",
  processing: "Paiement en cours (différé)",
  paid: "Payée",
  failed: "Paiement échoué",
  expired: "Session expirée / abandonnée",
};

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  not_started: "À commander chez le fournisseur",
  supplier_ordered: "Commandée chez le fournisseur",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  issue: "Problème à traiter",
};

export const EMAIL_STATUS_LABELS: Record<Exclude<EmailStatus, null>, string> = {
  pending: "À envoyer",
  sending: "Envoi en cours / interrompu",
  sent: "Envoyé",
  failed: "Échec d'envoi",
  not_configured: "Non envoyé — service d'envoi non configuré",
};

export type OrderItem = {
  id: number;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  locale: "fr" | "en";
  checkoutAttemptKey: string;
  cartFingerprint: string;
  stripeCheckoutSessionId: string | null;
  stripeCheckoutUrl: string | null;
  stripeSessionExpiresAt: string | null;
  stripePaymentIntentId: string | null;
  stripeCustomerId: string | null;
  stripeLivemode: boolean | null;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  paymentFailedAt: string | null;
  needsReview: boolean;
  currency: string;
  subtotalCents: number;
  savingsCents: number;
  shippingCents: number;
  taxCents: number | null;
  totalCents: number;
  amountPaidCents: number | null;
  shippingOptionId: string;
  /** Cadeau à inclure dans le colis (calculé par le serveur à la commande). */
  giftLabel: string | null;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  shipName: string | null;
  shipLine1: string | null;
  shipLine2: string | null;
  shipCity: string | null;
  shipState: string | null;
  shipPostalCode: string | null;
  shipCountry: string | null;
  fulfillmentStatus: FulfillmentStatus;
  fulfillmentProvider: string;
  supplierOrderId: string | null;
  supplierOrderedAt: string | null;
  supplierCostCents: number | null;
  supplierNotes: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  confirmationEmailStatus: EmailStatus;
  confirmationEmailAt: string | null;
  shippingEmailStatus: EmailStatus;
  shippingEmailAt: string | null;
};

export type OrderWithItems = Order & { items: OrderItem[] };

export type OrderEvent = { id: number; at: string; kind: string; message: string };
