/**
 * ════════════════════════════════════════════════════════════════════════════
 *  DONNÉES PRODUIT — fichier unique à modifier pour changer de produit.
 *  (Données publiques : jamais de coût ni d'info fournisseur ici —
 *   voir src/server/supplier-config.ts.)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ La fiche AliExpress 1005005777504095 n'a pas pu être consultée (captcha).
 * Tout ce qui est marqué « à confirmer » est un GABARIT : aucun nom, caractéristique,
 * variante ni performance n'a été inventé. Remplacez puis passez `confirmed: true`
 * (active les données structurées SEO et retire le bandeau « aperçu »).
 *
 * Règles d'honnêteté appliquées par le code :
 * - Note ★ et avis : affichés UNIQUEMENT à partir de `reviews` (vrais avis). Vide = masqué.
 * - Prix barré / badge « -XX % » : affichés UNIQUEMENT si `compareAt` est renseigné
 *   avec une justification (prix réellement pratiqué auparavant, etc.).
 * - Cadeau du panier : affiché UNIQUEMENT si `gift.enabled` (et le cadeau doit exister).
 * - Prix en cents CAD, taxes en sus ; le serveur recalcule tout à partir de ce fichier.
 */
import type { Localized, MediaItem, PriceTier, Variant, VideoItem } from "@/config/types";

const img = (id: string, file: string, fr: string, en: string, width = 1200, height = 1200): MediaItem => ({
  id,
  src: `/product/${file}`,
  alt: { fr: `Visuel provisoire — ${fr}`, en: `Placeholder — ${en}` },
  width,
  height,
  provisional: true,
});

const media = {
  hero: img("hero", "hero.jpg", "photo principale du produit", "main product photo"),
  angle1: img("angle1", "angle-1.jpg", "produit, angle n° 1", "product, angle #1"),
  angle2: img("angle2", "angle-2.jpg", "produit, angle n° 2", "product, angle #2"),
  angle3: img("angle3", "angle-3.jpg", "produit, angle n° 3", "product, angle #3"),
  variant2: img("variant2", "variant-2.jpg", "deuxième variante", "second variant"),
  detail1: img("detail1", "detail-1.jpg", "détail et contenu du colis", "detail and box contents"),
  lifestyle: img("lifestyle", "lifestyle.jpg", "produit en situation", "product in use", 1600, 1000),
  before: img("before", "before.jpg", "avant : le problème", "before: the problem", 1200, 900),
  after: img("after", "after.jpg", "après : la solution", "after: the solution", 1200, 900),
} satisfies Record<string, MediaItem>;

export type FeatureIcon = "spark" | "hand" | "shield" | "clock" | "leaf" | "box";

