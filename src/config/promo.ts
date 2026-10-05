/**
 * JEU « GRATTE & GAGNE » — configuration publique (les chances sont affichées aux clients).
 *
 * Les poids sont exprimés sur 10 000 tirages : 50 / 10 000 = 1 chance sur 200.
 * Le tirage a lieu CÔTÉ SERVEUR (src/server/promo) ; le navigateur ne fait qu'afficher le résultat.
 *
 * ⚠️ Avant de lancer le jeu : vérifier les obligations d'un concours publicitaire au Québec
 * (Régie des alcools, des courses et des jeux) et la Loi sur la concurrence (divulgation des chances).
 */
export type Prize =
  | { id: string; type: "percent"; value: number; weight: number }
  | { id: string; type: "bogo"; weight: number };

export const scratchGame = {
  enabled: true,
  /** Ouverture automatique de la fenêtre après ce délai (ms), une seule fois par visiteur. */
  autoOpenDelayMs: 12_000,
  /** Après fermeture sans jouer, la fenêtre ne se rouvre pas automatiquement avant N jours. */
  snoozeDays: 7,
  /** Validité du code gagné (jours). */
  validityDays: 14,
  /** Pourcentage de surface grattée qui révèle le résultat. */
  revealThreshold: 0.5,
  /** Le rabais du code s'ajoute au rabais de quantité (calculé sur le sous-total après paliers). */
  stacksWithQuantityDiscount: true,
  prizes: [
    { id: "p5", type: "percent", value: 5, weight: 4000 },
    { id: "p10", type: "percent", value: 10, weight: 3500 },
    { id: "p15", type: "percent", value: 15, weight: 2000 },
    { id: "p20", type: "percent", value: 20, weight: 450 },
    { id: "bogo", type: "bogo", weight: 50 },
  ] satisfies Prize[],
};

export const TOTAL_WEIGHT = scratchGame.prizes.reduce((s, p) => s + p.weight, 0);

export function prizeLabel(prize: Prize, locale: "fr" | "en"): string {
  if (prize.type === "bogo") return locale === "fr" ? "1 acheté = 1 offert" : "Buy 1, get 1 free";
  return locale === "fr" ? `-${prize.value} %` : `-${prize.value}%`;
}

/** Chances affichées (ex. « 1 sur 200 (0,5 %) »). */
export function prizeOdds(prize: Prize, locale: "fr" | "en"): string {
  const pct = (prize.weight * 100) / TOTAL_WEIGHT;
  const fmt = new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", { maximumFractionDigits: 2 });
  const percent = locale === "fr" ? `${fmt.format(pct)} %` : `${fmt.format(pct)}%`;
  // « 1 sur N » seulement quand c'est exact (pas d'arrondi trompeur : 40 % ≠ 1 sur 3).
  const oneIn = TOTAL_WEIGHT / prize.weight;
  if (!Number.isInteger(oneIn)) return percent;
  return locale === "fr" ? `1 sur ${oneIn} (${percent})` : `1 in ${oneIn} (${percent})`;
}

