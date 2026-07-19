import { test, expect } from "@playwright/test";
import {
  getZoneForCountry,
  isCountryDeliverable,
  getInternationalShippingPrice,
  listDeliverableCountries,
  isFreeShippingEligibleZone,
} from "../lib/delivery-config";

// ═══════════════════════════════════════════════════════════════════════════
// Fondation zones de livraison — helpers PURS (aucun DB/navigateur).
// La France passe par la matrice domestique ; l'international est toujours payant.
// ═══════════════════════════════════════════════════════════════════════════

test("France → zone FR", () => {
  expect(getZoneForCountry("FR")).toBe("FR");
});

test("pays de l'UE → zone EU", () => {
  expect(getZoneForCountry("BE")).toBe("EU");
  expect(getZoneForCountry("DE")).toBe("EU");
  expect(getZoneForCountry("IT")).toBe("EU");
});

test("Europe hors-UE → zone EUROPE_NON_EU", () => {
  expect(getZoneForCountry("CH")).toBe("EUROPE_NON_EU");
  expect(getZoneForCountry("NO")).toBe("EUROPE_NON_EU");
});

test("Royaume-Uni → zone UK", () => {
  expect(getZoneForCountry("GB")).toBe("UK");
});

test("pays non livrables → null", () => {
  expect(getZoneForCountry("US")).toBeNull();
  expect(getZoneForCountry("RU")).toBeNull();
  expect(getZoneForCountry("CA")).toBeNull();
  expect(getZoneForCountry("XX")).toBeNull();
  expect(getZoneForCountry("")).toBeNull();
});

test("casse mixte / espaces normalisés", () => {
  expect(getZoneForCountry(" be ")).toBe("EU");
  expect(getZoneForCountry("gb")).toBe("UK");
  expect(getZoneForCountry("Ch")).toBe("EUROPE_NON_EU");
  expect(getZoneForCountry("fr")).toBe("FR");
});

test("isCountryDeliverable", () => {
  expect(isCountryDeliverable("FR")).toBe(true);
  expect(isCountryDeliverable("BE")).toBe(true);
  expect(isCountryDeliverable("US")).toBe(false);
  expect(isCountryDeliverable("RU")).toBe(false);
});

test("les 3 prix internationaux TTC", () => {
  expect(getInternationalShippingPrice("BE")).toBe(11.90); // EU
  expect(getInternationalShippingPrice("CH")).toBe(14.90); // EUROPE_NON_EU
  expect(getInternationalShippingPrice("GB")).toBe(18.90); // UK
});

test("prix international : non livrable → null ; France → null (matrice domestique)", () => {
  expect(getInternationalShippingPrice("US")).toBeNull();
  expect(getInternationalShippingPrice("FR")).toBeNull();
});

test("seuil de livraison offerte UNIQUEMENT en France", () => {
  expect(isFreeShippingEligibleZone("FR")).toBe(true);
  expect(isFreeShippingEligibleZone("EU")).toBe(false);
  expect(isFreeShippingEligibleZone("EUROPE_NON_EU")).toBe(false);
  expect(isFreeShippingEligibleZone("UK")).toBe(false);
});

test("listDeliverableCountries — 31 pays (1 FR + 26 UE + 3 Europe hors-UE + 1 UK)", () => {
  const list  = listDeliverableCountries();
  const codes = list.map(c => c.code);
  expect(codes).toContain("FR");
  expect(codes).toContain("GB");
  expect(codes).not.toContain("US");
  expect(codes).not.toContain("RU");
  expect(list.length).toBe(31);
});
