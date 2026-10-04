/**
 * CONFIGURATION DU PRODUIT (publique — visible côté navigateur).
 *
 * ⚠️ La fiche fournisseur (AliExpress 1005005777504095) n'a pas pu être consultée
 * automatiquement (protection anti-robot). TOUT le contenu ci-dessous est un
 * GABARIT PROVISOIRE : aucun nom, caractéristique, dimension ou performance n'a
 * été inventé. Remplacez chaque champ « À confirmer » par l'information réelle,
 * puis passez `confirmed` à true.
 *
 * - `confirmed: true` active les données structurées Product (SEO) et retire le
 *   bandeau « aperçu » du site.
 * - Les prix sont en cents CAD, taxes en sus. Le serveur recalcule TOUJOURS les
 *   montants à partir de ce fichier : le navigateur n'envoie que variante + quantité.
 */
import type { Localized, MediaItem, PriceTier, Variant, VideoItem } from "./types";

const media = {
  hero: {
    id: "hero",
    src: "/media/placeholder/hero.svg",
    alt: { fr: "Visuel provisoire — photo principale du produit", en: "Placeholder — main product photo" },
    width: 1200,
    height: 1200,
    provisional: true,
  },
  variant2: {
    id: "variant2",
    src: "/media/placeholder/variant-2.svg",
    alt: { fr: "Visuel provisoire — deuxième variante", en: "Placeholder — second variant" },
    width: 1200,
    height: 1200,
    provisional: true,
  },
  lifestyle: {
    id: "lifestyle",
    src: "/media/placeholder/lifestyle.svg",
    alt: { fr: "Visuel provisoire — produit en situation", en: "Placeholder — product in use" },
    width: 1600,
    height: 1000,
    provisional: true,
  },
  detail1: {
    id: "detail1",
    src: "/media/placeholder/detail-1.svg",
    alt: { fr: "Visuel provisoire — détail n° 1", en: "Placeholder — detail #1" },
    width: 1000,
    height: 1000,
    provisional: true,
  },
  detail2: {
    id: "detail2",
    src: "/media/placeholder/detail-2.svg",
    alt: { fr: "Visuel provisoire — détail n° 2", en: "Placeholder — detail #2" },
    width: 1000,
    height: 1000,
    provisional: true,
  },
  detail3: {
    id: "detail3",
    src: "/media/placeholder/detail-3.svg",
    alt: { fr: "Visuel provisoire — contenu du colis", en: "Placeholder — what's in the box" },
    width: 1000,
    height: 1000,
    provisional: true,
  },
} satisfies Record<string, MediaItem>;

export type BenefitIcon = "spark" | "hand" | "shield" | "clock" | "leaf" | "box";

