"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { defaultVariant, product } from "@/config/product";
import { store } from "@/config/store";
import type { Locale } from "@/config/types";
import { dictionaries, fmt, type Dictionary } from "@/content";
import { catalog } from "@/lib/catalog";
import { normalizeCartLines, priceCart, type CartLineInput, type CartPricing } from "@/lib/pricing";

const CART_KEY = "borea-cart-v1";

/** `source` identifie le bouton à l'origine de la demande (spinner et message affichés au bon endroit). */
type CheckoutState = { status: "idle" } | { status: "loading"; source: string } | { status: "error"; message: string; source: string };

type StoreContextValue = {
  locale: Locale;
  t: Dictionary;
  taxesAtCheckout: boolean;
  // Sélection en cours (hero, offres, barre fixe et bloc final partagent la même sélection)
  variantId: string;
  quantity: number;
  setVariantId: (id: string) => void;
  setQuantity: (q: number) => void;
  // Panier
  cart: CartLineInput[];
  cartPricing: CartPricing | null;
  cartCount: number;
  addToCart: (line: CartLineInput) => void;
  setLineQuantity: (variantId: string, quantity: number) => void;
  removeLine: (variantId: string) => void;
  clearCart: () => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  // Paiement
  checkout: CheckoutState;
  startCheckout: (lines: CartLineInput[], source: string) => Promise<void>;
  dismissCheckoutError: () => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function sanitize(lines: unknown): CartLineInput[] {
  if (!Array.isArray(lines)) return [];
  const valid = lines
    .filter((l): l is CartLineInput => !!l && typeof l.variantId === "string" && Number.isInteger(l.quantity))
    .filter((l) => product.variants.some((v) => v.id === l.variantId && v.available))
    .map((l) => ({ variantId: l.variantId, quantity: Math.min(Math.max(l.quantity, 1), store.maxQuantityPerOrder) }));
  const result = normalizeCartLines(valid, catalog);
  if (result.ok) return result.lines;
  // Trop d'unités : on tronque proprement.
  let remaining = store.maxQuantityPerOrder;
  return valid.flatMap((l) => {
    const q = Math.min(l.quantity, remaining);
    remaining -= q;
    return q > 0 ? [{ variantId: l.variantId, quantity: q }] : [];
  });
}

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
  const [variantId, setVariantIdState] = useState(defaultVariant.id);
  const [quantity, setQuantityState] = useState(1);
  const [cart, setCart] = useState<CartLineInput[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutState>({ status: "idle" });
  const inflight = useRef(false);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  // Lecture du panier (préférence locale au navigateur ; jamais une source de prix).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronisation initiale avec localStorage
      if (raw) setCart(sanitize(JSON.parse(raw)));
    } catch {
      /* stockage indisponible : panier en mémoire seulement */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* ignoré */
    }
  }, [cart, hydrated]);

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

  const setVariantId = useCallback((id: string) => {
    if (product.variants.some((v) => v.id === id && v.available)) setVariantIdState(id);
  }, []);
  const setQuantity = useCallback((q: number) => {
    setQuantityState(Math.min(Math.max(Math.round(q) || 1, 1), store.maxQuantityPerOrder));
  }, []);

  const addToCart = useCallback((line: CartLineInput) => {
    setCart((prev) => {
      const total = prev.reduce((s, l) => s + l.quantity, 0);
      const room = store.maxQuantityPerOrder - total;
      const qty = Math.min(line.quantity, room);
      if (qty <= 0) return prev;
      const existing = prev.find((l) => l.variantId === line.variantId);
      return existing
        ? prev.map((l) => (l.variantId === line.variantId ? { ...l, quantity: l.quantity + qty } : l))
        : [...prev, { variantId: line.variantId, quantity: qty }];
    });
    setDrawerOpen(true);
  }, []);

  const setLineQuantity = useCallback((id: string, q: number) => {
    setCart((prev) => {
      const others = prev.filter((l) => l.variantId !== id).reduce((s, l) => s + l.quantity, 0);
      const qty = Math.min(Math.max(Math.round(q), 0), store.maxQuantityPerOrder - others);
      return qty <= 0 ? prev.filter((l) => l.variantId !== id) : prev.map((l) => (l.variantId === id ? { ...l, quantity: qty } : l));
    });
  }, []);

  const removeLine = useCallback((id: string) => setCart((prev) => prev.filter((l) => l.variantId !== id)), []);
  const clearCart = useCallback(() => setCart([]), []);

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
      const fingerprint = JSON.stringify([...normalized.lines].sort((a, b) => a.variantId.localeCompare(b.variantId)));
      if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: uuid() };
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: normalized.lines, locale, attemptKey: attempt.current.key }),
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
              : code === "too_many"
                ? fmt(t.errors.too_many, { max: store.maxQuantityPerOrder })
                : ["unknown_variant", "unavailable_variant", "invalid_quantity", "invalid_request", "empty"].includes(code)
                  ? t.errors.invalid
                  : t.errors.generic;
        if (message === t.errors.invalid) setCart((prev) => sanitize(prev));
        inflight.current = false;
        setCheckout({ status: "error", source, message });
      } catch {
        inflight.current = false;
        setCheckout({ status: "error", source, message: t.errors.network });
      }
    },
    [locale, t],
  );

  const cartPricing = useMemo(() => {
    const n = normalizeCartLines(cart, catalog);
    return n.ok ? priceCart(n.lines, catalog) : null;
  }, [cart]);

  const value: StoreContextValue = {
    locale,
    t,
    taxesAtCheckout,
    variantId,
    quantity,
    setVariantId,
    setQuantity,
    cart,
    cartPricing,
    cartCount: cart.reduce((s, l) => s + l.quantity, 0),
    addToCart,
    setLineQuantity,
    removeLine,
    clearCart,
    drawerOpen,
    openDrawer: useCallback(() => setDrawerOpen(true), []),
    closeDrawer: useCallback(() => setDrawerOpen(false), []),
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
