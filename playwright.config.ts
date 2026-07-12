import { defineConfig, devices } from "@playwright/test";

/**
 * Suite de non-régression M!LK (Étape 9).
 *
 * Parcours critiques couverts (déjà validés manuellement au fil des étapes) :
 *   - homepage.spec          : SSR + generateMetadata + toutes les sections (fr/en)
 *   - add-to-cart.spec       : ajout panier produit seul / pack seul / mixte
 *   - checkout-gating.spec   : bouton paiement gated (email + téléphone)
 *   - panier-steps.spec      : passage étape 1 → étape 2 + gating livraison
 *   - account-from-panier    : liens compte depuis /panier avec retour ?redirect=/panier
 *   - promo-code.spec        : application d'un code promo (valide + invalide)
 *
 * Deux modes d'exécution :
 *   1) Serveur géré par Playwright (défaut) : `npm run test:e2e`
 *      → build de prod + `next start` sur le port 3300, puis tests. Aucun lag de
 *        compilation en cours de test (fiable pour la non-régression).
 *   2) Serveur déjà lancé (dev) : `PW_BASE_URL=http://localhost:3993 npx playwright test`
 *      → réutilise le serveur existant (itération rapide).
 */

const PORT = 3300;
const baseURL = process.env.PW_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 1 retry en local aussi : absorbe un aléa réseau/hydratation isolé.
  retries: 1,
  // Exécution SÉQUENTIELLE par défaut : les parcours partagent un unique serveur
  // (+ Supabase/Stripe) ; en parallèle, la contention provoque des faux négatifs
  // (hydratation React tardive, fetch client lent). Fiabilité > vitesse pour une
  // suite de non-régression. Monter PW_WORKERS=3 sur une machine puissante.
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 1,
  reporter: [["list"]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    locale: "fr-FR",
    navigationTimeout: 90_000,
    actionTimeout: 20_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Serveur auto-géré uniquement si PW_BASE_URL n'est PAS fourni.
  webServer: process.env.PW_BASE_URL
    ? undefined
    : {
        command: `npx next build && npx next start -p ${PORT}`,
        url: baseURL,
        timeout: 300_000,
        reuseExistingServer: !process.env.CI,
        stdout: "ignore",
        stderr: "pipe",
      },
});
