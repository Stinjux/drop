/**
 * Calcul des prix — module PUR, partagé par le navigateur (affichage) et le serveur
 * (montants envoyés à Stripe). Tous les montants sont des entiers en cents.
 * Le serveur ne fait confiance qu'au résultat de ces fonctions appliquées à la
 * configuration, jamais à un montant reçu du navigateur.
 */
import type { PriceTier, ShippingOption, Variant } from "@/config/types";

export type CartLineInput = { variantId: string; quantity: number };

export type PricedLine = {
  variantId: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  /** Prix unitaire de référence (palier 1 unité). */
  baseUnitPriceCents: number;
  lineTotalCents: number;
};

export type CartPricing = {
  lines: PricedLine[];
  totalQuantity: number;
  /** Somme au prix de référence (sans remise de lot). */
  baseSubtotalCents: number;
  subtotalCents: number;
  savingsCents: number;
  shippingCents: number;
  /** Sous-total + livraison, avant taxes. */
  totalBeforeTaxCents: number;
  /** Reste à ajouter pour la livraison gratuite (`null` si non applicable ou déjà atteint). */
  freeShippingRemainingCents: number | null;
};

export type CartError =
  | { code: "empty" }
  | { code: "unknown_variant"; variantId: string }
  | { code: "unavailable_variant"; variantId: string }
  | { code: "invalid_quantity"; variantId: string }
  | { code: "too_many"; max: number };

export type CatalogContext = {
  variants: readonly Variant[];
  tiers: readonly PriceTier[];
  maxQuantityPerOrder: number;
  shipping: ShippingOption;
};

/** Vérifie la cohérence des paliers (appelé dans les tests et au démarrage du serveur). */
export function assertValidTiers(tiers: readonly PriceTier[]): void {
  if (tiers.length === 0) throw new Error("Au moins un palier de prix est requis.");
  if (tiers[0].minQuantity !== 1) throw new Error("Le premier palier doit commencer à 1 unité.");
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (!Number.isInteger(t.unitPriceCents) || t.unitPriceCents <= 0) {
      throw new Error(`Prix invalide au palier ${t.minQuantity}.`);
    }
    if (i > 0) {
      const prev = tiers[i - 1];
      if (t.minQuantity <= prev.minQuantity) throw new Error("Les paliers doivent être triés par quantité croissante.");
      if (t.unitPriceCents > prev.unitPriceCents) throw new Error("Un palier supérieur ne peut pas coûter plus cher à l'unité.");
    }
  }
}

export function baseUnitPrice(tiers: readonly PriceTier[]): number {
  return tiers[0].unitPriceCents;
}

/** Prix unitaire applicable pour une quantité totale donnée. */
export function unitPriceForQuantity(totalQuantity: number, tiers: readonly PriceTier[]): number {
  let price = tiers[0].unitPriceCents;
  for (const tier of tiers) {
    if (totalQuantity >= tier.minQuantity) price = tier.unitPriceCents;
  }
  return price;
}

export function shippingCostFor(subtotalCents: number, option: ShippingOption): number {
  if (subtotalCents <= 0) return 0;
  if (option.freeFromSubtotalCents !== null && subtotalCents >= option.freeFromSubtotalCents) return 0;
  return option.amountCents;
}

/**
 * Normalise et valide les lignes : fusionne les doublons, refuse les variantes
 * inconnues ou indisponibles, les quantités non entières et les dépassements.
 */
export function normalizeCartLines(
  input: readonly CartLineInput[],
  ctx: Pick<CatalogContext, "variants" | "maxQuantityPerOrder">,
): { ok: true; lines: CartLineInput[] } | { ok: false; error: CartError } {
  const merged = new Map<string, number>();
  for (const line of input) {
    const variant = ctx.variants.find((v) => v.id === line.variantId);
    if (!variant) return { ok: false, error: { code: "unknown_variant", variantId: line.variantId } };
    if (!variant.available) return { ok: false, error: { code: "unavailable_variant", variantId: line.variantId } };
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > ctx.maxQuantityPerOrder) {
      return { ok: false, error: { code: "invalid_quantity", variantId: line.variantId } };
    }
    merged.set(variant.id, (merged.get(variant.id) ?? 0) + line.quantity);
  }
  const lines = [...merged.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
  if (lines.length === 0) return { ok: false, error: { code: "empty" } };
  const total = lines.reduce((sum, l) => sum + l.quantity, 0);
  if (total > ctx.maxQuantityPerOrder) return { ok: false, error: { code: "too_many", max: ctx.maxQuantityPerOrder } };
  return { ok: true, lines };
}

/** Calcule le panier. Les lignes doivent avoir été normalisées. */
export function priceCart(lines: readonly CartLineInput[], ctx: CatalogContext): CartPricing {
  const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);
  const unit = unitPriceForQuantity(totalQuantity, ctx.tiers);
  const base = baseUnitPrice(ctx.tiers);

  const priced: PricedLine[] = lines.map((l) => {
    const variant = ctx.variants.find((v) => v.id === l.variantId);
    return {
      variantId: l.variantId,
      sku: variant?.sku ?? l.variantId,
      quantity: l.quantity,
      unitPriceCents: unit,
      baseUnitPriceCents: base,
      lineTotalCents: unit * l.quantity,
    };
  });

  const subtotalCents = priced.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const baseSubtotalCents = base * totalQuantity;
  const shippingCents = shippingCostFor(subtotalCents, ctx.shipping);
  const threshold = ctx.shipping.freeFromSubtotalCents;
  const freeShippingRemainingCents =
    threshold !== null && subtotalCents > 0 && subtotalCents < threshold ? threshold - subtotalCents : null;

  return {
    lines: priced,
    totalQuantity,
    baseSubtotalCents,
    subtotalCents,
    savingsCents: baseSubtotalCents - subtotalCents,
    shippingCents,
    totalBeforeTaxCents: subtotalCents + shippingCents,
    freeShippingRemainingCents,
  };
}

export type PackOffer = {
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  baseTotalCents: number;
  savingsCents: number;
  /** Pourcentage d'économie arrondi À LA BAISSE (on n'exagère jamais). */
  savingsPercent: number;
};

export function packOffer(quantity: number, tiers: readonly PriceTier[]): PackOffer {
  const unitPriceCents = unitPriceForQuantity(quantity, tiers);
  const baseTotalCents = baseUnitPrice(tiers) * quantity;
  const totalCents = unitPriceCents * quantity;
  const savingsCents = baseTotalCents - totalCents;
  return {
    quantity,
    unitPriceCents,
    totalCents,
    baseTotalCents,
    savingsCents,
    savingsPercent: baseTotalCents > 0 ? Math.floor((savingsCents * 100) / baseTotalCents) : 0,
  };
}
