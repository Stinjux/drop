import { describe, expect, it } from "vitest";
import { prizeLabel, prizeOdds, scratchGame } from "@/config/promo";
import { catalog } from "@/lib/catalog";
import { priceCart } from "@/lib/pricing";
import { applyPrize, findPrize, prizeFromRoll, TOTAL_PRIZE_WEIGHT } from "@/lib/promo";
import { product } from "@/config/product";

const v = product.variants;

describe("tirage du jeu à gratter", () => {
  it("1 acheté = 1 offert tombe exactement 1 fois sur 200", () => {
    expect(TOTAL_PRIZE_WEIGHT).toBe(10_000);
    const bogo = scratchGame.prizes.find((p) => p.type === "bogo")!;
    expect(bogo.weight / TOTAL_PRIZE_WEIGHT).toBe(1 / 200);
    expect(prizeOdds(bogo, "fr")).toContain("1 sur 200");
  });
  it("tous les lots vont de 5 % à 1 acheté = 1 offert", () => {
    const percents = scratchGame.prizes.filter((p) => p.type === "percent").map((p) => (p.type === "percent" ? p.value : 0));
    expect(Math.min(...percents)).toBe(5);
    expect(scratchGame.prizes.every((p) => p.weight > 0)).toBe(true);
  });
  it("bornes du tirage : chaque valeur 0..9999 donne exactement la distribution configurée", () => {
    const counts = new Map<string, number>();
    for (let roll = 0; roll < TOTAL_PRIZE_WEIGHT; roll++) {
      const p = prizeFromRoll(roll);
      counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
    }
    for (const p of scratchGame.prizes) expect(counts.get(p.id)).toBe(p.weight);
    expect(prizeFromRoll(0).type).toBe("bogo");
    expect(prizeFromRoll(49).type).toBe("bogo");
    expect(prizeFromRoll(50).type).toBe("percent");
  });
  it("libellés", () => {
    expect(prizeLabel(findPrize("bogo")!, "fr")).toBe("1 acheté = 1 offert");
    expect(prizeLabel(findPrize("p5")!, "en")).toMatch(/5/);
  });
});

describe("application du rabais", () => {
  it("pourcentage sur le sous-total (après remise de quantité)", () => {
    const p = priceCart([{ variantId: v[0].id, quantity: 2 }], catalog); // 2 × 46,74
    const r = applyPrize(p, findPrize("p10")!);
    expect(r.status).toBe("applied");
    expect(r.discountCents).toBe(Math.round(9348 * 0.1));
    expect(r.totalAfterPromoCents).toBe(p.totalBeforeTaxCents - r.discountCents);
  });
  it("1 acheté = 1 offert : exige 2 unités, puis offre une unité au prix du palier", () => {
    const one = priceCart([{ variantId: v[0].id, quantity: 1 }], catalog);
    expect(applyPrize(one, findPrize("bogo")!)).toMatchObject({ status: "needs_second_item", discountCents: 0 });
    const two = priceCart([{ variantId: v[0].id, quantity: 1 }, { variantId: v[9].id, quantity: 1 }], catalog);
    expect(applyPrize(two, findPrize("bogo")!)).toMatchObject({ status: "applied", discountCents: 4674, totalAfterPromoCents: 4674 });
    // Une seule unité offerte par commande, même avec 4 unités.
    const four = priceCart([{ variantId: v[0].id, quantity: 4 }], catalog);
    expect(applyPrize(four, findPrize("bogo")!).discountCents).toBe(4124);
  });
});
