/**
 * ════════════════════════════════════════════════════════════════════════════
 *  DONNÉES PRODUIT : fichier unique à modifier pour changer de produit.
 *  (Données publiques : jamais de coût ni d'info fournisseur ici —
 *   voir src/server/supplier-config.ts.)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Produit : doudoune pour chien, 5 coloris × 8 tailles (S à 5XL).
 * Sont CONFIRMÉS (photos et informations fournies par le propriétaire) : coloris,
 * tailles, tableau des mesures, éléments visibles sur les photos (matelassage,
 * fermeture éclair avant, col montant, poignets élastiqués).
 * Restent À CONFIRMER : matériaux, imperméabilité, prix, délais réels. Entretien : recommandations
 * générales (lavage à la main, séchage à l'air libre) en attendant l'étiquette du fabricant.
 *
 * Règles d'honnêteté appliquées par le code :
 * - Note ★ et avis : affichés UNIQUEMENT à partir de `reviews` (vrais avis). Vide = masqué.
 * - Prix barré / badge « -XX % » : UNIQUEMENT si `compareAt` est justifié, ou remise de quantité réelle.
 * - Cadeau du panier : affiché UNIQUEMENT si `gift.enabled` (et le cadeau doit exister).
 * - Prix en cents CAD, taxes en sus ; le serveur recalcule tout à partir de ce fichier.
 */
import type { Localized, MediaItem, PriceTier, Variant, VideoItem } from "@/config/types";

const PHOTO_RIGHTS = "Photo fournie par le propriétaire de la boutique — droit d'utilisation à confirmer (fournisseur).";

const photo = (id: string, file: string, fr: string, en: string, width: number, height: number): MediaItem => ({
  id,
  src: `/product/${file}`,
  alt: { fr, en },
  width,
  height,
  provisional: false,
  rights: PHOTO_RIGHTS,
});

const placeholder = (id: string, file: string, fr: string, en: string, width = 1200, height = 1200): MediaItem => ({
  id,
  src: `/product/${file}`,
  alt: { fr: `Visuel provisoire — ${fr}`, en: `Placeholder — ${en}` },
  width,
  height,
  provisional: true,
});

const media = {
  vert: photo("vert", "vert.jpg", "Shiba inu portant la doudoune verte et noire", "Shiba inu wearing the green and black puffer jacket", 2000, 1116),
  violet: photo("violet", "violet.jpg", "Shiba inu portant la doudoune violette et noire", "Shiba inu wearing the purple and black puffer jacket", 2000, 1116),
  rose: photo("rose", "rose.jpg", "Shiba inu portant la doudoune rose et noire", "Shiba inu wearing the pink and black puffer jacket", 2000, 1116),
  jaune: photo("jaune", "jaune.jpg", "Shiba inu portant la doudoune jaune et noire", "Shiba inu wearing the yellow and black puffer jacket", 1376, 768),
  rouge: photo("rouge", "rouge.jpg", "Shiba inu portant la doudoune rouge et noire", "Shiba inu wearing the red and black puffer jacket", 1376, 768),
  detail1: placeholder("detail1", "detail-1.jpg", "détail et contenu du colis", "detail and box contents"),
  lifestyle: placeholder("lifestyle", "lifestyle.jpg", "produit en situation", "product in use", 1600, 1000),
  before: photo("before", "avant-hiver.jpg", "Chien sans manteau, assis sous la neige dans une rue en hiver", "Dog without a coat sitting in the snow on a winter street", 1376, 768),
  after: photo("after", "apres-hiver.jpg", "Le même chien portant la doudoune jaune et noire sous la neige", "The same dog wearing the yellow and black puffer jacket in the snow", 1376, 768),
} satisfies Record<string, MediaItem>;

/** Coloris (l'ordre est celui du sélecteur). */
export const colors = [
  { id: "vert", code: "VER", label: { fr: "Vert", en: "Green" }, swatch: "#1FA95B", mediaId: "vert" },
  { id: "violet", code: "VIO", label: { fr: "Violet", en: "Purple" }, swatch: "#6A2BC2", mediaId: "violet" },
  { id: "rose", code: "ROS", label: { fr: "Rose", en: "Pink" }, swatch: "#F27A92", mediaId: "rose" },
  { id: "jaune", code: "JAU", label: { fr: "Jaune", en: "Yellow" }, swatch: "#F5C518", mediaId: "jaune" },
  { id: "rouge", code: "ROU", label: { fr: "Rouge", en: "Red" }, swatch: "#E3262D", mediaId: "rouge" },
] as const satisfies ReadonlyArray<{ id: string; code: string; label: Localized; swatch: string; mediaId: string }>;
export type ColorId = (typeof colors)[number]["id"];

