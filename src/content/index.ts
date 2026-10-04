import type { Locale } from "@/config/types";
import { en } from "./en";
import { fr, type Dictionary } from "./fr";

export const dictionaries: Record<Locale, Dictionary> = { fr, en };
export type { Dictionary };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Remplace les variables {nom} d'un texte. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Pages d'information : identifiant interne → slug par langue. */
export const INFO_PAGES = {
  contact: { fr: "contact", en: "contact" },
  shipping: { fr: "livraison", en: "shipping" },
  returns: { fr: "retours", en: "returns" },
  privacy: { fr: "confidentialite", en: "privacy" },
  terms: { fr: "conditions-de-vente", en: "terms" },
} as const satisfies Record<string, Record<Locale, string>>;
export type InfoPageId = keyof typeof INFO_PAGES;

export function infoPageFromSlug(locale: Locale, slug: string): InfoPageId | null {
  for (const [id, slugs] of Object.entries(INFO_PAGES)) if (slugs[locale] === slug) return id as InfoPageId;
  return null;
}

export function infoHref(locale: Locale, id: InfoPageId): string {
  return `/${locale}/${INFO_PAGES[id][locale]}`;
}

/** Chemin équivalent dans l'autre langue (page d'accueil, pages d'info, pages de commande). */
export function alternatePath(pathname: string, target: Locale): string {
  const parts = pathname.split("/").filter(Boolean);
  const current = parts[0] === "en" || parts[0] === "fr" ? (parts[0] as Locale) : null;
  if (!current) return `/${target}`;
  const rest = parts.slice(1);
  if (rest.length === 1) {
    const page = infoPageFromSlug(current, rest[0]);
    if (page) return infoHref(target, page);
  }
  return `/${[target, ...rest].join("/")}`;
}
