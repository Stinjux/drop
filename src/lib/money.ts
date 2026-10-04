import type { Locale } from "@/config/types";

const formatters = new Map<string, Intl.NumberFormat>();

/** Formate des cents CAD : 3999 → « 39,99 $ » (fr) / « $39.99 » (en). */
export function formatMoney(cents: number, locale: Locale, currency = "CAD"): string {
  const key = `${locale}:${currency}`;
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", { style: "currency", currency });
    formatters.set(key, fmt);
  }
  return fmt.format(cents / 100);
}
