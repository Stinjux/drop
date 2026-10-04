"use client";

import { useEffect, useRef } from "react";
import { getMedia, getVariant, product } from "@/config/product";
import { store } from "@/config/store";
import { fmt } from "@/content";
import { deliveryEstimate } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { IconClose, IconLock, IconTrash } from "../ui/icons";
import { btn, ProductImage, QuantityStepper, Spinner } from "../ui/primitives";
import { CheckoutAlert } from "./checkout-alert";
import { useStore } from "./store-provider";

export function CartDrawer() {
  const s = useStore();
  const { t, locale } = s;
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (s.drawerOpen && !d.open) d.showModal();
    if (!s.drawerOpen && d.open) d.close();
  }, [s.drawerOpen]);

  const pricing = s.cartPricing;
  const loading = s.checkout.status === "loading";
  const mine = s.checkout.status === "loading" && s.checkout.source === "cart";
  const est = deliveryEstimate();
  const otherUnits = (variantId: string) => s.cart.filter((l) => l.variantId !== variantId).reduce((n, l) => n + l.quantity, 0);

  return (
    <dialog
      ref={ref}
      aria-labelledby="cart-title"
      onClose={s.closeDrawer}
      onClick={(e) => {
        if (e.target === ref.current) s.closeDrawer();
      }}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-md bg-cream p-0 text-ink shadow-2xl open:animate-drawer"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="cart-title" className="font-display text-xl font-bold">
            {t.cart.title}
          </h2>
          <button type="button" onClick={s.closeDrawer} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sand" aria-label={t.a11y.close}>
            <IconClose />
          </button>
        </div>

        {s.cart.length === 0 || !pricing ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-muted">{t.cart.empty}</p>
            <button type="button" className={btn.secondary} onClick={s.closeDrawer}>
              {t.cart.continue}
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {pricing.lines.map((line) => {
                const variant = getVariant(line.variantId);
                const media = getMedia(variant?.mediaId);
                return (
                  <li key={line.variantId} className="flex gap-4 py-4">
                    <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-sand">
                      <ProductImage media={media} locale={locale} sizes="80px" className="size-full object-cover" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold leading-snug">{product.name[locale]}</p>
                          <p className="text-sm text-muted">{variant?.label[locale]}</p>
                        </div>
                        <p className="shrink-0 font-semibold tabular-nums">{formatMoney(line.lineTotalCents, locale)}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <QuantityStepper
                          size="sm"
                          value={line.quantity}
                          max={store.maxQuantityPerOrder - otherUnits(line.variantId)}
                          onChange={(q) => s.setLineQuantity(line.variantId, q)}
                          labels={{ decrease: t.a11y.decrease, increase: t.a11y.increase, quantity: `${t.buy.quantity} — ${variant?.label[locale]}` }}
                        />
                        <button
                          type="button"
                          onClick={() => s.removeLine(line.variantId)}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-muted hover:text-accent"
                        >
                          <IconTrash width={18} height={18} />
                          {t.cart.remove}
                        </button>
                      </div>
                      <p className="text-xs text-muted">
                        {formatMoney(line.unitPriceCents, locale)} {t.buy.perUnit}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-line bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              {pricing.freeShippingRemainingCents !== null ? (
                <p className="mb-3 rounded-lg bg-pine-soft px-3 py-2 text-sm text-pine">
                  {fmt(t.cart.freeShippingRemaining, { amount: formatMoney(pricing.freeShippingRemainingCents, locale) })}
                </p>
              ) : pricing.shippingCents === 0 ? (
                <p className="mb-3 rounded-lg bg-pine-soft px-3 py-2 text-sm text-pine">{t.cart.freeShippingReached}</p>
              ) : null}
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt>{t.cart.subtotal}</dt>
                  <dd className="tabular-nums">{formatMoney(pricing.subtotalCents, locale)}</dd>
                </div>
                {pricing.savingsCents > 0 && (
                  <div className="flex justify-between text-pine">
                    <dt>{t.cart.savings}</dt>
                    <dd className="tabular-nums">−{formatMoney(pricing.savingsCents, locale)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt>{t.cart.shipping}</dt>
                  <dd className="tabular-nums">{pricing.shippingCents === 0 ? t.cart.free : formatMoney(pricing.shippingCents, locale)}</dd>
                </div>
                {s.taxesAtCheckout && (
                  <div className="flex justify-between text-muted">
                    <dt>{t.cart.taxes}</dt>
                    <dd>{t.cart.taxesAtCheckout}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
                  <dt>{s.taxesAtCheckout ? t.cart.totalBeforeTax : t.cart.total}</dt>
                  <dd className="tabular-nums">{formatMoney(pricing.totalBeforeTaxCents, locale)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-muted">{fmt(t.buy.delivery, est)}</p>
              <CheckoutAlert source="cart" />
              <button
                type="button"
                className={`${btn.primary} mt-4 w-full`}
                disabled={loading}
                aria-busy={loading}
                onClick={() => s.startCheckout(s.cart, "cart")}
              >
                {mine ? (
                  <>
                    <Spinner /> {t.buy.loading}
                  </>
                ) : (
                  <>
                    <IconLock width={20} height={20} /> {t.cart.checkout}
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-xs text-muted">{t.cart.secureNote}</p>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
