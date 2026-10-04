"use client";

import { getMedia, getVariant, product } from "@/config/product";
import { store } from "@/config/store";
import { fmt } from "@/content";
import { IconCheck } from "../ui/icons";
import { ProductImage } from "../ui/primitives";
import { BuyControls } from "./buy-controls";
import { useStore } from "./store-provider";

export function FinalBuy() {
  const { t, locale, variantId } = useStore();
  const media = getMedia(getVariant(variantId)?.mediaId);
  const points = [t.trust.securePayment, t.trust.shipsCanada, fmt(t.trust.returns, { days: store.returns.windowDays }), t.trust.noAccount];
  return (
    <div id="final-buy" className="grid grid-cols-1 items-center gap-8 rounded-[32px] bg-white p-5 shadow-[var(--shadow-soft)] ring-1 ring-line sm:p-8 md:grid-cols-[0.9fr_1.1fr]">
      <div>
        <div className="overflow-hidden rounded-3xl bg-sand">
          <ProductImage media={media} locale={locale} sizes="(min-width: 768px) 40vw, 100vw" className="aspect-[4/3] w-full object-cover md:aspect-square" />
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-ink-soft">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <IconCheck width={18} height={18} className="shrink-0 text-pine" /> {p}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-display text-2xl font-bold">{product.name[locale]}</p>
        <p className="mb-5 mt-1 text-ink-soft">{product.description[locale]}</p>
        <BuyControls source="final" />
      </div>
    </div>
  );
}
