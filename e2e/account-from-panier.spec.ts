import { test, expect } from "@playwright/test";
import { prime, sampleCartItem } from "./helpers";

/**
 * Création de compte depuis /panier avec retour sur /panier.
 * On vérifie le CÂBLAGE du retour (?redirect=/panier), qui est la partie sujette
 * à régression. On NE complète PAS l'inscription réelle : cela créerait un
 * utilisateur Supabase à chaque run (non idempotent) — le paramètre redirect et
 * le rendu de la page d'inscription suffisent à couvrir le parcours.
 */

test("liens compte depuis /panier portent bien ?redirect=/panier", async ({ page }) => {
  await prime(page, { cart: [sampleCartItem()] });
  await page.goto("/fr/panier", { waitUntil: "domcontentloaded" });

  const createLink = page.getByRole("link", { name: /Créer un compte/ });
  await expect(createLink).toHaveAttribute("href", /\/inscription\?redirect=\/panier/);

  const loginLink = page.getByRole("link", { name: /J'ai déjà un compte/ });
  await expect(loginLink).toHaveAttribute("href", /\/connexion\?redirect=\/panier/);
});

test("clic « Créer un compte » → page inscription avec retour panier armé", async ({ page }) => {
  await prime(page, { cart: [sampleCartItem()] });
  await page.goto("/fr/panier", { waitUntil: "domcontentloaded" });

  await page.getByRole("link", { name: /Créer un compte/ }).click();

  // On atterrit sur l'inscription, le retour /panier est conservé dans l'URL.
  await expect(page).toHaveURL(/\/inscription\?redirect=%2Fpanier|\/inscription\?redirect=\/panier/);
  // Le formulaire d'inscription est rendu (champ email).
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
});
