"use client";

import { product } from "@/config/product";
import { store } from "@/config/store";
import { fmt } from "@/content";
import { catalog, deliveryEstimate } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { priceCart } from "@/lib/pricing";
import { IconCart, IconLock } from "../ui/icons";
import { btn, QuantityStepper, Spinner } from "../ui/primitives";
import { CheckoutAlert } from "./checkout-alert";
import { useStore } from "./store-provider";

/** Prix de la sélection courante (variante + quantité), calculé avec le moteur partagé. */
export function useSelectionPricing() {
  const { variantId, quantity } = useStore();
  return priceCart([{ variantId, quantity }], catalog);
}

/**
 * Prix de référence barré et pourcentage : uniquement s'ils sont JUSTIFIÉS —
 * soit un `compareAt` renseigné avec justification dans data/product.ts, soit la
 * remise de quantité réelle (prix 1 unité × quantité).
 */
export function useReferencePrice() {
  const pricing = useSelectionPricing();
  const compare = product.pricing.compareAt;
  const reference =
    compare && compare.justification.trim() && compare.priceCents > pricing.lines[0].baseUnitPriceCents
      ? compare.priceCents * pricing.totalQuantity
      : pricing.savingsCents > 0
        ? pricing.baseSubtotalCents
        : null;
  const percent = reference ? Math.floor(((reference - pricing.subtotalCents) * 100) / reference) : 0;
  return { pricing, reference, percent };
}

export function PriceDisplay({ size = "lg" }: { size?: "lg" | "md" }) {
  const { t, locale } = useStore();
  const { pricing, reference, percent } = useReferencePrice();
  return (
    <div aria-live="polite" className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className={`border-[3px] border-ink bg-accent px-2 font-mono font-bold tabular-nums tracking-tight text-ink ${size === "lg" ? "text-4xl sm:text-5xl" : "text-3xl"}`} data-testid="price">
        {formatMoney(pricing.subtotalCents, locale)}
      </span>
      {reference && (
        <>
          <s className="font-mono text-lg text-muted tabular-nums" aria-label={`${t.hero.compareAt} ${formatMoney(reference, locale)}`}>
            {formatMoney(reference, locale)}
          </s>
          {percent > 0 && (
            <span className="border-2 border-ink bg-accent px-2 py-0.5 font-mono text-sm font-bold text-ink">{fmt(t.hero.discount, { percent })}</span>
          )}
        </>
      )}
    </div>
  );
}

export function VariantPicker({ idPrefix }: { idPrefix: string }) {
  const { t, locale, variantId, setVariantId } = useStore();
  if (product.variants.length < 2) return null;
  const current = product.variants.find((v) => v.id === variantId);
  return (
    <fieldset>
      <legend className="mb-2 font-mono text-xs font-bold uppercase tracking-wider">
        {t.buy.variant} : <span className="font-sans text-sm font-medium normal-case tracking-normal">{current?.label[locale]}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {product.variants.map((v) => {
          const id = `${idPrefix}-variant-${v.id}`;
          const selected = v.id === variantId;
          return (
            <label
              key={v.id}
              htmlFor={id}
              className={`inline-flex min-h-12 cursor-pointer items-center gap-2 border-[3px] border-ink px-3 py-2 text-sm font-bold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                selected ? "bg-ink text-paper" : "bg-white text-ink hover:bg-paper"
              } ${v.available ? "" : "cursor-not-allowed opacity-40 line-through"}`}
            >
              <input id={id} type="radio" name={`${idPrefix}-variant`} value={v.id} checked={selected} disabled={!v.available} onChange={() => setVariantId(v.id)} className="sr-only" />
              {v.swatch && <span className="size-5 border-2 border-current" style={{ background: v.swatch }} aria-hidden="true" />}
              {v.label[locale]}
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
  const mine = s.checkout.status === "loading" && s.checkout.source === source;
  return (
    <button
      type="button"
      className={`${btn.secondary} ${className}`}
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

export function AddToCartButton({ className = "" }: { className?: string }) {
  const s = useStore();
  return (
    <button type="button" className={`${btn.primary} ${className}`} onClick={() => s.addToCart({ variantId: s.variantId, quantity: s.quantity })}>
      <IconCart width={20} height={20} /> {s.t.buy.addToCart}
    </button>
  );
}

export function BuyControls({ source, showVariant = true }: { source: string; showVariant?: boolean }) {
  const s = useStore();
  const { t } = s;
  const est = deliveryEstimate();
  return (
    <div className="space-y-5">
      <div>
        <PriceDisplay />
        <p className="mt-1 text-sm text-muted">{s.taxesAtCheckout ? t.buy.taxesExtra : t.buy.taxesNone}</p>
      </div>

      {showVariant && <VariantPicker idPrefix={source} />}

      <div>
        <label htmlFor={`${source}-qty`} className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider">
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

      <div className="grid gap-4 pr-[6px]">
        <AddToCartButton className="w-full" />
        <BuyNowButton source={source} className="w-full" />
      </div>
      <CheckoutAlert source={source} />
      <p className="font-mono text-xs font-bold uppercase tracking-wide">
        {t.buy.shippingFree} · {fmt(t.buy.delivery, est)}
      </p>
    </div>
  );
}
