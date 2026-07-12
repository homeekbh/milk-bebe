import { test, expect } from "@playwright/test";
import { prime, sampleCartItem, FIXTURES } from "./helpers";

/**
 * Passage étape 1 (compte + téléphone) → étape 2 (livraison + paiement).
 * Puis vérifie que le bouton « Confirmer et payer → » reste désactivé tant que
 * la livraison n'est pas complète (finalPayReady = step1Ready && deliveryReady).
 */

test("étape 1 → étape 2 puis paiement gated par la livraison", async ({ page }) => {
  await prime(page, { cart: [sampleCartItem()] });
  await page.goto("/fr/panier", { waitUntil: "domcontentloaded" });

  // Étape 1 : renseigner email + téléphone.
  await page.getByPlaceholder("ton@email.fr").fill(FIXTURES.validEmail);
  await page.getByPlaceholder("Ex : 06 12 34 56 78").fill(FIXTURES.validPhone);

  const proceed = page.getByRole("button", { name: /Passer au paiement/ });
  await expect(proceed).toBeEnabled();
  await proceed.click();

  // Étape 2 révélée : le bouton de paiement final apparaît.
  const pay = page.getByRole("button", { name: /Confirmer et payer/ });
  await expect(pay).toBeVisible();

  // Livraison pas encore choisie → paiement désactivé.
  await expect(pay).toBeDisabled();

  // Retour possible vers l'étape 1.
  await expect(page.getByRole("button", { name: /Modifier mes informations/ })).toBeVisible();
});
