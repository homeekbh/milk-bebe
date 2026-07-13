import { test, expect } from "@playwright/test";
import { decideRewardOnRefund } from "../lib/parrainage-refund";

// ═══════════════════════════════════════════════════════════════════════════
// Étape 22 — annulation d'une récompense parrain si la commande filleul est
// remboursée. Tests de la décision PURE (aucun DB/navigateur).
// ═══════════════════════════════════════════════════════════════════════════

test("remboursement TOTAL + récompense disponible → annulation automatique", () => {
  const d = decideRewardOnRefund("disponible", true);
  expect(d.action).toBe("cancel");
  expect(d.reason).toBe("commande_filleul_remboursee_total");
});

test("remboursement TOTAL + récompense déjà utilisée → révision manuelle (pas de clawback)", () => {
  const d = decideRewardOnRefund("utilisee", true);
  expect(d.action).toBe("flag_review");
  expect(d.reason).toBe("deja_utilisee_apres_remboursement");
});

test("remboursement PARTIEL + disponible → révision manuelle (jamais d'annulation auto)", () => {
  const d = decideRewardOnRefund("disponible", false);
  expect(d.action).toBe("flag_review");
  expect(d.reason).toBe("remboursement_partiel_filleul");
});

test("remboursement PARTIEL + utilisée → révision manuelle", () => {
  const d = decideRewardOnRefund("utilisee", false);
  expect(d.action).toBe("flag_review");
  expect(d.reason).toBe("remboursement_partiel_filleul");
});

test("récompense déjà expirée → aucune action (total ou partiel)", () => {
  expect(decideRewardOnRefund("expiree", true).action).toBe("noop");
  expect(decideRewardOnRefund("expiree", false).action).toBe("noop");
});

test("récompense déjà annulée → aucune action (idempotent)", () => {
  expect(decideRewardOnRefund("annulee", true).action).toBe("noop");
  expect(decideRewardOnRefund("annulee", false).action).toBe("noop");
});

test("statut inconnu → révision manuelle par prudence (jamais d'action irréversible)", () => {
  const d = decideRewardOnRefund("???", true);
  expect(d.action).toBe("flag_review");
  expect(d.reason).toBe("statut_inconnu");
});
