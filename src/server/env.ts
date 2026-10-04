/**
 * Lecture des variables d'environnement côté serveur. Les valeurs sont lues à
 * l'appel (pas à l'import) pour que `next build` fonctionne sans secrets.
 * Aucune de ces valeurs n'est exposée au navigateur (pas de préfixe NEXT_PUBLIC_).
 */

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export const env = {
  siteUrl(): string {
    return (read("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
  },
  isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },

  stripeSecretKey: () => read("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => read("STRIPE_WEBHOOK_SECRET"),
  /** Stripe Tax : à n'activer qu'après configuration dans Stripe et inscriptions fiscales vérifiées. */
  stripeTaxEnabled: () => read("STRIPE_TAX_ENABLED") === "true",
  /** Garde-fou : les clés live sont refusées tant que cette variable n'est pas « true ». */
  allowLivePayments: () => read("STORE_ALLOW_LIVE_PAYMENTS") === "true",
  /**
   * Tests uniquement : rediriger le SDK vers stripe-mock (ex. http://localhost:12111).
   * Ignoré si la clé n'est pas une clé de TEST.
   */
  stripeApiBaseForTests: () => read("STRIPE_API_BASE_FOR_TESTS"),

  databaseUrl: () => read("DATABASE_URL") ?? "file:./data/store.db",
  databaseAuthToken: () => read("DATABASE_AUTH_TOKEN"),

  adminPassword: () => read("ADMIN_PASSWORD"),
  adminSessionSecret: () => read("ADMIN_SESSION_SECRET"),

  resendApiKey: () => read("RESEND_API_KEY"),
  emailFrom: () => read("EMAIL_FROM"),
  emailReplyTo: () => read("EMAIL_REPLY_TO"),
  /** Copie des notifications de commande payée (facultatif). */
  orderNotificationEmail: () => read("ORDER_NOTIFICATION_EMAIL"),

  /** En-tête fiable contenant l'IP client, selon l'hébergeur (x-forwarded-for, cf-connecting-ip…). */
  clientIpHeader: () => (read("CLIENT_IP_HEADER") ?? "x-forwarded-for").toLowerCase(),
};

export type StripeKeyMode = "test" | "live" | "unknown" | "missing";

export function stripeKeyMode(key = env.stripeSecretKey()): StripeKeyMode {
  if (!key) return "missing";
  if (/^(sk|rk)_test_/.test(key)) return "test";
  if (/^(sk|rk)_live_/.test(key)) return "live";
  return "unknown";
}

export function isRestrictedKey(key = env.stripeSecretKey()): boolean {
  return !!key && key.startsWith("rk_");
}
