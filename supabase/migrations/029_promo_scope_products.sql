-- ─────────────────────────────────────────────────────────────────────────────
-- 029 — PORTÉE MULTI-PRODUITS d'un code promo (Lot 7a)
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️ NON EXÉCUTÉ. Additif. À relire puis lancer à la main (Bou).
--
-- Complète 028_promo_scope.sql (scope_type 'all'|'category'|'product' + scope_value text).
-- Ajoute la liste d'ids produits pour la portée 'product' MULTIPLE (A1 : JSONB, pas de table
-- de liaison — cf. docs/plan-codes-promo.md).
--
-- CONVENTION DE PORTÉE (validée serveur, jamais depuis le body client) :
--   scope_type='all'      → scope_value NULL,            scope_product_ids '[]'   → couvre produits ET packs
--   scope_type='category' → scope_value = category_slug, scope_product_ids '[]'   → produits de cette catégorie (PAS les packs)
--   scope_type='product'  → scope_value NULL,            scope_product_ids '["<uuid>", ...]' → CES produits (PAS les packs)
--
-- Le flag « offre la livraison gratuite » (A4) réutilise la colonne EXISTANTE promo_codes.free_shipping
-- (bool) — aucune nouvelle colonne. Métropole uniquement (A6).
-- La limite « 2 codes max » (A8) est une règle UI + serveur, aucune colonne.
-- ═════════════════════════════════════════════════════════════════════════════

alter table promo_codes
  add column if not exists scope_product_ids jsonb not null default '[]'::jsonb;

-- Index GIN facultatif (recherche « quels codes ciblent ce produit ? ») — utile seulement si
-- on requête par id produit ; les codes sont sinon chargés par leur `code`. Décommenter si besoin :
-- create index if not exists idx_promo_codes_scope_products on promo_codes using gin (scope_product_ids);
