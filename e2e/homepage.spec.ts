import { test, expect } from "@playwright/test";
import { prime } from "./helpers";

/**
 * Homepage — Server Component + generateMetadata + rendu de toutes les sections.
 * Sert aussi de preuve visuelle pour l'Étape 8 (coque serveur, îlot client intact).
 */

test.describe("Homepage /fr", () => {
  test("SSR metadata + toutes les sections rendues", async ({ page }) => {
    await prime(page);
    await page.goto("/fr", { waitUntil: "domcontentloaded" });

    // 1) generateMetadata (rendu SERVEUR) : titre localisé FR.
    await expect(page).toHaveTitle(/Bodies.*Pyjamas.*OEKO-TEX.*M!LK/i);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      /\/fr$/
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/fr$/
    );

    // 2) Sections rendues côté serveur (statiques).
    await expect(page.locator('[aria-label="Hero M!LK"]')).toBeVisible();
    await expect(page.locator('[aria-label="Engagements M!LK"]')).toBeVisible();
    // Au moins 8 <section> (11 attendues), toutes présentes au DOM.
    expect(await page.locator("section").count()).toBeGreaterThanOrEqual(8);
    // Catégories (liens SSR).
    expect(await page.locator('a[href*="/fr/categorie/"]').count()).toBeGreaterThan(0);

    // 3) Îlot client : la grille produits se peuple après le fetch client.
    await expect(page.locator('a[href*="/produits/"]').first()).toBeVisible({
      timeout: 20_000,
    });

    // 4) Aucune erreur applicative bloquante (pas d'écran Next error).
    await expect(page.locator("text=Application error")).toHaveCount(0);
  });

  test("pas d'erreur console critique au chargement", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await prime(page);
    await page.goto("/fr", { waitUntil: "load" });
    // Laisser le JS client s'exécuter (les erreurs console remontent alors). Attente
    // non bloquante : le but du test est le contrôle console, pas la grille produits.
    await page
      .locator('a[href*="/produits/"]')
      .first()
      .waitFor({ timeout: 30_000 })
      .catch(() => {});

    // On tolère le bruit tiers (favicon, images distantes) mais pas les erreurs React/JS.
    const critical = errors.filter(
      (e) =>
        /(hydrat|Minified React|Cannot read|is not a function|Unexpected|Maximum update)/i.test(
          e
        )
    );
    expect(critical, `Erreurs critiques:\n${critical.join("\n")}`).toHaveLength(0);
  });
});

test.describe("Homepage /en", () => {
  test("titre localisé EN + aucune fuite de français", async ({ page }) => {
    await prime(page);
    await page.goto("/en", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveTitle(/Baby Bamboo Bodysuits.*Pyjamas.*OEKO-TEX.*M!LK/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en$/);
    // Le bouton produit FR « Ajouter au panier » ne doit pas apparaître tel quel sur /en.
    await expect(page.locator("text=Ajouter au panier")).toHaveCount(0);
    expect(await page.locator("section").count()).toBeGreaterThanOrEqual(8);
  });
});
