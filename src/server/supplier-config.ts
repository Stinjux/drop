import "server-only";
import { product } from "@/config/product";

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
  /**
   * Correspondance variante boutique → options à sélectionner chez le fournisseur
   * (générée pour les 5 coloris × 8 tailles). Renseigner les coûts réels par taille.
   */
  variants: Object.fromEntries(
    product.variants.map((v) => [
      v.id,
      {
        supplierOptionLabel: `${v.label.fr.replace(" · ", " / ")} (libellé exact à vérifier sur la fiche)`,
        unitCostCents: null as number | null,
        shippingCostCents: null as number | null,
      },
    ]),
  ) as Record<string, { supplierOptionLabel: string; unitCostCents: number | null; shippingCostCents: number | null }>,
  notes:
    "Passer la commande avec l'adresse du client, sans facture ni prix dans le colis si l'option existe. Conserver la capture du récapitulatif fournisseur.",
};
