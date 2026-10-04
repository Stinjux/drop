/**
 * CONFIGURATION DE LA BOUTIQUE (publique — visible côté navigateur).
 *
 * Tout ce qui est marqué `confirmed: false` ou laissé vide ("") est PROVISOIRE et
 * doit être complété avant d'accepter de vraies commandes. La page /admin liste
 * automatiquement ces éléments (voir src/config/launch-checklist.ts).
 *
 * Les coûts et informations fournisseur ne vont JAMAIS ici : voir src/server/supplier-config.ts.
 */
import type { Localized, ShippingOption } from "./types";

export const store = {
  brand: {
    /** Nom de marque provisoire — modifiable librement. */
    name: "Boréa",
    tagline: {
      fr: "Des objets utiles, bien choisis, livrés au Canada.",
      en: "Useful things, carefully chosen, shipped across Canada.",
    } satisfies Localized,
  },

  /** Préfixe des numéros de commande (ex. BR-7K2Q9M). */
  orderNumberPrefix: "BR",

  currency: "CAD" as const,
  /** Pays de livraison acceptés (codes ISO). Marché initial : Canada. */
  shippingCountries: ["CA"] as const,
  /** Quantité maximale par commande (toutes variantes confondues). */
  maxQuantityPerOrder: 10,

  contact: {
    /** OBLIGATOIRE avant publication : adresse de support réelle. */
    email: "",
    /** Facultatif. */
    phone: "",
    responseTime: {
      fr: "Réponse sous 1 à 2 jours ouvrables.",
      en: "We reply within 1–2 business days.",
    } satisfies Localized,
    confirmed: false,
  },

  /**
   * Identité légale du commerçant — exigée par la Loi sur la protection du consommateur
   * (contrats à distance) et la Loi 25 au Québec. À compléter avant publication.
   */
  legal: {
    businessName: "",
    businessAddress: "",
    /** Numéro d'entreprise du Québec, si applicable. */
    neq: "",
    /** Numéros TPS/TVH et TVQ, si inscrit. */
    gstHstNumber: "",
    qstNumber: "",
    privacyOfficer: { name: "", email: "" },
    /** Date de dernière mise à jour des pages légales (AAAA-MM-JJ). */
    lastUpdated: "",
  },

  shipping: {
    /** Passer à true après vérification des délais et tarifs réels du fournisseur vers le Canada. */
    confirmed: false,
    options: [
      {
        id: "standard",
        label: { fr: "Livraison standard suivie", en: "Standard tracked shipping" },
        amountCents: 799,
        freeFromSubtotalCents: 7500,
        processingDays: { min: 1, max: 3 },
        transitDays: { min: 7, max: 15 },
      },
    ] satisfies ShippingOption[],
  },

  returns: {
    /** Passer à true après validation de la politique réelle. */
    confirmed: false,
    /** Délai pour demander un retour, en jours après réception. */
    windowDays: 30,
    /** Qui paie le retour d'un article non défectueux. */
    returnShippingPaidBy: "customer" as "customer" | "store",
    /** Délai de remboursement après réception du retour (jours ouvrables). */
    refundDelayBusinessDays: 10,
  },

  checkout: {
    /** Demander le téléphone dans Stripe Checkout (utile pour le transporteur). */
    collectPhone: true,
    /** Durée de validité d'une session Stripe Checkout (min. 30 min, max. 24 h). */
    sessionLifetimeMinutes: 120,
  },
};

export type StoreConfig = typeof store;