export const sizes = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"] as const;
export type Size = (typeof sizes)[number];

/** Guide des tailles : mesures du vêtement (fournies par le propriétaire). */
export const sizeChart: ReadonlyArray<{ size: Size; chestCm: number; chestIn: number; backCm: number; backIn: number }> = [
  { size: "S", chestCm: 40, chestIn: 15.75, backCm: 25, backIn: 9.84 },
  { size: "M", chestCm: 44, chestIn: 17.32, backCm: 28, backIn: 11.02 },
  { size: "L", chestCm: 50, chestIn: 19.69, backCm: 31, backIn: 12.2 },
  { size: "XL", chestCm: 56, chestIn: 22.05, backCm: 35, backIn: 13.78 },
  { size: "2XL", chestCm: 62, chestIn: 24.41, backCm: 40, backIn: 15.75 },
  { size: "3XL", chestCm: 70, chestIn: 27.56, backCm: 49, backIn: 19.29 },
  { size: "4XL", chestCm: 76, chestIn: 29.92, backCm: 56, backIn: 22.05 },
  { size: "5XL", chestCm: 84, chestIn: 33.07, backCm: 67, backIn: 26.38 },
];

/** Identifiant de variante = coloris + taille (ex. « vert-xl »). */
export const variantIdFor = (colorId: string, size: string) => `${colorId}-${size.toLowerCase()}`;

/** 40 variantes générées (5 coloris × 8 tailles). Mettre `available: false` pour une rupture. */
const variants: Variant[] = colors.flatMap((c) =>
  sizes.map((s) => ({
    id: variantIdFor(c.id, s),
    sku: `DJ-${c.code}-${s}`,
    label: { fr: `${c.label.fr} · ${s}`, en: `${c.label.en} · ${s}` },
    swatch: c.swatch,
    available: true,
    mediaId: c.mediaId,
    colorId: c.id,
    size: s,
  })),
);

export type FeatureIcon = "spark" | "hand" | "shield" | "clock" | "leaf" | "box";

