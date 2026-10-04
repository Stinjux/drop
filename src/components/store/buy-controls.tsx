"use client";

import { product } from "@/config/product";
import { store } from "@/config/store";
import { fmt } from "@/content";
import { catalog, deliveryEstimate } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { baseUnitPrice, priceCart } from "@/lib/pricing";
import { IconCart, IconLock } from "../ui/icons";
import { btn, QuantityStepper, Spinner } from "../ui/primitives";
import { CheckoutAlert } from "./checkout-alert";
import { useStore } from "./store-provider";

/** Prix de la sélection courante (variante + quantité), calculé avec le moteur partagé. */
export function useSelectionPricing() {
  const { variantId, quantity } = useStore();
  return priceCart([{ variantId, quantity }], catalog);
}

export function VariantPicker({ idPrefix }: { idPrefix: string }) {
  const { t, locale, variantId, setVariantId } = useStore();
  if (product.variants.length < 2) return null;
  const current = product.variants.find((v) => v.id === variantId);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">
        {t.buy.variant} : <span className="font-normal text-muted">{current?.label[locale]}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {product.variants.map((v) => {
          const id = `${idPrefix}-variant-${v.id}`;
          return (
            <label
              key={v.id}
              htmlFor={id}
              className={`relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
                v.id === variantId ? "border-ink bg-white" : "border-line bg-white/60 hover:border-ink-soft"
              } ${v.available ? "" : "cursor-not-allowed opacity-50"}`}
            >
              <input
                id={id}
                type="radio"
                name={`${idPrefix}-variant`}
                value={v.id}
                checked={v.id === variantId}
                disabled={!v.available}
                onChange={() => setVariantId(v.id)}
                className="sr-only"
              />
              {v.swatch && <span className="size-5 rounded-full border border-black/10" style={{ background: v.swatch }} aria-hidden="true" />}
              {v.label[locale]}
              {!v.available && <span className="text-xs">({t.buy.unavailable})</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function BuyNowButton({ source, className = "", label, quantity }: { source: string; className?: string; label?: string; quantity?: number }) {
  const s = useStore();
  const loading = s.checkout.status === "loading";
  const mine = loading && s.checkout.status === "loading" && s.checkout.source === source;
  return (
    <button
      type="button"
      className={`${btn.primary} ${className}`}
      disabled={loading}
      aria-busy={mine}
      onClick={() => s.startCheckout([{ variantId: s.variantId, quantity: quantity ?? s.quantity }], source)}
    >
      {mine ? (
        <>
          <Spinner /> {s.t.buy.loading}
        </>
      ) : (
        <>
          <IconLock width={20} height={20} /> {label ?? s.t.buy.orderNow}
        </>
      )}
    </button>
  );
}

export function BuyControls({ source, showVariant = true }: { source: string; showVariant?: boolean }) {
  const s = useStore();
  const { t, locale } = s;
  const pricing = useSelectionPricing();
  const base = baseUnitPrice(product.pricing.tiers);
  const est = deliveryEstimate();
  const ship = catalog.shipping;
  const shippingText =
    pricing.shippingCents === 0
      ? t.buy.shippingFree
      : ship.freeFromSubtotalCents !== null
        ? fmt(t.buy.shippingLine, { amount: formatMoney(ship.amountCents, locale), threshold: formatMoney(ship.freeFromSubtotalCents, locale) })
        : fmt(t.buy.shippingFlat, { amount: formatMoney(ship.amountCents, locale) });

  return (
    <div className="space-y-5">
      <div aria-live="polite">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-4xl font-bold tabular-nums">{formatMoney(pricing.subtotalCents, locale)}</span>
          {pricing.savingsCents > 0 && (
            <>
              <s className="text-lg text-muted tabular-nums" aria-label={`${t.offers.reference} ${formatMoney(pricing.baseSubtotalCents, locale)}`}>
                {formatMoney(pricing.baseSubtotalCents, locale)}
              </s>
              <span className="rounded-full bg-pine-soft px-2.5 py-0.5 text-sm font-semibold text-pine">
                {fmt(t.buy.youSave, { amount: formatMoney(pricing.savingsCents, locale) })}
              </span>
            </>
          )}
        </p>
        <p className="mt-1 text-sm text-muted">
          {s.quantity > 1 ? fmt(t.buy.unitPriceAt, { price: formatMoney(pricing.lines[0].unitPriceCents, locale) }) : `${formatMoney(base, locale)} ${t.buy.perUnit}`}
          {" · "}
          {s.taxesAtCheckout ? t.buy.taxesExtra : t.buy.taxesNone}
        </p>
      </div>

      {showVariant && <VariantPicker idPrefix={source} />}

      <div>
        <label htmlFor={`${source}-qty`} className="mb-2 block text-sm font-semibold">
          {t.buy.quantity}
        </label>
        <QuantityStepper
          id={`${source}-qty`}
          value={s.quantity}
          onChange={s.setQuantity}
          max={store.maxQuantityPerOrder}
          labels={{ decrease: t.a11y.decrease, increase: t.a11y.increase, quantity: t.buy.quantity }}
        />
        {s.quantity >= store.maxQuantityPerOrder && <p className="mt-2 text-xs text-muted">{fmt(t.buy.maxReached, { max: store.maxQuantityPerOrder })}</p>}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <BuyNowButton source={source} className="w-full whitespace-nowrap text-lg" />
        <button type="button" className={`${btn.secondary} w-full whitespace-nowrap`} onClick={() => s.addToCart({ variantId: s.variantId, quantity: s.quantity })}>
          <IconCart width={20} height={20} /> {t.buy.addToCart}
        </button>
      </div>
      <CheckoutAlert source={source} />
      <p className="text-sm text-muted">
        {shippingText} · {fmt(t.buy.delivery, est)}
      </p>
    </div>
  );
}
