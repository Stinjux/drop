import { scratchGame, TOTAL_WEIGHT, type Prize } from "@/config/promo";
import type { CartPricing } from "./pricing";

/** Tire un lot à partir d'un nombre entier uniforme dans [0, TOTAL_WEIGHT). Fonction pure (testée). */
export function prizeFromRoll(roll: number): Prize {
  let acc = 0;
  // Les lots rares sont vérifiés en premier : roll 0..49 → 1 acheté = 1 offert.
  const ordered = [...scratchGame.prizes].sort((a, b) => a.weight - b.weight);
  for (const p of ordered) {
    acc += p.weight;
    if (roll < acc) return p;
  }
  return ordered[ordered.length - 1];
}

export function findPrize(id: string): Prize | undefined {
  return scratchGame.prizes.find((p) => p.id === id);
}

export type PromoResult = {
  /** Montant déduit (cents). */
  discountCents: number;
  /** « needs_second_item » : 1 acheté = 1 offert demande au moins 2 unités. */
  status: "applied" | "needs_second_item";
  totalAfterPromoCents: number;
};

/**
 * Applique le lot au panier déjà calculé (paliers de quantité inclus).
 * - Pourcentage : sur le sous-total, arrondi au cent.
 * - 1 acheté = 1 offert : une unité offerte (au prix unitaire du palier), une seule fois par commande.
 */
export function applyPrize(pricing: CartPricing, prize: Prize): PromoResult {
  let discountCents = 0;
  let status: PromoResult["status"] = "applied";
  if (prize.type === "percent") {
    discountCents = Math.round((pricing.subtotalCents * prize.value) / 100);
  } else if (pricing.totalQuantity >= 2) {
    discountCents = Math.min(...pricing.lines.map((l) => l.unitPriceCents));
  } else {
    status = "needs_second_item";
  }
  discountCents = Math.min(discountCents, pricing.subtotalCents);
  return { discountCents, status, totalAfterPromoCents: pricing.totalBeforeTaxCents - discountCents };
}

export const TOTAL_PRIZE_WEIGHT = TOTAL_WEIGHT;
