export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

export type Localized<T = string> = Record<Locale, T>;

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "fr" || value === "en";
}

/** Une image du site. `provisional: true` = visuel provisoire à remplacer avant publication. */
export type MediaItem = {
  id: string;
  /** Chemin local sous /public (évite les liens fournisseur fragiles). */
  src: string;
  alt: Localized;
  width: number;
  height: number;
  provisional: boolean;
  /** Origine / droit d'utilisation (photo maison, licence, autorisation écrite du fournisseur…). */
  rights?: string;
};

export type VideoItem = {
  /** Fichier local sous /public (mp4/webm) — pas de lien fournisseur. */
  src: string;
  poster: string;
  title: Localized;
  provisional: boolean;
  rights?: string;
};

export type PriceTier = {
  /** Quantité totale minimale (toutes variantes confondues) pour obtenir ce prix unitaire. */
  minQuantity: number;
  /** Prix unitaire en cents CAD, taxes en sus. */
  unitPriceCents: number;
};

export type Variant = {
  id: string;
  sku: string;
  label: Localized;
  /** Couleur de la pastille dans le sélecteur (facultatif). */
  swatch?: string;
  available: boolean;
  /** Image affichée quand la variante est sélectionnée. */
  mediaId?: string;
};

export type ShippingOption = {
  id: string;
  label: Localized;
  amountCents: number;
  /** Livraison gratuite à partir de ce sous-total (cents). `null` = jamais gratuite. */
  freeFromSubtotalCents: number | null;
  /** Délai de préparation (jours ouvrables) avant expédition. */
  processingDays: { min: number; max: number };
  /** Délai de transport (jours ouvrables). */
  transitDays: { min: number; max: number };
};
