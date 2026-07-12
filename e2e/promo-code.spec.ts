import { test, expect } from "@playwright/test";
import { prime, sampleCartItem, FIXTURES } from "./helpers";

/**
 * Application d'un code promo dans /panier.
 *   - code invalide → message d'erreur ❌
 *   - code valide (MILK10, -10 %) → remise appliquée (code + « − X.XX € » + bouton Supprimer)
 * Valide contre /api/promo/validate (lecture seule : aucune écriture DB).
 */

test("code promo invalide → message d'erreur", async ({ page }) => {
  await prime(page, { cart: [sampleCartItem()] });
  await page.goto("/fr/panier", { waitUntil: "domcontentloaded" });

  await page.getByPlaceholder("Ex : BIENVENUE10").fill(FIXTURES.invalidPromo);
  await page.getByRole("button", { name: "Appliquer" }).click();

  await expect(page.getByText(/❌/)).toBeVisible();
});

test("code promo valide MILK10 → remise appliquée", async ({ page }) => {
  await prime(page, { cart: [sampleCartItem()] });
  await page.goto("/fr/panier", { waitUntil: "domcontentloaded" });

  await page.getByPlaceholder("Ex : BIENVENUE10").fill(FIXTURES.validPromo);
  await page.getByRole("button", { name: "Appliquer" }).click();

  // Succès : aucune erreur, le code appliqué + une remise « − …€ » + bouton Supprimer.
  await expect(page.getByText(/❌/)).toHaveCount(0);
  await expect(page.getByText(FIXTURES.validPromo).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Supprimer" })).toBeVisible();
  // 10 % de 34,90 € = 3,49 € (le signe est un vrai « − » U+2212).
  await expect(page.getByText(/[−-]\s*3[.,]49/).first()).toBeVisible();
});
