import { test, expect } from "@playwright/test";
import { combinePromos, type ValidatedPromo } from "../lib/promo-combine";

// ═══════════════════════════════════════════════════════════════════════════
// Étape 21 — cumul de codes promo classiques. Tests de la logique PURE
// (ordre fixe→%, compat mutuelle des deux côtés, plafond 60 %). Aucun DB/navigateur.
// ═══════════════════════════════════════════════════════════════════════════

function P(code: string, type: string, value: number, cumulable: boolean, cumulable_codes: string[], free_shipping = false): ValidatedPromo {
  return { code, type, value, free_shipping, cumulable_avec_livraison: true, cumulable, cumulable_codes };
}

test("2 codes cumulables (fixe + %) — ordre FIXE puis % respecté", () => {
  const r = combinePromos([P("A", "fixed", 10, true, ["B"]), P("B", "percent", 20, true, ["A"])], 100);
  expect(r.valid).toBe(true);
  if (r.valid) {
    expect(r.entries.find(e => e.code === "A")!.discount).toBe(10);  // fixe : 100 → 90
    expect(r.entries.find(e => e.code === "B")!.discount).toBe(18);  // 20 % de 90
    expect(r.totalDiscount).toBe(28);
  }
});

test("ordre indépendant de la saisie (% saisi d'abord → fixe appliqué quand même en 1er)", () => {
  const r = combinePromos([P("B", "percent", 20, true, ["A"]), P("A", "fixed", 10, true, ["B"])], 100);
  expect(r.valid).toBe(true);
  if (r.valid) expect(r.totalDiscount).toBe(28);
});

test("déclaration à SENS UNIQUE → refusé (B ne liste pas A)", () => {
  const r = combinePromos([P("A", "fixed", 10, true, ["B"]), P("B", "percent", 20, true, [])], 100);
  expect(r.valid).toBe(false);
  if (!r.valid) expect(r.rejectedCode).toBe("B");
});

test("code non cumulable → refusé", () => {
  const r = combinePromos([P("A", "fixed", 10, true, ["B"]), P("B", "percent", 20, false, ["A"])], 100);
  expect(r.valid).toBe(false);
});

test("plafond 60 % dépassé → refus du DERNIER code (2×40 % → 64 %)", () => {
  const r = combinePromos([P("A", "percent", 40, true, ["B"]), P("B", "percent", 40, true, ["A"])], 100);
  expect(r.valid).toBe(false);
  if (!r.valid) expect(r.rejectedCode).toBe("B");
});

test("plafond 60 % — juste en dessous (2×30 % → 51 %) → OK", () => {
  const r = combinePromos([P("A", "percent", 30, true, ["B"]), P("B", "percent", 30, true, ["A"])], 100);
  expect(r.valid).toBe(true);
  if (r.valid) expect(r.totalDiscount).toBe(51); // 30 → 70 ; 30 % de 70 = 21
});

test("un seul code → aucun contrôle de cumul (même exclusif)", () => {
  const r = combinePromos([P("SOLO", "percent", 30, false, [])], 100);
  expect(r.valid).toBe(true);
  if (r.valid) expect(r.totalDiscount).toBe(30);
});

test("2 codes FIXES cumulables → somme", () => {
  const r = combinePromos([P("A", "fixed", 20, true, ["B"]), P("B", "fixed", 15, true, ["A"])], 100);
  expect(r.valid).toBe(true);
  if (r.valid) expect(r.totalDiscount).toBe(35);
});

test("code livraison offerte dans le combo → discount 0 + free_shipping true", () => {
  const r = combinePromos([P("A", "fixed", 10, true, ["B"]), P("B", "free_shipping", 0, true, ["A"], true)], 100);
  expect(r.valid).toBe(true);
  if (r.valid) {
    expect(r.entries.find(e => e.code === "B")!.discount).toBe(0);
    expect(r.free_shipping).toBe(true);
    expect(r.totalDiscount).toBe(10);
  }
});

test("fixe > sous-total → plafonné au sous-total (pas de total négatif)", () => {
  const r = combinePromos([P("BIG", "fixed", 200, false, [])], 50);
  expect(r.valid).toBe(true);
  if (r.valid) expect(r.totalDiscount).toBe(50);
});
