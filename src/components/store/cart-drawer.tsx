"use client";

import { m } from "framer-motion";
import { useEffect, useRef } from "react";
import { getMedia, getVariant, product } from "@/config/product";
import { store } from "@/config/store";
import { fmt } from "@/content";
import { deliveryEstimate } from "@/lib/catalog";
import { giftProgress } from "@/lib/gift";
import { formatMoney } from "@/lib/money";
import { IconClose, IconLock, IconTrash } from "../ui/icons";
import { btn, ProductImage, QuantityStepper, Spinner } from "../ui/primitives";
import { CheckoutAlert } from "./checkout-alert";
import { useStore } from "./store-provider";

/** Barre « plus que X $ pour un cadeau » — affichée seulement si un cadeau est configuré. */
function GiftBar({ subtotalCents }: { subtotalCents: number }) {
  const { t, locale } = useStore();
  const g = giftProgress(subtotalCents);
  if (!g) return null;
  const label = product.gift.label[locale];
  return (
    <div className="border-[3px] border-ink bg-white p-3" data-testid="gift-bar">
      <p className="text-sm font-bold">
        {g.reached ? fmt(t.cart.giftReached, { gift: label }) : fmt(t.cart.giftRemaining, { amount: formatMoney(g.remainingCents, locale), gift: label })}
      </p>
      <div className="mt-2 h-4 border-2 border-ink bg-paper" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={g.percent} aria-label={label}>
        <m.div className="h-full bg-accent" initial={false} animate={{ width: `${g.percent}%` }} transition={{ duration: 0.3 }} />
      </div>
    </div>
  );
}

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
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-md bg-transparent p-0 text-ink"
    >
      {s.drawerOpen && (
        <m.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          transition={{ type: "tween", duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
          className="flex h-full flex-col border-l-[3px] border-ink bg-paper"
        >
          <div className="flex items-center justify-between border-b-[3px] border-ink px-5 py-4">
            <h2 id="cart-title" className="font-display text-lg font-bold uppercase">
              {t.cart.title} <span className="font-mono">({s.cartCount})</span>
            </h2>
            <button type="button" onClick={s.closeDrawer} className="inline-flex size-11 items-center justify-center border-[3px] border-ink bg-white hover:bg-accent" aria-label={t.a11y.close}>
              <IconClose />
            </button>
          </div>

          {s.cart.length === 0 || !pricing ? (
            <div className="flex flex-1 flex-col items-start justify-center gap-5 px-6">
              <p className="font-display text-xl font-bold uppercase">{t.cart.empty}</p>
              <button type="button" className={btn.outline} onClick={s.closeDrawer}>
                {t.cart.continue}
              </button>
            </div>
          ) : (
            <>
              <div className="border-b-[3px] border-ink p-4">
                <GiftBar subtotalCents={pricing.subtotalCents} />
              </div>
              <ul className="flex-1 overflow-y-auto">
                {pricing.lines.map((line) => {
                  const variant = getVariant(line.variantId);
                  const media = getMedia(variant?.mediaId);
                  return (
                    <li key={line.variantId} className="flex gap-4 border-b-[3px] border-ink p-4">
                      <div className="size-20 shrink-0 overflow-hidden border-[3px] border-ink bg-white">
                        <ProductImage media={media} locale={locale} sizes="80px" className="size-full object-cover" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold leading-snug">{product.name[locale]}</p>
                            <p className="text-sm text-muted">{variant?.label[locale]}</p>
                          </div>
                          <p className="shrink-0 font-mono font-bold tabular-nums">{formatMoney(line.lineTotalCents, locale)}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <QuantityStepper
                            size="sm"
                            value={line.quantity}
                            max={store.maxQuantityPerOrder - otherUnits(line.variantId)}
                            onChange={(q) => s.setLineQuantity(line.variantId, q)}
                            labels={{ decrease: t.a11y.decrease, increase: t.a11y.increase, quantity: `${t.buy.quantity} — ${variant?.label[locale]}` }}
                          />
                          <button type="button" onClick={() => s.removeLine(line.variantId)} className="inline-flex items-center gap-1 px-1 py-1 text-sm font-bold underline decoration-2 underline-offset-4">
                            <IconTrash width={16} height={16} />
                            {t.cart.remove}
                          </button>
                        </div>
                        <p className="font-mono text-xs text-muted">
                          {formatMoney(line.unitPriceCents, locale)} {t.buy.perUnit}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t-[3px] border-ink bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                <dl className="space-y-1.5 font-mono text-sm">
                  <div className="flex justify-between">
                    <dt>{t.cart.subtotal}</dt>
                    <dd className="tabular-nums">{formatMoney(pricing.subtotalCents, locale)}</dd>
                  </div>
                  {pricing.savingsCents > 0 && (
                    <div className="flex justify-between">
                      <dt>{t.cart.savings}</dt>
                      <dd className="tabular-nums">−{formatMoney(pricing.savingsCents, locale)}</dd>
                    </div>
                  )}
                  {s.promo && s.promoResult && (
                    <div data-testid="cart-promo">
                      <div className="flex items-start justify-between gap-2">
                        <dt>
                          {t.scratch.promoLine} <span className="font-bold">({s.promo.code})</span>
                        </dt>
                        <dd className="tabular-nums">{s.promoResult.discountCents > 0 ? `−${formatMoney(s.promoResult.discountCents, locale)}` : "—"}</dd>
                      </div>
                      {s.promoResult.status === "needs_second_item" && <p className="mt-1 text-xs font-bold text-accent-ink">{t.scratch.needsSecond}</p>}
                      <button type="button" onClick={() => s.setPromo(null)} className="mt-1 text-xs font-bold underline decoration-2 underline-offset-4">
                        {t.scratch.remove}
                      </button>
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
                  <div className="flex justify-between border-t-[3px] border-ink pt-2 text-lg font-bold">
                    <dt>{s.taxesAtCheckout ? t.cart.totalBeforeTax : t.cart.total}</dt>
                    <dd className="tabular-nums">{formatMoney(s.promoResult?.totalAfterPromoCents ?? pricing.totalBeforeTaxCents, locale)}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-xs text-muted">{fmt(t.buy.delivery, est)}</p>
                <CheckoutAlert source="cart" />
                <div className="mt-4 pr-[6px]">
                  <button type="button" className={`${btn.primary} w-full`} disabled={loading} aria-busy={mine} onClick={() => s.startCheckout(s.cart, "cart")}>
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
                </div>
                <p className="mt-3 text-center text-xs text-muted">{t.cart.secureNote}</p>
              </div>
            </>
          )}
        </m.div>
      )}
    </dialog>
  );
}
