// Tests d'acceptation de la logique cumul livraison.
// Vérifie que computeShipping() retourne la décision attendue pour chaque
// cas de figure. Exécuter avec : node --experimental-strip-types scripts/test-shipping-cumul.ts
//
// Cas testés (cf. spec user) :
//   1. Sans code, ≥ seuil      → port offert
//   2. Sans code, < seuil      → port payant
//   3. Code free_shipping      → port offert (peu importe montant)
//   4. Code % cumulable + ≥ seuil       → port offert
//   5. Code % NON cumulable + ≥ seuil   → port payant (seuil désactivé)
//   6. Code % NON cumulable + < seuil   → port payant (jamais offert)
//   7. Code free_shipping + non cumulable → port offert (free_shipping > seuil)
//   8. basePrice = 0 (carrier pas choisi) → 0, raison "no-shipping-needed"
//
// Bonus Option A — seuil sur BRUT, pas net :
//   9. Code -10€ + subtotal 60€ (net 50€) → port offert (60 ≥ 60 sur BRUT)

import { computeShipping } from "../lib/delivery-config.ts";

type Case = {
  name:     string;
  input:    Parameters<typeof computeShipping>[0];
  expected: {
    shipping:     number;
    shippingFree: boolean;
    reason:       string;
  };
};

const THRESHOLD = 60;
const BASE      = 3.50; // Mondial Relay Point Relais

const CASES: Case[] = [
  {
    name: "1. Sans code, subtotal=70€ (≥ seuil) → port offert",
    input: { subtotal: 70, freeShippingThreshold: THRESHOLD, basePrice: BASE, promo: null },
    expected: { shipping: 0, shippingFree: true, reason: "threshold-reached" },
  },
  {
    name: "2. Sans code, subtotal=40€ (< seuil) → port payant",
    input: { subtotal: 40, freeShippingThreshold: THRESHOLD, basePrice: BASE, promo: null },
    expected: { shipping: BASE, shippingFree: false, reason: "below-threshold" },
  },
  {
    name: "3. Code free_shipping, subtotal=20€ → port offert",
    input: {
      subtotal: 20, freeShippingThreshold: THRESHOLD, basePrice: BASE,
      promo: { free_shipping: true, cumulable_avec_livraison: true },
    },
    expected: { shipping: 0, shippingFree: true, reason: "promo-free-shipping" },
  },
  {
    name: "4. Code % cumulable + subtotal=70€ → port offert (cumul OK)",
    input: {
      subtotal: 70, freeShippingThreshold: THRESHOLD, basePrice: BASE,
      promo: { free_shipping: false, cumulable_avec_livraison: true },
    },
    expected: { shipping: 0, shippingFree: true, reason: "threshold-reached" },
  },
  {
    name: "5. Code % NON cumulable + subtotal=70€ → port payant (seuil bloqué)",
    input: {
      subtotal: 70, freeShippingThreshold: THRESHOLD, basePrice: BASE,
      promo: { free_shipping: false, cumulable_avec_livraison: false },
    },
    expected: { shipping: BASE, shippingFree: false, reason: "promo-blocks-cumul" },
  },
  {
    name: "6. Code % NON cumulable + subtotal=40€ → port payant",
    input: {
      subtotal: 40, freeShippingThreshold: THRESHOLD, basePrice: BASE,
      promo: { free_shipping: false, cumulable_avec_livraison: false },
    },
    expected: { shipping: BASE, shippingFree: false, reason: "promo-blocks-cumul" },
  },
  {
    name: "7. Code free_shipping + non cumulable → port offert (free_shipping prime)",
    input: {
      subtotal: 20, freeShippingThreshold: THRESHOLD, basePrice: BASE,
      promo: { free_shipping: true, cumulable_avec_livraison: false },
    },
    expected: { shipping: 0, shippingFree: true, reason: "promo-free-shipping" },
  },
  {
    name: "8. basePrice=0 (carrier pas choisi) → 0, no-shipping-needed",
    input: { subtotal: 100, freeShippingThreshold: THRESHOLD, basePrice: 0, promo: null },
    expected: { shipping: 0, shippingFree: false, reason: "no-shipping-needed" },
  },
  {
    name: "9. Option A : subtotal=60 (=seuil), code -10€ → port offert (sur BRUT, pas NET)",
    // Si on évaluait sur NET (50€), le port serait payant. Option A → offert.
    input: {
      subtotal: 60, freeShippingThreshold: THRESHOLD, basePrice: BASE,
      promo: { free_shipping: false, cumulable_avec_livraison: true },
    },
    expected: { shipping: 0, shippingFree: true, reason: "threshold-reached" },
  },
];

let pass = 0, fail = 0;
const failures: string[] = [];

for (const c of CASES) {
  const got = computeShipping(c.input);
  const ok =
    got.shipping     === c.expected.shipping &&
    got.shippingFree === c.expected.shippingFree &&
    got.reason       === c.expected.reason;

  if (ok) {
    pass++;
    console.log(`✅ ${c.name}`);
  } else {
    fail++;
    failures.push(c.name);
    console.log(`❌ ${c.name}`);
    console.log(`   attendu : ${JSON.stringify(c.expected)}`);
    console.log(`   reçu    : ${JSON.stringify({ shipping: got.shipping, shippingFree: got.shippingFree, reason: got.reason })}`);
  }
}

console.log("");
console.log("─".repeat(60));
console.log(`Résultat : ${pass}/${CASES.length} passent, ${fail} échec(s)`);
if (fail > 0) {
  console.log("");
  console.log("Échecs :");
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
console.log("✓ Tous les cas d'acceptation passent.");
