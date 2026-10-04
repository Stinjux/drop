"use client";

import { getMedia, getVariant, product } from "@/config/product";
import { store } from "@/config/store";
import { fmt } from "@/content";
import { formatMoney } from "@/lib/money";
import { packOffer } from "@/lib/pricing";
import { IconCheck } from "../ui/icons";
import { ProductImage } from "../ui/primitives";
import { BuyNowButton, VariantPicker } from "./buy-controls";
import { CheckoutAlert } from "./checkout-alert";
import { useStore } from "./store-provider";

export function Offers() {
  const s = useStore();
  const { t, locale } = s;
  const quantities = product.offerQuantities.filter((q) => q >= 1 && q <= store.maxQuantityPerOrder);
  const offers = quantities.map((q) => packOffer(q, product.pricing.tiers));
  const best = offers.reduce((a, b) => (b.unitPriceCents < a.unitPriceCents ? b : a), offers[0]);
  const media = getMedia(getVariant(s.variantId)?.mediaId);

  return (
    <div>
      <div className="mx-auto mb-6 max-w-md">
        <VariantPicker idPrefix="offers" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {offers.map((o) => {
          const selected = s.quantity === o.quantity;
          const isBest = offers.length > 1 && o === best && o.savingsCents > 0;
          return (
            <div
              key={o.quantity}
              className={`relative flex flex-col rounded-3xl bg-white p-5 ring-2 transition sm:p-6 ${selected ? "ring-ink shadow-[var(--shadow-soft)]" : "ring-line hover:ring-ink-soft"}`}
            >
              {isBest && (
                <span className="absolute -top-3 left-5 rounded-full bg-pine px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  {t.offers.bestValue}
                </span>
              )}
              <button
                type="button"
                onClick={() => s.setQuantity(o.quantity)}
                aria-pressed={selected}
                className="flex items-center gap-4 text-left"
              >
                <span className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-sand">
                  <ProductImage media={media} locale={locale} sizes="80px" className="size-full object-cover" />
                  {o.quantity > 1 && (
                    <span className="absolute bottom-1 right-1 rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white">×{o.quantity}</span>
                  )}
                </span>
                <span>
                  <span className="block font-display text-xl font-bold">
                    {fmt(o.quantity > 1 ? t.offers.unitsPlural : t.offers.units, { count: o.quantity })}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {formatMoney(o.unitPriceCents, locale)} {t.buy.perUnit}
                  </span>
                </span>
              </button>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold tabular-nums">{formatMoney(o.totalCents, locale)}</span>
                {o.savingsCents > 0 && (
                  <s className="text-muted tabular-nums" aria-label={`${t.offers.reference} ${formatMoney(o.baseTotalCents, locale)}`}>
                    {formatMoney(o.baseTotalCents, locale)}
                  </s>
                )}
              </div>
              <p className={`mt-1 min-h-6 text-sm font-semibold ${o.savingsCents > 0 ? "text-pine" : "text-muted"}`}>
                {o.savingsCents > 0 ? fmt(t.offers.save, { amount: formatMoney(o.savingsCents, locale), percent: o.savingsPercent }) : t.offers.reference}
              </p>

              <div className="mt-auto pt-5">
                {selected ? (
                  <BuyNowButton source={`offer-${o.quantity}`} quantity={o.quantity} label={t.offers.choose} className="w-full" />
                ) : (
                  <button
                    type="button"
                    onClick={() => s.setQuantity(o.quantity)}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-full border-2 border-ink px-5 font-semibold transition hover:bg-ink hover:text-white"
                  >
                    {t.offers.select}
                  </button>
                )}
                {selected && (
                  <p className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-pine">
                    <IconCheck width={16} height={16} /> {t.offers.selected}
                  </p>
                )}
                <CheckoutAlert source={`offer-${o.quantity}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
