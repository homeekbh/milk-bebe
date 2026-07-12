// ═══════════════════════════════════════════════════════════════════════════
// lib/parrainage.ts — Logique de calcul du parrainage (étape 13).
//
// Fonction PURE, sans I/O : même code côté client (affichage /panier) et côté
// serveur (re-validation à create-session). Le serveur ne fait JAMAIS confiance
// au calcul client — il ré-exécute computeParrainage avec ses propres données.
//
// Ordre STRICT (payment-critical) :
//   1. sous-total (items + packs)
//   2. − code promo classique              → totalApresPromo
//   3. livraison offerte : totalApresPromo >= seuilLivraison     (>=)
//   4. − code parrain (méca 1) : si totalApresPromo >= seuilFilleul (>=)
//                                            → totalApresParrain
//   5. − récompenses (méca 2) : si totalApresParrain >= seuilParrain (>=)
//                                            → totalFinal
// Tous les comparateurs de seuil sont `>=` (cohérence livraison / parrain).
// ═══════════════════════════════════════════════════════════════════════════

export type ParrainageSettings = {
  actif: boolean;
  montant_recompense: number;
  seuil_filleul: number;
  // Barème PROGRESSIF : un seuil par position de récompense (1ère, 2e, 3e, 4e…).
  // La i-ème récompense est cochable dès que le total atteint seuils_parrain[i].
  seuils_parrain: number[];
  max_recompenses_par_commande: number;
  duree_validite_jours: number;
  categories_restriction: string[] | null;
};

export const DEFAULT_PARRAINAGE_SETTINGS: ParrainageSettings = {
  actif: true,
  montant_recompense: 5,
  seuil_filleul: 60,
  seuils_parrain: [60, 80, 90, 100],
  max_recompenses_par_commande: 4,
  duree_validite_jours: 30,
  categories_restriction: null,
};

export type ParrainageInput = {
  settings: ParrainageSettings;
  subtotal: number;             // items + packs, avant toute remise
  promoDiscount: number;        // montant remise promo classique (>= 0)
  freeShippingThreshold: number;
  // Code parrain saisi ET déjà validé en amont (existe, actif, PAS le sien).
  // Le seuil (méca 1) est évalué ICI, pas en amont.
  hasValidParrainCode: boolean;
  rewardsAvailableCount: number; // récompenses `disponible` non expirées du compte
  rewardsSelectedCount: number;  // cases cochées par le client
  cartCategorySlugs: string[];   // catégories des articles (restriction méca 2)
};

export type ParrainageResult = {
  subtotal: number;
  totalApresPromo: number;
  freeShipping: boolean;
  // Mécanique 1
  parrainApplicable: boolean;
  parrainDiscount: number;
  totalApresParrain: number;
  parrainShortfall: number;      // € manquants pour débloquer le code parrain (0 si OK/absent)
  // Mécanique 2
  rewardsEligible: boolean;      // au moins 1 palier débloqué + catégorie OK + système actif
  rewardsUnlocked: number;       // nb de POSITIONS débloquées par le barème (plafonné au max/commande)
  rewardsUsable: number;         // nb de récompenses réellement activables (min sélection / débloqué / stock)
  rewardDiscount: number;
  rewardsShortfall: number;      // € manquants pour débloquer la PROCHAINE case (0 si aucune de plus)
  // Total
  totalFinal: number;
};

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeParrainage(input: ParrainageInput): ParrainageResult {
  const s = input.settings;
  const subtotal = round2(Math.max(0, input.subtotal));
  const promoDiscount = round2(Math.max(0, input.promoDiscount));

  // 2) après promo classique
  const totalApresPromo = round2(Math.max(0, subtotal - promoDiscount));

  // 3) livraison offerte (>=)
  const freeShipping = totalApresPromo >= input.freeShippingThreshold;

  // 4) code parrain (méca 1) — seuil >= seuil_filleul, sur totalApresPromo
  const parrainThresholdOk = totalApresPromo >= s.seuil_filleul;
  const parrainApplicable = !!s.actif && input.hasValidParrainCode && parrainThresholdOk;
  const parrainDiscount = parrainApplicable ? round2(s.montant_recompense) : 0;
  const totalApresParrain = round2(Math.max(0, totalApresPromo - parrainDiscount));
  const parrainShortfall =
    s.actif && input.hasValidParrainCode && !parrainThresholdOk
      ? round2(Math.max(0, s.seuil_filleul - totalApresPromo))
      : 0;

  // 5) récompenses (méca 2) — barème PROGRESSIF sur totalApresParrain. Chaque
  //    position i (1ère, 2e, …) a son propre seuil seuils_parrain[i], évalué
  //    indépendamment sur le même total de référence.
  const categoryOk =
    !s.categories_restriction ||
    s.categories_restriction.length === 0 ||
    input.cartCategorySlugs.some((c) => s.categories_restriction!.includes(c));

  const tiers = Array.isArray(s.seuils_parrain) ? s.seuils_parrain : [];
  // Paliers atteints DANS L'ORDRE (seuils croissants → on s'arrête au 1er non atteint).
  let tiersReached = 0;
  for (const t of tiers) {
    if (totalApresParrain >= t) tiersReached++;
    else break;
  }
  // Positions débloquées par le barème (plafonnées au max/commande, hors stock).
  const rewardsUnlocked = Math.min(tiersReached, s.max_recompenses_par_commande);
  // Plafond réel = positions débloquées ∩ stock de récompenses disponible.
  const rewardsCap = Math.min(rewardsUnlocked, input.rewardsAvailableCount);
  const rewardsEligible = !!s.actif && categoryOk && rewardsCap > 0;

  const rewardsUsable = rewardsEligible ? Math.max(0, Math.min(input.rewardsSelectedCount, rewardsCap)) : 0;
  const rewardDiscount = round2(rewardsUsable * s.montant_recompense);
  const totalFinal = round2(Math.max(0, totalApresParrain - rewardDiscount));

  // Manque pour débloquer la PROCHAINE case (dans la limite du stock + max), 0 sinon.
  const nextIdx = tiersReached;
  const canUnlockMore =
    !!s.actif && categoryOk &&
    nextIdx < Math.min(tiers.length, s.max_recompenses_par_commande, input.rewardsAvailableCount);
  const rewardsShortfall = canUnlockMore ? round2(Math.max(0, tiers[nextIdx] - totalApresParrain)) : 0;

  return {
    subtotal,
    totalApresPromo,
    freeShipping,
    parrainApplicable,
    parrainDiscount,
    totalApresParrain,
    parrainShortfall,
    rewardsEligible,
    rewardsUnlocked,
    rewardsUsable,
    rewardDiscount,
    rewardsShortfall,
    totalFinal,
  };
}

// Récompense utilisable = disponible ET non expirée (calcul à la lecture, fait
// autorité même si le status en base n'a pas encore été passé à 'expiree').
export function isRewardUsable(
  reward: { status: string; expires_at: string },
  now: Date
): boolean {
  return reward.status === "disponible" && new Date(reward.expires_at).getTime() > now.getTime();
}