export const product = {
  id: "dog-puffer",
  /** Passer à true UNIQUEMENT quand tout le contenu est vérifié (matériaux, prix, délais). */
  confirmed: false,

  /** Nom commercial (marque à choisir), pas le titre AliExpress. */
  name: { fr: "Doudoune pour chien", en: "Dog puffer jacket" } satisfies Localized,
  /** Titre géant du hero (affiché en MAJUSCULES). */
  headline: { fr: "La doudoune de ton chien", en: "Your dog's puffer jacket" } satisfies Localized,
  problemSolved: { fr: "Les sorties d'hiver, bien emmitouflé", en: "Winter walks, bundled up" } satisfies Localized,
  subheadline: {
    fr: "Doudoune matelassée à fermeture éclair, col montant et poignets élastiqués. 5 coloris, 8 tailles du S au 5XL.",
    en: "Quilted puffer with front zip, high collar and elastic cuffs. 5 colours, 8 sizes from S to 5XL.",
  } satisfies Localized,
  description: {
    fr: "Doudoune matelassée pour chien, 5 coloris bicolores (vert, violet, rose, jaune, rouge) et 8 tailles du S au 5XL.",
    en: "Quilted dog puffer jacket in 5 two-tone colours (green, purple, pink, yellow, red) and 8 sizes from S to 5XL.",
  } satisfies Localized,

  pricing: {
    /** Passer à true après validation du coût fournisseur habituel et de la marge (par taille si besoin). */
    confirmed: false,
    /** Prix unitaire selon la quantité totale (le palier 1 = prix de vente de référence). */
    tiers: [
      { minQuantity: 1, unitPriceCents: 3999 },
      { minQuantity: 2, unitPriceCents: 3599 },
      { minQuantity: 3, unitPriceCents: 3299 },
    ] satisfies PriceTier[],
    /** Prix barré : `null` tant qu'il n'est pas JUSTIFIÉ. Ex. { priceCents: 5999, justification: "Prix courant du … au …" }. */
    compareAt: null as null | { priceCents: number; justification: string },
  },

  colors,
  sizes,
  sizeChart,
  variants,

  /** Cadeau offert au-delà d'un montant (barre de progression du panier). */
  gift: {
    /** N'activer que si le cadeau existe réellement et sera expédié. */
    enabled: true,
    confirmed: false,
    thresholdCents: 7000,
    label: { fr: "Cadeau à définir", en: "Gift to be defined" } satisfies Localized,
  },

  media,
  /** Galerie du hero : une photo par coloris. */
  gallery: ["vert", "violet", "rose", "jaune", "rouge"] as Array<keyof typeof media>,
  video: null as VideoItem | null,

  /** Problème → solution (2 colonnes avant / après). */
  problemSolution: {
    before: {
      title: { fr: "Sans doudoune", en: "Without a jacket" },
      mediaId: "before",
      points: [
        { fr: "Promenades écourtées par temps froid (à confirmer)", en: "Walks cut short in cold weather (to confirm)" },
        { fr: "Le pelage seul face au vent et à la neige (à confirmer)", en: "Just fur against wind and snow (to confirm)" },
        { fr: "Manteaux mal ajustés qui tournent ou glissent (à confirmer)", en: "Ill-fitting coats that twist or slip (to confirm)" },
      ],
    },
    after: {
      title: { fr: "Avec la doudoune", en: "With the jacket" },
      mediaId: "after",
      points: [
        { fr: "Corps et pattes avant couverts par un matelassage rembourré", en: "Body and front legs covered by quilted padding" },
        { fr: "Col montant et poignets élastiqués", en: "High collar and elastic cuffs" },
        { fr: "8 tailles du S au 5XL pour un ajustement précis", en: "8 sizes from S to 5XL for a precise fit" },
      ],
    },
  },

  /** Caractéristiques clés (grille modulaire). Uniquement ce qui est visible ou confirmé. */
  features: [
    { icon: "shield", title: { fr: "Matelassage rembourré", en: "Quilted padding" }, text: { fr: "Doudoune matelassée qui couvre le corps et les pattes avant.", en: "Quilted puffer covering the body and front legs." } },
    { icon: "hand", title: { fr: "Fermeture éclair avant", en: "Front zip" }, text: { fr: "Une fermeture éclair sur le devant pour l'enfiler et l'ajuster.", en: "A front zip to put it on and adjust it." } },
    { icon: "spark", title: { fr: "Col montant", en: "High collar" }, text: { fr: "Un col montant qui couvre le haut du cou.", en: "A high collar that covers the top of the neck." } },
    { icon: "box", title: { fr: "Poignets élastiqués", en: "Elastic cuffs" }, text: { fr: "Les manches se resserrent aux pattes avant.", en: "Sleeves gather at the front legs." } },
    { icon: "leaf", title: { fr: "5 coloris bicolores", en: "5 two-tone colours" }, text: { fr: "Vert, violet, rose, jaune ou rouge, avec empiècements noirs.", en: "Green, purple, pink, yellow or red, with black panels." } },
    { icon: "clock", title: { fr: "8 tailles, S à 5XL", en: "8 sizes, S to 5XL" }, text: { fr: "Du petit au très grand chien : choisis selon le tour de poitrine et le dos.", en: "From small to very large dogs: choose by chest and back length." } },
  ] satisfies Array<{ icon: FeatureIcon; title: Localized; text: Localized }>,

  /** Comment ça marche — 3 étapes. */
  steps: [
    { title: { fr: "Mesure ton chien", en: "Measure your dog" }, text: { fr: "Tour de poitrine à l'endroit le plus large, et dos du cou à la base de la queue.", en: "Chest at its widest point, and back from the neck to the base of the tail." } },
    { title: { fr: "Choisis la taille", en: "Pick the size" }, text: { fr: "Compare avec le guide des tailles. Entre deux tailles, prends la plus grande.", en: "Compare with the size guide. Between two sizes, go for the larger one." } },
    { title: { fr: "Enfile et ferme", en: "Put it on and zip" }, text: { fr: "Pattes avant dans les manches, puis fermeture éclair sur le devant (à confirmer avec la notice).", en: "Front legs through the sleeves, then zip up the front (to confirm with the manual)." } },
  ] satisfies Array<{ title: Localized; text: Localized }>,

  specs: [
    { label: { fr: "Coloris", en: "Colours" }, value: { fr: "Vert, violet, rose, jaune, rouge", en: "Green, purple, pink, yellow, red" } },
    { label: { fr: "Tailles", en: "Sizes" }, value: { fr: "S, M, L, XL, 2XL, 3XL, 4XL, 5XL", en: "S, M, L, XL, 2XL, 3XL, 4XL, 5XL" } },
    { label: { fr: "Matériau", en: "Material" }, value: { fr: "À confirmer", en: "To be confirmed" } },
    {
      label: { fr: "Entretien", en: "Care" },
      value: { fr: "Lavage à la main à l'eau froide, séchage à l'air libre (voir l'étiquette)", en: "Hand wash cold, air dry (see care label)" },
    },
  ] satisfies Array<{ label: Localized; value: Localized }>,
  packageContents: [{ fr: "1 × doudoune pour chien", en: "1 × dog puffer jacket" }] satisfies Localized[],

  /** FAQ propre au produit. La question « Quelle taille choisir ? » affiche le tableau des tailles. */
  faq: [
    {
      q: { fr: "Quelle taille choisir ?", en: "Which size should I choose?" },
      a: {
        fr: "Mesure le tour de poitrine et la longueur du dos de ton chien, puis compare avec le tableau ci-dessous.",
        en: "Measure your dog's chest and back length, then compare with the chart below.",
      },
      sizeChart: true,
    },
    {
      q: { fr: "Convient-elle à mon chien ?", en: "Will it fit my dog?" },
      a: {
        fr: "Les 8 tailles couvrent un tour de poitrine de 40 à 84 cm. Fie-toi aux mesures plutôt qu'à la race.",
        en: "The 8 sizes cover a chest from 40 to 84 cm (15.75 to 33.07 in). Go by measurements rather than breed.",
      },
    },
    {
      q: { fr: "Quelle est la garantie ?", en: "What is the warranty?" },
      a: {
        fr: "Vous bénéficiez des garanties légales prévues par la Loi sur la protection du consommateur. Une éventuelle garantie supplémentaire est à préciser.",
        en: "You benefit from the statutory warranties under Québec's Consumer Protection Act. Any additional warranty is to be specified.",
      },
    },
    {
      q: { fr: "Comment l'entretenir ?", en: "How do I care for it?" },
      // Recommandations générales pour les vêtements rembourrés : l'étiquette du vêtement prime.
      a: {
        fr: "Recommandations générales pour un vêtement rembourré : lave-le à la main à l'eau froide avec un détergent doux, sans eau de Javel, produit agressif ni assouplissant. Presse-le doucement pour retirer l'eau, sans le tordre, puis laisse-le sécher complètement à l'air libre, à l'abri de la chaleur directe et du soleil. Évite le lave-linge et la sécheuse, sauf si l'étiquette l'autorise. En cas de doute, suis toujours l'étiquette d'entretien cousue sur le vêtement.",
        en: "General guidelines for padded clothing: hand wash in cold water with a mild detergent, without bleach, harsh chemicals or fabric softener. Gently press out the water without wringing, then let it air dry completely, away from direct heat and sunlight. Avoid the washing machine and dryer unless the care label allows them. When in doubt, always follow the care label sewn into the garment.",
      },
    },
  ] as Array<{ q: Localized; a: Localized; sizeChart?: boolean }>,

  /** VRAIS avis uniquement (avec accord de l'auteur). Vide = section et note masquées. */
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
  return (id && id in product.media ? product.media[id as MediaId] : product.media.vert) as MediaItem;
}

export function getVariant(id: string | null | undefined): Variant | undefined {
  return id ? product.variants.find((v) => v.id === id) : undefined;
}

export function getColor(id: string) {
  return colors.find((c) => c.id === id);
}

export const defaultColor = colors[0];
export const defaultVariant: Variant = product.variants.find((v) => v.available) ?? product.variants[0];

/** Note moyenne calculée à partir des vrais avis (null s'il n'y en a pas). */
export function reviewSummary(): { average: number; count: number } | null {
  if (product.reviews.length === 0) return null;
  const sum = product.reviews.reduce((s, r) => s + r.rating, 0);
  return { average: Math.round((sum / product.reviews.length) * 10) / 10, count: product.reviews.length };
}
