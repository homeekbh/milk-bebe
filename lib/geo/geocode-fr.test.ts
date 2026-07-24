import { describe, it, expect } from "vitest";
import { geocodeCity, normalizeCity } from "./geocode-fr";

// Borne « France métropolitaine + proche » pour vérifier qu'un point est plausible.
const inFrance = (p: { lat: number; lng: number } | null) =>
  !!p && p.lat > 41 && p.lat < 51.5 && p.lng > -5.5 && p.lng < 10;

describe("normalizeCity", () => {
  it("minuscule + sans accents + tirets", () => {
    expect(normalizeCity("Saint-Étienne")).toBe("saint-etienne");
    expect(normalizeCity("Aix-en-Provence")).toBe("aix-en-provence");
  });
  it("abréviations st/ste → saint/sainte", () => {
    expect(normalizeCity("St-Étienne")).toBe("saint-etienne");
    expect(normalizeCity("Ste Foy")).toBe("sainte-foy");
  });
  it("apostrophes et casse", () => {
    expect(normalizeCity("L'Haÿ-les-Roses")).toBe("l-hay-les-roses");
    expect(normalizeCity("  PARIS  ")).toBe("paris");
  });
});

describe("geocodeCity — villes connues (coordonnées réelles du dataset)", () => {
  it("Paris", () => {
    const p = geocodeCity("Paris");
    expect(p).not.toBeNull();
    expect(p!.lat).toBeCloseTo(48.86, 1);
    expect(p!.lng).toBeCloseTo(2.35, 1);
  });
  it("Menton", () => {
    const p = geocodeCity("Menton");
    expect(p).not.toBeNull();
    expect(p!.lat).toBeCloseTo(43.8, 1);
    expect(p!.lng).toBeCloseTo(7.5, 1);
  });
  it("Lyon", () => {
    const p = geocodeCity("Lyon");
    expect(inFrance(p)).toBe(true);
    expect(p!.lat).toBeCloseTo(45.76, 1);
  });
  it("accent + casse : « ST-étienne » matche Saint-Étienne", () => {
    const p = geocodeCity("ST-étienne");
    expect(p).not.toBeNull();
    expect(p!.lat).toBeCloseTo(45.44, 1);
    expect(p!.lng).toBeCloseTo(4.39, 1);
  });
});

describe("geocodeCity — fallback centroïde régional", () => {
  it("ville inconnue + région ISO (IDF) → centroïde Île-de-France", () => {
    const p = geocodeCity("Trifouillis-les-Oies", "IDF");
    expect(p).not.toBeNull();
    expect(inFrance(p)).toBe(true);
    // IDF est dominée par Paris → centroïde proche de la capitale.
    expect(p!.lat).toBeCloseTo(48.8, 0);
    expect(p!.lng).toBeCloseTo(2.4, 0);
  });
  it("ville inconnue + nom de région complet → centroïde", () => {
    const p = geocodeCity("VilleQuiNexistePas", "Provence-Alpes-Côte d'Azur");
    expect(inFrance(p)).toBe(true);
  });
  it("région lettre PAC", () => {
    expect(inFrance(geocodeCity("Inconnue", "PAC"))).toBe(true);
  });
});

describe("geocodeCity — null attendu", () => {
  it("ville inconnue sans région → null", () => {
    expect(geocodeCity("Trifouillis-les-Oies")).toBeNull();
  });
  it("région purement numérique NON mappée (collision dép./région) → null", () => {
    // "75" pourrait être Paris (département) OU Nouvelle-Aquitaine (région) : on refuse.
    expect(geocodeCity("Trifouillis-les-Oies", "75")).toBeNull();
  });
  it("région inconnue → null", () => {
    expect(geocodeCity("Trifouillis-les-Oies", "ZZZ")).toBeNull();
  });
  it("entrées vides → null", () => {
    expect(geocodeCity("")).toBeNull();
    expect(geocodeCity("", "")).toBeNull();
  });
});
