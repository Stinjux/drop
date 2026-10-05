"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultColor, getVariant, product, variantIdFor } from "@/config/product";
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
  /** Sélection courante (hero, guide des tailles, barre fixe, CTA final). */
  colorId: string;
  /** `null` tant que le client n'a pas choisi de taille (choix obligatoire). */
  size: string | null;
  /** Vrai quand le client a tenté d'acheter sans taille (affiche l'erreur). */
  sizeMissing: boolean;
  quantity: number;
  cart: CartLineInput[];
  /** Code « Gratte & gagne » obtenu (le lot réel est revérifié par le serveur au paiement). */
  promo: { code: string; prizeId: string; expiresAt: string } | null;
  setPromo: (promo: { code: string; prizeId: string; expiresAt: string } | null) => void;
  drawerOpen: boolean;
  setColorId: (id: string) => void;
  setSize: (size: string) => void;
  setVariantId: (id: string) => void;
  flagSizeMissing: () => void;
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
      colorId: defaultColor.id,
      size: null,
      sizeMissing: false,
      quantity: 1,
      cart: [],
      promo: null,
      setPromo: (promo) => set({ promo }),
      drawerOpen: false,
      setColorId: (id) => {
        if (product.colors.some((c) => c.id === id)) set({ colorId: id });
      },
      setSize: (size) => {
        if ((product.sizes as readonly string[]).includes(size)) set({ size, sizeMissing: false });
      },
      setVariantId: (id) => {
        const v = getVariant(id);
        if (v?.available && v.colorId && v.size) set({ colorId: v.colorId, size: v.size, sizeMissing: false });
      },
      flagSizeMissing: () => set({ sizeMissing: true }),
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
      partialize: (s) => ({ cart: s.cart, promo: s.promo }),
      merge: (persisted, current) => {
        const p = persisted as { cart?: unknown; promo?: CartState["promo"] } | undefined;
        const promo = p?.promo && typeof p.promo.code === "string" && new Date(p.promo.expiresAt).getTime() > Date.now() ? p.promo : null;
        return { ...current, cart: sanitizeCart(p?.cart), promo };
      },
      // Réhydratation explicite après le montage (évite les écarts de rendu serveur/client).
      skipHydration: true,
    },
  ),
);

/** Variante choisie (coloris + taille), ou `null` si la taille n'est pas encore choisie. */
export function selectedVariantId(s: Pick<CartState, "colorId" | "size">): string | null {
  if (!s.size) return null;
  const id = variantIdFor(s.colorId, s.size);
  return getVariant(id)?.available ? id : null;
}
