"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultVariant, product } from "@/config/product";
import { store } from "@/config/store";
import { catalog } from "@/lib/catalog";
import { normalizeCartLines, type CartLineInput } from "@/lib/pricing";

export const CART_STORAGE_KEY = "borea-cart-v2";

/** Ne garde que des lignes valides (variante connue et disponible, quantités bornées). */
export function sanitizeCart(lines: unknown): CartLineInput[] {
  if (!Array.isArray(lines)) return [];
  const valid = lines
    .filter((l): l is CartLineInput => !!l && typeof l.variantId === "string" && Number.isInteger(l.quantity))
    .filter((l) => product.variants.some((v) => v.id === l.variantId && v.available))
    .map((l) => ({ variantId: l.variantId, quantity: Math.min(Math.max(l.quantity, 1), store.maxQuantityPerOrder) }));
  const result = normalizeCartLines(valid, catalog);
  if (result.ok) return result.lines;
  let remaining = store.maxQuantityPerOrder;
  return valid.flatMap((l) => {
    const q = Math.min(l.quantity, remaining);
    remaining -= q;
    return q > 0 ? [{ variantId: l.variantId, quantity: q }] : [];
  });
}

const totalOf = (lines: CartLineInput[]) => lines.reduce((s, l) => s + l.quantity, 0);

type CartState = {
  /** Sélection courante (hero, barre fixe, CTA final). */
  variantId: string;
  quantity: number;
  cart: CartLineInput[];
  drawerOpen: boolean;
  setVariantId: (id: string) => void;
  setQuantity: (q: number) => void;
  addToCart: (line: CartLineInput) => void;
  setLineQuantity: (variantId: string, quantity: number) => void;
  removeLine: (variantId: string) => void;
  clearCart: () => void;
  sanitize: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
};

/**
 * État global du panier (Zustand). Persisté dans le navigateur à titre de
 * confort uniquement : il ne contient que variantes + quantités, jamais de prix.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      variantId: defaultVariant.id,
      quantity: 1,
      cart: [],
      drawerOpen: false,
      setVariantId: (id) => {
        if (product.variants.some((v) => v.id === id && v.available)) set({ variantId: id });
      },
      setQuantity: (q) => set({ quantity: Math.min(Math.max(Math.round(q) || 1, 1), store.maxQuantityPerOrder) }),
      addToCart: (line) =>
        set((s) => {
          const qty = Math.min(line.quantity, store.maxQuantityPerOrder - totalOf(s.cart));
          if (qty <= 0) return { drawerOpen: true };
          const exists = s.cart.some((l) => l.variantId === line.variantId);
          return {
            drawerOpen: true,
            cart: exists
              ? s.cart.map((l) => (l.variantId === line.variantId ? { ...l, quantity: l.quantity + qty } : l))
              : [...s.cart, { variantId: line.variantId, quantity: qty }],
          };
        }),
      setLineQuantity: (id, q) =>
        set((s) => {
          const others = totalOf(s.cart.filter((l) => l.variantId !== id));
          const qty = Math.min(Math.max(Math.round(q), 0), store.maxQuantityPerOrder - others);
          return { cart: qty <= 0 ? s.cart.filter((l) => l.variantId !== id) : s.cart.map((l) => (l.variantId === id ? { ...l, quantity: qty } : l)) };
        }),
      removeLine: (id) => set((s) => ({ cart: s.cart.filter((l) => l.variantId !== id) })),
      clearCart: () => set({ cart: [] }),
      sanitize: () => set((s) => ({ cart: sanitizeCart(s.cart) })),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: CART_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ cart: s.cart }),
      merge: (persisted, current) => ({ ...current, cart: sanitizeCart((persisted as { cart?: unknown } | undefined)?.cart) }),
      // Réhydratation explicite après le montage (évite les écarts de rendu serveur/client).
      skipHydration: true,
    },
  ),
);
