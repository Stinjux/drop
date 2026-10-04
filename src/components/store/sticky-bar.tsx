"use client";

import { useEffect, useState } from "react";
import { product } from "@/config/product";
import { formatMoney } from "@/lib/money";
import { BuyNowButton, useSelectionPricing } from "./buy-controls";
import { useStore } from "./store-provider";

/**
 * Barre d'achat fixe (mobile uniquement). Elle n'apparaît que lorsque les blocs
 * d'achat (hero, bloc final) et le pied de page sont hors écran, pour ne jamais
 * masquer de contrôle ; un espace équivalent est réservé en bas de page.
 */
export function StickyBuyBar() {
  const { t, locale, variantId, quantity, drawerOpen } = useStore();
  const pricing = useSelectionPricing();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const ids = ["buy-box", "final-buy", "site-footer"];
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!("IntersectionObserver" in window) || els.length === 0) return;
    const seen = new Map<Element, boolean>();
    const hero = document.getElementById("buy-box");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target, e.isIntersecting);
      const anyVisible = [...seen.values()].some(Boolean);
      // Uniquement après avoir dépassé le bloc d'achat du hero.
      const pastHero = hero ? hero.getBoundingClientRect().bottom < 0 : true;
      setVisible(!anyVisible && pastHero);
    });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const variant = product.variants.find((v) => v.id === variantId);
  const show = visible && !drawerOpen;

  return (
    <>
      <div className="h-[calc(var(--sticky-bar-h)+env(safe-area-inset-bottom))] md:hidden" aria-hidden="true" />
      {show && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgb(22_32_46/0.25)] backdrop-blur animate-bar md:hidden"
          role="region"
          aria-label={t.buy.orderNow}
        >
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted">
                {variant?.label[locale]} · ×{quantity}
              </p>
              <p className="font-display text-xl font-bold tabular-nums">{formatMoney(pricing.subtotalCents, locale)}</p>
            </div>
            <BuyNowButton source="sticky" className="shrink-0 px-5" />
          </div>
        </div>
      )}
    </>
  );
}
