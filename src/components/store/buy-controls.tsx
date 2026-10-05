"use client";

import { getColor, product, variantIdFor } from "@/config/product";
import { store } from "@/config/store";
import { fmt } from "@/content";
import { catalog, deliveryEstimate } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { priceCart } from "@/lib/pricing";
import { IconCart, IconLock } from "../ui/icons";
import { btn, QuantityStepper, Spinner } from "../ui/primitives";
import { SizeGuide } from "../SizeGuide";
import { CheckoutAlert } from "./checkout-alert";
import { useStore } from "./store-provider";

/** Prix de la sélection courante (variante + quantité), calculé avec le moteur partagé. */
export function useSelectionPricing() {
  const { variantId, colorId, quantity } = useStore();
  // Tant que la taille n'est pas choisie, le prix affiché est celui du coloris (identique pour toutes les tailles).
  const display =
    variantId ??
    product.variants.find((v) => v.colorId === colorId && v.available)?.id ??
    product.variants[0].id;
  return priceCart([{ variantId: display, quantity }], catalog);
}

/**
 * Vérifie qu'une taille est choisie avant l'ajout au panier ou l'achat. Sinon, affiche
 * l'erreur et amène le client au sélecteur de taille.
 */
export function useRequireSize() {
  const s = useStore();
  return (pickerId?: string): string | null => {
    if (s.variantId) return s.variantId;
    s.flagSizeMissing();
    const group =
      document.getElementById(pickerId ?? "hero-size") ??
      document.getElementById("hero-size");
    group?.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    group
      ?.querySelector<HTMLInputElement>("input")
      ?.focus({ preventScroll: true });
    return null;
  };
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
    compare &&
    compare.justification.trim() &&
    compare.priceCents > pricing.lines[0].baseUnitPriceCents
      ? compare.priceCents * pricing.totalQuantity
      : pricing.savingsCents > 0
        ? pricing.baseSubtotalCents
        : null;
  const percent = reference
    ? Math.floor(((reference - pricing.subtotalCents) * 100) / reference)
    : 0;
  return { pricing, reference, percent };
}

export function PriceDisplay({ size = "lg" }: { size?: "lg" | "md" }) {
  const { t, locale } = useStore();
  const { pricing, reference, percent } = useReferencePrice();
  return (
    <div
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
    >
      <span
        className={`border-[3px] border-ink bg-accent px-2 font-mono font-bold tabular-nums tracking-tight text-ink ${size === "lg" ? "text-4xl sm:text-5xl" : "text-3xl"}`}
        data-testid="price"
      >
        {formatMoney(pricing.subtotalCents, locale)}
      </span>
      {reference && (
        <>
          <s
            className="font-mono text-lg text-muted tabular-nums"
            aria-label={`${t.hero.compareAt} ${formatMoney(reference, locale)}`}
          >
            {formatMoney(reference, locale)}
          </s>
          {percent > 0 && (
            <span className="border-2 border-ink bg-accent px-2 py-0.5 font-mono text-sm font-bold text-ink">
              {fmt(t.hero.discount, { percent })}
            </span>
          )}
        </>
      )}
    </div>
  );
}

