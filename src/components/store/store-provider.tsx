"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { store } from "@/config/store";
import type { Locale } from "@/config/types";
import { dictionaries, fmt, type Dictionary } from "@/content";
import { catalog } from "@/lib/catalog";
import { selectedVariantId, useCartStore } from "./cart-store";
import type { Prize } from "@/config/promo";
import { applyPrize, findPrize, type PromoResult } from "@/lib/promo";
import { getColor } from "@/config/product";
import { normalizeCartLines, priceCart, type CartLineInput, type CartPricing } from "@/lib/pricing";

/** `source` identifie le bouton à l'origine de la demande (spinner et message affichés au bon endroit). */
type CheckoutState = { status: "idle" } | { status: "loading"; source: string } | { status: "error"; message: string; source: string };

type StoreContextValue = {
  locale: Locale;
  t: Dictionary;
  taxesAtCheckout: boolean;
  /** Variante choisie, ou `null` tant qu'aucune taille n'est choisie. */
  variantId: string | null;
  colorId: string;
  size: string | null;
  sizeMissing: boolean;
  /** Photo du coloris sélectionné. */
  mediaId: string;
  setColorId: (id: string) => void;
  setSize: (size: string) => void;
  flagSizeMissing: () => void;
  quantity: number;
  setVariantId: (id: string) => void;
  setQuantity: (q: number) => void;
  cart: CartLineInput[];
  cartPricing: CartPricing | null;
  /** Code « Gratte & gagne » et son effet sur le panier (affichage ; le serveur recalcule). */
  promo: { code: string; prize: Prize; expiresAt: string } | null;
  promoResult: PromoResult | null;
  setPromo: (promo: { code: string; prizeId: string; expiresAt: string } | null) => void;
  cartCount: number;
  addToCart: (line: CartLineInput) => void;
  setLineQuantity: (variantId: string, quantity: number) => void;
  removeLine: (variantId: string) => void;
  clearCart: () => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  checkout: CheckoutState;
  startCheckout: (lines: CartLineInput[], source: string) => Promise<void>;
  dismissCheckoutError: () => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function StoreProvider({ locale, taxesAtCheckout, children }: { locale: Locale; taxesAtCheckout: boolean; children: ReactNode }) {
  const t = dictionaries[locale];
  const cartState = useCartStore();
  const { cart, sanitize } = cartState;
  const [checkout, setCheckout] = useState<CheckoutState>({ status: "idle" });
  const inflight = useRef(false);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  // Réhydratation du panier persistant (Zustand) après le montage.
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);

  // Retour arrière depuis Stripe (cache de navigation) : on réactive les boutons.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        inflight.current = false;
        setCheckout({ status: "idle" });
      }
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const startCheckout = useCallback(
    async (lines: CartLineInput[], source: string) => {
      if (inflight.current) return; // anti double clic
      const normalized = normalizeCartLines(lines, catalog);
      if (!normalized.ok) {
        setCheckout({ status: "error", source, message: normalized.error.code === "too_many" ? fmt(t.errors.too_many, { max: store.maxQuantityPerOrder }) : t.errors.invalid });
        return;
      }
      inflight.current = true;
      setCheckout({ status: "loading", source });
      const promoCode = useCartStore.getState().promo?.code ?? null;
      const fingerprint = JSON.stringify([[...normalized.lines].sort((a, b) => a.variantId.localeCompare(b.variantId)), promoCode]);
      if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: uuid() };
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: normalized.lines, locale, attemptKey: attempt.current.key, ...(promoCode ? { promoCode } : {}) }),
        });
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (res.ok && data.url) {
          window.location.assign(data.url);
          return; // on garde l'état « chargement » pendant la redirection
        }
        if (res.status === 409) attempt.current = null;
        const code = data.error ?? "";
        const message =
          code === "rate_limited"
            ? t.errors.rate_limited
            : code === "payments_unavailable"
              ? t.errors.payments_unavailable
              : code === "promo_invalid"
                ? t.scratch.promoInvalid
                : code === "promo_needs_second_item"
                  ? t.scratch.needsSecond
                  : code === "too_many"
                ? fmt(t.errors.too_many, { max: store.maxQuantityPerOrder })
                : ["unknown_variant", "unavailable_variant", "invalid_quantity", "invalid_request", "empty"].includes(code)
                  ? t.errors.invalid
                  : t.errors.generic;
        if (message === t.errors.invalid) sanitize();
        if (code === "promo_invalid") useCartStore.getState().setPromo(null);
        inflight.current = false;
        setCheckout({ status: "error", source, message });
      } catch {
        inflight.current = false;
        setCheckout({ status: "error", source, message: t.errors.network });
      }
    },
    [locale, t, sanitize],
  );

  const cartPricing = useMemo(() => {
    const n = normalizeCartLines(cart, catalog);
    return n.ok ? priceCart(n.lines, catalog) : null;
  }, [cart]);

  const storedPromo = cartState.promo;
  const promoPrize = storedPromo ? findPrize(storedPromo.prizeId) : undefined;
  const promo = storedPromo && promoPrize ? { code: storedPromo.code, prize: promoPrize, expiresAt: storedPromo.expiresAt } : null;
  const promoResult = promo && cartPricing ? applyPrize(cartPricing, promo.prize) : null;

  const value: StoreContextValue = {
    locale,
    t,
    taxesAtCheckout,
    variantId: selectedVariantId(cartState),
    colorId: cartState.colorId,
    size: cartState.size,
    sizeMissing: cartState.sizeMissing,
    mediaId: getColor(cartState.colorId)?.mediaId ?? "vert",
    setColorId: cartState.setColorId,
    setSize: cartState.setSize,
    flagSizeMissing: cartState.flagSizeMissing,
    quantity: cartState.quantity,
    setVariantId: cartState.setVariantId,
    setQuantity: cartState.setQuantity,
    cart,
    cartPricing,
    cartCount: cart.reduce((s, l) => s + l.quantity, 0),
    promo,
    promoResult,
    setPromo: cartState.setPromo,
    addToCart: cartState.addToCart,
    setLineQuantity: cartState.setLineQuantity,
    removeLine: cartState.removeLine,
    clearCart: cartState.clearCart,
    drawerOpen: cartState.drawerOpen,
    openDrawer: cartState.openDrawer,
    closeDrawer: cartState.closeDrawer,
    checkout,
    startCheckout,
    dismissCheckoutError: useCallback(() => setCheckout({ status: "idle" }), []),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore doit être utilisé dans <StoreProvider>.");
  return ctx;
}
