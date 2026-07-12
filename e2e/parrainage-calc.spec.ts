import { test, expect } from "@playwright/test";
import {
  computeParrainage,
  DEFAULT_PARRAINAGE_SETTINGS,
  type ParrainageInput,
} from "../lib/parrainage";

// ═══════════════════════════════════════════════════════════════════════════
// Étape 19 — scénarios EXACTS du prompt, testés sur la logique de calcul PURE
// (payment-critical). Aucun navigateur / DB : on verrouille le calcul du montant
// avant de construire l'UI par-dessus.
// ═══════════════════════════════════════════════════════════════════════════

function mk(over: Partial<ParrainageInput> = {}): ParrainageInput {
  return {
    settings: { ...DEFAULT_PARRAINAGE_SETTINGS },
    subtotal: 0,
    promoDiscount: 0,
    freeShippingThreshold: 60,
    hasValidParrainCode: false,
    rewardsAvailableCount: 0,
    rewardsSelectedCount: 0,
    cartCategorySlugs: [],
    ...over,
  };
}

test("Scénario 1 — 50€ + code parrain → invalide (sous 60€), manque 10€", () => {
  const r = computeParrainage(mk({ subtotal: 50, hasValidParrainCode: true }));
  expect(r.parrainApplicable).toBe(false);
  expect(r.parrainDiscount).toBe(0);
  expect(r.parrainShortfall).toBe(10);
  expect(r.totalFinal).toBe(50);
  expect(r.freeShipping).toBe(false);
});

test("Scénario 2 — 70€ + code parrain → 65€, livraison offerte active", () => {
  const r = computeParrainage(mk({ subtotal: 70, hasValidParrainCode: true }));
  expect(r.parrainApplicable).toBe(true);
  expect(r.parrainDiscount).toBe(5);
  expect(r.totalFinal).toBe(65);
  expect(r.freeShipping).toBe(true);
});

test("Scénario 3 — 60€ pile + code parrain → 55€, livraison AUSSI active (>=)", () => {
  const r = computeParrainage(mk({ subtotal: 60, hasValidParrainCode: true }));
  expect(r.parrainApplicable).toBe(true); // 60 >= 60
  expect(r.totalFinal).toBe(55);
  expect(r.freeShipping).toBe(true); // 60 >= 60, MÊME comparateur
});

test("Scénario 4 — 65€ + code parrain PUIS promo -30% → 45,50€, parrain & livraison retombent invalides", () => {
  const promoDiscount = 65 * 0.3; // 19.50
  const r = computeParrainage(mk({ subtotal: 65, promoDiscount, hasValidParrainCode: true }));
  expect(r.totalApresPromo).toBe(45.5);
  expect(r.freeShipping).toBe(false); // 45.50 < 60
  expect(r.parrainApplicable).toBe(false); // 45.50 < 60
  expect(r.parrainDiscount).toBe(0);
  expect(r.totalFinal).toBe(45.5);
});

test("Scénario 5 — 100€, ETE30 -30% → 70€, code parrain → 65€, récompenses NON valables (<100€)", () => {
  const r = computeParrainage(
    mk({ subtotal: 100, promoDiscount: 30, hasValidParrainCode: true, rewardsAvailableCount: 3, rewardsSelectedCount: 3 })
  );
  expect(r.totalApresPromo).toBe(70);
  expect(r.freeShipping).toBe(true);
  expect(r.parrainApplicable).toBe(true);
  expect(r.totalApresParrain).toBe(65);
  expect(r.rewardsEligible).toBe(false); // 65 < 100
  expect(r.rewardDiscount).toBe(0);
  expect(r.totalFinal).toBe(65);
});

test("Scénario 6 — récompenses sous le seuil 100€ → grisées, manque exact", () => {
  const r = computeParrainage(mk({ subtotal: 70, hasValidParrainCode: true, rewardsAvailableCount: 2, rewardsSelectedCount: 2 }));
  // 70 → parrain -5 → 65 ; récompenses 65 < 100
  expect(r.totalApresParrain).toBe(65);
  expect(r.rewardsEligible).toBe(false);
  expect(r.rewardsShortfall).toBe(35); // 100 - 65
  expect(r.rewardDiscount).toBe(0);
});

test("Scénario 7 — propre code refusé en amont (hasValidParrainCode=false) → aucune remise", () => {
  const r = computeParrainage(mk({ subtotal: 80, hasValidParrainCode: false }));
  expect(r.parrainApplicable).toBe(false);
  expect(r.parrainDiscount).toBe(0);
  expect(r.totalFinal).toBe(80);
});

test("Scénario 8 — code parrain ET récompenses sur la même commande, chacune sa condition", () => {
  const r = computeParrainage(
    mk({ subtotal: 120, hasValidParrainCode: true, rewardsAvailableCount: 3, rewardsSelectedCount: 2 })
  );
  // 120 → parrain -5 → 115 ; récompenses 115 >= 100 → 2 cochées × 5 = 10 → 105
  expect(r.parrainApplicable).toBe(true);
  expect(r.parrainDiscount).toBe(5);
  expect(r.totalApresParrain).toBe(115);
  expect(r.rewardsEligible).toBe(true);
  expect(r.rewardsUsable).toBe(2);
  expect(r.rewardDiscount).toBe(10);
  expect(r.totalFinal).toBe(105);
});

test("Scénario 8b — plafond max_recompenses_par_commande respecté (coche 6, max 4)", () => {
  const r = computeParrainage(
    mk({ subtotal: 200, hasValidParrainCode: true, rewardsAvailableCount: 6, rewardsSelectedCount: 6 })
  );
  expect(r.rewardsUsable).toBe(4); // plafonné à max_recompenses_par_commande
  expect(r.rewardDiscount).toBe(20);
  expect(r.totalFinal).toBe(200 - 5 - 20); // 175
});

test("Scénario 9 — parrainage désactivé (admin) → aucune remise, aucune récompense", () => {
  const settings = { ...DEFAULT_PARRAINAGE_SETTINGS, actif: false };
  const r = computeParrainage(
    mk({ settings, subtotal: 150, hasValidParrainCode: true, rewardsAvailableCount: 4, rewardsSelectedCount: 4 })
  );
  expect(r.parrainApplicable).toBe(false);
  expect(r.rewardsEligible).toBe(false);
  expect(r.totalFinal).toBe(150);
});

test("Restriction catégorie — méca 2 indisponible si aucun article dans une catégorie autorisée", () => {
  const settings = { ...DEFAULT_PARRAINAGE_SETTINGS, categories_restriction: ["gigoteuses"] };
  const r = computeParrainage(
    mk({ settings, subtotal: 150, rewardsAvailableCount: 2, rewardsSelectedCount: 2, cartCategorySlugs: ["pyjamas", "bodies"] })
  );
  expect(r.rewardsEligible).toBe(false); // aucune catégorie autorisée dans le panier
  const r2 = computeParrainage(
    mk({ settings, subtotal: 150, rewardsAvailableCount: 2, rewardsSelectedCount: 2, cartCategorySlugs: ["pyjamas", "gigoteuses"] })
  );
  expect(r2.rewardsEligible).toBe(true); // au moins une catégorie autorisée
});