/** Sélecteur de coloris (pastilles). */
export function ColorPicker({ idPrefix }: { idPrefix: string }) {
  const { t, locale, colorId, setColorId } = useStore();
  const current = getColor(colorId);
  return (
    <fieldset>
      <legend className="mb-2 font-mono text-xs font-bold uppercase tracking-wider">
        {t.sizeGuide.color} :{" "}
        <span className="font-sans text-sm font-medium normal-case tracking-normal">
          {current?.label[locale]}
        </span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {product.colors.map((c) => {
          const id = `${idPrefix}-color-${c.id}`;
          const selected = c.id === colorId;
          return (
            <label
              key={c.id}
              htmlFor={id}
              title={c.label[locale]}
              className={`inline-flex min-h-12 cursor-pointer items-center gap-2 border-[3px] border-ink px-2.5 py-1.5 text-sm font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                selected
                  ? "bg-ink text-paper"
                  : "bg-white text-ink hover:bg-paper"
              }`}
            >
              <input
                id={id}
                type="radio"
                name={`${idPrefix}-color`}
                value={c.id}
                checked={selected}
                onChange={() => setColorId(c.id)}
                className="sr-only"
              />
              <span
                className="size-6 border-2 border-current"
                style={{ background: c.swatch }}
                aria-hidden="true"
              />
              {c.label[locale]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Sélecteur de taille (S à 5XL) + lien vers le guide des tailles. */
export function SizePicker({
  idPrefix,
  showGuide = true,
}: {
  idPrefix: string;
  showGuide?: boolean;
}) {
  const { t, size, setSize, sizeMissing, colorId } = useStore();
  const groupId = `${idPrefix}-size`;
  const errorId = `${idPrefix}-size-error`;
  return (
    <div>
      <fieldset
        id={groupId}
        aria-describedby={sizeMissing && !size ? errorId : undefined}
      >
        <legend className="mb-2 font-mono text-xs font-bold uppercase tracking-wider">
          {t.sizeGuide.pickSize} :{" "}
          <span className="font-sans text-sm font-medium normal-case tracking-normal">
            {size ?? "—"}
          </span>
        </legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {product.sizes.map((sz) => {
            const id = `${idPrefix}-size-${sz}`;
            const selected = sz === size;
            const available = product.variants.some(
              (v) => v.id === variantIdFor(colorId, sz) && v.available,
            );
            return (
              <label
                key={sz}
                htmlFor={id}
                className={`inline-flex min-h-12 cursor-pointer items-center justify-center border-[3px] font-mono text-sm font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                  selected
                    ? "border-ink bg-ink text-paper"
                    : sizeMissing && !size
                      ? "border-accent bg-white"
                      : "border-ink bg-white hover:bg-paper"
                } ${available ? "" : "cursor-not-allowed line-through opacity-40"}`}
              >
                <input
                  id={id}
                  type="radio"
                  name={`${idPrefix}-size`}
                  value={sz}
                  checked={selected}
                  disabled={!available}
                  onChange={() => setSize(sz)}
                  className="sr-only"
                />
                {sz}
              </label>
            );
          })}
        </div>
        {sizeMissing && !size && (
          <p
            id={errorId}
            role="alert"
            className="mt-2 border-2 border-ink bg-accent px-2 py-1 text-sm font-bold text-ink"
          >
            {t.sizeGuide.sizeRequired}
          </p>
        )}
      </fieldset>
      {showGuide && (
        <div className="mt-3">
          <SizeGuide />
        </div>
      )}
    </div>
  );
}

/** Coloris + taille. */
export function VariantPicker({ idPrefix }: { idPrefix: string }) {
  return (
    <div className="space-y-5">
      <ColorPicker idPrefix={idPrefix} />
      <SizePicker idPrefix={idPrefix} />
    </div>
  );
}

export function BuyNowButton({
  source,
  className = "",
  label,
  quantity,
  sizePicker,
}: {
  source: string;
  className?: string;
  label?: string;
  quantity?: number;
  sizePicker?: string;
}) {
  const s = useStore();
  const requireSize = useRequireSize();
  const loading = s.checkout.status === "loading";
  const mine = s.checkout.status === "loading" && s.checkout.source === source;
  return (
    <button
      type="button"
      className={`${btn.secondary} ${className}`}
      disabled={loading}
      aria-busy={mine}
      onClick={() => {
        const variantId = requireSize(sizePicker);
        if (variantId)
          void s.startCheckout(
            [{ variantId, quantity: quantity ?? s.quantity }],
            source,
          );
      }}
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

export function AddToCartButton({
  className = "",
  sizePicker,
}: {
  className?: string;
  sizePicker?: string;
}) {
  const s = useStore();
  const requireSize = useRequireSize();
  return (
    <button
      type="button"
      className={`${btn.primary} ${className}`}
      onClick={() => {
        const variantId = requireSize(sizePicker);
        if (variantId) s.addToCart({ variantId, quantity: s.quantity });
      }}
    >
      <IconCart width={20} height={20} /> {s.t.buy.addToCart}
    </button>
  );
}

export function BuyControls({
  source,
  showVariant = true,
}: {
  source: string;
  showVariant?: boolean;
}) {
  const s = useStore();
  const { t } = s;
  const est = deliveryEstimate();
  return (
    <div className="space-y-5">
      <div>
        <PriceDisplay />
        <p className="mt-1 text-sm text-muted">
          {s.taxesAtCheckout ? t.buy.taxesExtra : t.buy.taxesNone}
        </p>
      </div>

      {showVariant && <VariantPicker idPrefix={source} />}

      <div>
        <label
          htmlFor={`${source}-qty`}
          className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider"
        >
          {t.buy.quantity}
        </label>
        <QuantityStepper
          id={`${source}-qty`}
          value={s.quantity}
          onChange={s.setQuantity}
          max={store.maxQuantityPerOrder}
          labels={{
            decrease: t.a11y.decrease,
            increase: t.a11y.increase,
            quantity: t.buy.quantity,
          }}
        />
        {s.quantity >= store.maxQuantityPerOrder && (
          <p className="mt-2 text-xs text-muted">
            {fmt(t.buy.maxReached, { max: store.maxQuantityPerOrder })}
          </p>
        )}
      </div>

      <div className="grid gap-4 pr-[6px]">
        <AddToCartButton className="w-full" sizePicker={`${source}-size`} />
        <BuyNowButton
          source={source}
          className="w-full"
          sizePicker={`${source}-size`}
        />
      </div>
      <CheckoutAlert source={source} />
      <p className="font-mono text-xs font-bold uppercase tracking-wide">
        {t.buy.shippingFree} · {fmt(t.buy.delivery, est)}
      </p>
    </div>
  );
}
