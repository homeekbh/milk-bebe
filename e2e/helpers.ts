import { Page } from "@playwright/test";

/**
 * Prépare un contexte de test « propre » AVANT tout chargement de page :
 *   - dismiss de la bannière cookies (Étape 4) → pas d'overlay qui intercepte les clics
 *   - skip de l'intro animée + popup exit-intent de la homepage
 *   - (optionnel) pré-remplissage du panier produits / packs via localStorage
 *
 * On coupe aussi les effets de bord serveur pour garder la DB / Stripe intacts :
 *   - /api/cart/save          → sinon un panier abandonné de test serait enregistré
 *   - /api/checkout/create-*  → aucune session Stripe ne doit être créée par les tests
 *
 * addInitScript s'exécute à CHAQUE navigation du contexte, donc AVANT l'hydratation
 * du CartProvider (qui lit milk_cart_v2 au mount) → le panier seedé est bien pris.
 * Quand `cart` n'est pas fourni, on ne touche PAS milk_cart_v2 : le test add-to-cart
 * pilote l'UI et son panier doit survivre à la navigation vers /panier.
 */
export async function prime(
  page: Page,
  opts: { cart?: CartSeed[]; packCart?: PackSeed[] } = {}
): Promise<void> {
  await page.addInitScript(
    (data: { cart: CartSeed[] | null; packCart: PackSeed[] | null }) => {
      try {
        const now = Date.now();
        localStorage.setItem("milk_cookie_consent", JSON.stringify({ status: "refused", ts: now }));
        localStorage.setItem("milk_intro_seen", "1");
        localStorage.setItem("milk_intro_done", "1");
        localStorage.setItem("exit_intent_seen", "1");
        if (data.cart) localStorage.setItem("milk_cart_v2", JSON.stringify(data.cart));
        if (data.packCart) localStorage.setItem("milk_pack_cart", JSON.stringify(data.packCart));
      } catch {
        /* localStorage bloqué — ignoré */
      }
    },
    { cart: opts.cart ?? null, packCart: opts.packCart ?? null }
  );

  // Neutralise le popup de bienvenue (PopupBienvenue lit /api/popups/active et
  // s'affiche après 4 s : sinon la modale intercepte les clics). Le composant
  // ignore toute réponse `{ error }` → il ne s'affiche jamais.
  await page.route("**/api/popups/active", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ error: "e2e-disabled" }) })
  );

  // Garde-fous anti effets de bord (DB / Stripe).
  await page.route("**/api/cart/save", (r) => r.abort());
  await page.route("**/api/checkout/create-session", (r) => r.abort());
  await page.route("**/api/checkout/create-pack-session", (r) => r.abort());
}

export type CartSeed = {
  id: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  taille?: string;
  couleur?: string;
  category_slug?: string;
};

export type PackSeed = {
  pack_id: string;
  slug: string;
  title: string;
  size: string | null;
  price: number;
  image_url?: string | null;
  items?: unknown[];
};

/** Un article produit prêt à seeder (34,90 € → sous-total connu, MILK10 s'applique). */
export function sampleCartItem(overrides: Partial<CartSeed> = {}): CartSeed {
  return {
    id: "e2e-prod-1",
    slug: "pyjama-bambou-eclair",
    name: "Pyjama bambou Éclair — 0-3 mois",
    price: 34.9,
    quantity: 1,
    taille: "0-3 mois",
    category_slug: "pyjamas",
    ...overrides,
  };
}

/** Données réelles du catalogue (vérifiées via /api/produits + /api/packs). */
export const FIXTURES = {
  productSlug: "pyjama-bambou-eclair",
  productSizes: ["Naissance", "0-3 mois", "3-6 mois"],
  packSlug: "pack-damier",
  validPromo: "MILK10", // 10 %, sans minimum, sans expiration, illimité
  invalidPromo: "ZZINVALIDXYZ999",
  validEmail: "playwright-e2e@milkbebe-test.local",
  validPhone: "06 12 34 56 78",
} as const;
