"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { findOrderForTracking } from "./orders/repository";
import { clientIp, rateLimit } from "./rate-limit";

export type TrackingResult =
  | { state: "idle" }
  | { state: "error"; code: "invalid" | "not_found" | "rate_limited" }
  | {
      state: "found";
      orderNumber: string;
      createdAt: string;
      payment: "pending" | "processing" | "paid" | "failed" | "expired";
      fulfillment: string;
      carrier: string | null;
      trackingNumber: string | null;
      trackingUrl: string | null;
    };

const schema = z.object({
  orderNumber: z.string().trim().min(4).max(20).regex(/^[A-Za-z0-9-]+$/),
  email: z.email().max(200),
});

/**
 * Suivi de commande public. Réponse identique si le numéro ou le courriel est faux
 * (pas d'énumération), limité à 10 recherches / 15 min par IP. N'expose ni adresse
 * ni montant.
 */
export async function trackOrderAction(_prev: TrackingResult, formData: FormData): Promise<TrackingResult> {
  const parsed = schema.safeParse({ orderNumber: formData.get("orderNumber"), email: formData.get("email") });
  if (!parsed.success) return { state: "error", code: "invalid" };
  const limit = await rateLimit("tracking", clientIp(await headers()), 10, 900);
  if (!limit.ok) return { state: "error", code: "rate_limited" };
  const order = await findOrderForTracking(parsed.data.orderNumber, parsed.data.email);
  if (!order || order.paymentStatus === "expired") return { state: "error", code: "not_found" };
  return {
    state: "found",
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    payment: order.paymentStatus,
    fulfillment: order.fulfillmentStatus,
    carrier: order.carrier,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
  };
}
