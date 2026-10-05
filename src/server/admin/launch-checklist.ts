import "server-only";
import { product } from "@/config/product";
import { store } from "@/config/store";
import { isEmailConfigured } from "../email/provider";
import { env, isRestrictedKey, stripeKeyMode } from "../env";
import { supplier } from "../supplier-config";
import { isAdminConfigured } from "./session-token";

export type ChecklistItem = { label: string; ok: boolean; detail?: string; blocking: boolean };

/** Liste de vérification avant d'accepter de vraies commandes (affichée dans /admin). */
export function launchChecklist(): ChecklistItem[] {
  const mode = stripeKeyMode();
  const provisionalMedia = Object.values(product.media).filter((m) => m.provisional).map((m) => m.src);
  const legalMissing = Object.entries({
    "raison sociale": store.legal.businessName,
    "adresse de l'entreprise": store.legal.businessAddress,
    "responsable de la protection des renseignements personnels": store.legal.privacyOfficer.name,
    "courriel du responsable (Loi 25)": store.legal.privacyOfficer.email,
    "date de mise à jour des pages légales": store.legal.lastUpdated,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  return [
    { label: "Fiche produit vérifiée (nom, caractéristiques, variantes, FAQ)", ok: product.confirmed, blocking: true, detail: "data/product.ts → confirmed" },
    {
      label: "Propriété intellectuelle vérifiée (logo « THE DOG FANS » imitant The North Face)",
      ok: false,
      blocking: true,
      detail:
        "Risque de contrefaçon / atteinte à une marque : Stripe interdit la vente de produits portant atteinte à une marque. Obtenir un avis juridique ou choisir un modèle sans ce logo, puis retirer ce point.",
    },
    { label: "Visuels réels et droits d'utilisation", ok: provisionalMedia.length === 0, blocking: true, detail: provisionalMedia.length ? `${provisionalMedia.length} visuel(s) provisoire(s)` : undefined },
    {
      label: "Cadeau du panier défini et disponible",
      ok: !product.gift.enabled || product.gift.confirmed,
      blocking: true,
      detail: product.gift.enabled ? `data/product.ts → gift (« ${product.gift.label.fr} »)` : "désactivé",
    },
    {
      label: "Prix barré justifié (ou absent)",
      ok: !product.pricing.compareAt || !!product.pricing.compareAt.justification.trim(),
      blocking: true,
      detail: product.pricing.compareAt ? product.pricing.compareAt.justification || "justification manquante" : "aucun prix barré",
    },
    { label: "Prix de vente et lots validés", ok: product.pricing.confirmed, blocking: true, detail: "product.pricing.confirmed" },
    { label: "Coût fournisseur habituel vérifié (hors promo nouveau client)", ok: supplier.costVerified, blocking: false, detail: "src/server/supplier-config.ts" },
    { label: "Tarifs et délais de livraison vers le Canada vérifiés", ok: store.shipping.confirmed, blocking: true, detail: "store.shipping.confirmed" },
    { label: "Politique de retour validée", ok: store.returns.confirmed, blocking: true, detail: "store.returns.confirmed" },
    { label: "Courriel de support", ok: !!store.contact.email, blocking: true, detail: "store.contact.email" },
    { label: "Identité légale et pages légales complétées", ok: legalMissing.length === 0, blocking: true, detail: legalMissing.length ? `Manque : ${legalMissing.join(", ")}` : undefined },
    {
      label: "Clé Stripe configurée",
      ok: mode === "test" || mode === "live",
      blocking: true,
      detail: mode === "missing" ? "STRIPE_SECRET_KEY absente" : `mode ${mode}${isRestrictedKey() ? " (clé restreinte ✓)" : " — clé restreinte recommandée"}`,
    },
    { label: "Secret de webhook Stripe", ok: !!env.stripeWebhookSecret(), blocking: true, detail: "STRIPE_WEBHOOK_SECRET" },
    {
      label: "Taxes (TPS/TVH/TVQ) configurées",
      ok: env.stripeTaxEnabled(),
      blocking: false,
      detail: env.stripeTaxEnabled()
        ? "Stripe Tax activé — vérifier les inscriptions dans le Dashboard"
        : "Aucune taxe perçue. Activer STRIPE_TAX_ENABLED seulement après inscription et configuration Stripe Tax.",
    },
    { label: "Service d'envoi des courriels", ok: isEmailConfigured(), blocking: false, detail: isEmailConfigured() ? undefined : "RESEND_API_KEY / EMAIL_FROM absents : aucun courriel n'est envoyé" },
    { label: "Administration protégée", ok: isAdminConfigured(), blocking: true },
    { label: "URL publique HTTPS", ok: env.siteUrl().startsWith("https://"), blocking: true, detail: env.siteUrl() },
    {
      label: "Paiements live autorisés",
      ok: mode === "live" && env.allowLivePayments(),
      blocking: false,
      detail: "STORE_ALLOW_LIVE_PAYMENTS=true seulement après tests complets en mode test",
    },
  ];
}
