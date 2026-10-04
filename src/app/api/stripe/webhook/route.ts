import type Stripe from "stripe";
import { env } from "@/server/env";
import { getWebhookVerifier } from "@/server/stripe/client";
import { processStripeEvent } from "@/server/stripe/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook Stripe. La signature est vérifiée sur le corps BRUT (request.text(), jamais
 * re-sérialisé). Réponse 2xx uniquement après enregistrement : en cas d'erreur, Stripe
 * renverra l'événement et le traitement idempotent évitera tout doublon.
 */
export async function POST(request: Request) {
  const secret = env.stripeWebhookSecret();
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET manquant");
    return new Response("Webhook non configuré", { status: 500 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Signature manquante", { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await getWebhookVerifier().webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    console.warn("[webhook] signature invalide", (err as Error).message);
    return new Response("Signature invalide", { status: 400 });
  }

  try {
    const outcome = await processStripeEvent(event);
    return Response.json({ received: true, outcome: outcome.result });
  } catch (err) {
    console.error("[webhook] échec du traitement", event.id, err);
    return new Response("Erreur de traitement", { status: 500 });
  }
}
