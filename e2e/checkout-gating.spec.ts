import { test, expect } from "@playwright/test";
import { prime, sampleCartItem, FIXTURES } from "./helpers";

/**
 * Gating du tunnel (étape 1) : le bouton « Passer au paiement → » reste
 * DÉSACTIVÉ tant que l'email ET le téléphone valides ne sont pas saisis.
 * (step1Ready = emailReady && phoneOk && cartNonEmpty)
 */

test("« Passer au paiement » gated par email + téléphone", async ({ page }) => {
  await prime(page, { cart: [sampleCartItem()] });
  await page.goto("/fr/panier", { waitUntil: "domcontentloaded" });

  const proceed = page.getByRole("button", { name: /Passer au paiement/ });
  await expect(proceed).toBeVisible();

  // Panier non vide mais ni email ni téléphone → désactivé.
  await expect(proceed).toBeDisabled();

  // Email seul → toujours désactivé (téléphone manquant).
  await page.getByPlaceholder("ton@email.fr").fill(FIXTURES.validEmail);
  await expect(proceed).toBeDisabled();

  // Téléphone invalide → toujours désactivé.
  await page.getByPlaceholder("Ex : 06 12 34 56 78").fill("123");
  await expect(proceed).toBeDisabled();

  // Email valide + téléphone valide → activé.
  await page.getByPlaceholder("Ex : 06 12 34 56 78").fill(FIXTURES.validPhone);
  await expect(proceed).toBeEnabled();
});

test("panier vide → aucun passage au paiement", async ({ page }) => {
  await prime(page); // aucun article
  await page.goto("/fr/panier", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Votre panier est vide")).toBeVisible();
});