export const product = {
  id: "main",
  /** Passer à true UNIQUEMENT quand tout le contenu est vérifié. */
  confirmed: false,

  /** Nom commercial (marque), pas le titre AliExpress. */
  name: { fr: "Nom du produit (à confirmer)", en: "Product name (to confirm)" } satisfies Localized,
  /** Titre géant du hero (affiché en MAJUSCULES). Court : 2 à 5 mots. */
  headline: { fr: "Votre bénéfice en 4 mots", en: "Your benefit in 4 words" } satisfies Localized,
  /** Problème résolu, en une phrase (ex. « Fini les câbles emmêlés »). */
  problemSolved: { fr: "Problème résolu — à confirmer", en: "Problem solved — to confirm" } satisfies Localized,
  subheadline: {
    fr: "Une à deux phrases concrètes sur l'usage du produit, rédigées à partir de la fiche vérifiée.",
    en: "One or two concrete sentences about how the product is used, written from the verified listing.",
  } satisfies Localized,
  description: {
    fr: "Description courte du produit (SEO et récapitulatif), à compléter après validation de la fiche.",
    en: "Short product description (SEO and summary), to be completed once the listing is verified.",
  } satisfies Localized,

  pricing: {
    /** Passer à true après validation du coût fournisseur habituel et de la marge. */
    confirmed: false,
    /** Prix unitaire selon la quantité totale (le palier 1 = prix de vente de référence). */
    tiers: [
      { minQuantity: 1, unitPriceCents: 3999 },
      { minQuantity: 2, unitPriceCents: 3599 },
      { minQuantity: 3, unitPriceCents: 3299 },
    ] satisfies PriceTier[],
    /**
     * Prix barré : `null` tant qu'il n'est pas JUSTIFIÉ (ex. prix réellement pratiqué
     * pendant une période significative). Exemple : { priceCents: 5999, justification: "Prix courant du 1er au 30 sept. 2026" }.
     */
    compareAt: null as null | { priceCents: number; justification: string },
  },

  variants: [
    { id: "option-1", sku: "BR-OPT1", label: { fr: "Option 1 (à confirmer)", en: "Option 1 (to confirm)" }, swatch: "#0E0E0E", available: true, mediaId: "hero" },
    { id: "option-2", sku: "BR-OPT2", label: { fr: "Option 2 (à confirmer)", en: "Option 2 (to confirm)" }, swatch: "#F4F3EF", available: true, mediaId: "variant2" },
  ] satisfies Variant[],

  /** Cadeau offert au-delà d'un montant (barre de progression du panier). */
  gift: {
    /** N'activer que si le cadeau existe réellement et sera expédié. */
    enabled: true,
    confirmed: false,
    thresholdCents: 7000,
    label: { fr: "Cadeau à définir", en: "Gift to be defined" } satisfies Localized,
  },

  media,
  /** Galerie du hero (miniatures + zoom). */
  gallery: ["hero", "angle1", "angle2", "angle3", "variant2", "detail1"] as Array<keyof typeof media>,
  video: null as VideoItem | null,

  /** Problème → solution (2 colonnes avant / après). */
  problemSolution: {
    before: {
      title: { fr: "Avant", en: "Before" },
      mediaId: "before",
      points: [
        { fr: "Frustration n° 1 (à confirmer)", en: "Pain point #1 (to confirm)" },
        { fr: "Frustration n° 2 (à confirmer)", en: "Pain point #2 (to confirm)" },
        { fr: "Frustration n° 3 (à confirmer)", en: "Pain point #3 (to confirm)" },
      ],
    },
    after: {
      title: { fr: "Après", en: "After" },
      mediaId: "after",
      points: [
        { fr: "Ce que le produit change n° 1 (à confirmer)", en: "What the product changes #1 (to confirm)" },
        { fr: "Ce que le produit change n° 2 (à confirmer)", en: "What the product changes #2 (to confirm)" },
        { fr: "Ce que le produit change n° 3 (à confirmer)", en: "What the product changes #3 (to confirm)" },
      ],
    },
  },

  /** 3 à 6 caractéristiques clés (grille modulaire). Uniquement des faits vérifiables. */
  features: [
    { icon: "spark", title: { fr: "Caractéristique 1", en: "Feature 1" }, text: { fr: "À rédiger d'après une caractéristique réelle de la fiche.", en: "To be written from a real feature in the listing." } },
    { icon: "hand", title: { fr: "Caractéristique 2", en: "Feature 2" }, text: { fr: "Un bénéfice concret, sans promesse non démontrée.", en: "A concrete benefit, no unproven claims." } },
    { icon: "shield", title: { fr: "Caractéristique 3", en: "Feature 3" }, text: { fr: "Matériau, format ou fonction — à confirmer.", en: "Material, size or function — to confirm." } },
    { icon: "box", title: { fr: "Caractéristique 4", en: "Feature 4" }, text: { fr: "Accessoires inclus — à confirmer.", en: "Included accessories — to confirm." } },
  ] satisfies Array<{ icon: FeatureIcon; title: Localized; text: Localized }>,

  /** Comment ça marche — 3 étapes. */
  steps: [
    { title: { fr: "Étape 1", en: "Step 1" }, text: { fr: "Première étape, d'après la notice.", en: "First step, from the manual." } },
    { title: { fr: "Étape 2", en: "Step 2" }, text: { fr: "Deuxième étape.", en: "Second step." } },
    { title: { fr: "Étape 3", en: "Step 3" }, text: { fr: "Le résultat, sans exagération.", en: "The result, without exaggeration." } },
  ] satisfies Array<{ title: Localized; text: Localized }>,

  /** Caractéristiques techniques (section FAQ / détails). */
  specs: [
    { label: { fr: "Matériau", en: "Material" }, value: { fr: "À confirmer", en: "To be confirmed" } },
    { label: { fr: "Dimensions", en: "Dimensions" }, value: { fr: "À confirmer", en: "To be confirmed" } },
    { label: { fr: "Poids", en: "Weight" }, value: { fr: "À confirmer", en: "To be confirmed" } },
  ] satisfies Array<{ label: Localized; value: Localized }>,
  packageContents: [
    { fr: "1 × produit (à confirmer)", en: "1 × product (to be confirmed)" },
    { fr: "Accessoires inclus (à confirmer)", en: "Included accessories (to be confirmed)" },
  ] satisfies Localized[],

  /**
   * Comparatif « Nous vs les autres ». Ne comparez que ce que vous pouvez prouver.
   * `us` / `others` : true (✓), false (✗) ou un texte court. Pour « les autres »,
   * préférez « Variable » à une affirmation générale non vérifiée.
   */
  comparison: {
    othersLabel: { fr: "Les autres", en: "Others" } satisfies Localized,
    rows: [
      { label: { fr: "Livraison gratuite au Canada", en: "Free shipping in Canada" }, us: true, others: { fr: "Variable", en: "Varies" } },
      { label: { fr: "Retours sous 30 jours", en: "30-day returns" }, us: true, others: { fr: "Variable", en: "Varies" } },
      { label: { fr: "Paiement sécurisé (Stripe)", en: "Secure payment (Stripe)" }, us: true, others: { fr: "Variable", en: "Varies" } },
      { label: { fr: "Service client en français", en: "Support in French" }, us: true, others: { fr: "Variable", en: "Varies" } },
      { label: { fr: "Avantage produit (à confirmer)", en: "Product advantage (to confirm)" }, us: { fr: "À confirmer", en: "To confirm" }, others: { fr: "À confirmer", en: "To confirm" } },
    ] as Array<{ label: Localized; us: boolean | Localized; others: boolean | Localized }>,
  },

  /** FAQ propre au produit (compatibilité, garantie…) — infos confirmées uniquement. */
  faq: [
    {
      q: { fr: "Est-ce compatible avec … ?", en: "Is it compatible with…?" },
      a: { fr: "Réponse à rédiger d'après la fiche fournisseur vérifiée.", en: "Answer to be written from the verified supplier listing." },
    },
    {
      q: { fr: "Quelle est la garantie ?", en: "What is the warranty?" },
      a: {
        fr: "Vous bénéficiez des garanties légales prévues par la Loi sur la protection du consommateur. Une éventuelle garantie supplémentaire est à préciser.",
        en: "You benefit from the statutory warranties under Québec's Consumer Protection Act. Any additional warranty is to be specified.",
      },
    },
    {
      q: { fr: "Quels accessoires sont inclus ?", en: "Which accessories are included?" },
      a: { fr: "Voir le contenu du colis, à confirmer avec le fournisseur.", en: "See the box contents, to be confirmed with the supplier." },
    },
  ] satisfies Array<{ q: Localized; a: Localized }>,

  /**
   * VRAIS avis uniquement (avec accord de l'auteur). Vide = section et note masquées.
   * `photo` : chemin sous /public/product/reviews/ (facultatif).
   */
  reviews: [] as Array<{
    author: string;
    city: string;
    rating: 1 | 2 | 3 | 4 | 5;
    text: Localized;
    date: string;
    photo?: string;
    verifiedPurchase: boolean;
  }>,
};

export type ProductData = typeof product;
export type MediaId = keyof typeof media;

export function getMedia(id: string | undefined): MediaItem {
  return (id && id in product.media ? product.media[id as MediaId] : product.media.hero) as MediaItem;
}

export function getVariant(id: string): Variant | undefined {
  return product.variants.find((v) => v.id === id);
}

export const defaultVariant: Variant = product.variants.find((v) => v.available) ?? product.variants[0];

/** Note moyenne calculée à partir des vrais avis (null s'il n'y en a pas). */
export function reviewSummary(): { average: number; count: number } | null {
  if (product.reviews.length === 0) return null;
  const sum = product.reviews.reduce((s, r) => s + r.rating, 0);
  return { average: Math.round((sum / product.reviews.length) * 10) / 10, count: product.reviews.length };
}
