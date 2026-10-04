import { product } from "@/config/product";
import { store } from "@/config/store";
import type { Localized, ShippingOption } from "@/config/types";
import type { CatalogContext } from "./pricing";

export const defaultShipping: ShippingOption = store.shipping.options[0];

/** Contexte de calcul de prix construit uniquement à partir de la configuration. */
export const catalog: CatalogContext = {
  variants: product.variants,
  tiers: product.pricing.tiers,
  maxQuantityPerOrder: store.maxQuantityPerOrder,
  shipping: defaultShipping,
};

/** Délai total estimé (préparation + transport), en jours ouvrables. */
export function deliveryEstimate(option: ShippingOption = defaultShipping) {
  return {
    min: option.processingDays.min + option.transitDays.min,
    max: option.processingDays.max + option.transitDays.max,
  };
}

export function variantLabel(variantId: string): Localized {
  return product.variants.find((v) => v.id === variantId)?.label ?? { fr: variantId, en: variantId };
}
