import { describe, it, expect } from "vitest";
import {
  toScopedPromoCode,
  buildCartLines,
  maskEmail,
  mapScopeKind,
  type ValidatedPromoRow,
} from "./promo-scope-adapter";

// ════════════════════════════════════════════════════════════════════════════
// mapScopeKind — valeurs RÉELLES de la base (028: 'all' | 'category' | 'product')
// ════════════════════════════════════════════════════════════════════════════
describe("mapScopeKind — scope_type DB → contrat", () => {
  it("'all' → 'all'", () => expect(mapScopeKind("all")).toBe("all"));
  it("'category' → 'category'", () => expect(mapScopeKind("category")).toBe("category"));
  it("'product' (DB singulier) → 'products' (contrat pluriel)", () => expect(mapScopeKind("product")).toBe("products"));
  it("'products' toléré → 'products'", () => expect(mapScopeKind("products")).toBe("products"));
  it("inconnu / null / undefined → 'all' (défaut défensif)", () => {
    expect(mapScopeKind("tous")).toBe("all");
    expect(mapScopeKind(null)).toBe("all");
    expect(mapScopeKind(undefined)).toBe("all");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// toScopedPromoCode — chaque scope_type réel → ScopedPromoCode attendu
// ════════════════════════════════════════════════════════════════════════════
describe("toScopedPromoCode", () => {
  const base: ValidatedPromoRow = { code: "X", type: "percent", value: 10 };

  it("scope 'all' → scopeKind 'all', categorySlug null, productIds []", () => {
    const r = toScopedPromoCode({ ...base, scope_type: "all", scope_value: null, scope_product_ids: [] });
    expect(r).toEqual({
      code: "X", discountType: "percent", discountValue: 10,
      scopeKind: "all", categorySlug: null, productIds: [], minOrder: null, freeShipping: false,
    });
  });

  it("scope 'category' → categorySlug = scope_value", () => {
    const r = toScopedPromoCode({ ...base, scope_type: "category", scope_value: "bodies", scope_product_ids: [] });
    expect(r.scopeKind).toBe("category");
    expect(r.categorySlug).toBe("bodies");
    expect(r.productIds).toEqual([]);
  });

  it("scope 'product' (DB) → scopeKind 'products', productIds = scope_product_ids", () => {
    const r = toScopedPromoCode({ ...base, scope_type: "product", scope_value: null, scope_product_ids: ["p1", "p2"] });
    expect(r.scopeKind).toBe("products");
    expect(r.productIds).toEqual(["p1", "p2"]);
    expect(r.categorySlug).toBeNull();
  });

  it("discountType 'fixed' repris ; 'percent' repris", () => {
    expect(toScopedPromoCode({ code: "F", type: "fixed", value: 5 }).discountType).toBe("fixed");
    expect(toScopedPromoCode({ code: "P", type: "percent", value: 5 }).discountType).toBe("percent");
  });

  it("type 'free_shipping' → discountType 'percent' à 0 (aucune remise produit), freeShipping repris", () => {
    const r = toScopedPromoCode({ code: "FS", type: "free_shipping", value: 7.7, free_shipping: true });
    expect(r.discountType).toBe("percent");
    expect(r.discountValue).toBe(0);
    expect(r.freeShipping).toBe(true);
  });

  it("minOrder et freeShipping repris tels quels", () => {
    const r = toScopedPromoCode({ ...base, min_order: 60, free_shipping: true });
    expect(r.minOrder).toBe(60);
    expect(r.freeShipping).toBe(true);
  });

  it("min_order absent → null ; scope_type absent → 'all'", () => {
    const r = toScopedPromoCode({ code: "Z", type: "percent", value: 20 });
    expect(r.minOrder).toBeNull();
    expect(r.scopeKind).toBe("all");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// buildCartLines — items (DB) + packs ('__pack__')
// ════════════════════════════════════════════════════════════════════════════
describe("buildCartLines", () => {
  it("items → isPack false, categorySlug DB, unitPriceTtc = price ; packs → isPack true, '__pack__'", () => {
    const items = [{ id: "a", category_slug: "pyjamas", price: 30, quantity: 2 }];
    const packs = [{ pack_id: "pk1", price: 50, quantity: 1 }];
    const lines = buildCartLines(items, packs);
    expect(lines).toEqual([
      { productId: "a", categorySlug: "pyjamas", unitPriceTtc: 30, quantity: 2, isPack: false },
      { productId: "pk1", categorySlug: "__pack__", unitPriceTtc: 50, quantity: 1, isPack: true },
    ]);
  });

  it("category_slug manquant → '' ; entrées vides tolérées", () => {
    const lines = buildCartLines([{ id: "b", price: 10, quantity: 1 }], []);
    expect(lines[0].categorySlug).toBe("");
    expect(lines).toHaveLength(1);
  });

  it("aucun item ni pack → []", () => {
    expect(buildCartLines([], [])).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// maskEmail
// ════════════════════════════════════════════════════════════════════════════
describe("maskEmail", () => {
  it("email standard → 1re lettre + ***@ + domaine", () => {
    expect(maskEmail("muchismo.art@gmail.com")).toBe("m***@gmail.com");
    expect(maskEmail("x@y.z")).toBe("x***@y.z");
  });
  it("null / undefined / vide → null", () => {
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail(undefined)).toBeNull();
    expect(maskEmail("")).toBeNull();
  });
  it("sans '@' ou '@' en tête → '***'", () => {
    expect(maskEmail("pasdemail")).toBe("***");
    expect(maskEmail("@nolocal.com")).toBe("***");
  });
});
