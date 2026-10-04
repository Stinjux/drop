import "server-only";
import Stripe from "stripe";
import { env, stripeKeyMode } from "../env";

export class StripeNotConfiguredError extends Error {
  constructor(message = "Stripe n'est pas configuré (STRIPE_SECRET_KEY manquante).") {
    super(message);
    this.name = "StripeNotConfiguredError";
  }
}

export class LivePaymentsBlockedError extends Error {
  constructor() {
    super("Clé Stripe live détectée alors que STORE_ALLOW_LIVE_PAYMENTS n'est pas « true ». Paiements bloqués par sécurité.");
    this.name = "LivePaymentsBlockedError";
  }
}

let cached: { key: string; client: Stripe } | null = null;

/**
 * Client Stripe côté serveur, instancié paresseusement (le build n'a pas besoin de clé).
 * Utilisez de préférence une clé RESTREINTE (rk_test_… / rk_live_…), cf. README.
 */
export function getStripe(): Stripe {
  const key = env.stripeSecretKey();
  if (!key) throw new StripeNotConfiguredError();
  const mode = stripeKeyMode(key);
  if (mode === "unknown") throw new StripeNotConfiguredError("STRIPE_SECRET_KEY n'a pas un format reconnu (sk_… ou rk_…).");
  if (mode === "live" && !env.allowLivePayments()) throw new LivePaymentsBlockedError();
  if (cached?.key === key) return cached.client;

  const config: Stripe.StripeConfig = {
    appInfo: { name: "borea-store", version: "1.0.0" },
    maxNetworkRetries: 2,
    timeout: 20_000,
  };
  const mockBase = env.stripeApiBaseForTests();
  if (mockBase && mode === "test") {
    const url = new URL(mockBase);
    config.host = url.hostname;
    config.port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
    config.protocol = url.protocol === "https:" ? "https" : "http";
  }
  cached = { key, client: new Stripe(key, config) };
  return cached.client;
}

let verifier: Stripe | null = null;

/**
 * Instance utilisée uniquement pour vérifier les signatures de webhook (aucun appel
 * réseau) : elle ne dépend ni de la clé API ni du garde-fou live.
 */
export function getWebhookVerifier(): Stripe {
  if (!verifier) verifier = new Stripe(env.stripeSecretKey() ?? "sk_test_signature_verification_only");
  return verifier;
}
