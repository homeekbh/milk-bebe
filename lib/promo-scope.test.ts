import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { applyScopedPromos } from "./promo-scope";
import type { CartLine, ScopedPromoCode, ApplyOptions } from "./promo-scope";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// ── Helpers de fabrication ──────────────────────────────────────────────────
function line(productId: string, categorySlug: string, unitPriceTtc: number, quantity = 1, isPack = false): CartLine {
  return { productId, categorySlug, unitPriceTtc, quantity, isPack };
}
function pct(code: string, value: number, scope: Partial<ScopedPromoCode> = {}): ScopedPromoCode {
  return { code, discountType: "percent", discountValue: value, scopeKind: "all", ...scope };
}
function fixed(code: string, value: number, scope: Partial<ScopedPromoCode> = {}): ScopedPromoCode {
  return { code, discountType: "fixed", discountValue: value, scopeKind: "all", ...scope };
}

// ════════════════════════════════════════════════════════════════════════════
// A. CAS CHIFFRÉS DÉTERMINISTES
// ════════════════════════════════════════════════════════════════════════════
describe("applyScopedPromos — cas chiffrés", () => {
  it("exemple spec 85€ : -50% pyjama (products) puis -30% ETE30 (all, min 60 sur running total)", () => {
    const cart = [
      line("pyj", "pyjamas", 30),
      line("bod", "bodies", 20),
      line("gig", "gigoteuses", 35),
    ];
    const codes = [
      pct("PROMO-PYJAMA", 50, { scopeKind: "products", productIds: ["pyj"] }),
      pct("ETE30", 30, { scopeKind: "all", minOrder: 60 }),
    ];
    const r = applyScopedPromos(cart, codes);

    expect(r.subtotal).toBe(85);
    expect(r.totalDiscount).toBe(31.5);
    expect(r.totalAfterDiscount).toBe(53.5);
    expect(r.appliedCodes).toEqual(["PROMO-PYJAMA", "ETE30"]);
    expect(r.rejectedCodes).toEqual([]);

    const byId = Object.fromEntries(r.lines.map((l) => [l.productId, l]));
    expect(byId["pyj"].appliedCode).toBe("PROMO-PYJAMA");
    expect(byId["pyj"].lineDiscount).toBe(15);
    expect(byId["pyj"].finalLineTotal).toBe(15);
    expect(byId["bod"].appliedCode).toBe("ETE30");
    expect(byId["bod"].lineDiscount).toBe(6);
    expect(byId["gig"].appliedCode).toBe("ETE30");
    expect(byId["gig"].lineDiscount).toBe(10.5);
    expect(r.capExceeded).toBe(false); // 31.5/85 ≈ 0.37
  });

  it("min_order refusé sur le running total (running 70 < min 80)", () => {
    const cart = [line("pyj", "pyjamas", 30), line("bod", "bodies", 20), line("gig", "gigoteuses", 35)];
    const codes = [
      pct("PROMO-PYJAMA", 50, { scopeKind: "products", productIds: ["pyj"] }),
      pct("ETE30", 30, { scopeKind: "all", minOrder: 80 }),
    ];
    const r = applyScopedPromos(cart, codes);
    expect(r.appliedCodes).toEqual(["PROMO-PYJAMA"]);
    expect(r.rejectedCodes).toEqual([{ code: "ETE30", reason: "min_order_not_met" }]);
    expect(r.totalDiscount).toBe(15);
    // body/gigoteuse NON verrouillés (le code refusé ne verrouille rien)
    const byId = Object.fromEntries(r.lines.map((l) => [l.productId, l]));
    expect(byId["bod"].appliedCode).toBeNull();
    expect(byId["gig"].appliedCode).toBeNull();
  });

  it("code sans produit éligible → no_eligible_product", () => {
    const cart = [line("bod", "bodies", 20)];
    const codes = [pct("X", 10, { scopeKind: "products", productIds: ["ZZZ"] })];
    const r = applyScopedPromos(cart, codes);
    expect(r.appliedCodes).toEqual([]);
    expect(r.rejectedCodes).toEqual([{ code: "X", reason: "no_eligible_product" }]);
    expect(r.totalDiscount).toBe(0);
  });

  it("toutes les cibles déjà verrouillées → already_covered", () => {
    const cart = [line("bod", "bodies", 20), line("pyj", "pyjamas", 30)];
    const codes = [
      pct("ALL10", 10, { scopeKind: "all" }),                                   // verrouille tout
      pct("BOD20", 20, { scopeKind: "category", categorySlug: "bodies" }),      // cible bodies (existe) mais verrouillé
    ];
    const r = applyScopedPromos(cart, codes);
    expect(r.appliedCodes).toEqual(["ALL10"]);
    expect(r.rejectedCodes).toEqual([{ code: "BOD20", reason: "already_covered" }]);
  });

  it("pack : couvert par 'all', jamais par 'category' ni 'products'", () => {
    const cart = [line("packA", "pack", 50, 1, true)];

    const catCode = applyScopedPromos(cart, [pct("CAT", 10, { scopeKind: "category", categorySlug: "pack" })]);
    expect(catCode.rejectedCodes).toEqual([{ code: "CAT", reason: "no_eligible_product" }]);
    expect(catCode.lines[0].appliedCode).toBeNull();

    const prodCode = applyScopedPromos(cart, [pct("PRD", 10, { scopeKind: "products", productIds: ["packA"] })]);
    expect(prodCode.rejectedCodes).toEqual([{ code: "PRD", reason: "no_eligible_product" }]);

    const allCode = applyScopedPromos(cart, [pct("ALL", 10, { scopeKind: "all" })]);
    expect(allCode.appliedCodes).toEqual(["ALL"]);
    expect(allCode.lines[0].appliedCode).toBe("ALL");
    expect(allCode.lines[0].lineDiscount).toBe(5);
  });

  it("3e code → limit_reached (maxCodes défaut 2)", () => {
    const cart = [line("a", "bodies", 40)];
    const codes = [
      pct("C1", 10, { scopeKind: "all" }),
      pct("C2", 10, { scopeKind: "category", categorySlug: "pyjamas" }), // rejeté (no eligible) mais compté
      pct("C3", 10, { scopeKind: "all" }),                               // au-delà de 2 → limit_reached
    ];
    const r = applyScopedPromos(cart, codes);
    expect(r.appliedCodes).toEqual(["C1"]);
    expect(r.rejectedCodes).toContainEqual({ code: "C3", reason: "limit_reached" });
    expect(r.appliedCodes.length).toBeLessThanOrEqual(2);
  });

  it("fixed : répartition proportionnelle simple (10€ sur 30 + 20)", () => {
    const cart = [line("a", "bodies", 30), line("b", "bodies", 20)];
    const r = applyScopedPromos(cart, [fixed("F10", 10, { scopeKind: "all" })]);
    const byId = Object.fromEntries(r.lines.map((l) => [l.productId, l]));
    expect(byId["a"].lineDiscount).toBe(6); // 10 * 30/50
    expect(byId["b"].lineDiscount).toBe(4); // 10 * 20/50
    expect(r.totalDiscount).toBe(10);
  });

  it("fixed : reste au centime (10€ sur 3×10€ → 3,34 / 3,33 / 3,33 = 10,00 exact)", () => {
    const cart = [line("a", "c", 10), line("b", "c", 10), line("d", "c", 10)];
    const r = applyScopedPromos(cart, [fixed("F10", 10, { scopeKind: "all" })]);
    const ds = r.lines.map((l) => l.lineDiscount).sort((x, y) => y - x);
    expect(ds).toEqual([3.34, 3.33, 3.33]);
    expect(round2(ds[0] + ds[1] + ds[2])).toBe(10);
    expect(r.totalDiscount).toBe(10);
    // chaque part ≤ total ligne
    for (const l of r.lines) expect(l.lineDiscount).toBeLessThanOrEqual(l.originalLineTotal);
  });

  it("fixed : borné au sous-total éligible (100€ demandés sur 50€ éligibles → 50€)", () => {
    const cart = [line("a", "c", 30), line("b", "c", 20)];
    const r = applyScopedPromos(cart, [fixed("BIG", 100, { scopeKind: "all" })]);
    expect(r.totalDiscount).toBe(50);
    expect(r.totalAfterDiscount).toBe(0);
    for (const l of r.lines) expect(l.finalLineTotal).toBe(0);
    expect(r.capExceeded).toBe(true); // 50/50 = 1.0 > 0.6
  });

  it("free_shipping : actif si total ≥ 60 et non international", () => {
    const cart = [line("a", "c", 70)];
    const codes = [pct("FS", 0, { scopeKind: "all", freeShipping: true })];
    expect(applyScopedPromos(cart, codes).freeShipping).toBe(true);
    // international → jamais offert
    expect(applyScopedPromos(cart, codes, { isInternational: true }).freeShipping).toBe(false);
  });

  it("free_shipping : inactif si total < 60 (même avec le flag code)", () => {
    const cart = [line("a", "c", 50)];
    const codes = [pct("FS", 0, { scopeKind: "all", freeShipping: true })];
    const r = applyScopedPromos(cart, codes);
    expect(r.totalAfterDiscount).toBe(50);
    expect(r.freeShipping).toBe(false);
  });

  it("dépassement 60% : totalDiscount NON clampé, capExceeded=true, aucune exception", () => {
    const cart = [line("a", "c", 50)];
    const r = applyScopedPromos(cart, [pct("HALFPLUS", 100, { scopeKind: "all" })]);
    expect(r.totalDiscount).toBe(50);       // 100% appliqué, PAS ramené à 60%
    expect(r.discountRatio).toBe(1);
    expect(r.capExceeded).toBe(true);
    expect(r.totalAfterDiscount).toBe(0);
  });

  it("percent : FLOOR dur — une remise > 100% ne descend jamais sous 0", () => {
    const cart = [line("a", "c", 40)];
    const r = applyScopedPromos(cart, [pct("OVER", 150, { scopeKind: "all" })]);
    expect(r.lines[0].lineDiscount).toBe(40);   // borné au total ligne
    expect(r.lines[0].finalLineTotal).toBe(0);
  });

  it("panier vide → tout à zéro, pas de division par zéro", () => {
    const r = applyScopedPromos([], [pct("X", 20, { scopeKind: "all" })]);
    expect(r.subtotal).toBe(0);
    expect(r.totalDiscount).toBe(0);
    expect(r.discountRatio).toBe(0);
    expect(r.capExceeded).toBe(false);
    expect(r.rejectedCodes).toEqual([{ code: "X", reason: "no_eligible_product" }]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// B. INVARIANTS PROPERTY-BASED (fast-check)
// ════════════════════════════════════════════════════════════════════════════
const productIdArb = fc.constantFrom("p1", "p2", "p3", "p4", "pk1");
const catArb = fc.constantFrom("bodies", "pyjamas", "gigoteuses", "pack");
const priceArb = fc.integer({ min: 0, max: 20000 }).map((c) => c / 100); // 0.00 – 200.00 €
const lineArb: fc.Arbitrary<CartLine> = fc.record({
  productId: productIdArb,
  categorySlug: catArb,
  unitPriceTtc: priceArb,
  quantity: fc.integer({ min: 1, max: 5 }),
  isPack: fc.boolean(),
});
const cartArb = fc.array(lineArb, { maxLength: 8 });

const codeArb: fc.Arbitrary<ScopedPromoCode> = fc.record({
  code: fc.string({ minLength: 1, maxLength: 6 }),
  discountType: fc.constantFrom<"percent" | "fixed">("percent", "fixed"),
  discountValue: fc.integer({ min: 0, max: 150 }), // > 100 pour tester FLOOR + dépassement cap
  scopeKind: fc.constantFrom<"all" | "category" | "products">("all", "category", "products"),
  categorySlug: catArb,
  productIds: fc.array(productIdArb, { maxLength: 4 }),
  minOrder: fc.option(fc.integer({ min: 0, max: 120 }), { nil: null }),
  freeShipping: fc.boolean(),
});
const codesArb = fc.array(codeArb, { maxLength: 4 });
const optsArb: fc.Arbitrary<ApplyOptions> = fc.record({
  capThreshold: fc.constantFrom(0.5, 0.6, 0.7),
  maxCodes: fc.integer({ min: 0, max: 3 }),
  freeShippingMin: fc.constantFrom(40, 60, 80),
  isInternational: fc.boolean(),
});

describe("applyScopedPromos — invariants (property-based)", () => {
  it("déterminisme : même entrée → même sortie", () => {
    fc.assert(
      fc.property(cartArb, codesArb, optsArb, (cart, codes, opts) => {
        const a = applyScopedPromos(cart, codes, opts);
        const b = applyScopedPromos(cart, codes, opts);
        expect(a).toEqual(b);
      }),
    );
  });

  it("aucun produit re-remisé : une ligne sans code appliqué a une remise nulle", () => {
    fc.assert(
      fc.property(cartArb, codesArb, optsArb, (cart, codes, opts) => {
        const r = applyScopedPromos(cart, codes, opts);
        for (const l of r.lines) {
          if (l.appliedCode === null) expect(l.lineDiscount).toBe(0);
        }
      }),
    );
  });

  it("FLOOR : finalLineTotal ≥ 0 et lineDiscount ≤ originalLineTotal", () => {
    fc.assert(
      fc.property(cartArb, codesArb, optsArb, (cart, codes, opts) => {
        const r = applyScopedPromos(cart, codes, opts);
        for (const l of r.lines) {
          expect(l.lineDiscount).toBeLessThanOrEqual(l.originalLineTotal + 1e-9);
          expect(l.lineDiscount).toBeGreaterThanOrEqual(-1e-9);
          expect(l.finalLineTotal).toBeGreaterThanOrEqual(-1e-9);
          expect(round2(l.originalLineTotal - l.lineDiscount)).toBe(l.finalLineTotal);
        }
      }),
    );
  });

  it("conservation : Σ lineDiscount == totalDiscount ; totalAfterDiscount == subtotal − totalDiscount", () => {
    fc.assert(
      fc.property(cartArb, codesArb, optsArb, (cart, codes, opts) => {
        const r = applyScopedPromos(cart, codes, opts);
        const sumLines = round2(r.lines.reduce((s, l) => s + l.lineDiscount, 0));
        expect(sumLines).toBe(r.totalDiscount);
        expect(r.totalAfterDiscount).toBe(round2(Math.max(0, r.subtotal - r.totalDiscount)));
      }),
    );
  });

  it("cohérence du flag : capExceeded === (discountRatio > capThreshold)", () => {
    fc.assert(
      fc.property(cartArb, codesArb, optsArb, (cart, codes, opts) => {
        const r = applyScopedPromos(cart, codes, opts);
        const cap = opts.capThreshold ?? 0.6;
        expect(r.capExceeded).toBe(r.discountRatio > cap);
      }),
    );
  });

  it("free_shipping : implique total ≥ seuil, un code offreur appliqué, et pas international", () => {
    fc.assert(
      fc.property(cartArb, codesArb, optsArb, (cart, codes, opts) => {
        const r = applyScopedPromos(cart, codes, opts);
        if (r.freeShipping) {
          const min = opts.freeShippingMin ?? 60;
          expect(r.totalAfterDiscount).toBeGreaterThanOrEqual(min);
          expect(opts.isInternational).not.toBe(true);
          expect(r.appliedCodes.length).toBeGreaterThan(0);
        }
      }),
    );
  });

  it("PAS de clamp : il existe des entrées où discountRatio > 0.60 sans exception", () => {
    // Témoin déterministe (fast-check ne modélise pas l'existentiel) : un code 100% 'all'.
    const r = applyScopedPromos([line("a", "c", 42)], [pct("FULL", 100, { scopeKind: "all" })]);
    expect(r.discountRatio).toBeGreaterThan(0.6);
    expect(r.capExceeded).toBe(true);
    expect(r.totalDiscount).toBe(42); // non clampé
  });
});
