// ═══════════════════════════════════════════════════════════════════════════
// lib/parrainage-refund.ts — Décision PURE : que faire d'une récompense parrain
// quand la commande FILLEUL qui l'a générée est remboursée ? (anti-abus, étape 22)
//
// Sans I/O → testable unitairement. Le webhook charge.refunded applique le verdict
// (update DB). Règles verrouillées :
//   - récompense déjà 'expiree' ou 'annulee'        → rien à faire ;
//   - remboursement PARTIEL (ambigu)                → révision manuelle, jamais d'annulation auto ;
//   - remboursement TOTAL + récompense 'disponible' → annulation automatique ;
//   - remboursement TOTAL + récompense 'utilisee'   → révision manuelle (pas de clawback
//                                                     d'une commande parrain déjà payée).
// ═══════════════════════════════════════════════════════════════════════════

export type RewardRefundAction = "cancel" | "flag_review" | "noop";

export type RewardRefundDecision = {
  action: RewardRefundAction;
  reason: string; // motif machine, stocké dans annulation_reason / le log admin
};

export function decideRewardOnRefund(
  status: string,
  isTotalRefund: boolean,
): RewardRefundDecision {
  // Déjà sans valeur ou déjà traitée → aucune action (idempotent).
  if (status === "expiree" || status === "annulee") {
    return { action: "noop", reason: "aucune_action_requise" };
  }

  // Remboursement partiel → on ne peut pas trancher automatiquement (le produit qui a
  // fait franchir le seuil filleul peut ou non avoir été remboursé) → révision humaine.
  if (!isTotalRefund) {
    return { action: "flag_review", reason: "remboursement_partiel_filleul" };
  }

  // Remboursement total :
  if (status === "disponible") {
    return { action: "cancel", reason: "commande_filleul_remboursee_total" };
  }
  if (status === "utilisee") {
    // Déjà dépensée sur une commande du parrain déjà payée/confirmée → pas de clawback
    // automatique, un humain décide (contacter le parrain, ajuster, etc.).
    return { action: "flag_review", reason: "deja_utilisee_apres_remboursement" };
  }

  // Statut inconnu → prudence : révision manuelle plutôt qu'action irréversible.
  return { action: "flag_review", reason: "statut_inconnu" };
}
