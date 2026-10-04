import "server-only";

/**
 * INFORMATIONS FOURNISSEUR — INTERNES (jamais envoyées au navigateur des clients).
 * Affichées uniquement dans /admin pour passer les commandes manuellement.
 *
 * ⚠️ Le coût habituel n'a pas pu être vérifié (fiche inaccessible). Ne pas utiliser un
 * prix promotionnel « nouvel utilisateur » comme coût de référence.
 */
export const supplier = {
  name: "AliExpress",
  productUrl: "https://www.aliexpress.com/item/1005005777504095.html",
  /** Passer à true après vérification du coût HABITUEL (hors promo nouveau client). */
  costVerified: false,
  /** Méthode de livraison fournisseur à choisir vers le Canada (ex. « AliExpress Standard Shipping »). */
  shippingMethod: "À confirmer",
  /** Correspondance variante boutique → option à sélectionner chez le fournisseur. */
  variants: {
    "option-1": { supplierOptionLabel: "À confirmer", unitCostCents: null as number | null, shippingCostCents: null as number | null },
    "option-2": { supplierOptionLabel: "À confirmer", unitCostCents: null as number | null, shippingCostCents: null as number | null },
  } as Record<string, { supplierOptionLabel: string; unitCostCents: number | null; shippingCostCents: number | null }>,
  notes:
    "Passer la commande avec l'adresse du client, sans facture ni prix dans le colis si l'option existe. Conserver la capture du récapitulatif fournisseur.",
};