export const product = {
  id: "main",
  /** Passer à true UNIQUEMENT quand tout le contenu ci-dessous est vérifié. */
  confirmed: false,

  name: { fr: "Nom du produit (à confirmer)", en: "Product name (to be confirmed)" } satisfies Localized,
  /** Titre du hero : bénéfice concret, appuyé par une caractéristique réelle. */
  headline: {
    fr: "Titre axé sur le bénéfice principal du produit",
    en: "Headline built on the product's main benefit",
  } satisfies Localized,
  subheadline: {
    fr: "Une à deux phrases qui décrivent concrètement l'usage du produit. À rédiger à partir de la fiche fournisseur vérifiée.",
    en: "One or two sentences that describe how the product is used. To be written from the verified supplier listing.",
  } satisfies Localized,
  /** Description courte pour le SEO et le récapitulatif d'achat. */
  description: {
    fr: "Description courte du produit, à compléter après validation de la fiche.",
    en: "Short product description, to be completed once the listing is verified.",
  } satisfies Localized,

  pricing: {
    /** Passer à true après validation du coût fournisseur habituel et de la marge. */
    confirmed: false,
    /**
     * Paliers de prix unitaire selon la quantité TOTALE commandée.
     * Le premier palier (minQuantity: 1) est le prix de référence d'une unité :
     * c'est lui qui justifie les économies affichées sur les lots.
     */
    tiers: [
      { minQuantity: 1, unitPriceCents: 3999 },
      { minQuantity: 2, unitPriceCents: 3599 },
      { minQuantity: 3, unitPriceCents: 3299 },
    ] satisfies PriceTier[],
  },

  /** Lots proposés dans la section Offres (quantités). Retirer ce qui n'est pas pertinent. */
  offerQuantities: [1, 2, 3],

  variants: [
    {
      id: "option-1",
      sku: "BR-OPT1",
      label: { fr: "Option 1 (à confirmer)", en: "Option 1 (to confirm)" },
      swatch: "#1F2A3A",
      available: true,
      mediaId: "hero",
    },
    {
      id: "option-2",
      sku: "BR-OPT2",
      label: { fr: "Option 2 (à confirmer)", en: "Option 2 (to confirm)" },
      swatch: "#D9C7B0",
      available: true,
      mediaId: "variant2",
    },
  ] satisfies Variant[],

  media,
  /** Ordre de la galerie (section Détails). */
  gallery: ["hero", "variant2", "detail1", "detail2", "detail3", "lifestyle"] as Array<keyof typeof media>,
  /** Vidéo de démonstration locale (sous /public). `null` = section sans vidéo. */
  video: null as VideoItem | null,

  /** 3 à 5 bénéfices, chacun appuyé par une caractéristique vérifiable. */
  benefits: [
    {
      icon: "spark",
      title: { fr: "Bénéfice n° 1", en: "Benefit #1" },
      text: {
        fr: "À rédiger à partir d'une caractéristique réelle de la fiche (ex. matériau, format, fonction).",
        en: "To be written from a real feature in the listing (e.g. material, size, function).",
      },
    },
    {
      icon: "hand",
      title: { fr: "Bénéfice n° 2", en: "Benefit #2" },
      text: {
        fr: "Un bénéfice concret et vérifiable, sans promesse de performance non démontrée.",
        en: "A concrete, verifiable benefit — no unproven performance claims.",
      },
    },
    {
      icon: "shield",
      title: { fr: "Bénéfice n° 3", en: "Benefit #3" },
      text: {
        fr: "Une phrase courte. Le visuel associé doit montrer ce bénéfice.",
        en: "One short sentence. The matching visual should show this benefit.",
      },
    },
    {
      icon: "box",
      title: { fr: "Bénéfice n° 4", en: "Benefit #4" },
      text: {
        fr: "Facultatif : retirez cette carte s'il n'y a que trois bénéfices solides.",
        en: "Optional: remove this card if there are only three solid benefits.",
      },
    },
  ] satisfies Array<{ icon: BenefitIcon; title: Localized; text: Localized }>,

  /** Démonstration : étapes d'utilisation. */
  steps: [
    {
      title: { fr: "Étape 1", en: "Step 1" },
      text: { fr: "Première étape d'utilisation, à décrire d'après la notice.", en: "First step, to be described from the manual." },
    },
    {
      title: { fr: "Étape 2", en: "Step 2" },
      text: { fr: "Deuxième étape d'utilisation.", en: "Second step." },
    },
    {
      title: { fr: "Étape 3", en: "Step 3" },
      text: { fr: "Résultat obtenu, sans exagération.", en: "The result, without exaggeration." },
    },
  ] satisfies Array<{ title: Localized; text: Localized }>,

  /** Caractéristiques techniques — uniquement des données confirmées. */
  specs: [
    { label: { fr: "Matériau", en: "Material" }, value: { fr: "À confirmer", en: "To be confirmed" } },
    { label: { fr: "Dimensions", en: "Dimensions" }, value: { fr: "À confirmer", en: "To be confirmed" } },
    { label: { fr: "Poids", en: "Weight" }, value: { fr: "À confirmer", en: "To be confirmed" } },
    { label: { fr: "Alimentation", en: "Power" }, value: { fr: "À confirmer (ou retirer)", en: "To be confirmed (or remove)" } },
    { label: { fr: "Entretien", en: "Care" }, value: { fr: "À confirmer", en: "To be confirmed" } },
  ] satisfies Array<{ label: Localized; value: Localized }>,

  /** Contenu du colis. */
  packageContents: [
    { fr: "1 × produit (à confirmer)", en: "1 × product (to be confirmed)" },
    { fr: "Accessoires inclus (à confirmer)", en: "Included accessories (to be confirmed)" },
  ] satisfies Localized[],

  /** FAQ propre au produit — uniquement à partir d'informations confirmées. */
  faq: [
    {
      q: { fr: "Comment utiliser le produit ?", en: "How do I use the product?" },
      a: {
        fr: "Réponse à rédiger à partir de la notice du fournisseur.",
        en: "Answer to be written from the supplier's manual.",
      },
    },
    {
      q: { fr: "Quelles sont les différences entre les variantes ?", en: "What's the difference between the variants?" },
      a: {
        fr: "Réponse à rédiger quand les variantes réelles seront confirmées.",
        en: "Answer to be written once the real variants are confirmed.",
      },
    },
    {
      q: { fr: "Quels accessoires sont inclus ?", en: "Which accessories are included?" },
      a: {
        fr: "Voir la liste « Contenu du colis » ci-dessus, à confirmer avec le fournisseur.",
        en: "See the “What's in the box” list above — to be confirmed with the supplier.",
      },
    },
  ] satisfies Array<{ q: Localized; a: Localized }>,

  /**
   * Avis clients RÉELS uniquement (avec accord de l'auteur). Tant que la liste est
   * vide, la section Avis est masquée. Aucune note ni nombre de clients n'est affiché
   * sans avis réels.
   */
  reviews: [] as Array<{ author: string; rating: 1 | 2 | 3 | 4 | 5; text: Localized; date: string; verifiedPurchase: boolean }>,
};

export type ProductConfig = typeof product;
export type MediaId = keyof typeof media;

export function getMedia(id: string | undefined): MediaItem {
  return (id && id in product.media ? product.media[id as MediaId] : product.media.hero) as MediaItem;
}

export function getVariant(id: string): Variant | undefined {
  return product.variants.find((v) => v.id === id);
}

export const defaultVariant: Variant =
  product.variants.find((v) => v.available) ?? product.variants[0];
