import { product } from "@/config/product";

/**
 * Progression vers le cadeau offert (partagé navigateur / serveur).
 * `null` si aucun cadeau n'est activé dans data/product.ts.
 */
export function giftProgress(subtotalCents: number): { reached: boolean; remainingCents: number; percent: number } | null {
  const g = product.gift;
  if (!g.enabled || g.thresholdCents <= 0) return null;
  const remainingCents = Math.max(g.thresholdCents - subtotalCents, 0);
  return {
    reached: remainingCents === 0,
    remainingCents,
    percent: Math.min(100, Math.floor((subtotalCents * 100) / g.thresholdCents)),
  };
}
