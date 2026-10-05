import type { OrderWithItems } from "../orders/types";

export type SupplierLine = {
  sku: string;
  variantLabel: string;
  supplierOptionLabel: string;
  quantity: number;
  /** Coût estimé (cents) si connu et vérifié dans la configuration fournisseur. */
  estimatedCostCents: number | null;
};

export type SupplierInstructions = {
  supplierName: string;
  productUrl: string;
  shippingMethod: string;
  lines: SupplierLine[];
  /** Adresse prête à copier dans le formulaire fournisseur. */
  shippingAddress: string;
  phone: string | null;
  estimatedTotalCostCents: number | null;
  costVerified: boolean;
  /** Cadeau promis au client, à ajouter au colis. */
  gift: string | null;
  notes: string;
};

/**
 * Contrat d'un module de traitement fournisseur. L'implémentation actuelle est
 * MANUELLE : elle prépare les informations et l'administrateur passe la commande
 * lui-même. Une future intégration officielle (API fournisseur autorisée) pourra
 * implémenter `submitOrder` sans toucher au reste de la boutique.
 */
export interface FulfillmentProvider {
  readonly id: string;
  readonly label: string;
  /** false = commande passée à la main par l'administrateur. */
  readonly automatic: boolean;
  instructions(order: OrderWithItems): SupplierInstructions;
  submitOrder?(order: OrderWithItems): Promise<{ supplierOrderId: string; costCents: number | null }>;
}
