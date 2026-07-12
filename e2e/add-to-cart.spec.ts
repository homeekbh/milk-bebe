import { test, expect, Page } from "@playwright/test";
import { prime, FIXTURES } from "./helpers";

/**
 * Ajout au panier — pilotage réel de l'UI (produit seul, pack seul, mixte).
 * Vérifie que l'article ajouté se retrouve bien dans /panier.
 *
 * Robustesse hydratation : sous charge, un clic peut précéder l'attache des
 * handlers React (hydratation) et être perdu. On ré-essaie donc l'action tant
 * que l'effet attendu n'est pas visible — sans double-effet grâce à un garde sur
 * l'état courant du bouton.
 */

async function addProduct(page: Page) {
  await page.goto(`/fr/produits/${FIXTURES.productSlug}`, { waitUntil: "domcontentloaded" });

  const size = page.getByRole("button", { name: "0-3 mois", exact: true }).first();
  // Le CTA existe dans les 2 états : « Choisir une taille ↑ » puis « Ajouter — XX.XX € ».
  const cta = page.getByRole("button", { name: /Choisir une taille|Ajouter\s+—/ });
  const added = page.getByRole("button", { name: /Ajouté au panier/ });
  await expect(cta).toBeVisible();

  // 1) Sélection de taille (tolérante à l'hydratation : on ne re-clique QUE si le
  //    CTA affiche encore « Choisir une taille » — le clic taille est un toggle).
  await expect(async () => {
    if (await added.count()) return;
    const label = (await cta.textContent().catch(() => "")) ?? "";
    if (/Choisir une taille/.test(label)) await size.click();
    await expect(cta).toHaveText(/Ajouter\s+—/, { timeout: 1500 });
  }).toPass({ timeout: 20_000, intervals: [400, 800, 1200, 2000] });

  // 2) Ajout au panier (retry jusqu'à confirmation : un clic isolé peut être perdu).
  await expect(async () => {
    if (await added.count()) return;
    await cta.click();
    await expect(added).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20_000, intervals: [400, 800, 1200, 2000] });
}

async function addPack(page: Page) {
  await page.goto(`/fr/packs/${FIXTURES.packSlug}`, { waitUntil: "domcontentloaded" });

  const addBtn = page.getByRole("button", { name: /Ajouter au panier/ });
  await expect(addBtn).toBeVisible();

  // Taille requise non pré-sélectionnée → choisir la première disponible.
  if (!(await addBtn.isEnabled())) {
    const sizeBtn = page
      .locator("button:not([disabled])", { hasText: /mois|unique|Naissance/ })
      .first();
    if (await sizeBtn.count()) await sizeBtn.click();
  }

  const added = page.getByRole("button", { name: /Ajouté au panier/ });
  await expect(async () => {
    if (await added.count()) return; // déjà ajouté
    await addBtn.click();
    await expect(added).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20_000, intervals: [400, 800, 1200, 2000] });
}

test("produit seul → présent dans /panier", async ({ page }) => {
  await prime(page); // pas de seed cart : l'UI écrit le panier
  await addProduct(page);

  await page.goto("/fr/panier", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Votre panier est vide")).toHaveCount(0);
  await expect(page.getByText(/Pyjama/i).first()).toBeVisible();
});

test("pack seul → présent dans /panier", async ({ page }) => {
  await prime(page);
  await addPack(page);

  await page.goto("/fr/panier", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Votre panier est vide")).toHaveCount(0);
  // Le prix du pack (84,90 €) apparaît dans le récap.
  await expect(page.getByText(/84[.,]90/).first()).toBeVisible();
});

test("panier mixte (produit + pack) → les deux présents", async ({ page }) => {
  await prime(page);
  await addProduct(page);
  await addPack(page);

  await page.goto("/fr/panier", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Votre panier est vide")).toHaveCount(0);
  await expect(page.getByText(/Pyjama/i).first()).toBeVisible();
  await expect(page.getByText(/84[.,]90/).first()).toBeVisible();
});
