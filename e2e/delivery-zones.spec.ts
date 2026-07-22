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

test("Suisse (CH) + Royaume-Uni (GB) BLOQUÉS au tunnel (douane non validée) → null", () => {
  // Retirés de COUNTRY_TO_ZONE tant que la douane FedEx n'est pas testée sur une étiquette réelle.
  // Réactivation : décommenter CH/GB dans lib/delivery-config (zones + prix conservés).
  expect(getZoneForCountry("CH")).toBeNull();
  expect(getZoneForCountry("GB")).toBeNull();
  // NO / IS : jamais dans le contrat FedEx.
  expect(getZoneForCountry("NO")).toBeNull();
  expect(getZoneForCountry("IS")).toBeNull();
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
  expect(getZoneForCountry("de")).toBe("EU");
  expect(getZoneForCountry("It")).toBe("EU");
  expect(getZoneForCountry("fr")).toBe("FR");
});

test("isCountryDeliverable", () => {
  expect(isCountryDeliverable("FR")).toBe(true);
  expect(isCountryDeliverable("BE")).toBe(true);
  expect(isCountryDeliverable("US")).toBe(false);
  expect(isCountryDeliverable("RU")).toBe(false);
});

test("prix international TTC — UE facturée ; CH/GB bloqués → null", () => {
  expect(getInternationalShippingPrice("BE")).toBe(11.90); // EU
  expect(getInternationalShippingPrice("DE")).toBe(11.90); // EU
  // CH / GB retirés du tunnel (douane non validée) → non livrables → aucun prix.
  expect(getInternationalShippingPrice("CH")).toBeNull();
  expect(getInternationalShippingPrice("GB")).toBeNull();
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

test("listDeliverableCountries — 22 pays (1 FR + 21 UE ; CH/UK bloqués go-live)", () => {
  const list  = listDeliverableCountries();
  const codes = list.map(c => c.code);
  expect(codes).toContain("FR");
  expect(codes).toContain("BE");
  expect(codes).not.toContain("CH"); // Suisse bloquée (douane non validée)
  expect(codes).not.toContain("GB"); // Royaume-Uni bloqué (douane non validée)
  expect(codes).not.toContain("US");
  expect(codes).not.toContain("RU");
  expect(codes).not.toContain("MT"); // Malte retiré (coût FedEx non rentable)
  expect(codes).not.toContain("NO"); // Norvège hors contrat FedEx
  expect(list.length).toBe(22);

  // Décompte par zone dérivé du code réel (doit refléter COUNTRY_TO_ZONE).
  const byZone = list.reduce<Record<string, number>>((acc, { zone }) => {
    acc[zone] = (acc[zone] ?? 0) + 1;
    return acc;
  }, {});
  expect(byZone.FR).toBe(1);
  expect(byZone.EU).toBe(21);
  expect(byZone.EUROPE_NON_EU).toBeUndefined(); // CH retiré → plus aucun pays
  expect(byZone.UK).toBeUndefined();            // GB retiré → plus aucun pays
});
