"use client";

import { getMedia, product } from "@/config/product";
import { fmt } from "@/content";
import { formatMoney } from "@/lib/money";
import { ProductImage } from "../ui/primitives";
import { AddToCartButton, BuyNowButton, useReferencePrice, VariantPicker } from "./buy-controls";
import { CheckoutAlert } from "./checkout-alert";
import { useStore } from "./store-provider";

/** 11. CTA final plein écran sur fond accent, avec rappel du prix. */
export function FinalCta() {
  const { t, locale, mediaId } = useStore();
  const { pricing, reference } = useReferencePrice();
  const media = getMedia(mediaId);
  return (
    <section id="final-cta" aria-labelledby="final-title" className="flex min-h-[85dvh] items-center border-b-[3px] border-ink bg-accent py-16 text-ink">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="min-w-0 [container-type:inline-size]">
          <p className="font-mono text-sm font-bold uppercase tracking-wider">{product.name[locale]}</p>
          <h2 id="final-title" className="display-xl mt-4">
            {t.blocks.finalTitle}
          </h2>
          <p className="mt-6 flex flex-wrap items-baseline gap-3 font-mono text-3xl font-bold sm:text-4xl">
            {fmt(t.blocks.finalPrice, { price: formatMoney(pricing.subtotalCents, locale) })}
            {reference && <s className="text-xl opacity-70">{formatMoney(reference, locale)}</s>}
          </p>
          <div className="mt-8 max-w-md space-y-5">
            <VariantPicker idPrefix="final" />
            <div className="grid gap-4 pr-[6px]">
              <AddToCartButton className="w-full !bg-white hover:!bg-paper" sizePicker="final-size" />
              <BuyNowButton source="final" className="w-full" sizePicker="final-size" />
            </div>
            <CheckoutAlert source="final" />
          </div>
        </div>
        <div className="hidden border-[3px] border-ink bg-white shadow-[var(--shadow-hard)] lg:block">
          <ProductImage media={media} locale={locale} sizes="40vw" className="aspect-square w-full object-cover" />
        </div>
      </div>
    </section>
  );
}
