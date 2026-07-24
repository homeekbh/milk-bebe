-- ─────────────────────────────────────────────────────────────────────────────
-- 026 — SOUS-CATÉGORIES (STRUCTURE / OUTIL VIDE) + libellés d'affichage dynamiques
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️ NON EXÉCUTÉ. Additif. À relire puis lancer à la main (Bou).
--
-- Livre l'OUTIL, PAS le contenu : ce script crée la colonne + les tables de référentiel, mais
-- N'INSÈRE AUCUNE catégorie ni sous-catégorie. Bou créera les sous-catégories dans l'admin.
--
--   • products.subcategory_slug  : rattachement d'un produit à une sous-catégorie (nullable).
--   • table categories(slug,label): libellés d'AFFICHAGE dynamiques des catégories (D2). Le SEO
--                                   (title/desc/keywords/H1) reste servi par CATEGORY_SEO (hardcodé) ;
--                                   ici on ne gère QUE le libellé affiché. Démarre VIDE → le resolver
--                                   applicatif retombe sur le libellé hardcodé / slug capitalisé.
--   • table subcategories(...)    : sous-catégories créées par l'admin. Démarre VIDE.
--
-- La table `categories` est déjà attendue par app/api/admin/categories/route.ts (avec fallback
-- « does not exist »). On la crée proprement ici. Aucune donnée pré-remplie.
-- ═════════════════════════════════════════════════════════════════════════════

-- 1) Colonne de rattachement produit → sous-catégorie (nullable, pas de FK dure : intégrité
--    validée applicativement, souplesse pour créer/supprimer des sous-catégories librement).
alter table products add column if not exists subcategory_slug text;
create index if not exists idx_products_subcategory
  on products (subcategory_slug) where subcategory_slug is not null;

-- 2) Référentiel des libellés de CATÉGORIE (affichage). VIDE au départ.
create table if not exists categories (
  slug        text primary key,
  label       text not null,
  created_at  timestamptz not null default now()
);

-- 3) Référentiel des SOUS-CATÉGORIES (créées par l'admin). VIDE au départ.
--    Un slug de sous-catégorie est unique AU SEIN d'une catégorie.
create table if not exists subcategories (
  category_slug text not null,
  slug          text not null,
  label         text not null,
  created_at    timestamptz not null default now(),
  primary key (category_slug, slug)
);

-- NB RLS : lectures publiques (resolver de libellés) faites CÔTÉ SERVEUR via service_role →
-- pas bloquées par RLS. Ces tables ne contiennent que du référentiel d'affichage (non sensible).
-- Si tu veux les exposer en lecture anon (PostgREST) ou aligner sur 006_rls_lockdown, ajouter :
--   alter table categories    enable row level security;
--   alter table subcategories enable row level security;
--   create policy cat_read  on categories    for select using (true);
--   create policy subcat_read on subcategories for select using (true);
-- (facultatif — non requis tant que seules les routes service_role lisent ces tables).
