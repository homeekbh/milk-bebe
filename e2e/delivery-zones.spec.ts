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

test("Europe hors-UE → zone EUROPE_NON_EU (Suisse uniquement)", () => {
  expect(getZoneForCountry("CH")).toBe("EUROPE_NON_EU");
  // NO / IS exclus du contrat FedEx → non livrables (ne sont plus dans EUROPE_NON_EU)
  expect(getZoneForCountry("NO")).toBeNull();
  expect(getZoneForCountry("IS")).toBeNull();
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

test("listDeliverableCountries — 24 pays (1 FR + 21 UE + 1 Europe hors-UE + 1 UK)", () => {
  const list  = listDeliverableCountries();
  const codes = list.map(c => c.code);
  expect(codes).toContain("FR");
  expect(codes).toContain("GB");
  expect(codes).toContain("CH");
  expect(codes).not.toContain("US");
  expect(codes).not.toContain("RU");
  expect(codes).not.toContain("MT"); // Malte retiré (coût FedEx non rentable)
  expect(codes).not.toContain("NO"); // Norvège hors contrat FedEx
  expect(list.length).toBe(24);

  // Décompte par zone dérivé du code réel (doit refléter COUNTRY_TO_ZONE).
  const byZone = list.reduce<Record<string, number>>((acc, { zone }) => {
    acc[zone] = (acc[zone] ?? 0) + 1;
    return acc;
  }, {});
  expect(byZone.FR).toBe(1);
  expect(byZone.EU).toBe(21);
  expect(byZone.EUROPE_NON_EU).toBe(1);
  expect(byZone.UK).toBe(1);
});
