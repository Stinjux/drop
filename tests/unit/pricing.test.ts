import { describe, expect, it } from "vitest";
import { product } from "@/config/product";
import { store } from "@/config/store";
import { catalog } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { assertValidTiers, normalizeCartLines, packOffer, priceCart, shippingCostFor, unitPriceForQuantity } from "@/lib/pricing";

const tiers = [
  { minQuantity: 1, unitPriceCents: 3999 },
  { minQuantity: 2, unitPriceCents: 3599 },
  { minQuantity: 3, unitPriceCents: 3299 },
];
const shipping = { id: "std", label: { fr: "", en: "" }, amountCents: 799, freeFromSubtotalCents: 7500, processingDays: { min: 1, max: 3 }, transitDays: { min: 7, max: 15 } };
const variants = [
  { id: "a", sku: "A", label: { fr: "A", en: "A" }, available: true },
  { id: "b", sku: "B", label: { fr: "B", en: "B" }, available: true },
  { id: "off", sku: "OFF", label: { fr: "X", en: "X" }, available: false },
];
const ctx = { variants, tiers, maxQuantityPerOrder: 10, shipping };

describe("configuration réelle", () => {
  it("les paliers configurés sont cohérents", () => {
    expect(() => assertValidTiers(product.pricing.tiers)).not.toThrow();
  });
  it("chaque lot proposé respecte la quantité maximale", () => {
    for (const q of product.offerQuantities) expect(q).toBeLessThanOrEqual(store.maxQuantityPerOrder);
  });
  it("le catalogue partagé utilise la configuration", () => {
    expect(catalog.tiers).toBe(product.pricing.tiers);
  });
});

describe("paliers", () => {
  it("refuse des paliers incohérents", () => {
    expect(() => assertValidTiers([{ minQuantity: 2, unitPriceCents: 100 }])).toThrow();
    expect(() => assertValidTiers([{ minQuantity: 1, unitPriceCents: 100 }, { minQuantity: 2, unitPriceCents: 150 }])).toThrow();
    expect(() => assertValidTiers([{ minQuantity: 1, unitPriceCents: 10.5 }])).toThrow();
  });
  it("prix unitaire selon la quantité totale", () => {
    expect(unitPriceForQuantity(1, tiers)).toBe(3999);
    expect(unitPriceForQuantity(2, tiers)).toBe(3599);
    expect(unitPriceForQuantity(3, tiers)).toBe(3299);
    expect(unitPriceForQuantity(9, tiers)).toBe(3299);
  });
});

describe("lots 1/2/3", () => {
  it("calcule total, économies et pourcentage arrondi à la baisse", () => {
    expect(packOffer(1, tiers)).toMatchObject({ totalCents: 3999, savingsCents: 0, savingsPercent: 0 });
    expect(packOffer(2, tiers)).toMatchObject({ unitPriceCents: 3599, totalCents: 7198, baseTotalCents: 7998, savingsCents: 800, savingsPercent: 10 });
    // 3 × 39,99 = 119,97 ; 3 × 32,99 = 98,97 ; économie 21,00 = 17,50 % → 17 %
    expect(packOffer(3, tiers)).toMatchObject({ totalCents: 9897, baseTotalCents: 11997, savingsCents: 2100, savingsPercent: 17 });
  });
});

describe("panier", () => {
  it("fusionne les doublons et applique le palier sur le total mixte", () => {
    const n = normalizeCartLines([{ variantId: "a", quantity: 1 }, { variantId: "b", quantity: 1 }, { variantId: "a", quantity: 1 }], ctx);
    expect(n.ok).toBe(true);
    if (!n.ok) return;
    expect(n.lines).toEqual([{ variantId: "a", quantity: 2 }, { variantId: "b", quantity: 1 }]);
    const p = priceCart(n.lines, ctx);
    expect(p.totalQuantity).toBe(3);
    expect(p.lines.every((l) => l.unitPriceCents === 3299)).toBe(true);
    expect(p.subtotalCents).toBe(9897);
    expect(p.savingsCents).toBe(2100);
    expect(p.shippingCents).toBe(0); // ≥ 75 $
    expect(p.totalBeforeTaxCents).toBe(9897);
  });
  it("frais de livraison sous le seuil et reste à atteindre", () => {
    const p = priceCart([{ variantId: "a", quantity: 1 }], ctx);
    expect(p.shippingCents).toBe(799);
    expect(p.totalBeforeTaxCents).toBe(3999 + 799);
    expect(p.freeShippingRemainingCents).toBe(7500 - 3999);
    expect(shippingCostFor(7500, shipping)).toBe(0);
    expect(shippingCostFor(7499, shipping)).toBe(799);
  });
  it.each([
    [[{ variantId: "zzz", quantity: 1 }], "unknown_variant"],
    [[{ variantId: "off", quantity: 1 }], "unavailable_variant"],
    [[{ variantId: "a", quantity: 0 }], "invalid_quantity"],
    [[{ variantId: "a", quantity: -2 }], "invalid_quantity"],
    [[{ variantId: "a", quantity: 1.5 }], "invalid_quantity"],
    [[{ variantId: "a", quantity: Number.NaN }], "invalid_quantity"],
    [[{ variantId: "a", quantity: 11 }], "invalid_quantity"],
    [[{ variantId: "a", quantity: 6 }, { variantId: "b", quantity: 5 }], "too_many"],
    [[], "empty"],
  ])("refuse %j (%s)", (lines, code) => {
    const n = normalizeCartLines(lines, ctx);
    expect(n.ok).toBe(false);
    if (!n.ok) expect(n.error.code).toBe(code);
  });
});

describe("format monétaire", () => {
  it("CAD en français et en anglais", () => {
    expect(formatMoney(3999, "fr").replace(/\s/g, " ")).toBe("39,99 $");
    expect(formatMoney(3999, "en")).toBe("$39.99");
  });
});
