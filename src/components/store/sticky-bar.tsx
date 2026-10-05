"use client";

import { AnimatePresence, m } from "framer-motion";
import { useEffect, useState } from "react";
import { getColor } from "@/config/product";
import { formatMoney } from "@/lib/money";
import { AddToCartButton, useSelectionPricing } from "./buy-controls";
import { useStore } from "./store-provider";

/**
 * Bouton « Ajouter au panier » collant en bas (mobile uniquement). Il n'apparaît qu'après
 * le bloc d'achat du hero et disparaît dès que le CTA final ou le pied de page arrive,
 * pour ne jamais masquer de contrôle ; un espace équivalent est réservé en bas de page.
 */
export function StickyBuyBar() {
  const { t, locale, colorId, size, quantity, drawerOpen } = useStore();
  const pricing = useSelectionPricing();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("buy-box");
    const blockers = ["final-cta", "site-footer"].map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    let frame = 0;
    // Position recalculée au défilement (une fois par image) : fiable même après un saut d'ancre.
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const pastHero = hero ? hero.getBoundingClientRect().bottom < 0 : true;
      const blocked = blockers.some((el) => el.getBoundingClientRect().top < vh);
      setVisible(pastHero && !blocked);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const color = getColor(colorId);

  return (
    <>
      <div className="h-[calc(var(--sticky-bar-h)+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true" />
      <AnimatePresence>
        {visible && !drawerOpen && (
          <m.div
            key="sticky"
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            exit={{ y: "110%" }}
            transition={{ type: "tween", duration: 0.2 }}
            className="fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-ink bg-paper px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden"
            role="region"
            aria-label={t.buy.addToCart}
          >
            <div className="mx-auto flex max-w-xl items-center gap-3 pr-[6px]">
              <div className="min-w-0 shrink-0">
                <p className="truncate font-mono text-[11px] font-bold uppercase">
                  {color?.label[locale]} · {size ?? t.sizeGuide.pickSize + " ?"} ×{quantity}
                </p>
                <p className="font-mono text-xl font-bold tabular-nums">{formatMoney(pricing.subtotalCents, locale)}</p>
              </div>
              <AddToCartButton className="min-w-0 flex-1 !min-h-12 !px-3 !text-xs" />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
